const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kagtmrubzgpgnfkornen.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZ3RtcnViemdwZ25ma29ybmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTA3NTEsImV4cCI6MjA4MDg2Njc1MX0.MSTURkNUF9Z0hG1VkMvOabOQzBWJnlwDbAe5-oBBC38'
);

async function testInsert() {
  const { data, error } = await supabase.from('orcamento_itens').insert([
    {
      id: 'test_123',
      orcamento_id: '1a7f0103-8baa-4a18-9c9b-c7fdd2af2511', // UUID do log do usuario
      treatment_name: 'Teste',
      valor: 150
    }
  ]).select();

  if (error) {
    console.error('INSERT ERROR:', error);
  } else {
    console.log('INSERT SUCCESS:', data);
  }
}

testInsert();
