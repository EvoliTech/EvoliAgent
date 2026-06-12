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
  comprovante_url?: string;
  nota_fiscal_url?: string;
  boleto_url?: string;
  tipo?: 'despesa' | 'receita';
  created_at?: string;
}

export interface ExpenseFiles {
  boletos?: File[];
  notaFiscal?: File | null;
  comprovante?: File | null;
}

const BUCKET_NAME = 'financial-files';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function calcOccurrences(periodo: string, duracaoMeses: number): number {
  switch (periodo) {
    case 'semanalmente': return Math.round(duracaoMeses * 4.33);
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

async function uploadFile(file: File, empresaId: number, prefix: string): Promise<string> {
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `expenses/${empresaId}/${prefix}_${timestamp}_${safeFileName}`;
  
  const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, { cacheControl: '3600', upsert: false });

  if (!uploadError) {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return data.publicUrl;
  }
  console.error('Upload Error to bucket', BUCKET_NAME, ':', uploadError);
  alert(`Erro ao fazer upload do anexo: ${uploadError?.message || JSON.stringify(uploadError)}`);
  return '';
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

  async createExpense(despesa: Despesa, files?: ExpenseFiles): Promise<Despesa[]> {
    let nfUrl = '';
    let compUrl = '';
    let boletosUrls: string[] = [];

    if (files?.notaFiscal) {
       nfUrl = await uploadFile(files.notaFiscal, despesa.empresa_id, 'nf');
       despesa.nota_fiscal_url = nfUrl;
    }
    
    if (files?.comprovante) {
       compUrl = await uploadFile(files.comprovante, despesa.empresa_id, 'comp');
       despesa.comprovante_url = compUrl;
    }

    if (files?.boletos && files.boletos.length > 0) {
       for (const b of files.boletos) {
          const url = await uploadFile(b, despesa.empresa_id, 'bol');
          if (url) boletosUrls.push(url);
       }
       if (boletosUrls.length === 1 && !despesa.is_recorrente) {
          despesa.boleto_url = boletosUrls[0];
       }
    }

    const cleanDespesa = { ...despesa };
    delete cleanDespesa.tipo;
    delete cleanDespesa.comprovante_url;
    delete cleanDespesa.nota_fiscal_url;
    delete cleanDespesa.boleto_url;

    const expensesToInsert: Despesa[] = [];

    if (cleanDespesa.is_recorrente && cleanDespesa.periodo_recorrencia && cleanDespesa.duracao_meses) {
       const grupoId = generateUUID();
       const totalOccurrences = calcOccurrences(cleanDespesa.periodo_recorrencia, cleanDespesa.duracao_meses);
       let currentDate = new Date(cleanDespesa.data_vencimento + 'T12:00:00');

       for (let i = 0; i < totalOccurrences; i++) {
          // Lógica de distribuição dos boletos
          let parcelBoletoUrl = undefined;
          if (boletosUrls.length === 1) {
            parcelBoletoUrl = boletosUrls[0]; // Replicado para todas
          } else if (boletosUrls.length > 1 && i < boletosUrls.length) {
            parcelBoletoUrl = boletosUrls[i]; // Distribuído individualmente
          }

          expensesToInsert.push({
             ...cleanDespesa,
             data_vencimento: currentDate.toISOString().split('T')[0],
             grupo_recorrente: grupoId,
             is_paga: i === 0 ? cleanDespesa.is_paga : false,
             data_pagamento: i === 0 ? cleanDespesa.data_pagamento : undefined,
             forma_pagamento: i === 0 ? cleanDespesa.forma_pagamento : undefined,
             anexo_url: compUrl || nfUrl || parcelBoletoUrl || cleanDespesa.anexo_url
          });
          currentDate = addInterval(currentDate, cleanDespesa.periodo_recorrencia);
       }
    } else {
       expensesToInsert.push({
         ...cleanDespesa,
         anexo_url: compUrl || nfUrl || (boletosUrls.length > 0 ? boletosUrls[0] : undefined) || cleanDespesa.anexo_url
       });
    }

    const { data, error } = await supabase
        .from('despesas')
        .insert(expensesToInsert)
        .select();
        
    if (error) {
       console.error("Error saving expense:", error);
       throw error;
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

  async updateExpense(id: string, updates: Partial<Despesa>, files?: ExpenseFiles): Promise<boolean> {
    if (updates.empresa_id) {
       if (files?.notaFiscal) {
          updates.anexo_url = await uploadFile(files.notaFiscal, updates.empresa_id, 'nf');
       }
       if (files?.comprovante) {
          updates.anexo_url = await uploadFile(files.comprovante, updates.empresa_id, 'comp');
       }
       if (files?.boletos && files.boletos.length > 0) {
          updates.anexo_url = await uploadFile(files.boletos[0], updates.empresa_id, 'bol');
       }
    }

    const cleanUpdates = { ...updates };
    delete cleanUpdates.tipo;
    delete cleanUpdates.comprovante_url;
    delete cleanUpdates.nota_fiscal_url;
    delete cleanUpdates.boleto_url;

    const { error } = await supabase.from('despesas').update(cleanUpdates).eq('id', id);
    if (error) {
       console.error("Error updating expense", error);
       throw error;
    }

    // Se tiver um grupo recorrente e a url de anexo mudou
    if (cleanUpdates.grupo_recorrente && cleanUpdates.anexo_url) {
      const groupUpdates: any = {};
      groupUpdates.anexo_url = cleanUpdates.anexo_url;
      await supabase.from('despesas').update(groupUpdates).eq('grupo_recorrente', cleanUpdates.grupo_recorrente);
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
