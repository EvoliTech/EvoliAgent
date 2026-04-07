import { supabase } from '../lib/supabase';

export interface Despesa {
  id?: string;
  empresa_id: number;
  titulo: string;
  categoria: string;
  data_vencimento: string;
  valor: number;
  is_recorrente: boolean;
  periodo_recorrencia?: string;
  duracao_meses?: number;
  grupo_recorrente?: string;
  is_paga: boolean;
  data_pagamento?: string;
  forma_pagamento?: string;
  observacoes?: string;
  anexo_url?: string;
  created_at?: string;
}

const BUCKET_NAME = 'patient-files';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function calcOccurrences(periodo: string, duracaoMeses: number): number {
  switch (periodo) {
    case 'semanalmente': return Math.round(duracaoMeses * 4.33);    // ~4.33 weeks per month
    case 'quinzenalmente': return duracaoMeses * 2;
    case 'mensalmente': return duracaoMeses;
    case 'trimestralmente': return Math.max(1, Math.floor(duracaoMeses / 3));
    default: return duracaoMeses;
  }
}

function addInterval(date: Date, periodo: string): Date {
  const next = new Date(date);
  switch (periodo) {
    case 'semanalmente': next.setDate(next.getDate() + 7); break;
    case 'quinzenalmente': next.setDate(next.getDate() + 14); break;
    case 'mensalmente': next.setMonth(next.getMonth() + 1); break;
    case 'trimestralmente': next.setMonth(next.getMonth() + 3); break;
  }
  return next;
}

export const expenseService = {
  async fetchExpenses(empresaId: number | string): Promise<Despesa[]> {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true });

    if (error) {
       if ((error as any)?.code === '42P01') return [];
       console.error('Error fetching expenses:', error);
       throw error;
    }
    return data || [];
  },

  async createExpense(despesa: Despesa, file?: File | null): Promise<Despesa[]> {
    let anexo_url = '';

    if (file) {
       const timestamp = Date.now();
       const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
       const storagePath = `expenses/${despesa.empresa_id}/${timestamp}_${safeFileName}`;
       
       const { error: uploadError } = await supabase.storage
           .from(BUCKET_NAME)
           .upload(storagePath, file, { cacheControl: '3600', upsert: false });

       if (!uploadError) {
          const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
          anexo_url = data.publicUrl;
          despesa.anexo_url = anexo_url;
       }
    }

    const expensesToInsert: Despesa[] = [];

    if (despesa.is_recorrente && despesa.periodo_recorrencia && despesa.duracao_meses) {
       const grupoId = generateUUID();
       const totalOccurrences = calcOccurrences(despesa.periodo_recorrencia, despesa.duracao_meses);
       let currentDate = new Date(despesa.data_vencimento + 'T12:00:00');

       for (let i = 0; i < totalOccurrences; i++) {
          expensesToInsert.push({
             ...despesa,
             data_vencimento: currentDate.toISOString().split('T')[0],
             grupo_recorrente: grupoId,
             is_paga: i === 0 ? despesa.is_paga : false,
             data_pagamento: i === 0 ? despesa.data_pagamento : undefined,
             forma_pagamento: i === 0 ? despesa.forma_pagamento : undefined,
             anexo_url: i === 0 ? despesa.anexo_url : undefined,
          });
          currentDate = addInterval(currentDate, despesa.periodo_recorrencia);
       }
    } else {
       expensesToInsert.push(despesa);
    }

    const { data, error } = await supabase
        .from('despesas')
        .insert(expensesToInsert)
        .select();
        
    if (error) {
       console.error("Error saving expense:", error);
       return expensesToInsert.map((d, index) => ({ ...d, id: (Date.now() + index).toString() }));
    }

    return data as Despesa[];
  },

  async deleteExpense(id: string): Promise<boolean> {
    const { error } = await supabase.from('despesas').delete().eq('id', id);
    if (error) {
       console.error("Error deleting expense", error);
       return false;
    }
    return true;
  },

  async deleteExpenseGroup(grupoId: string): Promise<boolean> {
    const { error } = await supabase.from('despesas').delete().eq('grupo_recorrente', grupoId);
    if (error) {
       console.error("Error deleting expense group", error);
       return false;
    }
    return true;
  },

  async payExpense(id: string, formaPagamento: string = 'Dinheiro'): Promise<boolean> {
    const { error } = await supabase.from('despesas').update({
       is_paga: true,
       data_pagamento: new Date().toISOString().split('T')[0],
       forma_pagamento: formaPagamento
    }).eq('id', id);

    if (error) {
       console.error("Error paying expense", error);
       return false;
    }
    return true;
  }
};
