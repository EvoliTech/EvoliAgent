
import { supabase } from '../lib/supabase';
import { Specialist } from '../types';

export const specialistService = {
    async fetchSpecialists(): Promise<Specialist[]> {
        const { data, error } = await supabase
            .from('especialistas')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching specialists:', error);
            throw error;
        }

        return (data || []).map(mapSupabaseToSpecialist);
    },

    async createSpecialist(specialist: Omit<Specialist, 'id'>): Promise<Specialist> {
        const newSpecialist = {
            name: specialist.name,
            specialty: specialist.specialty,
            color: specialist.color,
            avatar_url: specialist.avatarUrl,
            email: specialist.email,
            phone: specialist.phone,
            treatments: specialist.treatments || []
        };

        const { data, error } = await supabase
            .from('especialistas')
            .insert(newSpecialist)
            .select()
            .single();

        if (error) throw error;

        return mapSupabaseToSpecialist(data);
    },

    async updateSpecialist(specialist: Specialist): Promise<Specialist> {
        const updates = {
            name: specialist.name,
            specialty: specialist.specialty,
            color: specialist.color,
            avatar_url: specialist.avatarUrl,
            email: specialist.email,
            phone: specialist.phone,
            treatments: specialist.treatments ?? []
        };

        const { data, error } = await supabase
            .from('especialistas')
            .update(updates)
            .eq('id', specialist.id)
            .select()
            .single();

        if (error) throw error;

        return mapSupabaseToSpecialist(data);
    },

    async deleteSpecialist(id: string): Promise<void> {
        const { error } = await supabase
            .from('especialistas')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    subscribeToSpecialists(onChanges: () => void) {
        return supabase
            .channel('especialistas-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'especialistas' },
                () => {
                    onChanges();
                }
            )
            .subscribe();
    }
};

// Mapeamento: Supabase (snake_case) -> App (camelCase)
// Note: The table columns are defined in snake_case in the DB migration, but typically selected as snake_case.
// To avoid confusion, let's explicitely map.
function mapSupabaseToSpecialist(data: any): Specialist {
    return {
        id: data.id,
        name: data.name,
        specialty: data.specialty,
        color: data.color,
        avatarUrl: data.avatar_url,
        email: data.email,
        phone: data.phone,
        treatments: data.treatments || []
    };
}
