import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const budgetId = '4d2e0474-302b-4161-a098-6cdcdb0da083'; // From user's screenshot
  const { data, error } = await supabase
    .from('orcamentos')
    .select(`
      *,
      orcamento_itens(*, orcamento_item_pagamentos(*)),
      paciente:Cliente (
        id, nome, nome_completo, cpf, celular, telefone
      ),
      empresa:Empresa (
        id, nome, cnpj, telefone, endereco, logo_url
      )
    `)
    .eq('id', budgetId)
    .single();

  console.log("Error:", error);
  console.log("Data:", data ? "Found" : "Not Found");
}

test();
