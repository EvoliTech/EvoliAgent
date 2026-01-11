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
   AlertCircle,
   Lock,
   Mail
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { googleCalendarService } from '../services/googleCalendarService';
import { specialistService } from '../services/specialistService';
import { userService, UserProfile } from '../services/userService';
import { Modal } from './ui/Modal';
import { useCompany } from '../contexts/CompanyContext';
import { companyService, CompanySettings } from '../services/companyService';
import { formatWhatsApp } from '../utils';
import { AlertModal } from './ui/AlertModal';
import { logService } from '../services/logService';

type TabType = 'general' | 'rules' | 'integrations' | 'security';

export const Settings: React.FC = () => {
   const { empresaId } = useCompany();
   const [activeTab, setActiveTab] = useState<TabType>('general');
   const [isSaving, setIsSaving] = useState(false);
   const [isSyncing, setIsSyncing] = useState(false);
   const [googleAccount, setGoogleAccount] = useState<string | null>(null);
   const [clientId, setClientId] = useState('');
   const [clientSecret, setClientSecret] = useState('');
   const [isConfigLoaded, setIsConfigLoaded] = useState(false);
   const [company, setCompany] = useState<Partial<CompanySettings>>({
      nome: '',
      telefoneWhatsapp: '',
      endereco: '',
      configuracoes: {
         dias_funcionamento: [
            { dia: 'Segunda-feira', aberto: true, inicio: '08:00', fim: '18:00' },
            { dia: 'Terça-feira', aberto: true, inicio: '08:00', fim: '18:00' },
            { dia: 'Quarta-feira', aberto: true, inicio: '08:00', fim: '18:00' },
            { dia: 'Quinta-feira', aberto: true, inicio: '08:00', fim: '18:00' },
            { dia: 'Sexta-feira', aberto: true, inicio: '08:00', fim: '18:00' },
            { dia: 'Sábado', aberto: false, inicio: '08:00', fim: '12:00' },
            { dia: 'Domingo', aberto: false, inicio: '08:00', fim: '12:00' },
         ]
      }
   });

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
   const [alertConfig, setAlertConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
      onConfirm?: () => void;
      confirmLabel?: string;
   }>({
      isOpen: false,
      title: '',
      message: '',
      type: 'info'
   });

   const showAlert = (title: string, message: string, type: any = 'info', onConfirm?: () => void, confirmLabel?: string) => {
      setAlertConfig({ isOpen: true, title, message, type, onConfirm, confirmLabel });
      if (type === 'error') {
         logService.logError({
            empresaId: empresaId || 0,
            message: `${title}: ${message}`,
            component: 'Settings.tsx',
            functionName: 'showAlert'
         });
      }
   };

   React.useEffect(() => {
      if (empresaId) {
         loadCompanyData();
         checkConfigs();
         checkConnection();
         loadUsers();
      }
   }, [empresaId]);

   const loadCompanyData = async () => {
      try {
         const data = await companyService.fetchCompany(empresaId!);
         if (data) {
            const configuracoes = data.configuracoes || { dias_funcionamento: [] };
            if (!configuracoes.dias_funcionamento || configuracoes.dias_funcionamento.length === 0) {
               configuracoes.dias_funcionamento = [
                  { dia: 'Segunda-feira', aberto: true, inicio: '08:00', fim: '18:00' },
                  { dia: 'Terça-feira', aberto: true, inicio: '08:00', fim: '18:00' },
                  { dia: 'Quarta-feira', aberto: true, inicio: '08:00', fim: '18:00' },
                  { dia: 'Quinta-feira', aberto: true, inicio: '08:00', fim: '18:00' },
                  { dia: 'Sexta-feira', aberto: true, inicio: '08:00', fim: '18:00' },
                  { dia: 'Sábado', aberto: false, inicio: '08:00', fim: '12:00' },
                  { dia: 'Domingo', aberto: false, inicio: '08:00', fim: '12:00' },
               ];
            }
            setCompany({
               ...data,
               telefoneWhatsapp: formatWhatsApp(data.telefoneWhatsapp),
               configuracoes
            });
         }
      } catch (error) {
         console.error('Failed to load company data', error);
      }
   };

   const checkConfigs = async () => {
      if (!empresaId) return;
      const { data } = await supabase.from('integrations_config').select('client_id').eq('service', 'google_calendar').eq('IDEmpresa', empresaId).maybeSingle();
      if (data) {
         setClientId(data.client_id);
         setIsConfigLoaded(true);
      }
   };

   const checkConnection = async () => {
      if (!empresaId) return;
      // Show the connected Google email if available
      const email = await userService.getConnectedGoogleEmail(empresaId);
      setGoogleAccount(email);
   };

   const loadUsers = async () => {
      if (!empresaId) return;
      try {
         const data = await userService.fetchUsers(empresaId);
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
      if (!empresaId) return;

      try {
         if (currentUser.id) {
            await userService.updateUser(empresaId, currentUser.id, {
               ...currentUser,
               name: currentUser.name
            });
         } else {
            if (!currentUser.name) {
               showAlert('Campo Obrigatório', 'Por favor, insira o título/nome do usuário.', 'warning');
               return;
            }
            await userService.createUser(empresaId, currentUser);
         }
         setIsUserModalOpen(false);
         loadUsers();
         showAlert('Sucesso', 'Usuário salvo com sucesso!', 'success');
      } catch (error: any) {
         showAlert('Erro', 'Erro ao salvar usuário: ' + error.message, 'error');
      }
   };

   const handleDeleteUser = async (id: string) => {
      showAlert(
         'Confirmar Exclusão',
         'Tem certeza que deseja excluir este usuário?',
         'confirm',
         async () => {
            if (!empresaId) return;
            try {
               await userService.deleteUser(empresaId, id);
               loadUsers();
               showAlert('Excluído', 'Usuário removido com sucesso!', 'success');
            } catch (error: any) {
               showAlert('Erro', error.message, 'error');
            }
         }
      );
   };

   const handleResetPassword = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
         showAlert(
            'Alterar Senha',
            `Deseja enviar um e-mail de redefinição de senha para ${user.email}?`,
            'confirm',
            async () => {
               const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
                  redirectTo: window.location.origin + '/settings',
               });

               if (error) {
                  showAlert('Erro', 'Erro ao enviar e-mail: ' + error.message, 'error');
               } else {
                  showAlert('E-mail Enviado', 'E-mail de redefinição enviado! Verifique sua caixa de entrada para alterar a senha com segurança.', 'success');
               }
            }
         );
      }
   };

   const saveIntegrationConfig = async () => {
      if (!clientId || !clientSecret || !empresaId) {
         showAlert('Campos Faltando', 'Por favor, preencha o Client ID e Client Secret.', 'warning');
         return;
      }
      const { error } = await supabase.from('integrations_config').upsert({
         IDEmpresa: empresaId,
         service: 'google_calendar',
         client_id: clientId,
         client_secret: clientSecret,
         updated_at: new Date().toISOString()
      }, { onConflict: 'IDEmpresa,service' });

      if (error) {
         showAlert('Erro', 'Erro ao salvar credenciais: ' + error.message, 'error');
      } else {
         setClientSecret('');
         setIsConfigLoaded(true);
         showAlert('Sucesso', 'Credenciais salvas com sucesso!', 'success');
      }
   };

   const handleConnectGoogle = async () => {
      if (!empresaId) return showAlert('Erro', 'Empresa não identificada', 'error');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return showAlert('Erro', 'Sessão expirada. Faça login novamente.', 'error');

      const redirectUri = window.location.origin + '/settings/callback';
      const { data, error } = await supabase.functions.invoke('google-auth', {
         body: { action: 'auth-url', redirectUri, empresaId }
      });

      if (error) {
         showAlert('Erro', 'Erro ao conectar: ' + error.message, 'error');
      } else if (data?.url) {
         window.location.href = data.url;
      }
   };

   const handleDisconnectGoogle = async () => {
      showAlert(
         'Desconectar Google',
         'Tem certeza que deseja desconectar sua conta do Google? Esta ação removerá a integração da agenda, os especialistas importados e os agendamentos sincronizados.',
         'confirm',
         async () => {
            if (!empresaId) return;
            setIsSyncing(true);
            try {
               const { data: { user } } = await supabase.auth.getUser();
               if (!user) throw new Error('Usuário não autenticado');

               const { data: adminUser } = await supabase
                  .from('users')
                  .select('id')
                  .eq('email', user.email)
                  .eq('IDEmpresa', empresaId)
                  .eq('role', 'admin')
                  .single();

               if (!adminUser) throw new Error('Administrador não encontrado no banco de dados.');

               // 1. Invoke Edge Function to clear tokens
               const { error: fnError } = await supabase.functions.invoke('google-auth', {
                  body: { action: 'disconnect', empresaId }
               });

               if (fnError) throw fnError;

               // 2. Remove specialists imported from Google
               const { error: specError } = await supabase
                  .from('especialistas')
                  .delete()
                  .eq('created_by', 'Google Calendar')
                  .eq('IDEmpresa', empresaId);

               if (specError) console.error('Erro ao remover especialistas:', specError);

               // 3. Remove mirrored appointments
               const { error: apptError } = await supabase
                  .from('agendamentos')
                  .delete()
                  .not('google_event_id', 'is', null)
                  .eq('IDEmpresa', empresaId);

               if (apptError) console.error('Erro ao remover agendamentos:', apptError);

               setGoogleAccount(null);
               showAlert('Sucesso', 'Google Calendar desconectado com sucesso!', 'success');
            } catch (error: any) {
               showAlert('Erro', 'Erro ao desconectar: ' + error.message, 'error');
            } finally {
               setIsSyncing(false);
            }
         },
         'Desconectar'
      );
   };

   const handleSyncCalendars = async () => {
      if (!googleAccount || !empresaId) return;
      setIsSyncing(true);
      try {
         const calendarList = await googleCalendarService.listCalendars(empresaId, googleAccount);
         const currentSpecialists = await specialistService.fetchSpecialists(empresaId);
         let addedCount = 0;
         for (const cal of calendarList) {
            const exists = currentSpecialists.some(s => s.name === cal.summary || s.calendarId === cal.id);
            if (!exists) {
               await specialistService.createSpecialistFromGoogle(empresaId, {
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
         showAlert('Sincronização', `Sincronização concluída! ${addedCount} novos especialistas/calendários adicionados.`, 'success');
      } catch (error: any) {
         showAlert('Erro', 'Erro na sincronização: ' + error.message, 'error');
      } finally {
         setIsSyncing(false);
      }
   };

   const saveConfigs = async () => {
      if (!empresaId) return;
      setIsSaving(true);
      try {
         await companyService.updateCompany(empresaId, company);
         showAlert('Sucesso', 'Configurações salvas com sucesso!', 'success');
      } catch (error: any) {
         showAlert('Erro', 'Erro ao salvar as configurações: ' + error.message, 'error');
      } finally {
         setIsSaving(false);
      }
   };

   const renderContent = () => {
      switch (activeTab) {
         case 'general':
            return (
               <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Clínica</label>
                        <input
                           type="text"
                           value={company.nome || ''}
                           onChange={e => setCompany({ ...company, nome: e.target.value })}
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                           placeholder="Ex: Clínica ClínicaSync"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp de Contato</label>
                        <input
                           type="text"
                           value={company.telefoneWhatsapp || ''}
                           readOnly
                           className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                           placeholder="(00) 00000-0000"
                        />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Endereço Completo</label>
                        <input
                           type="text"
                           value={company.endereco || ''}
                           onChange={e => setCompany({ ...company, endereco: e.target.value })}
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500"
                           placeholder="Rua, Número, Bairro, Cidade - UF"
                        />
                     </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                     <div className="flex items-center gap-2 mb-6 text-gray-900">
                        <Clock className="text-blue-600" size={20} />
                        <h3 className="text-lg font-bold">Horário de Funcionamento</h3>
                     </div>

                     <div className="space-y-3">
                        {company.configuracoes?.dias_funcionamento?.map((dia, index) => (
                           <div key={dia.dia} className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-md hover:shadow-gray-100 group">
                              <div className="w-32">
                                 <span className="text-sm font-bold text-gray-700">{dia.dia}</span>
                              </div>

                              <label className="flex items-center gap-2 cursor-pointer">
                                 <div className="relative inline-flex items-center">
                                    <input
                                       type="checkbox"
                                       checked={dia.aberto}
                                       onChange={e => {
                                          const newDias = [...(company.configuracoes?.dias_funcionamento || [])];
                                          newDias[index] = { ...dia, aberto: e.target.checked };
                                          setCompany({ ...company, configuracoes: { ...company.configuracoes!, dias_funcionamento: newDias } });
                                       }}
                                       className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                 </div>
                                 <span className={`text-xs font-bold uppercase tracking-wider ${dia.aberto ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {dia.aberto ? 'Aberto' : 'Fechado'}
                                 </span>
                              </label>

                              {dia.aberto && (
                                 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <input
                                       type="time"
                                       value={dia.inicio}
                                       onChange={e => {
                                          const newDias = [...(company.configuracoes?.dias_funcionamento || [])];
                                          newDias[index] = { ...dia, inicio: e.target.value };
                                          setCompany({ ...company, configuracoes: { ...company.configuracoes!, dias_funcionamento: newDias } });
                                       }}
                                       className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <span className="text-gray-400 text-xs font-bold">até</span>
                                    <input
                                       type="time"
                                       value={dia.fim}
                                       onChange={e => {
                                          const newDias = [...(company.configuracoes?.dias_funcionamento || [])];
                                          newDias[index] = { ...dia, fim: e.target.value };
                                          setCompany({ ...company, configuracoes: { ...company.configuracoes!, dias_funcionamento: newDias } });
                                       }}
                                       className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                 </div>
                              )}
                           </div>
                        ))}
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
                           <button onClick={handleDisconnectGoogle} className="text-red-600 font-medium hover:underline">Desconectar</button>
                        ) : (
                           <button onClick={handleConnectGoogle} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all">Conectar</button>
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

                  {/* Password Security Section */}
                  <div className="mt-12 bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                           <Lock size={24} />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-gray-900">Segurança da Conta</h3>
                           <p className="text-sm text-gray-500">Deseja alterar sua senha? Enviaremos um link de confirmação para o seu e-mail.</p>
                        </div>
                     </div>
                     <button
                        onClick={handleResetPassword}
                        className="bg-white text-gray-700 px-6 py-3 rounded-xl font-bold shadow-sm border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2"
                     >
                        <Mail size={18} /> Alterar Minha Senha
                     </button>
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
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500" value={currentUser.name || ''} onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })} />
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

         <AlertModal
            isOpen={alertConfig.isOpen}
            onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            confirmLabel={alertConfig.confirmLabel}
            onConfirm={() => {
               if (alertConfig.onConfirm) alertConfig.onConfirm();
               setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }}
         />
      </div>
   );
};

const tabs = [
   { id: 'general', label: 'Dados da Clínica', icon: Building },
   { id: 'integrations', label: 'Integrações', icon: LinkIcon },
   { id: 'security', label: 'Segurança & Acesso', icon: Shield },
];