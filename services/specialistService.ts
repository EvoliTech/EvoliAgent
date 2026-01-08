
import { supabase } from '../lib/supabase';
import { Specialist } from '../types';
import { googleCalendarService } from './googleCalendarService';
import { userService } from './userService';

// Helper to get connected admin email
async function getAdminEmail(empresaId: number) {
    return userService.getAdminEmail(empresaId);
}

export const specialistService = {
    async fetchSpecialists(empresaId: number): Promise<Specialist[]> {
        const { data, error } = await supabase
            .from('especialistas')
            .select('*')
            .eq('IDEmpresa', empresaId)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching specialists:', error);
            throw error;
        }

        return (data || []).map(mapSupabaseToSpecialist);
    },

    async createSpecialist(empresaId: number, specialist: Omit<Specialist, 'id'>): Promise<Specialist> {
        // 1. Get owner email
        const adminEmail = await getAdminEmail(empresaId);

        // 2. Create Google Calendar first
        let googleCalendarId = specialist.email || adminEmail || '';
        try {
            if (adminEmail) {
                const newCal = await googleCalendarService.createCalendar(adminEmail, specialist.name);
                googleCalendarId = newCal.id;
            }
        } catch (e) {
            console.error('Failed to create Google Calendar for specialist:', e);
        }

        const newSpecialist = {
            name: specialist.name,
            specialty: specialist.specialty,
            color: specialist.color,
            avatar_url: specialist.avatarUrl,
            calendar_id: googleCalendarId, // Store Google Calendar ID
            email: specialist.email || adminEmail || '', // Use provided email or owner's email
            phone: specialist.phone,
            treatments: specialist.treatments || [],
            IDEmpresa: empresaId
        };

        const { data, error } = await supabase
            .from('especialistas')
            .insert(newSpecialist)
            .select()
            .single();

        if (error) throw error;

        return mapSupabaseToSpecialist(data);
    },

    async createSpecialistFromGoogle(empresaId: number, specialist: Omit<Specialist, 'id'>): Promise<Specialist> {
        // This version is used when importing from Google Calendar
        // It does NOT create a new Google Calendar (to avoid duplication)
        // Email is automatically filled with owner's email
        const adminEmail = await getAdminEmail(empresaId);

        const newSpecialist = {
            name: specialist.name,
            specialty: specialist.specialty,
            color: specialist.color,
            avatar_url: specialist.avatarUrl,
            calendar_id: specialist.calendarId, // Google Calendar ID
            email: adminEmail || '', // Automatically fill with owner's email
            phone: specialist.phone,
            treatments: specialist.treatments || [],
            IDEmpresa: empresaId
        };

        const { data, error } = await supabase
            .from('especialistas')
            .insert(newSpecialist)
            .select()
            .single();

        if (error) throw error;

        return mapSupabaseToSpecialist(data);
    },

    async updateSpecialist(empresaId: number, specialist: Specialist): Promise<Specialist> {
        const updates = {
            name: specialist.name,
            specialty: specialist.specialty,
            color: specialist.color,
            avatar_url: specialist.avatarUrl,
            calendar_id: specialist.calendarId,
            email: specialist.email,
            phone: specialist.phone,
            treatments: specialist.treatments ?? []
        };

        const { data, error } = await supabase
            .from('especialistas')
            .update(updates)
            .eq('id', specialist.id)
            .eq('IDEmpresa', empresaId)
            .select()
            .single();

        if (error) throw error;

        return mapSupabaseToSpecialist(data);
    },

    async deleteSpecialist(empresaId: number, id: string): Promise<void> {
        // 1. Get specialist info BEFORE deletion
        const { data: spec } = await supabase
            .from('especialistas')
            .select('calendar_id')
            .eq('id', id)
            .eq('IDEmpresa', empresaId)
            .single();

        const calendarId = spec?.calendar_id;

        // 2. Delete from DB (fast operation)
        const { error } = await supabase
            .from('especialistas')
            .delete()
            .eq('id', id)
            .eq('IDEmpresa', empresaId);

        if (error) throw error;

        // 3. Delete from Google Calendar in background (non-blocking)
        if (calendarId && calendarId.includes('@group.calendar.google.com')) {
            // Fire and forget - don't await this
            (async () => {
                try {
                    const adminEmail = await getAdminEmail(empresaId);
                    if (adminEmail) {
                        await googleCalendarService.deleteCalendar(adminEmail, calendarId);
                        console.log(`Google Calendar ${calendarId} deleted successfully`);
                    }
                } catch (e) {
                    console.error('Failed to delete Google Calendar (background):', e);
                }
            })();
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
function mapSupabaseToSpecialist(data: any): Specialist {
    return {
        id: data.id,
        name: data.name,
        specialty: data.specialty,
        color: data.color,
        avatarUrl: data.avatar_url,
        calendarId: data.calendar_id,
        email: data.email,
        phone: data.phone,
        treatments: data.treatments || []
    };
}
