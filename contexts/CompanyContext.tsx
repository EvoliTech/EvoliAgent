import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface CompanyContextType {
    empresaId: number | null;
    loading: boolean;
    setEmpresaId: (id: number | null) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
    const [empresaId, setEmpresaId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadUserCompany(session: Session | null) {
            if (!session?.user) {
                setLoading(false);
                return;
            }

            try {
                console.log('Loading company for user:', session.user.id);
                // 1. Try to find by auth_user_id
                let { data: userProfile } = await supabase
                    .from('users')
                    .select('id, IDEmpresa')
                    .eq('auth_user_id', session.user.id)
                    .maybeSingle();

                // 2. Fallback: Try to find by email if no auth_user_id mapping exists
                if (!userProfile && session.user.email) {
                    console.log('No auth_user_id mapping found, trying email fallback:', session.user.email);
                    const { data: emailProfile } = await supabase
                        .from('users')
                        .select('id, IDEmpresa')
                        .eq('email', session.user.email)
                        .maybeSingle();

                    if (emailProfile) {
                        console.log('Found profile by email, linking auth_user_id...');
                        await supabase
                            .from('users')
                            .update({ auth_user_id: session.user.id })
                            .eq('id', emailProfile.id);
                        userProfile = emailProfile;
                    }
                }

                if (userProfile?.IDEmpresa) {
                    setEmpresaId(userProfile.IDEmpresa);
                } else {
                    console.warn('No company mapping found for user');
                    setEmpresaId(null); // Ensure empresaId is null if no company is found
                }
            } catch (err) {
                console.error('Unexpected error loading company:', err);
                setEmpresaId(null); // Ensure empresaId is null on error
            } finally {
                setLoading(false);
            }
        }

        // Initial load
        supabase.auth.getSession().then(({ data: { session } }) => {
            loadUserCompany(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                setLoading(true);
                loadUserCompany(session);
            } else if (event === 'SIGNED_OUT') {
                setEmpresaId(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <CompanyContext.Provider value={{ empresaId, loading, setEmpresaId }}>
            {children}
        </CompanyContext.Provider>
    );
}

export function useCompany() {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
}
