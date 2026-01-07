import { supabase } from '../lib/supabase';

export interface UserProfile {
    id: string;
    email?: string;
    name?: string;
    role: 'admin' | 'user';
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    created_at?: string;
}

export const userService = {
    async fetchUsers(): Promise<UserProfile[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('role', { ascending: true }) // Admin first
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching users:', error);
            throw error;
        }

        return data || [];
    },

    async createUser(user: Partial<UserProfile>): Promise<UserProfile> {
        const { data, error } = await supabase
            .from('users')
            .insert({
                ...user,
                role: user.role || 'user'
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            throw error;
        }

        return data;
    },

    async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating user:', error);
            throw error;
        }

        return data;
    },

    async deleteUser(id: string): Promise<void> {
        // Cannot delete the main admin (fixed email)
        // We should check this in UI too, but here is a safety
        const { data: user } = await supabase.from('users').select('role').eq('id', id).single();
        if (user?.role === 'admin') {
            throw new Error('O administrador principal não pode ser excluído.');
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    async getAdminEmail(): Promise<string | null> {
        const { data, error } = await supabase
            .from('users')
            .select('email, google_email')
            .eq('role', 'admin')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching admin email:', error);
            return null;
        }

        // Return login email as fallback for admin identification
        return data?.email || null;
    },

    async getConnectedGoogleEmail(): Promise<string | null> {
        const { data, error } = await supabase
            .from('users')
            .select('google_email, google_access_token')
            .eq('role', 'admin')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error || !data || !data.google_access_token) {
            return null;
        }

        return data.google_email || null;
    }
};
