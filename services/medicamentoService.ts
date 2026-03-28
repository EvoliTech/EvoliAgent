import { supabase } from '../lib/supabase';

export interface MedicamentoSugestao {
    id?: string;
    IDEmpresa: number;
    nome: string;
    medida: string;
    posologia: string;
    created_at?: string;
}

export const medicamentoService = {
    // Buscar lista de medicamentos sugeridos para a empresa
    async getMedicamentos(empresaId: number): Promise<MedicamentoSugestao[]> {
        try {
            const { data, error } = await supabase
                .from('medicamentos')
                .select('*')
                .eq('IDEmpresa', empresaId)
                .order('nome', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar medicamentos sugeridos:', error);
            return [];
        }
    },

    // Adicionar um novo medicamento as sugestões (útil para quando você for criar a tela de Configurações)
    async createMedicamento(medicamento: MedicamentoSugestao): Promise<MedicamentoSugestao> {
        try {
            const { data, error } = await supabase
                .from('medicamentos')
                .insert([medicamento])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar medicamento:', error);
            throw error;
        }
    },
    
    // Atualizar sugestão
    async updateMedicamento(id: string, empresaId: number, atualizacao: Partial<MedicamentoSugestao>): Promise<MedicamentoSugestao> {
        try {
            const { data, error } = await supabase
                .from('medicamentos')
                .update(atualizacao)
                .eq('id', id)
                .eq('IDEmpresa', empresaId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao atualizar medicamento:', error);
            throw error;
        }
    },

    // Excluir sugestão
    async deleteMedicamento(id: string, empresaId: number): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('medicamentos')
                .delete()
                .eq('id', id)
                .eq('IDEmpresa', empresaId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao excluir medicamento:', error);
            throw error;
        }
    }
};
