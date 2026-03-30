import { supabase } from '../lib/supabase';

export interface ArquivoPaciente {
    id?: string;
    IDEmpresa: number;
    patient_id: number;
    nome_arquivo: string;
    tipo_arquivo: string;
    storage_path: string;
    url_publica: string;
    tamanho_bytes: number;
    created_at?: string;
}

const BUCKET_NAME = 'patient-files';

export const arquivoService = {

    /**
     * Faz upload de um arquivo para o Supabase Storage e salva metadados na tabela patient_files.
     */
    async uploadArquivo(
        empresaId: number,
        patientId: number,
        file: File
    ): Promise<ArquivoPaciente> {
        // Gera um caminho único: empresaId/patientId/timestamp_nome
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${empresaId}/${patientId}/${timestamp}_${safeFileName}`;

        // Upload para o Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) throw uploadError;

        // Gera URL pública
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        const urlPublica = urlData.publicUrl;

        // Salva metadados na tabela
        const arquivo: Omit<ArquivoPaciente, 'id' | 'created_at'> = {
            IDEmpresa: empresaId,
            patient_id: patientId,
            nome_arquivo: file.name,
            tipo_arquivo: file.type || 'application/octet-stream',
            storage_path: storagePath,
            url_publica: urlPublica,
            tamanho_bytes: file.size,
        };

        const { data, error: dbError } = await supabase
            .from('patient_files')
            .insert([arquivo])
            .select()
            .single();

        if (dbError) throw dbError;
        return data as ArquivoPaciente;
    },

    /**
     * Busca todos os arquivos de um paciente.
     */
    async getArquivosByPatient(
        empresaId: number,
        patientId: number
    ): Promise<ArquivoPaciente[]> {
        const { data, error } = await supabase
            .from('patient_files')
            .select('*')
            .eq('IDEmpresa', empresaId)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) {
            // Ignora se a tabela ainda não existir
            if ((error as any)?.code === '42P01') return [];
            throw error;
        }
        return data || [];
    },

    /**
     * Deleta um arquivo do Storage e do banco.
     */
    async deleteArquivo(arquivo: ArquivoPaciente): Promise<void> {
        // Remove do Storage
        const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([arquivo.storage_path]);

        if (storageError) throw storageError;

        // Remove do banco
        const { error: dbError } = await supabase
            .from('patient_files')
            .delete()
            .eq('id', arquivo.id);

        if (dbError) throw dbError;
    },
};
