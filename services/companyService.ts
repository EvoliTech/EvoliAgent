import { supabase } from '../lib/supabase';

export interface CompanySettings {
    id: number;
    nome: string;
    telefoneWhatsapp: string;
    endereco: string;
    configuracoes: {
        dias_funcionamento: {
            dia: string;
            aberto: boolean;
            inicio: string;
            fim: string;
        }[];
    };
}

export const companyService = {
    async fetchCompany(empresaId: string | number): Promise<CompanySettings | null> {
        const { data, error } = await supabase
            .from('Empresa')
            .select('*')
            .eq('id', empresaId)
            .single();

        if (error) {
            console.error('Error fetching company:', error);
            throw error;
        }

        return data;
    },

    async updateCompany(empresaId: string | number, updates: Partial<CompanySettings>) {
        const { data, error } = await supabase
            .from('Empresa')
            .update(updates)
            .eq('id', empresaId)
            .select()
            .single();

        if (error) {
            console.error('Error updating company:', error);
            throw error;
        }

        return data;
    }
};
