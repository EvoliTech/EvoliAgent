import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export interface DocumentoData {
    id?: string;
    IDEmpresa: number;
    patient_id: number;
    tipo: string;
    conteudo: any;
    created_at?: string;
}

export const documentoService = {
    // Buscar documentos de um paciente
    async getDocumentosByPatient(empresaId: number, patientId: number): Promise<DocumentoData[]> {
        try {
            const { data, error } = await supabase
                .from('documentos')
                .select('*')
                .eq('IDEmpresa', empresaId)
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar documentos:', error);
            // Ignore if table still doesn't exist
            if ((error as PostgrestError)?.code === '42P01') {
                 return [];
            }
            throw error;
        }
    },

    // Salvar ou atualizar um documento
    async saveDocumento(documento: DocumentoData): Promise<DocumentoData> {
        try {
            const payload = { ...documento };
            delete payload.id; // avoid passing id if it's undefined
            delete payload.created_at; // let DB handle defaults if new

            if (documento.id) {
                // Atualizar
                const { data, error } = await supabase
                    .from('documentos')
                    .update({ conteudo: payload.conteudo })
                    .eq('id', documento.id)
                    .eq('IDEmpresa', documento.IDEmpresa)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Criar
                const { data, error } = await supabase
                    .from('documentos')
                    .insert([payload])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        } catch (error) {
            console.error('Erro ao salvar documento:', error);
            throw error;
        }
    },

    // Excluir um documento
    async deleteDocumento(empresaId: number, id: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('documentos')
                .delete()
                .eq('id', id)
                .eq('IDEmpresa', empresaId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao excluir documento:', error);
            throw error;
        }
    }
};
