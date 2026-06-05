import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Patient } from '../types';
import { patientService } from '../services/patientService';
import { Search, Plus, Filter, MoreVertical, Phone, Mail, User, Check, X, Loader2, Edit2, Trash2, ClipboardList, Download } from 'lucide-react';
import { Modal } from './ui/Modal';
import { PageHeader } from './ui/PageHeader';
import { PatientDetails } from './PatientDetails';
import { AlertModal } from './ui/AlertModal';
import { logService } from '../services/logService';

import { useCompany } from '../contexts/CompanyContext';

interface PatientsProps {
  onUpdateRegistration?: (id: string) => void;
  onNavigate?: (page: any) => void;
}

export const Patients: React.FC<PatientsProps> = ({ onUpdateRegistration, onNavigate }) => {
  const { empresaId } = useCompany();
  // Estado principal dos pacientes
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  // Sync selected patient from URL
  useEffect(() => {
    if (patients.length > 0) {
      const parts = location.pathname.split('/');
      if (parts[1] === 'pacientes' && parts[2]) {
        const id = parts[2];
        if (!selectedPatient || selectedPatient.id !== id) {
          const p = patients.find(p => p.id === id);
          if (p) {
            setSelectedPatient(p);
          }
        }
      } else if (parts[1] === 'pacientes' && !parts[2] && selectedPatient) {
        // URL says no patient, but we have one selected (e.g. back button)
        setSelectedPatient(null);
      }
    }
  }, [location.pathname, patients]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    navigate(`/pacientes/${patient.id}/visao-geral`);
  };

  const handleBackFromPatient = () => {
    setSelectedPatient(null);
    navigate('/pacientes');
  };


  // Estados de controle da interface
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(() => {
    try {
      const saved = localStorage.getItem('appState_patients_selectedPatient');
      if (saved) return JSON.parse(saved);
    } catch { }
    return null;
  });

  useEffect(() => {
    if (selectedPatient) {
      localStorage.setItem('appState_patients_selectedPatient', JSON.stringify(selectedPatient));
    } else {
      localStorage.removeItem('appState_patients_selectedPatient');
    }
  }, [selectedPatient]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    ddd: '',
    phoneOnly: '',
    email: '',
    plano: '',
    status: 'Ativo'
  });
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [customPlano, setCustomPlano] = useState('');
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
        empresaId,
        message: `${title}: ${message}`,
        component: 'Patients.tsx',
        functionName: 'showAlert'
      });
    }
  };

  // Fetch Patients on Mount & Realtime Subscription
  useEffect(() => {
    if (empresaId) {
      loadPatients();

      const subscription = patientService.subscribeToPatients(() => {
        loadPatients(); // Allow auto-refresh on external changes
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [empresaId]);

  const loadPatients = async () => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      const data = await patientService.fetchPatients(empresaId);
      setPatients(data);
      // Sincroniza o paciente aberto com os dados frescos do banco
      setSelectedPatient(prev => {
        if (!prev) return null;
        const updated = data.find(p => p.id === prev.id);
        return updated ?? prev;
      });
    } catch (error) {
      console.error('Failed to load patients', error);
      showAlert('Erro', 'Erro ao carregar pacientes do Supabase.', 'error');
    } finally {
      setIsLoading(false);
    }
  };


  // Lógica de Filtragem
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone.includes(searchTerm) ||
        (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'Todos' || patient.status === statusFilter;

      return matchesSearch && matchesStatus;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, searchTerm, statusFilter]);

  // Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = filteredPatients.map(p => p.id);
      setSelectedPatientIds(allIds);
    } else {
      setSelectedPatientIds([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedPatientIds.length === 0) return;
    showAlert(
      'Confirmar Exclusão Múltipla',
      `Tem certeza que deseja excluir ${selectedPatientIds.length} paciente(s)?`,
      'confirm',
      async () => {
        try {
          if (empresaId) {
            setIsLoading(true);
            for (const id of selectedPatientIds) {
               await patientService.deletePatient(empresaId, id);
            }
            setSelectedPatientIds([]);
            await loadPatients();
            showAlert('Sucesso', 'Pacientes excluídos com sucesso!', 'success');
          }
        } catch (error) {
          setIsLoading(false);
          showAlert('Erro', 'Erro ao excluir pacientes.', 'error');
        }
      }
    );
  };

  const handleBulkExport = () => {
    if (selectedPatientIds.length === 0) return;
    const patientsToExport = patients.filter(p => selectedPatientIds.includes(p.id));
    
    const headers = ['Nome,Contato,Email,Plano,Status,Criado Em'];
    const rows = patientsToExport.map(p => {
      return `"${p.name}","${p.phone || ''}","${p.email || ''}","${p.plano || ''}","${p.status}","${p.lastVisit || ''}"`;
    });
    const csvContent = headers.concat(rows).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pacientes_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewPatient = () => {
    setFormData({
      name: '',
      phone: '',
      ddd: '',
      phoneOnly: '',
      email: '',
      plano: '',
      status: 'Ativo'
    });
    setCustomPlano('');
    setEditingPatientId(null);
    setIsModalOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setActiveMenuId(null);
    const isStandardPlan = ['Amil', 'Bradesco', 'Uniodonto', 'Unimed', 'Particular'].includes(patient.plano || '');

    // Extract DDD and Phone number from stored format (e.g. 5511999999999)
    let ddd = '';
    let phoneOnly = '';
    if (patient.phone) {
      const cleanPhone = patient.phone.replace(/\D/g, ''); // 5511999999999
      if (cleanPhone.startsWith('55')) {
        ddd = cleanPhone.substring(2, 4);
        phoneOnly = cleanPhone.substring(4);
      } else {
        ddd = cleanPhone.substring(0, 2);
        phoneOnly = cleanPhone.substring(2);
      }
    }

    setFormData({
      name: patient.name,
      phone: patient.phone,
      ddd: ddd,
      phoneOnly: phoneOnly,
      email: patient.email,
      plano: isStandardPlan ? patient.plano : 'Outros',
      status: patient.status
    });

    if (!isStandardPlan && patient.plano) {
      setCustomPlano(patient.plano);
    } else {
      setCustomPlano('');
    }

    setEditingPatientId(patient.id);
    setIsModalOpen(true);
  };

  const handleDeletePatient = async (patient: Patient) => {
    setActiveMenuId(null);
    showAlert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir o paciente ${patient.name}?`,
      'confirm',
      async () => {
        try {
          if (empresaId) {
            await patientService.deletePatient(empresaId, patient.id);
            await loadPatients();
            showAlert('Sucesso', 'Paciente excluído com sucesso!', 'success');
          }
        } catch (error) {
          showAlert('Erro', 'Erro ao excluir paciente.', 'error');
        }
      }
    );
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.ddd || !formData.phoneOnly) {
      showAlert('Campo Obrigatório', 'Nome, DDD e telefone são obrigatórios.', 'warning');
      return;
    }

    const finalPhone = `55${formData.ddd.replace(/\D/g, '')}${formData.phoneOnly.replace(/\D/g, '')}`;
    const finalPlano = formData.plano === 'Outros' ? customPlano : formData.plano;

    try {
      const { ddd: _d, phoneOnly: _p, ...submitData } = formData;
      const patientData: any = { ...submitData, phone: finalPhone, plano: finalPlano };

      if (editingPatientId && empresaId) {
        await patientService.updatePatient(empresaId, editingPatientId, patientData);
      } else if (empresaId) {
        await patientService.createPatient(empresaId, patientData as Patient);
      }

      await loadPatients(); // Reload list
      setIsModalOpen(false);
      showAlert('Sucesso', 'Paciente salvo com sucesso!', 'success');
    } catch (error: any) {
      console.error('Error saving patient:', error);
      const errorMessage = error.message || 'Erro inesperado ao salvar paciente.';
      showAlert('Erro', `Não foi possível salvar os dados: ${errorMessage}`, 'error');
    }
  };

  if (selectedPatient) {
    return (
      <PatientDetails
        patient={selectedPatient}
        onBack={handleBackFromPatient}
        onEdit={() => {
          if (onUpdateRegistration) {
            onUpdateRegistration(selectedPatient.id);
          }
        }}
        onNavigateToSchedule={() => {
          if (onNavigate) {
            onNavigate('agenda');
          }
        }}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <PageHeader
        title="Pacientes"
        subtitle="Lista sincronizada de clientes."
      >
        <div className="flex flex-wrap items-center gap-2">
          {selectedPatientIds.length > 0 && (
            <>
              <span className="text-sm font-medium text-gray-600 mr-2 hidden sm:inline-block">
                {selectedPatientIds.length} selecionado(s)
              </span>
              <button
                onClick={handleBulkDelete}
                className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-100 shadow-sm flex items-center gap-2 transition-colors"
                title="Excluir selecionados"
              >
                <Trash2 size={16} /> <span className="hidden sm:inline">Excluir</span>
              </button>
              <button
                onClick={handleBulkExport}
                className="bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm font-medium border border-green-200 hover:bg-green-100 shadow-sm flex items-center gap-2 transition-colors"
                title="Exportar selecionados"
              >
                <Download size={16} /> <span className="hidden sm:inline">Exportar</span>
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block"></div>
            </>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              border px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors
              ${showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
            `}
          >
            <Filter size={16} /> Filtros
          </button>
          <button
            onClick={handleOpenNewPatient}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2"
          >
            <Plus size={16} /> Novo Paciente
          </button>
        </div>
      </PageHeader>

      {/* Search and Filters Bar */}
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in slide-in-from-top-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filtrar por Status</h3>
            <div className="flex gap-2">
              {(['Todos', 'Ativo', 'Inativo'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                    ${statusFilter === status
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}
                  `}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hidden md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left w-12">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  checked={filteredPatients.length > 0 && selectedPatientIds.length === filteredPatients.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contato
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plano
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado em
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                    <p>Sincronizando com Supabase...</p>
                  </div>
                </td>
              </tr>
            ) : filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className={`transition-colors cursor-pointer ${selectedPatientIds.includes(patient.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      checked={selectedPatientIds.includes(patient.id)}
                      onChange={(e) => {
                        setSelectedPatientIds(prev =>
                          e.target.checked ? [...prev, patient.id] : prev.filter(id => id !== patient.id)
                        );
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase text-sm">
                          {patient.name.charAt(0)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                        <div className="text-xs text-gray-400">ID: {patient.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone size={14} className="mr-2 text-gray-400" />
                        {patient.phone ? (
                          <a
                            href={`https://wa.me/${patient.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-green-600 hover:underline transition-colors"
                            title="Abrir no WhatsApp"
                          >
                            {patient.phone.replace(/^55(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                          </a>
                        ) : (
                          <span className="text-gray-300 italic">Sem telefone</span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail size={14} className="mr-2 text-gray-400" />
                        {patient.email || <span className="text-gray-300 italic">Sem e-mail</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {patient.plano || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${patient.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {patient.lastVisit || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative inline-block text-left">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === patient.id ? null : patient.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>

                      {/* Menu Dropdown */}
                      {activeMenuId === patient.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl z-50 border border-gray-100 py-1 animate-in fade-in zoom-in-95 duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPatient(patient);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit2 className="w-4 h-4 mr-2 text-gray-400" />
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePatient(patient);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2 text-red-400" />
                            Excluir
                          </button>
                          {onUpdateRegistration && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateRegistration(patient.id);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-50 mt-1"
                            >
                              <ClipboardList className="w-4 h-4 mr-2 text-blue-400" />
                              Atualização Cadastral
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                  Nenhum paciente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {/* Adiciona selecionar todos na versão mobile se houver pacientes */}
        {filteredPatients.length > 0 && !isLoading && (
          <div className="flex items-center px-2 py-1 mb-2">
            <input
              type="checkbox"
              id="selectAllMobile"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5 cursor-pointer mr-3"
              checked={filteredPatients.length > 0 && selectedPatientIds.length === filteredPatients.length}
              onChange={handleSelectAll}
            />
            <label htmlFor="selectAllMobile" className="text-sm text-gray-600 cursor-pointer select-none">
              Selecionar todos
            </label>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
            <p className="text-gray-500">Sincronizando com Supabase...</p>
          </div>
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className={`rounded-xl shadow-sm border p-4 transition-colors cursor-pointer ${selectedPatientIds.includes(patient.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 active:bg-gray-50'}`}
              onClick={() => handleSelectPatient(patient)}
            >
              <div className="flex items-center gap-3">
                <div onClick={e => e.stopPropagation()} className="shrink-0 flex items-center h-full">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5 cursor-pointer"
                    checked={selectedPatientIds.includes(patient.id)}
                    onChange={(e) => {
                      setSelectedPatientIds(prev =>
                        e.target.checked ? [...prev, patient.id] : prev.filter(id => id !== patient.id)
                      );
                    }}
                  />
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase text-sm shrink-0">
                  {patient.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 truncate">{patient.name}</p>
                    <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 ${patient.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {patient.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Phone size={12} className="text-gray-400" />
                    <span>{patient.phone ? patient.phone.replace(/^55(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : 'Sem telefone'}</span>
                  </div>
                  {patient.plano && (
                    <p className="text-xs text-gray-400 mt-0.5">Plano: {patient.plano}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-gray-500">Nenhum paciente encontrado.</div>
        )}
      </div>

      {/* Create Patient Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Paciente"
      >
        <form onSubmit={handleSavePatient} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                required
                className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
                placeholder="Ex: Ana Maria Silva"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700">DDD</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  required
                  maxLength={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3 pl-3"
                  placeholder="11"
                  value={formData.ddd}
                  onChange={e => setFormData({ ...formData, ddd: e.target.value.replace(/\D/g, '') })}
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Telefone (só números)</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  required
                  className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
                  placeholder="99999-9999"
                  value={formData.phoneOnly}
                  onChange={e => setFormData({ ...formData, phoneOnly: e.target.value.replace(/\D/g, '') })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'Ativo' | 'Inativo' })}
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
                  placeholder="exemplo@email.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Plano de Saúde</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
              value={formData.plano || ''}
              onChange={e => setFormData({ ...formData, plano: e.target.value })}
            >
              <option value="">Selecione...</option>
              <option value="Particular">Particular</option>
              <option value="Amil">Amil</option>
              <option value="Bradesco">Bradesco</option>
              <option value="Uniodonto">Uniodonto</option>
              <option value="Unimed">Unimed</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {formData.plano === 'Outros' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Qual Plano?</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
                placeholder="Digite o nome do plano"
                value={customPlano}
                onChange={e => setCustomPlano(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Salvar Paciente
            </button>
          </div>
        </form>
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
