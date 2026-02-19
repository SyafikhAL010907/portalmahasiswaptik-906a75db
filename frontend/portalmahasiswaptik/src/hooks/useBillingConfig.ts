import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBillingConfig = (onConfigUpdated?: () => void) => {
    const [billingStart, setBillingStart] = useState<number>(1);
    const [billingEnd, setBillingEnd] = useState<number>(6);
    const [selectedMonth, setSelectedMonth] = useState<number>(0);
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    const fetchGlobalSettings = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) setIsLoadingConfig(true);

            // Fetch central billing range from global_settings
            const { data, error } = await supabase
                .from('global_settings')
                .select('value')
                .eq('key', 'billing_range')
                .maybeSingle();

            if (error) throw error;

            if (data && data.value) {
                const range = data.value as { start: number, end: number, selected?: number };
                setBillingStart(range.start || 1);
                setBillingEnd(range.end || 6);
                if (range.selected !== undefined) {
                    setSelectedMonth(range.selected);
                }
            }
        } catch (error: any) {
            console.error("❌ useBillingConfig: Global Settings Fetch failed:", error);
        } finally {
            setIsLoadingConfig(false);
        }
    }, []);

    useEffect(() => {
        console.log("🚀 useBillingConfig: Initializing Global Sync...");
        fetchGlobalSettings();

        // Listen for ANY change in global_settings to sync across admins
        const channel = supabase
            .channel('global_settings_sync')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'global_settings',
                    filter: 'key=eq.billing_range'
                },
                (payload) => {
                    console.log('🔄 useBillingConfig: Global sync update detected!', payload);
                    const newVal = payload.new?.value as { start: number, end: number, selected?: number };
                    if (newVal) {
                        setBillingStart(newVal.start);
                        setBillingEnd(newVal.end);
                        if (newVal.selected !== undefined) {
                            setSelectedMonth(newVal.selected);
                        }
                    } else {
                        // Fallback if payload is incomplete
                        fetchGlobalSettings(true);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchGlobalSettings]);

    const updateBillingRange = async (start: number, end: number, currentSelected: number) => {
        // --- OPTIMISTIC UPDATE ---
        setBillingStart(start);
        setBillingEnd(end);
        setSelectedMonth(currentSelected);
        setIsUpdatingConfig(true);

        try {
            const { error } = await supabase
                .from('global_settings')
                .update({
                    value: { start, end, selected: currentSelected }
                })
                .eq('key', 'billing_range');

            if (error) throw error;

            toast.success("Setelan Global diperbarui! 🌐", { duration: 1500 });
            if (onConfigUpdated) onConfigUpdated();
        } catch (error: any) {
            console.error("❌ useBillingConfig: Save error:", error);
            toast.error(`Gagal update global: ${error.message}`);
            // Revert on error
            fetchGlobalSettings(true);
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    return {
        billingStart,
        billingEnd,
        selectedMonth,
        isUpdatingConfig,
        isLoadingConfig,
        updateBillingRange
    };
};
