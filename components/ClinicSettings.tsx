import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
   Mail,
   Crown,
   Briefcase,
   Headphones,
   Eye,
   EyeOff,
   Loader2,
   Stethoscope,
   User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { googleCalendarService } from '../services/googleCalendarService';
import { specialistService } from '../services/specialistService';
import { userService, subUserService, SubUserProfile } from '../services/userService';
import { Modal } from './ui/Modal';
import { useCompany } from '../contexts/CompanyContext';
import { companyService, CompanySettings } from '../services/companyService';
import { formatWhatsApp } from '../utils';
import { AlertModal } from './ui/AlertModal';
import { logService } from '../services/logService';

type TabType = 'general' | 'rules' | 'integrations' | 'security';

const iconConfig: Record<string, { icon: React.ComponentType<any>; bgColor: string; borderColor: string; textColor: string; colorClass: string; iconColor: string }> = {
  crown: {
    icon: Crown,
    bgColor: 'bg-blue-50/20',
    borderColor: 'border-blue-100',
    textColor: 'text-blue-700',
    colorClass: 'bg-blue-600/10 text-blue-400 border-blue-500/30 group-hover:border-blue-400 group-hover:bg-blue-600/20 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]',
    iconColor: 'text-blue-500 group-hover:scale-110 transition-transform'
  },
  briefcase: {
    icon: Briefcase,
    bgColor: 'bg-emerald-50/20',
    borderColor: 'border-emerald-100',
    textColor: 'text-emerald-700',
    colorClass: 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30 group-hover:border-emerald-400 group-hover:bg-emerald-600/20 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]',
    iconColor: 'text-emerald-500 group-hover:scale-110 transition-transform'
  },
  headphones: {
    icon: Headphones,
    bgColor: 'bg-amber-50/20',
    borderColor: 'border-amber-100',
    textColor: 'text-amber-700',
    colorClass: 'bg-amber-600/10 text-amber-400 border-amber-500/30 group-hover:border-amber-400 group-hover:bg-amber-600/20 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    iconColor: 'text-amber-500 group-hover:scale-110 transition-transform'
  },
  stethoscope: {
     icon: Stethoscope,
     bgColor: 'bg-rose-50/20',
     borderColor: 'border-rose-100',
     textColor: 'text-rose-700',
     colorClass: 'bg-rose-600/10 text-rose-400 border-rose-500/30 group-hover:border-rose-400 group-hover:bg-rose-600/20 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]',
     iconColor: 'text-rose-500 group-hover:scale-110 transition-transform'
  },
  user: {
     icon: User,
     bgColor: 'bg-purple-50/20',
     borderColor: 'border-purple-100',
     textColor: 'text-purple-700',
     colorClass: 'bg-purple-600/10 text-purple-400 border-purple-500/30 group-hover:border-purple-400 group-hover:bg-purple-600/20 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
     iconColor: 'text-purple-500 group-hover:scale-110 transition-transform'
  },
  shield: {
     icon: Shield,
     bgColor: 'bg-cyan-50/20',
     borderColor: 'border-cyan-100',
     textColor: 'text-cyan-700',
     colorClass: 'bg-cyan-600/10 text-cyan-400 border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-600/20 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]',
     iconColor: 'text-cyan-500 group-hover:scale-110 transition-transform'
  }
};

const permissionOptions = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'appointments', label: 'Agendamentos' },
  { key: 'patients', label: 'Pacientes' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'campaigns', label: 'Campanhas' },
  { key: 'inventory', label: 'Estoque' },
  { key: 'gallery', label: 'Galeria' },
  { key: 'prosthesis-control', label: 'Controle de Prótese' },
  { key: 'integrations', label: 'Integrações' },
  { key: 'security', label: 'Segurança & Acessos' }
];

