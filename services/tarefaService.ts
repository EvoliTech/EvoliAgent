import { supabase } from '../lib/supabase';

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  prazo?: string;   // ISO date string YYYY-MM-DD or empty
  lista: string;
  paciente_id: number;
  paciente_nome: string;
  empresa_id: number;
  concluida: boolean;
  created_at: string;
}

export const tarefaService = {
  async fetch(empresaId: number, pacienteId: number): Promise<Tarefa[]> {
    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar tarefas:', error);
      return [];
    }
    return (data || []) as Tarefa[];
  },

  async create(
    empresaId: number,
    pacienteId: number,
    pacienteNome: string,
    dados: Pick<Tarefa, 'titulo' | 'descricao' | 'prazo' | 'lista'>
  ): Promise<Tarefa | null> {
    const { data, error } = await supabase
      .from('tarefas')
      .insert({
        empresa_id: empresaId,
        paciente_id: pacienteId,
        paciente_nome: pacienteNome,
        titulo: dados.titulo,
        descricao: dados.descricao || null,
        prazo: dados.prazo || null,
        lista: dados.lista,
        concluida: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar tarefa:', error);
      return null;
    }
    return data as Tarefa;
  },

  async toggle(tarefaId: string, concluida: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('tarefas')
      .update({ concluida })
      .eq('id', tarefaId);

    if (error) {
      console.error('Erro ao atualizar tarefa:', error);
      return false;
    }
    return true;
  },

  async delete(tarefaId: string): Promise<boolean> {
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', tarefaId);

    if (error) {
      console.error('Erro ao excluir tarefa:', error);
      return false;
    }
    return true;
  },
};
