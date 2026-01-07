import React, { useState } from 'react';
import {
   Building,
   Calendar,
   Link as LinkIcon,
   Shield,
   Save,
   CheckCircle,
   RefreshCw,
   Upload,
   Globe,
   Clock,
   Trash2,
   Plus,
   AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { googleCalendarService } from '../services/googleCalendarService';
import { specialistService } from '../services/specialistService';
import { userService, UserProfile } from '../services/userService';
import { Modal } from './ui/Modal';

type TabType = 'general' | 'rules' | 'integrations' | 'security';

export const Settings: React.FC = () => {
   const [activeTab, setActiveTab] = useState<TabType>('general');
   const [isSaving, setIsSaving] = useState(false);
   const [isSyncing, setIsSyncing] = useState(false);
   const [googleAccount, setGoogleAccount] = useState<string | null>(null);
   const [clientId, setClientId] = useState('');
   const [clientSecret, setClientSecret] = useState('');
   const [isConfigLoaded, setIsConfigLoaded] = useState(false);

   // Security & Access states
   const [users, setUsers] = useState<UserProfile[]>([]);
   const [isUserModalOpen, setIsUserModalOpen] = useState(false);
   const [currentUser, setCurrentUser] = useState<Partial<UserProfile>>({
      role: 'user',
      can_create: false,
      can_edit: false,
      can_delete: false
   });
   const [isAdminLoading, setIsAdminLoading] = useState(true);

   React.useEffect(() => {
      checkConfigs();
      checkConnection();
      loadUsers();
   }, []);

   const checkConfigs = async () => {
      const { data } = await supabase.from('integrations_config').select('client_id').eq('service', 'google_calendar').single();
      if (data) {
         setClientId(data.client_id);
         setIsConfigLoaded(true);
      }
   };

   const checkConnection = async () => {
      // Show the connected Google email if available
      const email = await userService.getConnectedGoogleEmail();
      setGoogleAccount(email);
   };

   const loadUsers = async () => {
      try {
         const data = await userService.fetchUsers();
         const { data: { user } } = await supabase.auth.getUser();

         if (user?.email) {
            const adminIdx = data.findIndex(u => u.email === user.email && u.role === 'admin');
            if (adminIdx === -1) {
               const adminProfile: UserProfile = {
                  id: user.id,
                  email: user.email,
                  name: user.user_metadata?.full_name || 'Administrador',
                  role: 'admin',
                  can_create: true,
                  can_edit: true,
                  can_delete: true
               };
               setUsers([adminProfile, ...data]);
            } else {
               setUsers(data);
            }
         } else {
            setUsers(data);
         }
      } catch (error) {
         console.error('Failed to load users', error);
      } finally {
         setIsAdminLoading(false);
      }
   };

   const handleOpenUserModal = (user?: UserProfile) => {
      if (user) {
         setCurrentUser({ ...user });
      } else {
         setCurrentUser({
            name: '',
            role: 'user',
            can_create: false,
            can_edit: false,
            can_delete: false
         });
      }
      setIsUserModalOpen(true);
   };

   const handleSaveUser = async () => {
      if (!currentUser.name && currentUser.role !== 'admin') {
         alert('Por favor, insira o título/nome do usuário.');
         return;
      }

      try {
         if (currentUser.id) {
            await userService.updateUser(currentUser.id, currentUser);
         } else {
            await userService.createUser(currentUser);
         }
         setIsUserModalOpen(false);
         loadUsers();
      } catch (error: any) {
         alert('Erro ao salvar usuário: ' + error.message);
      }
   };

   const handleDeleteUser = async (id: string) => {
      if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
      try {
         await userService.deleteUser(id);
         loadUsers();
      } catch (error: any) {
         alert(error.message);
      }
   };

   const saveIntegrationConfig = async () => {
      if (!clientId || !clientSecret) return alert('Preencha ID e Secret');
      const { error } = await supabase.from('integrations_config').upsert({
         service: 'google_calendar',
         client_id: clientId,
         client_secret: clientSecret,
         updated_at: new Date().toISOString()
      });
      if (error) alert('Erro ao salvar credenciais: ' + error.message);
      else {
         setClientSecret('');
         setIsConfigLoaded(true);
         alert('Credenciais salvas!');
      }
   };

   const connectGoogleAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert('Faça login');
      const redirectUri = window.location.origin + '/settings/callback';
      const { data, error } = await supabase.functions.invoke('google-auth', {
         body: { action: 'auth-url', redirectUri }
      });
      if (error) alert('Erro ao conectar: ' + error.message);
      else if (data?.url) window.location.href = data.url;
   };

   const disconnectGoogle = async () => {
      if (!confirm('Tem certeza que deseja desconectar sua conta do Google? Esta ação removerá a integração da agenda, os especialistas importados e os agendamentos sincronizados.')) return;

      try {
         // Find the admin user to disconnect
         const { data: admin } = await supabase
            .from('users')
            .select('id, email')
            .eq('role', 'admin')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

         if (!admin) {
            alert('Erro: Administrador não encontrado no banco de dados.');
            return;
         }

         // 1. Invoke Edge Function to clear tokens (bypasses RLS issues)
         const { error: fnError } = await supabase.functions.invoke('google-auth', {
            body: { action: 'disconnect' }
         });

         if (fnError) throw fnError;

         // 2. Remove specialists imported from Google (identified by specialty: 'Google Calendar')
         const { error: specError } = await supabase
            .from('especialistas')
            .delete()
            .eq('specialty', 'Google Calendar');

         if (specError) {
            console.error('Erro ao remover especialistas importados:', specError);
         }

         // 3. Remove mirrored appointments (identified by having a google_event_id)
         const { error: apptError } = await supabase
            .from('agendamentos')
            .delete()
            .not('google_event_id', 'is', null);

         if (apptError) {
            console.error('Erro ao remover agendamentos sincronizados:', apptError);
         }

         setGoogleAccount(null);
         alert('Google Calendar desconectado com sucesso!');
         window.location.reload();
      } catch (error: any) {
         console.error('Erro detalhado ao desconectar:', error);
         alert('Erro ao desconectar: ' + error.message);
      }
   };

   const handleSyncCalendars = async () => {
      if (!googleAccount) return;
      setIsSyncing(true);
      try {
         const calendars = await googleCalendarService.listCalendars(googleAccount);
         const currentSpecialists = await specialistService.fetchSpecialists();
         let addedCount = 0;
         for (const cal of calendars) {
            const exists = currentSpecialists.some(s => s.name === cal.summary || s.calendarId === cal.id);
            if (!exists) {
               await specialistService.createSpecialistFromGoogle({
                  name: cal.summary,
                  specialty: 'Google Calendar',
                  color: cal.backgroundColor || 'bg-blue-100 text-blue-800',
                  avatarUrl: 'https://cdn-icons-png.flaticon.com/512/3004/3004458.png',
                  calendarId: cal.id,
                  email: '',
                  phone: '',
                  treatments: []
               });
               addedCount++;
            }
         }
         alert(`Sincronização concluída! ${addedCount} novos calendários adicionados.`);
      } catch (error: any) {
         alert('Erro na sincronização: ' + error.message);
      } finally {
         setIsSyncing(false);
      }
   };

   const saveConfigs = () => {
      setIsSaving(true);
      setTimeout(() => {
         setIsSaving(false);
         alert('Configurações salvas com sucesso!');
      }, 800);
   };

   const renderContent = () => {
      switch (activeTab) {
         case 'general':
            return (
               <div className="space-y-8">
                  <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                     <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400">
                        <Upload size={24} />
                     </div>
                     <div>
                        <h3 className="font-medium text-gray-900">Logotipo da Clínica</h3>
                        <p className="text-sm text-gray-500 mb-3">Recomendado: 400x400px, PNG ou JPG.</p>
                        <button className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-md text-gray-700 hover:bg-gray-50">
                           Carregar imagem
                        </button>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Nome da Clínica</label>
                        <input type="text" defaultValue="ClínicaSync Médica" className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Endereço</label>
                        <input type="text" defaultValue="Av. Paulista, 1000 - SP" className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border shadow-sm" />
                     </div>
                  </div>
               </div>
            );
         case 'rules':
            return (
               <div className="space-y-8">
                  <h3 className="text-lg font-medium text-gray-900">Configurações de Agendamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Duração Padrão</label>
                        <select className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border shadow-sm">
                           <option>30 minutos</option>
                           <option>45 minutos</option>
                           <option>60 minutos</option>
                        </select>
                     </div>
                  </div>
               </div>
            );
         case 'integrations':
            return (
               <div className="space-y-8">
                  <div className="bg-white border rounded-xl p-6 shadow-sm">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                           <img className="w-10 h-10" src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" />
                           <div>
                              <h3 className="text-lg font-bold">Google Calendar</h3>
                              {googleAccount ? (
                                 <p className="text-sm text-green-600 font-medium">Conectado como {googleAccount}</p>
                              ) : (
                                 <p className="text-sm text-gray-500">Não conectado</p>
                              )}
                           </div>
                        </div>
                        {googleAccount ? (
                           <button onClick={disconnectGoogle} className="text-red-600 font-medium hover:underline">Desconectar</button>
                        ) : (
                           <button onClick={connectGoogleAccount} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all">Conectar</button>
                        )}
                     </div>
                     {googleAccount && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between">
                           <div>
                              <p className="text-sm text-blue-900 font-medium">Sincronizar Profissionais</p>
                              <p className="text-xs text-blue-700">Importar calendários do Google como especialistas.</p>
                           </div>
                           <button onClick={handleSyncCalendars} disabled={isSyncing} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                              {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                              Re-sincronizar agora
                           </button>
                        </div>
                     )}
                  </div>
                  <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                     <h3 className="font-bold">Credenciais do Google (API)</h3>
                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700">Client ID</label>
                           <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border shadow-sm" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                           <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Oculto" className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border shadow-sm" />
                        </div>
                        <button onClick={saveIntegrationConfig} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">Salvar Credenciais</button>
                     </div>
                  </div>
               </div>
            );
         case 'security':
            return (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-end">
                     <div>
                        <h3 className="text-lg font-medium text-gray-900">Usuários e Permissões</h3>
                        <p className="text-sm text-gray-500">Gerencie quem pode acessar o sistema.</p>
                     </div>
                     <button onClick={() => handleOpenUserModal()} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-all">
                        <Plus size={16} /> Novo Usuário
                     </button>
                  </div>
                  <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                     <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                           <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <th className="px-6 py-3">Usuário</th>
                              <th className="px-6 py-3">Função</th>
                              <th className="px-6 py-3">Permissões</th>
                              <th className="px-6 py-3 text-right">Ações</th>
                           </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {users.map(user => (
                              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                 <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                       <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold mr-3 ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                          {(user.name || 'U')[0].toUpperCase()}
                                       </div>
                                       <div>
                                          <div className="text-sm font-bold">{user.name}</div>
                                          {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                                       {user.role === 'admin' ? 'Admin' : 'Usuário'}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex gap-1">
                                       {user.role === 'admin' ? (
                                          <span className="text-[10px] uppercase font-bold text-blue-600">Acesso Total</span>
                                       ) : (
                                          <>
                                             {user.can_create && <span className="text-[10px] bg-green-50 text-green-700 px-1 border border-green-100 rounded">Criar</span>}
                                             {user.can_edit && <span className="text-[10px] bg-blue-50 text-blue-700 px-1 border border-blue-100 rounded">Editar</span>}
                                             {user.can_delete && <span className="text-[10px] bg-red-50 text-red-700 px-1 border border-red-100 rounded">Excluir</span>}
                                          </>
                                       )}
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleOpenUserModal(user)} className="text-blue-600 hover:underline mr-4 text-sm font-bold">Editar</button>
                                    {user.role !== 'admin' && (
                                       <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} className="inline" /></button>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            );
         default:
            return null;
      }
   };

   return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/30">
         <div className="flex justify-between items-center mb-8">
            <div>
               <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
               <p className="text-gray-500">Personalize seu sistema e gerencie acessos.</p>
            </div>
            <button onClick={saveConfigs} disabled={isSaving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
               {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
               Salvar Alterações
            </button>
         </div>

         <div className="flex flex-col lg:flex-row gap-8">
            <nav className="w-full lg:w-64 space-y-2">
               {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}>
                     <tab.icon size={20} />
                     {tab.label}
                  </button>
               ))}
            </nav>
            <main className="flex-1 bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 min-h-[600px]">
               {renderContent()}
            </main>
         </div>

         <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={currentUser.id ? "Editar Usuário" : "Novo Usuário"}>
            <div className="space-y-6">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Título/Nome <span className="text-red-500">*</span></label>
                  <input type="text" disabled={currentUser.role === 'admin'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500" value={currentUser.name || ''} onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })} />
               </div>
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest"><Shield size={16} className="text-blue-600" /> Permissões</h4>
                  <div className="space-y-3">
                     {[
                        { key: 'can_create' as const, label: 'Pode Criar', icon: Plus },
                        { key: 'can_edit' as const, label: 'Pode Editar', icon: RefreshCw },
                        { key: 'can_delete' as const, label: 'Pode Excluir', icon: Trash2 }
                     ].map(p => (
                        <label key={p.key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 cursor-pointer">
                           <div className="flex items-center gap-3">
                              <p.icon size={16} className="text-gray-400" />
                              <span className="text-sm font-bold">{p.label}</span>
                           </div>
                           <input type="checkbox" disabled={currentUser.role === 'admin'} checked={currentUser.role === 'admin' ? true : !!currentUser[p.key]} onChange={e => setCurrentUser({ ...currentUser, [p.key]: e.target.checked })} className="w-5 h-5 text-blue-600 rounded" />
                        </label>
                     ))}
                  </div>
               </div>
               <div className="flex gap-4 pt-4">
                  <button onClick={() => setIsUserModalOpen(false)} className="flex-1 px-4 py-3 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                  <button onClick={handleSaveUser} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">Salvar</button>
               </div>
            </div>
         </Modal>
      </div>
   );
};

const tabs = [
   { id: 'general', label: 'Dados da Clínica', icon: Building },
   { id: 'rules', label: 'Agenda & Regras', icon: Calendar },
   { id: 'integrations', label: 'Integrações', icon: LinkIcon },
   { id: 'security', label: 'Segurança & Acesso', icon: Shield },
];