const iconChoices: { key: 'crown' | 'briefcase' | 'headphones' | 'stethoscope' | 'user' | 'shield'; icon: React.ComponentType<any>; label: string }[] = [
  { key: 'crown', icon: Crown, label: 'Coroa' },
  { key: 'briefcase', icon: Briefcase, label: 'Maleta' },
  { key: 'headphones', icon: Headphones, label: 'Fone' },
  { key: 'stethoscope', icon: Stethoscope, label: 'Estetoscópio' },
  { key: 'user', icon: User, label: 'Usuário' },
  { key: 'shield', icon: Shield, label: 'Escudo' }
];

interface ClinicSettingsProps {
   initialTab?: TabType;
   onBack: () => void;
}

export const ClinicSettings: React.FC<ClinicSettingsProps> = ({ initialTab = 'general', onBack }) => {
   const { empresaId } = useCompany();
   const navigate = useNavigate();
   const location = useLocation();
   const subUserRole = localStorage.getItem('clinica_sub_user_role') || 'admin';
   const [activeTab, setActiveTab] = useState<TabType>(initialTab);

   useEffect(() => {
      const path = location.pathname;
      let targetTab = initialTab;
      if (path === '/configuracoes/seguranca') {
         targetTab = 'security';
      } else if (path === '/configuracoes/integracoes') {
         targetTab = 'integrations';
      }

      if (subUserRole === 'concierge' && (targetTab === 'integrations' || targetTab === 'security')) {
         setActiveTab('general');
         navigate('/configuracoes/clinica', { replace: true });
      } else {
         setActiveTab(targetTab);
      }
   }, [location.pathname, initialTab, subUserRole]);

   const [isSaving, setIsSaving] = useState(false);
   const [isSyncing, setIsSyncing] = useState(false);
   const [googleAccount, setGoogleAccount] = useState<string | null>(null);
   const [clientId, setClientId] = useState('');
   const [clientSecret, setClientSecret] = useState('');
   const [openaiApiKey, setOpenaiApiKey] = useState('');
   const [isGoogleConfigSaved, setIsGoogleConfigSaved] = useState(false);
   const [isOpenAiConfigSaved, setIsOpenAiConfigSaved] = useState(false);
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
   const [adminEmail, setAdminEmail] = useState('');
   const [profiles, setProfiles] = useState<Record<string, SubUserProfile>>({});
   const [showSubPass, setShowSubPass] = useState<Record<string, boolean>>({});


   // Profile Modal states
   const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
   const [editingProfile, setEditingProfile] = useState<SubUserProfile | null>(null);
   const [profileName, setProfileName] = useState('');
   const [profilePassword, setProfilePassword] = useState('');
   const [profileIcon, setProfileIcon] = useState<'crown' | 'briefcase' | 'headphones' | 'stethoscope' | 'user' | 'shield'>('user');
   const [profilePermissions, setProfilePermissions] = useState<string[]>([]);
   const [showModalPassword, setShowModalPassword] = useState(false);
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
         loadSubUsers();
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
      const { data, error } = await supabase.from('integrations_config').select('service, client_id, client_secret, is_active').eq('IDEmpresa', empresaId);
      if (data) {
         const google = data.find(d => d.service === 'google_calendar');
         if (google && google.client_id) {
            setClientId(google.client_id || '');
            // se a coluna não existir ainda (null/undefined) ou for true, consideramos conectada
            setIsGoogleConfigSaved(google.is_active !== false);
         }
         const openaiConfig = data.find(d => d.service === 'openai' || d.service === 'OpenAi');
         if (openaiConfig && (openaiConfig.client_secret || openaiConfig.client_id)) {
            setOpenaiApiKey(openaiConfig.client_secret || openaiConfig.client_id || '');
            setIsOpenAiConfigSaved(openaiConfig.is_active !== false);
         }
         setIsConfigLoaded(true);
      } else if (error && error.code === '42703') {
          // caso a coluna is_active ainda não tenha sido criada, faz um fallback pra manter o app rodando sem erro na tela
          const { data: fbData } = await supabase.from('integrations_config').select('service, client_id, client_secret').eq('IDEmpresa', empresaId);
          if (fbData) {
              const google = fbData.find(d => d.service === 'google_calendar');
              if (google && google.client_id) {
                  setClientId(google.client_id || '');
                  setIsGoogleConfigSaved(true);
              }
              const openaiConfig = fbData.find(d => d.service === 'openai' || d.service === 'OpenAi');
              if (openaiConfig && (openaiConfig.client_secret || openaiConfig.client_id)) {
                  setOpenaiApiKey(openaiConfig.client_secret || openaiConfig.client_id || '');
                  setIsOpenAiConfigSaved(true);
              }
              setIsConfigLoaded(true);
          }
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
         const { data: { user } } = await supabase.auth.getUser();
         if (user?.email) {
            setAdminEmail(user.email);
         }
      } catch (error) {
         console.error('Failed to load admin email', error);
      }
   };

   const loadSubUsers = async () => {
      if (!empresaId) return;
      try {
         const data = await subUserService.getSubUsers(empresaId);
         setProfiles(data);
      } catch (err) {
         console.error('Erro ao carregar perfis:', err);
      }
   };



   const handleOpenProfileModal = (profile?: SubUserProfile) => {
      if (profile) {
         setEditingProfile(profile);
         setProfileName(profile.name);
         setProfilePassword(profile.password);
         setProfileIcon(profile.icon);
         setProfilePermissions(profile.permissions);
      } else {
         setEditingProfile(null);
         setProfileName('');
         setProfilePassword('');
         setProfileIcon('user');
         setProfilePermissions(['agenda', 'appointments', 'patients']); // reasonable defaults
      }
      setShowModalPassword(false);
      setIsProfileModalOpen(true);
   };

   const handleSaveProfile = () => {
      if (!profileName.trim()) {
         showAlert('Campo Obrigatório', 'Por favor, insira o nome do perfil.', 'warning');
         return;
      }
      if (!profilePassword.trim()) {
         showAlert('Campo Obrigatório', 'Por favor, insira a senha do perfil.', 'warning');
         return;
      }

      const newProfiles = { ...profiles };
      if (editingProfile) {
         // Editing existing
         newProfiles[editingProfile.id] = {
            ...editingProfile,
            name: profileName,
            password: profilePassword,
            icon: profileIcon,
            permissions: editingProfile.id === 'admin' ? newProfiles.admin.permissions : profilePermissions
         };
      } else {
         // Creating new
         const id = 'profile_' + Date.now();
         newProfiles[id] = {
            id,
            name: profileName,
            password: profilePassword,
            icon: profileIcon,
            permissions: profilePermissions
         };
      }

      setProfiles(newProfiles);
      setIsProfileModalOpen(false);
      showAlert('Sucesso', 'Perfil atualizado localmente! Clique em "Salvar Senhas dos Perfis" ou "Salvar Alterações" no topo para persistir no banco de dados.', 'success');
   };

   const handleDeleteProfile = (id: string) => {
      if (id === 'admin') {
         showAlert('Erro', 'O perfil Administrador não pode ser excluído.', 'error');
         return;
      }
      showAlert(
         'Confirmar Exclusão',
         `Tem certeza que deseja excluir o perfil "${profiles[id]?.name}"?`,
         'confirm',
         () => {
            const newProfiles = { ...profiles };
            delete newProfiles[id];
            setProfiles(newProfiles);
            showAlert('Excluído', 'Perfil removido! Clique em "Salvar Alterações" no topo para salvar definitivamente.', 'success');
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

   const saveGoogleConfig = async () => {
      if (!empresaId) return;
      if (!clientId || !clientSecret) {
         showAlert('Campos Faltando', 'Por favor, preencha o Client ID e Client Secret do Google.', 'warning');
         return;
      }

      try {
          const { data, error: selError } = await supabase
              .from('integrations_config')
              .select('service')
              .eq('IDEmpresa', empresaId)
              .eq('service', 'google_calendar')
              .maybeSingle();

          if (selError) throw selError;

          const payload = {
              IDEmpresa: empresaId,
              service: 'google_calendar',
              client_id: clientId,
              client_secret: clientSecret,
              is_active: true,
              updated_at: new Date().toISOString()
          };

          if (data) {
              const { error: upError } = await supabase.from('integrations_config').update(payload).eq('IDEmpresa', empresaId).eq('service', 'google_calendar');
              if (upError) throw upError;
          } else {
              const { error: inError } = await supabase.from('integrations_config').insert([payload]);
              if (inError) throw inError;
          }

          setClientSecret('');
          setIsGoogleConfigSaved(true);
          showAlert('Sucesso', 'Credenciais do Google salvas com sucesso!', 'success');
      } catch (err: any) {
          showAlert('Erro', `Erro ao salvar credenciais do Google: ${err.message}`, 'error');
      }
   };

   const saveOpenAIConfig = async () => {
      if (!empresaId) return;
      if (!openaiApiKey) {
         showAlert('Campos Faltando', 'Por favor, preencha a OpenAI API Key (começa com sk-...).', 'warning');
         return;
      }

      try {
          const { data, error: selError } = await supabase
              .from('integrations_config')
              .select('service')
              .eq('IDEmpresa', empresaId)
              .eq('service', 'OpenAi')
              .maybeSingle();

          if (selError) throw selError;

          const payload = {
              IDEmpresa: empresaId,
              service: 'OpenAi',
              client_id: openaiApiKey,
              client_secret: openaiApiKey,
              is_active: true,
              updated_at: new Date().toISOString()
          };

          if (data) {
              const { error: upError } = await supabase.from('integrations_config').update(payload).eq('IDEmpresa', empresaId).eq('service', 'OpenAi');
              if (upError) throw upError;
          } else {
              const { error: inError } = await supabase.from('integrations_config').insert([payload]);
              if (inError) throw inError;
          }

          setIsOpenAiConfigSaved(true);
          showAlert('Sucesso', 'Credencial da IA salva com sucesso!', 'success');
      } catch (err: any) {
          showAlert('Erro', `Erro ao salvar credenciais da IA: ${err.message}`, 'error');
      }
   };

   const disconnectGoogleConfig = async () => {
      if (!empresaId) return;
      try {
          const { error } = await supabase.from('integrations_config').update({ is_active: false }).eq('IDEmpresa', empresaId).eq('service', 'google_calendar');
          if (error) throw error;
          
          setIsGoogleConfigSaved(false);
          showAlert('Sucesso', 'Credencial do Google foi desconectada!', 'success');
      } catch (err: any) {
          showAlert('Erro', `Erro ao desconectar credencial Google: ${err.message}`, 'error');
      }
   };

   const disconnectOpenAIConfig = async () => {
      if (!empresaId) return;
      try {
          const { error } = await supabase.from('integrations_config').update({ is_active: false }).eq('IDEmpresa', empresaId).in('service', ['openai', 'OpenAi']);
          if (error) throw error;
          
          setIsOpenAiConfigSaved(false);
          showAlert('Sucesso', 'Credencial da IA foi desconectada!', 'success');
      } catch (err: any) {
          showAlert('Erro', `Erro ao desconectar credencial OpenAI: ${err.message}`, 'error');
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
          await subUserService.saveSubUsers(empresaId, profiles);
          showAlert('Sucesso', 'Configurações e perfis salvos com sucesso!', 'success');
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
                     <div className="flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2">
                           <img className="w-5 h-5" src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" />
                           Credenciais do Google (API)
                        </h3>
                        {isGoogleConfigSaved ? (
                           <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Conectado</span>
                        ) : (
                           <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">Desconectado</span>
                        )}
                     </div>
                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700">Client ID</label>
                           <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border shadow-sm" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                           <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Oculto" className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border shadow-sm" />
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                           <button onClick={saveGoogleConfig} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">Salvar Credenciais do Google</button>
                           {isGoogleConfigSaved ? (
                              <button onClick={disconnectGoogleConfig} className="text-red-500 font-medium hover:text-red-600 text-sm">Desconectar</button>
                           ) : clientId ? (
                               <p className="text-gray-400 text-xs text-right pr-2">Preserva chaves (Desconectado)</p>
                           ) : null}
                        </div>
                     </div>
                  </div>

                  <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
                     <div className="flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2">
                           <span className="text-xl">✨</span>
                           Inteligência Artificial (OpenAI)
                        </h3>
                        {isOpenAiConfigSaved ? (
                           <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Conectado</span>
                        ) : (
                           <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">Desconectado</span>
                        )}
                     </div>
                     <p className="text-sm text-gray-500">Defina sua Chave de API da OpenAI para utilizar recursos de melhoria de texto por inteligência artificial.</p>
                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700">OpenAI API Key (sk-...)</label>
                           <input type="password" value={openaiApiKey} onChange={e => setOpenaiApiKey(e.target.value)} placeholder="Oculto" className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 border shadow-sm" />
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                           <button onClick={saveOpenAIConfig} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 shadow-sm transition-all border border-gray-200">Salvar Credencial da IA</button>
                           {isOpenAiConfigSaved ? (
                              <button onClick={disconnectOpenAIConfig} className="text-red-500 font-medium hover:text-red-600 text-sm">Desconectar</button>
                           ) : openaiApiKey ? (
                               <p className="text-gray-400 text-xs text-right pr-2">Preserva chave (Desconectado)</p>
                           ) : null}
                        </div>
                     </div>
                  </div>
               </div>
            );
         case 'security':
            return (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-end">
                     <div>
                        <h3 className="text-lg font-bold text-gray-900">Usuários e Permissões</h3>
                        <p className="text-sm text-gray-500">Gerencie a conta principal da clínica.</p>
                     </div>
                     <button onClick={() => handleOpenProfileModal()} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm">
                        <Plus size={16} /> Novo Perfil
                     </button>
                  </div>
                  
                  {/* Static Clinic Owner Row Table */}
                  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                     <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                           <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              <th className="px-6 py-4">Usuário</th>
                              <th className="px-6 py-4">Função</th>
                              <th className="px-6 py-4">Permissões</th>
                           </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           <tr className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="flex items-center">
                                    <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold mr-3 bg-blue-100 text-blue-700">
                                       {(company.nome || 'C')[0].toUpperCase()}
                                    </div>
                                    <div>
                                       <div className="text-sm font-bold text-gray-800">{company.nome || 'Minha Clínica'}</div>
                                       {adminEmail && <div className="text-xs text-gray-500">{adminEmail}</div>}
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                    Administrador Principal
                                 </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2.5 py-1 border border-blue-100 rounded">Acesso Total</span>
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>

                  {/* Gestão de Senhas dos Perfis Dinâmicos */}
                  {(subUserRole === 'admin' || subUserRole === 'gestor') && (
                     <div className="pt-8 border-t border-gray-100 space-y-6">
                        <div>
                           <h3 className="text-lg font-bold text-gray-900">Senhas de Acesso dos Perfis</h3>
                           <p className="text-sm text-gray-500">Configure as senhas e as permissões de acesso para os perfis na tela de seleção.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                           {Object.values(profiles).map(profile => {
                              const config = iconConfig[profile.icon] || iconConfig.user;
                              const Icon = config.icon;
                              const showPasswordText = !!showSubPass[profile.id];
                              
                              return (
                                 <div 
                                    key={profile.id} 
                                    className={`p-5 rounded-2xl border ${config.borderColor} ${config.bgColor} space-y-4 flex flex-col justify-between hover:shadow-md transition-all duration-350 group`}
                                 >
                                    <div className="space-y-3">
                                       <div className="flex items-center justify-between">
                                          <div className={`flex items-center gap-2 ${config.textColor} font-bold text-sm`}>
                                             <Icon size={18} className="group-hover:scale-110 transition-transform duration-300" />
                                             <span className="truncate max-w-[120px]" title={profile.name}>{profile.name}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                             <button
                                                type="button"
                                                onClick={() => handleOpenProfileModal(profile)}
                                                className="text-blue-500 hover:text-blue-600 hover:bg-white/80 p-1.5 rounded-lg transition-all"
                                                title="Editar Perfil"
                                             >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                             </button>
                                             {profile.id !== 'admin' && (
                                                <button
                                                   type="button"
                                                   onClick={() => handleDeleteProfile(profile.id)}
                                                   className="text-red-400 hover:text-red-600 hover:bg-white/80 p-1.5 rounded-lg transition-all"
                                                   title="Excluir Perfil"
                                                >
                                                   <Trash2 size={15} />
                                                </button>
                                             )}
                                          </div>
                                       </div>
                                       <div className="relative">
                                          <input
                                             type="text"
                                             style={{ WebkitTextSecurity: showPasswordText ? 'none' : 'disc' } as React.CSSProperties}
                                             readOnly
                                             value={profile.password}
                                             className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none select-all font-semibold"
                                          />
                                          <button
                                             type="button"
                                             onClick={() => setShowSubPass({ ...showSubPass, [profile.id]: !showSubPass[profile.id] })}
                                             className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                          >
                                             {showPasswordText ? <EyeOff size={15} /> : <Eye size={15} />}
                                          </button>
                                       </div>
                                    </div>
                                    <div className="space-y-1 pt-2 border-t border-gray-100/50">
                                       <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Permissões ({profile.permissions.length})</p>
                                       <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-0.5">
                                          {profile.id === 'admin' ? (
                                             <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">ACESSO TOTAL</span>
                                          ) : profile.permissions.length === 0 ? (
                                             <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">NENHUMA</span>
                                          ) : (
                                             profile.permissions.map(perm => (
                                                <span key={perm} className="text-[8px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                                   {perm === 'prosthesis-control' ? 'Prótese' : perm}
                                                </span>
                                             ))
                                          )}
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}

                  {/* Password Security Section */}
                  <div className="mt-12 bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100">
                           <Lock size={24} />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-gray-900">Segurança da Conta</h3>
                           <p className="text-sm text-gray-500">Deseja alterar a senha da conta master? Enviaremos um link de confirmação para o seu e-mail.</p>
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
               <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
               </button>
               <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Configurações Gerais</h1>
                  <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                     <Shield size={14} className="text-green-500" />
                     Gerencie as informações da clínica, integrações e permissões.
                  </p>
               </div>
            </div>
            <button onClick={saveConfigs} disabled={isSaving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
               {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
               Salvar Alterações
            </button>
         </div>

         <div className="flex flex-col lg:flex-row gap-8">
            <nav className="w-full lg:w-64 space-y-2">
               {tabs.map(tab => {
                  const isTabDisabledForConcierge = subUserRole === 'concierge' && (tab.id === 'integrations' || tab.id === 'security');
                  return (
                     <button 
                        key={tab.id} 
                        disabled={isTabDisabledForConcierge}
                        onClick={() => {
                           if (tab.id === 'integrations') {
                              navigate('/configuracoes/integracoes');
                           } else if (tab.id === 'security') {
                              navigate('/configuracoes/seguranca');
                           } else {
                              navigate('/configuracoes/clinica');
                           }
                        }} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                           activeTab === tab.id 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                              : isTabDisabledForConcierge
                                 ? 'text-gray-300 bg-gray-50/50 cursor-not-allowed opacity-50 font-medium' 
                                 : 'text-gray-600 hover:bg-white hover:shadow-sm'
                        }`}
                     >
                        <tab.icon size={20} />
                        {tab.label}
                     </button>
                  );
               })}
            </nav>
            <main className="flex-1 bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 min-h-[600px]">
               {renderContent()}
            </main>
         </div>

         <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title={editingProfile ? "Editar Perfil de Acesso" : "Criar Novo Perfil de Acesso"}>
            <div className="space-y-6">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Perfil <span className="text-red-500">*</span></label>
                  <input 
                     type="text" 
                     className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-semibold" 
                     value={profileName} 
                     onChange={e => setProfileName(e.target.value)} 
                     disabled={editingProfile?.id === 'admin'}
                     placeholder="Ex: Recepcionista, Dr. João, etc."
                  />
                  {editingProfile?.id === 'admin' && (
                     <p className="text-[10px] text-gray-400 mt-1">O nome do perfil administrador master não pode ser alterado.</p>
                  )}
               </div>

               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Senha de Acesso <span className="text-red-500">*</span></label>
                  <div className="relative">
                     <input 
                        type="text"
                        style={{ WebkitTextSecurity: showModalPassword ? 'none' : 'disc' } as React.CSSProperties} 
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-semibold pr-10" 
                        value={profilePassword} 
                        onChange={e => setProfilePassword(e.target.value)} 
                        placeholder="Digite a senha de acesso"
                     />
                     <button
                        type="button"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                     >
                        {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                     </button>
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Escolha um Ícone Visual</label>
                  <div className="grid grid-cols-6 gap-2">
                     {iconChoices.map(choice => {
                        const IconComponent = choice.icon;
                        const isSelected = profileIcon === choice.key;
                        const isChoiceDisabled = editingProfile?.id === 'admin' && choice.key !== 'crown';
                        return (
                           <button
                              key={choice.key}
                              type="button"
                              disabled={isChoiceDisabled}
                              onClick={() => setProfileIcon(choice.key)}
                              title={choice.label}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                                 ${isSelected 
                                    ? 'bg-blue-600/10 border-blue-500 text-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.2)]' 
                                    : isChoiceDisabled
                                       ? 'opacity-30 cursor-not-allowed border-gray-105 text-gray-300'
                                       : 'border-gray-200 text-gray-500 hover:border-blue-200 hover:bg-gray-50 hover:text-blue-500'
                                 }`}
                           >
                              <IconComponent size={20} />
                           </button>
                        );
                     })}
                  </div>
                  {editingProfile?.id === 'admin' && (
                     <p className="text-[10px] text-gray-400 mt-1">O ícone do perfil administrador master é fixo como Coroa.</p>
                  )}
               </div>

               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-gray-700">
                     <Shield size={16} className="text-blue-600" /> Permissões de Acesso
                  </h4>
                  
                  {editingProfile?.id === 'admin' ? (
                     <div className="p-3 bg-blue-50/50 border border-blue-100 text-blue-700 rounded-xl text-xs font-semibold leading-relaxed">
                        Este é o perfil administrador orquestrador e sempre possui acesso total e irrestrito a todas as funcionalidades e telas do aplicativo.
                     </div>
                  ) : (
                     <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                        {permissionOptions.map(p => {
                           const isChecked = profilePermissions.includes(p.key);
                           return (
                              <label key={p.key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-100 cursor-pointer select-none transition-all">
                                 <span className="text-xs font-bold text-gray-700">{p.label}</span>
                                 <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    onChange={e => {
                                       if (e.target.checked) {
                                          setProfilePermissions([...profilePermissions, p.key]);
                                       } else {
                                          setProfilePermissions(profilePermissions.filter(k => k !== p.key));
                                       }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition-all" 
                                 />
                              </label>
                           );
                        })}
                     </div>
                  )}
               </div>

               <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button onClick={() => setIsProfileModalOpen(false)} className="flex-1 px-4 py-3 border rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-sm transition-colors">Cancelar</button>
                  <button onClick={handleSaveProfile} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all text-sm">Salvar Perfil</button>
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