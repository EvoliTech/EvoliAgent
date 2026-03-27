import { supabase } from '../lib/supabase';

export interface Anamnese {
   id: string;
   IDEmpresa: number;
   patient_id: number;
   respostas: Record<string, any>;
   created_at: string;
   updated_at: string;
}

export const anamneseService = {
   async fetchAnamnese(empresaId: number, patientId: number): Promise<Anamnese | null> {
      try {
          const { data, error } = await supabase
             .from('anamneses')
             .select('*')
             .eq('IDEmpresa', empresaId)
             .eq('patient_id', patientId)
             .order('created_at', { ascending: false })
             .limit(1)
             .maybeSingle();
             
          if (error && error.code !== 'PGRST116') {
             console.error('Error fetching anamnese:', error);
             return null;
          }
          return data;
      } catch (err) {
          return null;
      }
   },

   async saveAnamnese(empresaId: number, patientId: number, respostas: Record<string, any>): Promise<Anamnese | null> {
      try {
          const existing = await this.fetchAnamnese(empresaId, patientId);
          if (existing) {
              const { data, error } = await supabase
                 .from('anamneses')
                 .update({ respostas, updated_at: new Date().toISOString() })
                 .eq('id', existing.id)
                 .select()
                 .single();
                 
              if (error) throw error;
              return data;
          } else {
              const { data, error } = await supabase
                 .from('anamneses')
                 .insert({
                    IDEmpresa: empresaId,
                    patient_id: patientId,
                    respostas
                 })
                 .select()
                 .single();
                 
              if (error) throw error;
              return data;
          }
      } catch (err) {
          console.error('Error saving anamnese:', err);
          return null;
      }
   }
};
