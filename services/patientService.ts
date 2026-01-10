
import { supabase } from '../lib/supabase';
import { Patient, SupabaseCustomer } from '../types';
import { logService } from './logService';

export const patientService = {
    async fetchPatients(empresaId: number): Promise<Patient[]> {
        const { data, error } = await supabase
            .from('Cliente')
            .select('*')
            .eq('IDEmpresa', empresaId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching patients:', error);
            await logService.logError({
                empresaId,
                message: error.message,
                component: 'patientService',
                functionName: 'fetchPatients',
                context: error
            });
            throw error;
        }

        return (data as SupabaseCustomer[]).map(mapCustomerToPatient);
    },

    async createPatient(empresaId: number, patient: Omit<Patient, 'id' | 'lastVisit' | 'createdAt'>): Promise<void> {
        const phone = patient.phone.includes('@s.whatsapp.net')
            ? patient.phone
            : `${patient.phone.replace(/\D/g, '')}@s.whatsapp.net`;

        const newCustomer: any = {
            nome: patient.name,
            nome_completo: patient.name,
            telefoneWhatsapp: phone,
            email: patient.email,
            plano: patient.plano,
            IDEmpresa: empresaId,
            botAtivo: patient.status === 'Ativo' ? 'true' : 'false',
            status_lead_no_crm: patient.status === 'Ativo' ? 'novo' : 'arquivado'
        };

        const { error } = await supabase
            .from('Cliente')
            .insert(newCustomer);

        if (error) {
            console.error('Error in createPatient:', error);
            await logService.logError({
                empresaId,
                message: error.message,
                component: 'patientService',
                functionName: 'createPatient',
                context: { patient, newCustomer, error }
            });
            throw error;
        }
    },

    async updatePatient(empresaId: number, id: string, patient: Partial<Patient>): Promise<void> {
        const updates: any = {};
        if (patient.name) {
            updates.nome = patient.name;
            updates.nome_completo = patient.name;
        }
        if (patient.phone) {
            updates.telefoneWhatsapp = patient.phone.includes('@s.whatsapp.net')
                ? patient.phone
                : `${patient.phone.replace(/\D/g, '')}@s.whatsapp.net`;
        }
        if (patient.email) updates.email = patient.email;
        if (patient.plano) updates.plano = patient.plano;
        if (patient.status) {
            updates.botAtivo = patient.status === 'Ativo' ? 'true' : 'false';
            updates.status_lead_no_crm = patient.status === 'Ativo' ? 'novo' : 'arquivado';
        }

        const { error } = await supabase
            .from('Cliente')
            .update(updates)
            .eq('id', id)
            .eq('IDEmpresa', empresaId);

        if (error) {
            console.error('Error in updatePatient:', error);
            await logService.logError({
                empresaId,
                message: error.message,
                component: 'patientService',
                functionName: 'updatePatient',
                context: { id, updates, error }
            });
            throw error;
        }
    },

    async deletePatient(empresaId: number, id: string): Promise<void> {
        const { error } = await supabase
            .from('Cliente')
            .delete()
            .eq('id', id)
            .eq('IDEmpresa', empresaId);

        if (error) {
            await logService.logError({
                empresaId,
                message: error.message,
                component: 'patientService',
                functionName: 'deletePatient',
                context: { id, error }
            });
            throw error;
        }
    },

    subscribeToPatients(onChanges: () => void) {
        return supabase
            .channel('custom-all-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'Cliente' },
                () => {
                    onChanges();
                }
            )
            .subscribe();
    }
};

// Mapper utility
function mapCustomerToPatient(customer: SupabaseCustomer): Patient {
    // Determine name: prefer nome_completo, fallback to nome, fallback to 'Sem Nome'
    const name = customer.nome_completo || customer.nome || 'Paciente sem nome';

    // Determine status (Simple logic for now)
    // Check if botAtivo is 'true', '1', 'active' etc. 
    // Adjust based on real data observation.
    const isActive = customer.botAtivo === 'true' || customer.status_lead_no_crm !== 'arquivado';

    return {
        id: customer.id ? customer.id.toString() : '',
        name: name,
        phone: customer.telefoneWhatsapp?.replace('@s.whatsapp.net', '') || '',
        email: customer.email,
        plano: customer.plano,
        status: isActive ? 'Ativo' : 'Ativo', // Defaulting to Ativo for visibility for now
        lastVisit: customer.created_at ? new Date(customer.created_at).toLocaleDateString('pt-BR') : '-',
        createdAt: customer.created_at ? new Date(customer.created_at) : undefined
    };
}
