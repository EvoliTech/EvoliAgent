import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const payload = {
        IDEmpresa: 1, // just a test
        service: 'test_upsert',
        client_id: 'sub_users',
        client_secret: '{}',
        is_active: true
    };
    const { data, error } = await supabase.from('integrations_config').upsert(payload);
    console.log('Upsert without onConflict error:', error);
}

run();
