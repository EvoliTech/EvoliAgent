import React, { useState, useMemo, useEffect } from 'react';
import { Patient } from '../types';
import { patientService } from '../services/patientService';
import { Search, Plus, Filter, MoreVertical, Phone, Mail, User, Check, X, Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { PageHeader } from './ui/PageHeader';

import { useCompany } from '../contexts/CompanyContext';

export const Patients: React.FC = () => {
  const { empresaId } = useCompany();
  // Estado principal dos pacientes
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de controle da interface
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');

  // Estado do formulário
  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    phone: '',
    email: '',
    plano: '',
    status: 'Ativo'
  });
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [customPlano, setCustomPlano] = useState('');

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
    } catch (error) {
      console.error('Failed to load patients', error);
      alert('Erro ao carregar pacientes do Supabase.');
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
    });
  }, [patients, searchTerm, statusFilter]);

  // Handlers
  const handleOpenNewPatient = () => {
    setFormData({
      name: '',
      phone: '',
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

    setFormData({
      name: patient.name,
      phone: patient.phone,
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
    if (confirm(`Tem certeza que deseja excluir o paciente ${patient.name}?`)) {
      try {
        if (empresaId) {
          await patientService.deletePatient(empresaId, patient.id);
          await loadPatients();
        }
      } catch (error) {
        alert("Erro ao excluir paciente.");
      }
    }
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      alert("Nome e telefone são obrigatórios.");
      return;
    }

    const finalPlano = formData.plano === 'Outros' ? customPlano : formData.plano;

    try {
      const patientData: any = { ...formData, plano: finalPlano };

      if (editingPatientId && empresaId) {
        await patientService.updatePatient(empresaId, editingPatientId, patientData);
      } else if (empresaId) {
        await patientService.createPatient(empresaId, patientData as Patient);
      }

      await loadPatients(); // Reload list
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao salvar paciente.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <PageHeader
        title="Pacientes"
        subtitle="Lista sincronizada de clientes (Supabase)."
      >
        <div className="flex gap-2">
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                <td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                    <p>Sincronizando com Supabase...</p>
                  </div>
                </td>
              </tr>
            ) : filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === patient.id ? null : patient.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {/* Menu Dropdown */}
                    {activeMenuId === patient.id && (
                      <div className="absolute right-8 top-8 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-100 py-1 animate-in fade-in zoom-in-95 duration-200">
                        <button
                          onClick={() => handleEditPatient(patient)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  Nenhum paciente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  required
                  className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border px-3"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
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

    </div>
  );
};
