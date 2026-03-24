import { supabase } from '../lib/supabase';

export interface Budget {
  id: string; // React generates UUID or string
  numero?: number;
  name: string;
  date: string;
  total: number;
  status: 'Pendente' | 'Aguardando' | 'Aprovado';
  treatments: any[];
}

export const budgetService = {
  async fetchBudgets(empresaId: number, pacienteId: number): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching budgets:', error);
      return [];
    }

    return data.map(dbBudget => ({
      id: dbBudget.id,
      numero: dbBudget.numero,
      name: dbBudget.nome,
      date: dbBudget.data_orcamento,
      total: Number(dbBudget.total),
      status: dbBudget.status as 'Pendente' | 'Aguardando' | 'Aprovado',
      treatments: dbBudget.tratamentos || []
    }));
  },

  async saveBudget(empresaId: number, pacienteId: number, budget: Budget): Promise<Budget | null> {
    const payload = {
      empresa_id: empresaId,
      paciente_id: pacienteId,
      nome: budget.name,
      data_orcamento: budget.date,
      total: budget.total,
      status: budget.status,
      tratamentos: budget.treatments
    };

    // If ID is a purely numeric short random id (from frontend), we should omit it and let Supabase generate UUID
    // Or if we want to enforce updates, we need to check if it's a valid UUID.
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(budget.id);

    if (isUUID) {
      // Update
      const { data, error } = await supabase
        .from('orcamentos')
        .update(payload)
        .eq('id', budget.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating budget:', error);
        return null;
      }
      return this.mapToBudget(data);
    } else {
      // Create
      const { data, error } = await supabase
        .from('orcamentos')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error inserting budget:', error);
        return null;
      }
      return this.mapToBudget(data);
    }
  },

  async deleteBudget(budgetId: string): Promise<boolean> {
    const { error } = await supabase
      .from('orcamentos')
      .delete()
      .eq('id', budgetId);
    
    return !error;
  },

  // Odontogram sync
  async saveOdontogram(pacienteId: number, procedures: any): Promise<void> {
    const { error } = await supabase
      .from('Cliente')
      .update({ odontograma: procedures })
      .eq('id', pacienteId);
    
    if (error) console.error('Error saving odontogram:', error);
  },

  async fetchOdontogram(pacienteId: number): Promise<any> {
    const { data, error } = await supabase
      .from('Cliente')
      .select('odontograma')
      .eq('id', pacienteId)
      .single();
    
    if (error) return {};
    return data?.odontograma || {};
  },

  mapToBudget(dbBudget: any): Budget {
    return {
      id: dbBudget.id,
      numero: dbBudget.numero,
      name: dbBudget.nome,
      date: dbBudget.data_orcamento,
      total: Number(dbBudget.total),
      status: dbBudget.status,
      treatments: dbBudget.tratamentos || []
    };
  }
};
