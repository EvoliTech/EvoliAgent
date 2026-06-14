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
      .select('*, orcamento_itens(*, orcamento_item_pagamentos(*))')
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
        orcamento_itens(*, orcamento_item_pagamentos(*)),
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
      status: budget.status
    };

    // Verificamos se o ID indica um orçamento recém-criado na interface que ainda não foi salvo no banco
    const isNew = String(budget.id).startsWith('new_');

    let savedBudget: any = null;

    if (!isNew) {
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
        observacoes: t.observacoes || null,
        payment_status: t.paymentStatus || null,
        payment_cancellation_reason: t.paymentCancellationReason || null
      }));

      const { data: insertedItems, error: insertError } = await supabase.from('orcamento_itens').insert(itemsPayload).select();
      
      // Separar e salvar os pagamentos na terceira tabela
      const paymentsPayload: any[] = [];
      budget.treatments.forEach((t: any, index: number) => {
        const itemId = itemsPayload[index].id;
        if (t.payments && Array.isArray(t.payments)) {
          t.payments.forEach((p: any) => {
            paymentsPayload.push({
              orcamento_item_id: itemId,
              date: p.date,
              amount: p.amount ? Number(p.amount) : 0,
              method: p.method || null,
              installments: p.installments ? Number(p.installments) : 1,
              observations: p.observations || null
            });
          });
        }
      });

      if (paymentsPayload.length > 0) {
        const { error: paymentError } = await supabase.from('orcamento_item_pagamentos').insert(paymentsPayload);
        if (paymentError) {
          console.error('Erro ao inserir pagamentos na terceira tabela:', paymentError);
          alert('Atenção: Ocorreu um erro ao salvar os pagamentos no banco de dados. Veja o console.');
        }
      }
      
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
    let treatments: any[] = [];
    
    if (dbBudget.orcamento_itens && Array.isArray(dbBudget.orcamento_itens) && dbBudget.orcamento_itens.length > 0) {
      treatments = dbBudget.orcamento_itens.map((item: any) => {
        // Fallback para ler do jsonb antigo caso o item ainda não tenha sido migrado no banco
        const jsonTreatment = (dbBudget.tratamentos || []).find((t: any) => t.id === item.id) || {};
        return {
          id: item.id,
          treatmentName: item.treatment_name,
          categoria: item.categoria,
          valor: item.valor,
          dente: item.dente,
          faces: item.faces,
          profissional: item.profissional,
          convenio: item.convenio,
          status: item.status,
          observacoes: item.observacoes,
          payments: item.orcamento_item_pagamentos || item.payments || jsonTreatment.payments || [],
          paymentStatus: item.payment_status || item.paymentStatus || jsonTreatment.paymentStatus || null,
          paymentCancellationReason: item.payment_cancellation_reason || item.paymentCancellationReason || jsonTreatment.paymentCancellationReason || null
        };
      });
    } else if (dbBudget.tratamentos && Array.isArray(dbBudget.tratamentos)) {
      // Fallback para caso existam orçamentos antigos que não tenham orcamento_itens
      treatments = dbBudget.tratamentos;
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
