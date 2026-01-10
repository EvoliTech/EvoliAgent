
import { supabase } from '../lib/supabase';

interface ErrorLog {
    empresaId?: number;
    message: string;
    stack?: string;
    component?: string;
    functionName?: string;
    context?: any;
    userEmail?: string;
}

export const logService = {
    async logError({
        empresaId,
        message,
        stack,
        component,
        functionName,
        context,
        userEmail
    }: ErrorLog) {
        try {
            const { error } = await supabase
                .from('logs_error_app')
                .insert({
                    ide_empresa: empresaId,
                    error_message: message,
                    stack_trace: stack,
                    component_name: component,
                    function_name: functionName,
                    additional_context: context,
                    user_email: userEmail
                });

            if (error) {
                console.error('Failed to save log to database:', error);
            }
        } catch (e) {
            console.error('Critical failure in logService:', e);
        }
    }
};
