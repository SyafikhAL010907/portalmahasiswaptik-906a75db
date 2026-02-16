import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBillingConfig = (onConfigUpdated?: () => void) => {
    const [billingStart, setBillingStart] = useState<number>(1); // Default Januari
    const [billingEnd, setBillingEnd] = useState<number>(6);     // Default Juni
    const [selectedMonth, setSelectedMonth] = useState<number>(0); // Default Lifetime
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);
    const [hasServerError, setHasServerError] = useState(false);

    const fetchGlobalConfig = useCallback(async (isBackground = false, force = false) => {
        // Stop background polling if server is down, BUT allow force (real-time/manual) to retry
        if (hasServerError && isBackground && !force) return;

        try {
            if (!isBackground) setIsLoadingConfig(true);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.warn("⚠️ useBillingConfig: No active session found.");
                setIsLoadingConfig(false);
                return;
            }

            const baseUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${baseUrl}/config/billing-range`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📦 useBillingConfig: Data fetched from API:', data);

                // Use functional updates to avoid stale state
                if (data.start_month !== undefined) setBillingStart(data.start_month);
                if (data.end_month !== undefined) setBillingEnd(data.end_month);
                if (data.selected_month !== undefined) setSelectedMonth(data.selected_month);
                setHasServerError(false); // Reset on success
            } else {
                console.error("❌ useBillingConfig: API error", response.status);
                if (response.status === 500) setHasServerError(true);
            }
        } catch (error) {
            console.error("❌ useBillingConfig: Fetch failed:", error);
        } finally {
            setIsLoadingConfig(false);
        }
    }, []);

    // FETCH GLOBAL CONFIG ON MOUNT & REAL-TIME
    useEffect(() => {
        console.log("🚀 useBillingConfig: Initializing sync...");
        fetchGlobalConfig();

        // Supabase Real-time channel for global_configs
        const channel = supabase
            .channel('global_config_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'global_configs'
                },
                (payload) => {
                    console.log('🔄 useBillingConfig: Real-time update detected!', payload);
                    fetchGlobalConfig(true, true); // Use force=true to recover from server error
                }
            )
            .subscribe((status) => {
                console.log('🔌 useBillingConfig: Subscription Status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ useBillingConfig: Ready to receive real-time updates.');
                }
            });

        // Polling Backup (every 10s) as requested for extra safety
        let poller: any;
        if (!hasServerError) {
            poller = setInterval(() => {
                fetchGlobalConfig(true);
            }, 10000);
        }

        return () => {
            console.log("🛑 useBillingConfig: Cleaning up sync...");
            supabase.removeChannel(channel);
            if (poller) clearInterval(poller);
        };
    }, [fetchGlobalConfig, hasServerError]);

    // UPDATE GLOBAL CONFIG
    const updateBillingRange = async (start: number, end: number, currentSelected: number) => {
        console.log('📤 useBillingConfig: Updating Global Config...', { start, end, currentSelected });

        // Optimistic Update
        setBillingStart(start);
        setBillingEnd(end);
        setSelectedMonth(currentSelected);

        setIsUpdatingConfig(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            const baseUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${baseUrl}/config/save-range`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    start_month: start,
                    end_month: end,
                    selected_month: currentSelected
                })
            });

            if (response.ok) {
                toast.success("Konfigurasi berhasil disinkronkan!");
                setHasServerError(false); // Clear error on successful POST
                if (onConfigUpdated) onConfigUpdated();
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.details || errorData.error || "Failed to save config";

                if (response.status === 500) {
                    setHasServerError(true);
                    console.error("🛑 useBillingConfig: Server 500 detected via POST.");
                }

                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error("❌ useBillingConfig: Sync error:", error);
            toast.error(`Gagal sinkronisasi: ${error.message || "Server Error"}`);
            // Revert on failure
            fetchGlobalConfig(true);
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
