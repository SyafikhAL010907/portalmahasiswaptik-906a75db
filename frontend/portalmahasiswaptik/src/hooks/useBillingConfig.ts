import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBillingConfig = (onConfigUpdated?: () => void) => {
    const [billingStart, setBillingStart] = useState<number>(1);
    const [billingEnd, setBillingEnd] = useState<number>(6);
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    // FETCH GLOBAL CONFIG ON MOUNT & POLLING
    useEffect(() => {
        let isMounted = true;

        const fetchGlobalConfig = async (isBackground = false) => {
            try {
                if (!isBackground) setIsLoadingConfig(true);

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const baseUrl = import.meta.env.VITE_API_URL;
                const response = await fetch(`${baseUrl}/config/billing-range`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (isMounted) {
                        setBillingStart(prev => prev !== data.start_month ? data.start_month : prev);
                        setBillingEnd(prev => prev !== data.end_month ? data.end_month : prev);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch global config:", error);
            } finally {
                if (isMounted && !isBackground) {
                    setIsLoadingConfig(false);
                }
            }
        };

        // Initial fetch
        fetchGlobalConfig();

        // Polling every 5 seconds
        const intervalId = setInterval(() => {
            fetchGlobalConfig(true);
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    // UPDATE GLOBAL CONFIG
    const updateBillingRange = async (start: number, end: number) => {
        // Optimistic Update
        setBillingStart(start);
        setBillingEnd(end);

        setIsUpdatingConfig(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const baseUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${baseUrl}/config/save-range`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ start_month: start, end_month: end })
            });

            if (!response.ok) throw new Error("Failed to save config");

            toast.success("Rentang tagihan berhasil diperbarui (Global Sync)!");

            // Trigger callback if provided
            if (onConfigUpdated) {
                onConfigUpdated();
            }

        } catch (error) {
            console.error("Failed to update config:", error);
            toast.error("Gagal menyimpan konfigurasi global.");
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    return {
        billingStart,
        billingEnd,
        isUpdatingConfig,
        isLoadingConfig,
        updateBillingRange
    };
};
