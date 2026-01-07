
import { supabase } from '../lib/supabase';
import { Specialist } from '../types';
import { googleCalendarService } from './googleCalendarService';

// Helper to get connected admin email
async function getAdminEmail() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;
    const { data } = await supabase.from('especialistas').select('google_email').eq('email', user.email).single();
    return data?.google_email || user.email; // Fallback to user email if not explicitly linked, but usually we need the one with tokens
}

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
        // 1. Create Google Calendar first
        let googleCalendarId = specialist.email;
        try {
            const adminEmail = await getAdminEmail();
            if (adminEmail) {
                const newCal = await googleCalendarService.createCalendar(adminEmail, specialist.name);
                googleCalendarId = newCal.id;
            }
        } catch (e) {
            console.error('Failed to create Google Calendar for specialist:', e);
            // Proceed to create in DB anyway? Yes, but maybe warn.
        }

        const newSpecialist = {
            name: specialist.name,
            specialty: specialist.specialty,
            color: specialist.color,
            avatar_url: specialist.avatarUrl,
            email: googleCalendarId, // Store Calendar ID as email/identifier
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

    async createSpecialistFromGoogle(specialist: Omit<Specialist, 'id'>): Promise<Specialist> {
        // This version is used when importing from Google Calendar
        // It does NOT create a new Google Calendar (to avoid duplication)
        const newSpecialist = {
            name: specialist.name,
            specialty: specialist.specialty,
            color: specialist.color,
            avatar_url: specialist.avatarUrl,
            email: specialist.email, // Already a Google Calendar ID
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
        // 1. Get specialist to find Calendar ID
        const { data: spec } = await supabase.from('especialistas').select('email').eq('id', id).single();
        const calendarId = spec?.email;

        // 2. Delete from DB
        const { error } = await supabase
            .from('especialistas')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 3. Delete from Google Calendar (Post-delete to ensure DB is clean)
        if (calendarId && calendarId.includes('@group.calendar.google.com')) {
            try {
                const adminEmail = await getAdminEmail();
                if (adminEmail) {
                    await googleCalendarService.deleteCalendar(adminEmail, calendarId);
                }
            } catch (e) {
                console.error('Failed to delete Google Calendar:', e);
            }
        }
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
