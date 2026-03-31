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
   async fetchAnamneses(empresaId: number, patientId: number): Promise<Anamnese[]> {
      try {
          const { data, error } = await supabase
             .from('anamneses')
             .select('*')
             .eq('IDEmpresa', empresaId)
             .eq('patient_id', patientId)
             .order('created_at', { ascending: false });
             
          if (error && error.code !== 'PGRST116') {
             console.error('Error fetching anamnese:', error);
             return [];
          }
          return data || [];
      } catch (err) {
          return null;
      }
   },

   async saveAnamnese(empresaId: number, patientId: number, respostas: Record<string, any>): Promise<Anamnese | null> {
      try {
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
      } catch (err) {
          console.error('Error saving anamnese:', err);
          return null;
      }
   },
   
   async updateAnamnese(empresaId: number, id: string, respostas: Record<string, any>): Promise<Anamnese | null> {
      try {
          const { data, error } = await supabase
             .from('anamneses')
             .update({ respostas, updated_at: new Date().toISOString() })
             .eq('id', id)
             .eq('IDEmpresa', empresaId)
             .select()
             .single();
             
          if (error) throw error;
          return data;
      } catch (err) {
          console.error('Error updating anamnese:', err);
          return null;
      }
   },
   
   async deleteAnamnese(empresaId: number, id: string): Promise<boolean> {
      try {
          const { error } = await supabase
             .from('anamneses')
             .delete()
             .eq('id', id)
             .eq('IDEmpresa', empresaId);
             
          if (error) throw error;
          return true;
      } catch (err) {
          console.error('Error deleting anamnese:', err);
          return false;
      }
   }
};
