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

export interface SubUserProfile {
    id: string;
    name: string;
    password: string;
    icon: 'crown' | 'briefcase' | 'headphones' | 'stethoscope' | 'user' | 'shield';
    permissions: string[];
}

export const userService = {
    async fetchUsers(empresaId: number): Promise<UserProfile[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('IDEmpresa', empresaId)
            .order('role', { ascending: true }) // Admin first
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching users:', error);
            throw error;
        }

        return data || [];
    },

    async createUser(empresaId: number, user: Partial<UserProfile>): Promise<UserProfile> {
        const { data, error } = await supabase
            .from('users')
            .insert({
                ...user,
                role: user.role || 'user',
                IDEmpresa: empresaId
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            throw error;
        }

        return data;
    },

    async updateUser(empresaId: number, id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .eq('IDEmpresa', empresaId)
            .select()
            .single();

        if (error) {
            console.error('Error updating user:', error);
            throw error;
        }

        return data;
    },

    async deleteUser(empresaId: number, id: string): Promise<void> {
        // Cannot delete the main admin (fixed email)
        // We should check this in UI too, but here is a safety
        const { data: user } = await supabase.from('users').select('role').eq('id', id).eq('IDEmpresa', empresaId).single();
        if (user?.role === 'admin') {
            throw new Error('O administrador principal não pode ser excluído.');
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id)
            .eq('IDEmpresa', empresaId);

        if (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    async getAdminEmail(empresaId: number): Promise<string | null> {
        const { data, error } = await supabase
            .from('users')
            .select('email, google_email')
            .eq('role', 'admin')
            .eq('IDEmpresa', empresaId)
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

    async getConnectedGoogleEmail(empresaId: number): Promise<string | null> {
        const { data, error } = await supabase
            .from('users')
            .select('google_email, google_access_token')
            .eq('IDEmpresa', empresaId)
            .not('google_access_token', 'is', null)
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        return data.google_email || null;
    }
};

export const subUserService = {
    async checkIfFirstAccess(empresaId: number): Promise<boolean> {
        const { data } = await supabase
            .from('integrations_config')
            .select('id')
            .eq('service', 'sub_users')
            .eq('IDEmpresa', empresaId)
            .maybeSingle();
        return !data;
    },

    async getSubUsers(empresaId: number): Promise<Record<string, SubUserProfile>> {
        const { data, error } = await supabase
            .from('integrations_config')
            .select('client_secret')
            .eq('service', 'sub_users')
            .eq('IDEmpresa', empresaId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching sub-users:', error);
        }

        let parsed: any = null;
        if (data?.client_secret) {
            try {
                parsed = JSON.parse(data.client_secret);
            } catch (e) {
                console.error('Error parsing sub-users:', e);
            }
        }

        return this.sanitizeSubUsers(parsed);
    },

    sanitizeSubUsers(data: any): Record<string, SubUserProfile> {
        const defaults: Record<string, SubUserProfile> = {
            admin: {
                id: 'admin',
                name: 'Administrador',
                password: 'admin',
                icon: 'crown',
                permissions: ['agenda', 'appointments', 'patients', 'financeiro', 'campaigns', 'inventory', 'gallery', 'prosthesis-control', 'integrations', 'security']
            }
        };

        if (!data || typeof data !== 'object') {
            return defaults;
        }

        const sanitized: Record<string, SubUserProfile> = {};

        Object.keys(data).forEach(key => {
            const item = data[key];
            if (!item) return;

            sanitized[key] = {
                id: key,
                name: item.name || (key === 'admin' ? 'Administrador' : key === 'gestor' ? 'Gestor' : key === 'concierge' ? 'Concierge' : key),
                password: item.password || '',
                icon: item.icon || (key === 'admin' ? 'crown' : key === 'gestor' ? 'briefcase' : key === 'concierge' ? 'headphones' : 'user'),
                permissions: Array.isArray(item.permissions)
                    ? item.permissions
                    : (key === 'concierge' ? ['agenda', 'appointments', 'patients'] : ['agenda', 'appointments', 'patients', 'financeiro', 'campaigns', 'inventory', 'gallery', 'prosthesis-control', 'integrations', 'security'])
            };
        });

        // Ensure admin always exists and is fully enabled
        if (!sanitized.admin) {
            sanitized.admin = defaults.admin;
        } else {
            sanitized.admin.permissions = defaults.admin.permissions;
            sanitized.admin.name = 'Administrador';
            sanitized.admin.icon = 'crown';
        }

        return sanitized;
    },

    async saveSubUsers(empresaId: number, config: Record<string, any>): Promise<void> {
        const sanitized = this.sanitizeSubUsers(config);

        const payload = {
            IDEmpresa: empresaId,
            service: 'sub_users',
            client_id: 'sub_users',
            client_secret: JSON.stringify(sanitized),
            is_active: true
        };

        // Check if exists
        const { data: existing } = await supabase
            .from('integrations_config')
            .select('service')
            .eq('service', 'sub_users')
            .eq('IDEmpresa', empresaId)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('integrations_config')
                .update(payload)
                .eq('service', 'sub_users')
                .eq('IDEmpresa', empresaId);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('integrations_config')
                .insert([payload]);
            if (error) throw error;
        }
    }
};

