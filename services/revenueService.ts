import { supabase } from '../lib/supabase';

export interface Receita {
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
  tipo?: 'Receita' | 'receita';
  created_at?: string;
}

export interface revenueFiles {
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
  const storagePath = `revenues/${empresaId}/${prefix}_${timestamp}_${safeFileName}`;
  
  const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, { cacheControl: '3600', upsert: false });

  if (!uploadError) {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return data.publicUrl;
  }
  return '';
}

export const revenueService = {
  async fetchRevenues(empresaId: number | string): Promise<Receita[]> {
    const { data, error } = await supabase
      .from('receitas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true });

    if (error) {
       if ((error as any)?.code === '42P01') return [];
       console.error('Error fetching revenues:', error);
       throw error;
    }
    return data || [];
  },

  async createRevenue(Receita: Receita, files?: revenueFiles): Promise<Receita[]> {
    let nfUrl = '';
    let compUrl = '';
    let boletosUrls: string[] = [];

    if (files?.notaFiscal) {
       nfUrl = await uploadFile(files.notaFiscal, Receita.empresa_id, 'nf');
       Receita.nota_fiscal_url = nfUrl;
    }
    
    if (files?.comprovante) {
       compUrl = await uploadFile(files.comprovante, Receita.empresa_id, 'comp');
       Receita.comprovante_url = compUrl;
    }

    if (files?.boletos && files.boletos.length > 0) {
       for (const b of files.boletos) {
          const url = await uploadFile(b, Receita.empresa_id, 'bol');
          if (url) boletosUrls.push(url);
       }
       if (boletosUrls.length === 1 && !Receita.is_recorrente) {
          Receita.boleto_url = boletosUrls[0];
       }
    }

    const revenuesToInsert: Receita[] = [];

    if (Receita.is_recorrente && Receita.periodo_recorrencia && Receita.duracao_meses) {
       const grupoId = generateUUID();
       const totalOccurrences = calcOccurrences(Receita.periodo_recorrencia, Receita.duracao_meses);
       let currentDate = new Date(Receita.data_vencimento + 'T12:00:00');

       for (let i = 0; i < totalOccurrences; i++) {
          // Lógica de distribuição dos boletos
          let parcelBoletoUrl = undefined;
          if (boletosUrls.length === 1) {
            parcelBoletoUrl = boletosUrls[0]; // Replicado para todas
          } else if (boletosUrls.length > 1 && i < boletosUrls.length) {
            parcelBoletoUrl = boletosUrls[i]; // Distribuído individualmente
          }

          revenuesToInsert.push({
             ...Receita,
             data_vencimento: currentDate.toISOString().split('T')[0],
             grupo_recorrente: grupoId,
             is_paga: i === 0 ? Receita.is_paga : false,
             data_pagamento: i === 0 ? Receita.data_pagamento : undefined,
             forma_pagamento: i === 0 ? Receita.forma_pagamento : undefined,
             comprovante_url: compUrl || undefined, // Shared on all rows to act as "Parent" file
             nota_fiscal_url: nfUrl || undefined,   // Shared
             boleto_url: parcelBoletoUrl,
             // Remove anexo_url to favor new fields, but keep it if somehow legacy
          });
          currentDate = addInterval(currentDate, Receita.periodo_recorrencia);
       }
    } else {
       revenuesToInsert.push({
         ...Receita,
         boleto_url: boletosUrls.length > 0 ? boletosUrls[0] : undefined
       });
    }

    const { data, error } = await supabase
        .from('receitas')
        .insert(revenuesToInsert)
        .select();
        
    if (error) {
       console.error("Error saving revenue:", error);
       return revenuesToInsert.map((d, index) => ({ ...d, id: (Date.now() + index).toString() }));
    }

    return data as Receita[];
  },

  async deleteRevenue(id: string): Promise<boolean> {
    const { error } = await supabase.from('receitas').delete().eq('id', id);
    if (error) {
       console.error("Error deleting revenue", error);
       return false;
    }
    return true;
  },

  async updateRevenue(id: string, updates: Partial<Receita>, files?: revenueFiles): Promise<boolean> {
    if (updates.empresa_id) {
       if (files?.notaFiscal) {
          updates.nota_fiscal_url = await uploadFile(files.notaFiscal, updates.empresa_id, 'nf');
       }
       if (files?.comprovante) {
          updates.comprovante_url = await uploadFile(files.comprovante, updates.empresa_id, 'comp');
       }
       if (files?.boletos && files.boletos.length > 0) {
          updates.boleto_url = await uploadFile(files.boletos[0], updates.empresa_id, 'bol');
       }
    }

    const { error } = await supabase.from('receitas').update(updates).eq('id', id);
    if (error) {
       console.error("Error updating revenue", error);
       return false;
    }

    // Se tiver um grupo recorrente e as urls de NF/Comprovante mudaram, atualizamos todas as parcelas "irmãs"
    if (updates.grupo_recorrente && (updates.nota_fiscal_url || updates.comprovante_url)) {
      const groupUpdates: any = {};
      if (updates.nota_fiscal_url) groupUpdates.nota_fiscal_url = updates.nota_fiscal_url;
      if (updates.comprovante_url) groupUpdates.comprovante_url = updates.comprovante_url;
      await supabase.from('receitas').update(groupUpdates).eq('grupo_recorrente', updates.grupo_recorrente);
    }

    return true;
  },

  async deleteRevenueGroup(grupoId: string): Promise<boolean> {
    const { error } = await supabase.from('receitas').delete().eq('grupo_recorrente', grupoId);
    if (error) {
       console.error("Error deleting revenue group", error);
       return false;
    }
    return true;
  },

  async payRevenue(id: string, formaPagamento: string = 'Dinheiro'): Promise<boolean> {
    const { error } = await supabase.from('receitas').update({
       is_paga: true,
       data_pagamento: new Date().toISOString().split('T')[0],
       forma_pagamento: formaPagamento
    }).eq('id', id);

    if (error) {
       console.error("Error paying revenue", error);
       return false;
    }
    return true;
  },

  async deleteRevenuesByTreatment(tratamentoId: string, onlyOpen: boolean = true): Promise<boolean> {
    let query = supabase.from('receitas').delete().eq('tratamento_id', tratamentoId);
    if (onlyOpen) {
       query = query.eq('is_paga', false);
    }
    const { error } = await query;
    if (error) {
       console.error("Error deleting revenues by treatment", error);
       return false;
    }
    return true;
  },

  async createRevenuesFromPayment(
    empresaId: number, 
    clienteId: number, 
    orcamentoId: string, 
    tratamentoId: string, 
    p: any, 
    maquininhas: any[],
    patientName: string,
    treatmentName: string
  ): Promise<{success: boolean, error?: string}> {
    const patientPaid = parseFloat(p.amount) || 0;
    let netReceived = p.planAmount !== undefined ? parseFloat(p.planAmount) : patientPaid;
    let dateFallback = p.receiveDate || p.date || p.createdAt || new Date().toISOString().split('T')[0];
    let dueDate = new Date((dateFallback.includes('T') ? dateFallback.split('T')[0] : dateFallback) + 'T12:00:00');
    let isPaga = true;
    
    // Lógica de Taxas e Parcelas (Maquininhas)
    const maq = maquininhas.find(m => m.id === p.maquininha_id);
    let installments = 1;
    
    if (p.method === 'Pix') {
        if (maq && maq.pix_fee) {
            const feeAmt = netReceived * (Number(maq.pix_fee) / 100);
            netReceived -= feeAmt;
        }
    } else if (p.method === 'Débito') {
        if (maq && maq.debito_fee) {
            const feeAmt = netReceived * (Number(maq.debito_fee) / 100);
            netReceived -= feeAmt;
        }
        if (maq && maq.debito_dias) {
            let dias = parseInt(maq.debito_dias || '0');
            if (isNaN(dias)) dias = 0;
            dueDate.setDate(dueDate.getDate() + dias);
            isPaga = dias === 0;
        }
    } else if (p.method === 'Crédito') {
        installments = p.installments || 1;
        let fee = 0;
        if (maq) {
            if (installments === 1 && maq.credito_fees && maq.credito_fees.length > 0) {
                 fee = Number(maq.credito_fees[0]);
            } else if (maq.credito_fees && maq.credito_fees.length >= installments) {
                 fee = Number(maq.credito_fees[installments - 1]);
            }
            const feeAmt = netReceived * (fee / 100);
            netReceived -= feeAmt;
            
            if (maq.credito_forma === 'Antecipado') {
                 let dias = parseInt(maq.credito_dias_uma_vez || '0');
                 if (isNaN(dias)) dias = 0;
                 dueDate = new Date();
                 dueDate.setDate(dueDate.getDate() + dias);
                 isPaga = dias === 0;
            }
        }
    } else if (p.method === 'Boleto') {
        installments = p.installments || 1;
        isPaga = p.status === 'Pago' || p.isPaid === true;
    }

    const isFuture = dueDate.getTime() > new Date().getTime() || (!isPaga && p.method === 'Boleto');
    
    let baseTitle = `${treatmentName} [${p.method}]`;
    if (typeof p.observations === 'string' && p.observations.includes('Parcela')) {
        const parcelaMatch = p.observations.match(/Parcela \d+\/\d+/);
        if (parcelaMatch) {
            baseTitle += ` (${parcelaMatch[0]})`;
        }
    }

    const { error } = await supabase.from('receitas').insert([{
        empresa_id: empresaId,
        cliente_id: clienteId,
        orcamento_id: orcamentoId,
        tratamento_id: tratamentoId,
        payment_id: p.id,
        titulo: baseTitle,
        categoria: patientName,
        data_vencimento: dueDate.toISOString().split('T')[0],
        valor: netReceived,
        is_recorrente: false,
        is_paga: !isFuture,
        data_pagamento: !isFuture ? dueDate.toISOString().split('T')[0] : undefined,
        forma_pagamento: p.method
    }]);

    if (error) {
       console.error("Error creating physical revenues from payment", error);
       return { success: false, error: error.message || JSON.stringify(error) };
    }
    return { success: true };
  }
};
