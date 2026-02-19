import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserPreferences {
    last_selected_class: string | null;
    last_selected_month: number | null;
}

/**
 * Hook to manage individual user preferences (Sticky Filters)
 * stored in the profiles table.
 */
export function useUserPreferences() {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<UserPreferences>({
        last_selected_class: null,
        last_selected_month: null
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchPreferences = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('last_selected_class, last_selected_month')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                setPreferences({
                    last_selected_class: data.last_selected_class,
                    last_selected_month: data.last_selected_month
                });
            }
        } catch (err) {
            console.error('Error fetching user preferences:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    const updatePreference = async (updates: Partial<UserPreferences>) => {
        if (!user) return;

        // Optimistic Update (Requirement 2: UI langsung berubah)
        setPreferences(prev => ({ ...prev, ...updates }));

        try {
            const { error } = await (supabase as any)
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;
            // Silent success for sticky filters (Requirement 5: UI terasa instan/sat-set)
        } catch (err) {
            console.error('Error updating user preferences:', err);
            toast.error('Gagal sinkronisasi preferensi');
            // Rollback on error
            fetchPreferences();
        }
    };

    return {
        ...preferences,
        isLoading,
        updatePreference
    };
}
