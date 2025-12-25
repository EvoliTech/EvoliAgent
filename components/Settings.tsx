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
import { SPECIALISTS } from '../constants';

type TabType = 'general' | 'rules' | 'integrations' | 'security';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [googleAccount, setGoogleAccount] = useState<string | null>('clinica@gmail.com');

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert('Configurações salvas com sucesso!');
    }, 800);
  };

  const tabs = [
    { id: 'general', label: 'Dados da Clínica', icon: Building },
    { id: 'rules', label: 'Agenda & Regras', icon: Calendar },
    { id: 'integrations', label: 'Integrações', icon: LinkIcon },
    { id: 'security', label: 'Segurança & Acesso', icon: Shield },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Logo Section */}
            <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
               <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400">
                  <div className="text-center">
                    <Upload size={24} className="mx-auto mb-1" />
                    <span className="text-xs">Logo</span>
                  </div>
               </div>
               <div>
                  <h3 className="font-medium text-gray-900">Logotipo da Clínica</h3>
                  <p className="text-sm text-gray-500 mb-3">Recomendado: 400x400px, PNG ou JPG.</p>
                  <button className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-md font-medium text-gray-700 hover:bg-gray-50">
                    Carregar nova imagem
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Nome da Clínica</label>
                <input type="text" defaultValue="ClínicaSync Médica" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Endereço Completo</label>
                <input type="text" defaultValue="Av. Paulista, 1000 - Bela Vista, São Paulo - SP" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Telefone Principal</label>
                <input type="text" defaultValue="(11) 3003-0000" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">WhatsApp da Clínica</label>
                <input type="text" defaultValue="(11) 99999-8888" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" />
              </div>

               <div>
                <label className="block text-sm font-medium text-gray-700">Fuso Horário</label>
                <div className="mt-1 relative">
                   <Globe size={16} className="absolute left-3 top-3 text-gray-400" />
                   <select className="block w-full pl-9 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 border px-3">
                     <option>Brasília (GMT-03:00)</option>
                     <option>Manaus (GMT-04:00)</option>
                     <option>Fernando de Noronha (GMT-02:00)</option>
                   </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={18} /> Dias e Horários de Atendimento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day) => (
                    <div key={day} className={`border rounded-lg p-3 ${day === 'Domingo' ? 'bg-gray-50 opacity-70' : 'bg-white'}`}>
                       <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-700">{day}</span>
                          <input type="checkbox" checked={day !== 'Domingo'} className="rounded text-blue-600 focus:ring-blue-500" />
                       </div>
                       <div className="flex items-center gap-2 text-sm">
                          <input type="time" defaultValue="08:00" disabled={day === 'Domingo'} className="w-full border-gray-300 rounded border px-1 py-0.5" />
                          <span className="text-gray-400">-</span>
                          <input type="time" defaultValue="18:00" disabled={day === 'Domingo'} className="w-full border-gray-300 rounded border px-1 py-0.5" />
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          </div>
        );

      case 'rules':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Configurações de Agendamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duração Padrão da Consulta</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border">
                    <option>15 minutos</option>
                    <option>20 minutos</option>
                    <option selected>30 minutos</option>
                    <option>45 minutos</option>
                    <option>60 minutos</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Tempo sugerido ao criar novo agendamento.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Intervalo Mínimo entre Atendimentos</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border">
                    <option>0 minutos (Sem intervalo)</option>
                    <option>5 minutos</option>
                    <option selected>10 minutos</option>
                    <option>15 minutos</option>
                  </select>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700">Antecedência Mínima para Agendar</label>
                   <div className="mt-1 relative rounded-md shadow-sm">
                      <input type="number" defaultValue="2" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border pr-12" />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">horas</span>
                      </div>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700">Limite Diário de Consultas (por profissional)</label>
                   <input type="number" defaultValue="16" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Restrições</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-50">
                   <div>
                     <p className="font-medium text-gray-900">Permitir agendamento no mesmo dia</p>
                     <p className="text-sm text-gray-500">Pacientes podem agendar para hoje se houver vaga.</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                   </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-50">
                   <div>
                     <p className="font-medium text-gray-900">Bloquear feriados automaticamente</p>
                     <p className="text-sm text-gray-500">O sistema importará feriados nacionais e bloqueará a agenda.</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                   </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
             
             {/* Google Calendar Header Card */}
             <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-2 shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="GCal" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Google Calendar</h3>
                        {googleAccount ? (
                           <p className="text-sm text-green-600 flex items-center gap-1 font-medium">
                              <CheckCircle size={14} /> Conectado como {googleAccount}
                           </p>
                        ) : (
                           <p className="text-sm text-gray-500">Não conectado</p>
                        )}
                      </div>
                   </div>
                   
                   {googleAccount ? (
                      <button 
                        onClick={() => setGoogleAccount(null)}
                        className="text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Desconectar
                      </button>
                   ) : (
                      <button 
                        onClick={() => setGoogleAccount('usuario@clinica.com')}
                        className="text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Conectar Conta Google
                      </button>
                   )}
                </div>

                {googleAccount && (
                   <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                         <h4 className="font-medium text-gray-900">Calendários Encontrados</h4>
                         <button className="text-blue-600 text-xs font-medium flex items-center gap-1 hover:underline">
                            <RefreshCw size={12} /> Re-sincronizar agora
                         </button>
                      </div>

                      <div className="space-y-3">
                         {/* Mock Calendar List Mapping */}
                         {[
                           { name: 'Dr. Ricardo Silva (Principal)', id: 'cal_1' },
                           { name: 'Dra. Amanda Costa', id: 'cal_2' },
                           { name: 'Consultório 1', id: 'cal_3' }
                         ].map(cal => (
                           <div key={cal.id} className="flex items-center justify-between bg-white p-3 border border-gray-200 rounded-md">
                              <div className="flex items-center gap-3">
                                 <Calendar size={18} className="text-gray-400" />
                                 <span className="text-sm font-medium text-gray-700">{cal.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className="text-xs text-gray-400">Vincular a:</span>
                                 <select className="text-sm border-gray-300 rounded border py-1 px-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Selecione um profissional...</option>
                                    {SPECIALISTS.map(s => (
                                       <option key={s.id} selected={cal.name.includes(s.name.split(' ')[1])}>{s.name}</option>
                                    ))}
                                 </select>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                )}
             </div>

             <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm opacity-60 grayscale">
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold text-xl">
                        WA
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-gray-900">WhatsApp Business API</h3>
                        <p className="text-sm text-gray-500">Integração em breve.</p>
                     </div>
                 </div>
             </div>

          </div>
        );

      case 'security':
        return (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
             
             {/* Header */}
             <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Usuários e Permissões</h3>
                  <p className="text-sm text-gray-500">Gerencie quem pode acessar o sistema.</p>
                </div>
                <button className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700">
                   <Plus size={16} /> Novo Usuário
                </button>
             </div>

             {/* Users Table */}
             <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                   <thead className="bg-gray-50">
                      <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissões</th>
                         <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                               <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">L</div>
                               <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">Dr. Lucas A.</div>
                                  <div className="text-sm text-gray-500">admin@clinica.com</div>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                               Admin
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                               <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Acesso Total</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">Editar</button>
                         </td>
                      </tr>
                      <tr>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                               <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">R</div>
                               <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">Recepção Manhã</div>
                                  <div className="text-sm text-gray-500">recepcao@clinica.com</div>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                               Recepção
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                               <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">Agendar</span>
                               <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">Editar</span>
                               <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 line-through decoration-red-500">Excluir</span>
                               <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 line-through decoration-red-500">Relatórios</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">Editar</button>
                            <button className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                         </td>
                      </tr>
                   </tbody>
                </table>
             </div>
             
             {/* Matrix of Permissions (Visual) */}
             <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
                <h4 className="font-medium text-gray-900 mb-4">Matriz de Permissões (Padrão)</h4>
                <div className="grid grid-cols-5 gap-4 text-sm text-center">
                   <div className="text-left font-medium text-gray-500">Função</div>
                   <div className="font-medium text-gray-500">Criar</div>
                   <div className="font-medium text-gray-500">Editar</div>
                   <div className="font-medium text-gray-500">Excluir</div>
                   <div className="font-medium text-gray-500">Relatórios</div>

                   <div className="text-left font-medium">Admin</div>
                   <div className="text-blue-600"><CheckCircle size={16} className="mx-auto"/></div>
                   <div className="text-blue-600"><CheckCircle size={16} className="mx-auto"/></div>
                   <div className="text-blue-600"><CheckCircle size={16} className="mx-auto"/></div>
                   <div className="text-blue-600"><CheckCircle size={16} className="mx-auto"/></div>

                   <div className="text-left font-medium">Recepção</div>
                   <div className="text-blue-600"><CheckCircle size={16} className="mx-auto"/></div>
                   <div className="text-blue-600"><CheckCircle size={16} className="mx-auto"/></div>
                   <div className="text-gray-300"><AlertCircle size={16} className="mx-auto"/></div>
                   <div className="text-gray-300"><AlertCircle size={16} className="mx-auto"/></div>
                </div>
             </div>

           </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500">Gerencie as preferências gerais do sistema.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2 disabled:opacity-70 transition-all"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          Salvar Alterações
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
        {/* Sidebar Tabs */}
        <nav className="w-full lg:w-64 space-y-1 shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'}
                `}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
          <div className="p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};