import { supabase } from '../lib/supabase';

export interface Budget {
  id: string; // React generates UUID or string
  numero?: number;
  name: string;
  date: string;
  created_at?: string;
  total: number;
  status: 'Pendente' | 'Aguardando' | 'Aprovado';
  treatments: any[];
}

export const budgetService = {
  async fetchBudgets(empresaId: number, pacienteId: number): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*, orcamento_itens(*)')
      .eq('empresa_id', empresaId)
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching budgets:', error);
      return [];
    }

    return data.map(dbBudget => this.mapToBudget(dbBudget));
  },
  async fetchAllCompanyBudgets(empresaId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`
        *,
        orcamento_itens(*),
        paciente:Cliente (
          id, nome, nome_completo, cpf
        )
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching company budgets:', error);
      return [];
    }
    return data.map(dbBudget => {
      const budget = this.mapToBudget(dbBudget);
      return { ...dbBudget, treatments: budget.treatments };
    });
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

    let savedBudget: any = null;

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
      savedBudget = data;
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
      savedBudget = data;
    }

    // Deletar itens antigos antes de inserir os novos para evitar duplicidade
    await supabase.from('orcamento_itens').delete().eq('orcamento_id', savedBudget.id);

    // Inserir os novos itens
    if (budget.treatments && budget.treatments.length > 0) {
      const itemsPayload = budget.treatments.map(t => ({
        id: t.id || Math.random().toString(36).substr(2, 9),
        orcamento_id: savedBudget.id,
        treatment_name: t.treatmentName || t.tratamento,
        categoria: t.categoria || null,
        valor: t.valor ? Number(t.valor) : 0,
        dente: t.dente ? String(t.dente) : null,
        faces: t.faces || null,
        profissional: t.profissional || null,
        convenio: t.convenio || null,
        status: t.status || 'Aguardando',
        observacoes: t.observacoes || null
      }));

      const { data: insertedItems, error: insertError } = await supabase.from('orcamento_itens').insert(itemsPayload).select();
      if (insertError) {
        console.error('Error inserting budget items:', insertError);
        savedBudget.orcamento_itens = itemsPayload;
      } else {
        savedBudget.orcamento_itens = insertedItems;
      }
    }

    return this.mapToBudget(savedBudget);
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
    let treatments = dbBudget.tratamentos || [];
    
    if (dbBudget.orcamento_itens && Array.isArray(dbBudget.orcamento_itens) && dbBudget.orcamento_itens.length > 0) {
      treatments = dbBudget.orcamento_itens.map((item: any) => ({
        id: item.id,
        treatmentName: item.treatment_name,
        categoria: item.categoria,
        valor: item.valor,
        dente: item.dente,
        faces: item.faces,
        profissional: item.profissional,
        convenio: item.convenio,
        status: item.status,
        observacoes: item.observacoes
      }));
    }

    return {
      id: dbBudget.id,
      numero: dbBudget.numero,
      name: dbBudget.nome,
      date: dbBudget.data_orcamento,
      created_at: dbBudget.created_at,
      total: Number(dbBudget.total),
      status: dbBudget.status,
      treatments: treatments
    };
  }
};
