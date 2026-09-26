import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data: d1, error: e1 } = await supabase.from('empresas').select('id').limit(1);
  console.log("empresas:", e1 ? e1.message : "Exists");

  const { data: d2, error: e2 } = await supabase.from('Empresa').select('id').limit(1);
  console.log("Empresa:", e2 ? e2.message : "Exists");
  
  const { data: d3, error: e3 } = await supabase.from('Empresas').select('id').limit(1);
  console.log("Empresas:", e3 ? e3.message : "Exists");
}

checkTable();
