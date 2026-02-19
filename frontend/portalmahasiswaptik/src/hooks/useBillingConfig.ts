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
                console.log("✅ useBillingConfig: Fetched global settings:", range);
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
        // Initial fetch
        fetchGlobalSettings();

        // Listen for ANY change in global_settings to sync across admins
        const channel = supabase
            .channel('global_settings_sync')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to ALL events (UPDATE, INSERT, DELETE)
                    schema: 'public',
                    table: 'global_settings',
                    filter: 'key=eq.billing_range'
                },
                (payload) => {
                    console.log('🔄 useBillingConfig: Global sync update detected!', payload);

                    // Handle different event types safely
                    const newData = payload.new as { value: { start: number, end: number, selected?: number } } | null;
                    const newVal = newData?.value;

                    if (newVal) {
                        // Directly update state from payload (Fast UI Update)
                        setBillingStart(newVal.start);
                        setBillingEnd(newVal.end);
                        if (newVal.selected !== undefined) {
                            console.log('🔄 useBillingConfig: Updating selected month to:', newVal.selected);
                            setSelectedMonth(newVal.selected);
                        }
                    } else {
                        // Fallback if payload is incomplete
                        console.warn('⚠️ useBillingConfig: Payload incomplete, refetching...');
                        fetchGlobalSettings(true);
                    }
                }
            )
            .subscribe((status) => {
                console.log("📡 useBillingConfig: Realtime subscription status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchGlobalSettings]);

    const updateBillingRange = async (start: number, end: number, currentSelected: number) => {
        // --- OPTIMISTIC UPDATE ---
        console.log('📤 useBillingConfig: Sending update to Supabase...', { start, end, selected: currentSelected });
        setBillingStart(start);
        setBillingEnd(end);
        setSelectedMonth(currentSelected);
        setIsUpdatingConfig(true);

        try {
            const { data, error } = await supabase
                .from('global_settings')
                .update({
                    value: { start, end, selected: currentSelected }
                })
                .eq('key', 'billing_range')
                .select(); // Added .select() to get response back

            if (error) {
                console.error('❌ Update Error:', error.message);
                throw error;
            }

            if (!data || data.length === 0) {
                console.warn('⚠️ Update ditolak! (Cek RLS Policy di Supabase)');
                toast.error("Gagal mengubah setelan bulan", {
                    description: "Akses ini khusus untuk Admin Kelas dan AdminDev.",
                    duration: 4000
                });
                // Revert optimistic update here
                fetchGlobalSettings(true);
                return;
            }

            console.log('✅ Update Berhasil:', data);
            toast.success("Periode Masuk Diperbarui", {
                description: "Seluruh dashboard mahasiswa akan sinkron ke bulan ini.",
                duration: 2000
            });
            if (onConfigUpdated) onConfigUpdated();
        } catch (error: any) {
            console.error("❌ useBillingConfig: Save error object:", error);
            toast.error("Gagal menyimpan perubahan", {
                description: error.message || "Terjadi kesalahan pada server."
            });
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
