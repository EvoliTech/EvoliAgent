import { supabase } from '../lib/supabase';

export interface Evolucao {
  id?: string;
  empresa_id: number;
  paciente_id: number;
  orcamento_id: string; // The parent budget ID
  tratamento_id: string; // The string ID from the treatment inside the budget
  tratamento_nome: string; // Stored to prevent needing to fetch budget just for the name
  dente: string;
  faces: string;
  orcamento_numero: string;
  texto: string;
  data_evolucao: string;
  profissional: string;
  created_at?: string;
}

export const evolutionService = {
  async fetchEvolutions(empresaId: number, pacienteId: number): Promise<Evolucao[]> {
    const { data, error } = await supabase
      .from('evolucoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evolutions:', error);
      return [];
    }

    return data as Evolucao[];
  },

  async saveEvolution(evolution: Evolucao): Promise<Evolucao | null> {
    const { data, error } = await supabase
      .from('evolucoes')
      .insert({
        empresa_id: evolution.empresa_id,
        paciente_id: evolution.paciente_id,
        orcamento_id: evolution.orcamento_id,
        tratamento_id: evolution.tratamento_id,
        tratamento_nome: evolution.tratamento_nome,
        dente: evolution.dente,
        faces: evolution.faces,
        orcamento_numero: evolution.orcamento_numero,
        texto: evolution.texto,
        data_evolucao: evolution.data_evolucao,
        profissional: evolution.profissional
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting evolution:', error);
      return null;
    }
    return data as Evolucao;
  },

  async deleteEvolution(evolutionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('evolucoes')
      .delete()
      .eq('id', evolutionId);
    
    return !error;
  }
};
