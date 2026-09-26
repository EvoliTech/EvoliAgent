const fs = require('fs');

const path = 'c:\\Users\\User\\Documents\\App gestão\\clínicasync---gestão-médica\\EvoliAgent\\components\\PatientDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace n8nPayload with stripePayload
content = content.replace(
    /const n8nPayload = \{[\s\S]*?description: descriptionText\s*\};/,
    `const stripePayload = {
                               empresa_id: empresaId,
                               paciente_id: patient.id,
                               tratamento_id: treatmentIds,
                               valor: p.amount,
                               vencimento: p.date || p.receiveDate || new Date().toISOString().split('T')[0],
                               externalReference: createdReceitaIds[0],
                               name: patient.name,
                               cpf: patient.cpf,
                               email: patient.email || '',
                               phone: patient.phone,
                               description: descriptionText
                           };`
);

// Replace fetch block
content = content.replace(
    /const controller = new AbortController\(\);\s*\/\/ Aumentando o timeout[\s\S]*?if \(n8nData\.link_boleto\) \{\s*boletosLinks\.push\(n8nData\.link_boleto\);\s*\}\s*\}/,
    `const controller = new AbortController();
                           const timeoutId = setTimeout(() => controller.abort(), 10000); 
                           
                           let stripeData: any = null;
                           try {
                               const { data, error } = await supabase.functions.invoke('stripe-create-boleto', {
                                   body: stripePayload,
                                   signal: controller.signal
                               });
                               
                               if (error) throw error;
                               if (data?.success) {
                                   stripeData = data;
                               }
                           } catch (fetchErr: any) {
                               console.error("Erro ao chamar Edge Function do Stripe:", fetchErr.message);
                           } finally {
                               clearTimeout(timeoutId);
                           }
                           
                           if (!stripeData) {
                               alert("Ocorreu um erro ao gerar o boleto com a Stripe. Tente novamente ou verifique as faturas geradas na aba de orçamentos.");
                           } else {
                               for (const rid of createdReceitaIds) {
                                   await supabase.from('receitas').update({
                                       stripe_payment_intent_id: stripeData.stripe_payment_intent_id,
                                       stripe_customer_id: stripeData.customer_id,
                                       stripe_status: 'PENDING',
                                       status_asaas: 'PENDING',
                                       link_boleto: stripeData.link_boleto,
                                       linha_digitavel: stripeData.linha_digitavel
                                   }).eq('id', rid);
                               }
                               
                               paymentsArray[i] = {
                                   ...paymentsArray[i],
                                   stripe_payment_intent_id: stripeData.stripe_payment_intent_id,
                                   stripe_status: 'PENDING',
                                   status_asaas: 'PENDING',
                                   link_boleto: stripeData.link_boleto,
                                   linha_digitavel: stripeData.linha_digitavel
                               };

                               if (stripeData.link_boleto) {
                                   boletosLinks.push(stripeData.link_boleto);
                               }
                           }`
);

fs.writeFileSync(path, content, 'utf8');
console.log("Updated PatientDetails.tsx");
