import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, CreditCard, Save, ArrowLeft, Loader2, Calendar, ClipboardList } from 'lucide-react';
import { patientService } from '../services/patientService';
import { Patient } from '../types';
import { useCompany } from '../contexts/CompanyContext';
import { AlertModal } from './ui/AlertModal';

interface PatientRegistrationUpdateProps {
    patientId: string;
    onBack: () => void;
}

export const PatientRegistrationUpdate: React.FC<PatientRegistrationUpdateProps> = ({ patientId, onBack }) => {
    const { empresaId } = useCompany();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const [formData, setFormData] = useState<Partial<Patient>>({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (empresaId && patientId) {
            loadPatient();
        }
    }, [empresaId, patientId]);

    const loadPatient = async () => {
        try {
            setLoading(true);
            const clients = await patientService.fetchPatients(empresaId!);
            const found = clients.find(p => p.id === patientId);
            if (found) {
                setPatient(found);
                setFormData(found);
                setHasChanges(false);
            }
        } catch (error) {
            console.error('Error loading patient:', error);
            showAlert('Erro', 'Não foi possível carregar os dados do paciente.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (title: string, message: string, type: any = 'info', onConfirm?: () => void) => {
        setAlertConfig({ isOpen: true, title, message, type });
        if (type === 'success' && onConfirm) {
            // No direct callback in AlertModal for simple alerts, but we can handle it in handleSave
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        setHasChanges(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empresaId || !patientId || !hasChanges) return;

        try {
            setSaving(true);
            await patientService.updatePatient(empresaId, patientId, formData);
            setHasChanges(false);

            // Show success alert and then go back
            setAlertConfig({
                isOpen: true,
                title: 'Sucesso',
                message: 'Cadastro atualizado com sucesso!',
                type: 'success'
            });

            // Redirect after a short delay to allow the user to see the success state
            // or we can just redirect immediately when they close the modal.
            // But since the user asked to "update to the list of patients", 
            // I'll add a short timeout or just call onBack if they press OK.
            // For now, calling onBack after a brief moment so they see the toast.
            setTimeout(() => {
                onBack();
            }, 1500);

        } catch (error: any) {
            console.error('Error updating patient:', error);
            showAlert('Erro', error.message || 'Erro ao realizar atualização cadastral.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                <p className="text-gray-500">Carregando dados do paciente...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Atualização Cadastral</h1>
                    <p className="text-gray-500 text-sm">Mantenha seus dados atualizados para um melhor atendimento.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Dados Pessoais */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <User className="text-blue-600" size={20} />
                        <h2 className="font-semibold text-gray-800">Dados Pessoais</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                placeholder="Ex: João da Silva"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                            <input
                                type="text"
                                name="cpf"
                                value={formData.cpf || ''}
                                onChange={handleChange}
                                placeholder="000.000.000-00"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                            <input
                                type="text"
                                name="rg"
                                value={formData.rg || ''}
                                onChange={handleChange}
                                placeholder="Ex: 12.345.678-9"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    name="dataNascimento"
                                    value={formData.dataNascimento || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
                            <select
                                name="genero"
                                value={formData.genero || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="">Selecione...</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Feminino">Feminino</option>
                                <option value="Outro">Outro</option>
                                <option value="Prefiro não informar">Prefiro não informar</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                            <select
                                name="estadoCivil"
                                value={formData.estadoCivil || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="">Selecione...</option>
                                <option value="Solteiro(a)">Solteiro(a)</option>
                                <option value="Casado(a)">Casado(a)</option>
                                <option value="Divorciado(a)">Divorciado(a)</option>
                                <option value="Viúvo(a)">Viúvo(a)</option>
                                <option value="União Estável">União Estável</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Contato */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <Phone className="text-blue-600" size={20} />
                        <h2 className="font-semibold text-gray-800">Contato</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                                placeholder="email@exemplo.com"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Celular / WhatsApp</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone || ''}
                                onChange={handleChange}
                                placeholder="(00) 00000-0000"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-2 border-t pt-4 mt-2">
                            <h3 className="text-sm font-semibold text-gray-600 mb-3">Contato de Emergência</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Contato</label>
                                    <input
                                        type="text"
                                        name="contatoEmergenciaNome"
                                        value={formData.contatoEmergenciaNome || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone de Emergência</label>
                                    <input
                                        type="tel"
                                        name="contatoEmergenciaTelefone"
                                        value={formData.contatoEmergenciaTelefone || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Endereço */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <MapPin className="text-blue-600" size={20} />
                        <h2 className="font-semibold text-gray-800">Endereço</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                            <input
                                type="text"
                                name="cep"
                                value={formData.cep || ''}
                                onChange={handleChange}
                                placeholder="00000-000"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rua / Avenida</label>
                            <input
                                type="text"
                                name="enderecoRua"
                                value={formData.enderecoRua || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                            <input
                                type="text"
                                name="enderecoNumero"
                                value={formData.enderecoNumero || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                            <input
                                type="text"
                                name="enderecoBairro"
                                value={formData.enderecoBairro || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                            <input
                                type="text"
                                name="enderecoCidade"
                                value={formData.enderecoCidade || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <select
                                name="enderecoEstado"
                                value={formData.enderecoEstado || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="">UF</option>
                                <option value="AC">AC</option>
                                <option value="AL">AL</option>
                                <option value="AP">AP</option>
                                <option value="AM">AM</option>
                                <option value="BA">BA</option>
                                <option value="CE">CE</option>
                                <option value="DF">DF</option>
                                <option value="ES">ES</option>
                                <option value="GO">GO</option>
                                <option value="MA">MA</option>
                                <option value="MT">MT</option>
                                <option value="MS">MS</option>
                                <option value="MG">MG</option>
                                <option value="PA">PA</option>
                                <option value="PB">PB</option>
                                <option value="PR">PR</option>
                                <option value="PE">PE</option>
                                <option value="PI">PI</option>
                                <option value="RJ">RJ</option>
                                <option value="RN">RN</option>
                                <option value="RS">RS</option>
                                <option value="RO">RO</option>
                                <option value="RR">RR</option>
                                <option value="SC">SC</option>
                                <option value="SP">SP</option>
                                <option value="SE">SE</option>
                                <option value="TO">TO</option>
                            </select>
                        </div>
                        <div className="md:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                            <input
                                type="text"
                                name="enderecoComplemento"
                                value={formData.enderecoComplemento || ''}
                                onChange={handleChange}
                                placeholder="Apto, Bloco, etc."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Plano de Saúde */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <CreditCard className="text-blue-600" size={20} />
                        <h2 className="font-semibold text-gray-800">Plano de Saúde e Clínico</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Convênio / Plano</label>
                                <input
                                    type="text"
                                    name="plano"
                                    value={formData.plano || ''}
                                    onChange={handleChange}
                                    placeholder="Ex: Unimed, Bradesco Saúde"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nº da Carteirinha</label>
                                <input
                                    type="text"
                                    name="carteirinhaNumero"
                                    value={formData.carteirinhaNumero || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Validade</label>
                                <input
                                    type="date"
                                    name="carteirinhaValidade"
                                    value={formData.carteirinhaValidade || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <ClipboardList className="text-amber-600" size={18} />
                                <h3 className="text-sm font-semibold text-amber-900">Alergias e Observações</h3>
                            </div>
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="possuiAlergias"
                                        checked={formData.possuiAlergias || false}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-amber-900">O paciente possui alergias conhecidas?</span>
                                </label>
                                {formData.possuiAlergias && (
                                    <textarea
                                        name="alergiasObservacoes"
                                        value={formData.alergiasObservacoes || ''}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Descreva as alergias e outras observações médicas importantes..."
                                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                        Última atualização: <span className="font-semibold">{patient?.lastVisit || 'Hoje'}</span>
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !hasChanges}
                            className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg 
                                ${saving || !hasChanges
                                    ? 'bg-gray-400 text-gray-100 cursor-not-allowed shadow-none'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </form>

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => {
                    setAlertConfig(prev => ({ ...prev, isOpen: false }));
                    if (alertConfig.type === 'success') {
                        onBack();
                    }
                }}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    );
};
