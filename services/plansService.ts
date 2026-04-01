import { HealthPlan, TreatmentItem } from '../types';
import { DEFAULT_TREATMENTS } from '../constants/treatments';
import { supabase } from '../lib/supabase';

export const TREATMENT_CATEGORIES = [
  'Todos',
  'Outros',
  'Urgência',
  'Cirurgia',
  'Prótese',
  'Prevenção',
  'Periodontia',
  'Ortodontia',
  'Implantodontia',
  'Endodontia',
  'Dentística',
  'Testes e exames laboratoriais',
  'Radiologia',
  'Odontopediatria',
  'Harmonização Orofacial'
];

export const plansService = {
  fetchPlans: async (empresaId: string | number): Promise<HealthPlan[]> => {
    try {
      const { data, error } = await supabase
        .from('convenios')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching convenios:', error);
        return [];
      }

      if (data && data.length > 0) {
        return data.map(dbPlan => ({
           id: dbPlan.id,
           name: dbPlan.nome,
           isDefault: dbPlan.is_default,
           treatments: dbPlan.tratamentos || []
        }));
      }
      
      // Criar o plano padrão Particular if DB is empty for this company
      const defaultPlan = {
        empresa_id: empresaId,
        nome: 'Particular',
        is_default: true,
        tratamentos: [...DEFAULT_TREATMENTS]
      };
      
      const { data: newDbPlan, error: insertError } = await supabase
        .from('convenios')
        .insert(defaultPlan)
        .select()
        .single();
        
      if (insertError) {
         console.error('Error creating default plan:', insertError);
         return [];
      }
      
      return [{
         id: newDbPlan.id,
         name: newDbPlan.nome,
         isDefault: newDbPlan.is_default,
         treatments: newDbPlan.tratamentos || []
      }];
    } catch (error) {
      console.error('Error fetching plans', error);
      return [];
    }
  },

  createPlan: async (empresaId: string | number, plan: HealthPlan): Promise<HealthPlan> => {
    const payload = {
        empresa_id: empresaId,
        nome: plan.name,
        is_default: plan.isDefault || false,
        tratamentos: plan.treatments
    };
    
    // We ignore the mock ID from frontend and let Supabase generate UUID
    const { data, error } = await supabase
        .from('convenios')
        .insert(payload)
        .select()
        .single();
        
    if (error) throw error;
    
    return {
        id: data.id,
        name: data.nome,
        isDefault: data.is_default,
        treatments: data.tratamentos || []
    };
  },

  updatePlan: async (empresaId: string | number, plan: HealthPlan): Promise<HealthPlan> => {
    const payload = {
        nome: plan.name,
        tratamentos: plan.treatments
    };
    
    const { data, error } = await supabase
        .from('convenios')
        .update(payload)
        .eq('id', plan.id)
        .select()
        .single();
        
    if (error) throw error;
    
    return {
        id: data.id,
        name: data.nome,
        isDefault: data.is_default,
        treatments: data.tratamentos || []
    };
  },
  
  deletePlan: async (empresaId: string | number, planId: string): Promise<void> => {
    const { error } = await supabase
        .from('convenios')
        .delete()
        .eq('id', planId);
        
    if (error) throw error;
  }
};
