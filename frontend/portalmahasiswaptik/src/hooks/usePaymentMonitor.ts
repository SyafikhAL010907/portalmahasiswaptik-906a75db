import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

/**
 * Global hook to monitor payment status and handle auto-cancellation (revert)
 * if a payment expires or is updated elsewhere.
 */
export function usePaymentMonitor() {
    const location = useLocation();
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const studentIdRef = useRef<string | null>(null);

    const stopMonitoring = () => {
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
    };

    const performRevert = async (studentId: string) => {
        try {
            console.log("⏳ PaymentMonitor: System detected expiry or cancellation. Reverting...");

            // 1. Revert pending dues
            const { data: pendingItems, error: fetchError } = await (supabase as any)
                .from('weekly_dues')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'pending');

            if (fetchError) throw fetchError;

            if (pendingItems && pendingItems.length > 0) {
                const updates = pendingItems.map((item: any) => ({
                    ...item,
                    status: 'unpaid'
                }));

                await (supabase as any)
                    .from('weekly_dues')
                    .upsert(updates, { onConflict: 'student_id, month, week_number, year' });
            }

            // 2. Reset Profile
            await (supabase as any)
                .from('profiles')
                .update({
                    payment_status: 'unpaid',
                    payment_expires_at: null
                })
                .eq('id', studentId);

            // 3. Cleanup local state
            localStorage.removeItem('payment_session');

            toast.info("Sesi pembayaran telah berakhir. Status dikembalikan ke awal.", {
                description: "Waktu pembayaran habis atau dibatalkan.",
                duration: 5000,
            });

        } catch (err) {
            console.error("❌ PaymentMonitor: Failed to auto-revert:", err);
        } finally {
            stopMonitoring();
        }
    };

    const checkExpiry = async (studentId: string, expiresAt: string | null) => {
        if (!expiresAt) return;

        const expiryDate = new Date(expiresAt).getTime();
        const now = Date.now();

        if (now >= expiryDate) {
            console.log("⏰ PaymentMonitor: Expiry reached!");
            await performRevert(studentId);
        }
    };

    useEffect(() => {
        let channel: any;

        const initMonitor = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Initial Profile Check
            const { data: profile } = await (supabase as any)
                .from('profiles')
                .select('id, payment_status, payment_expires_at')
                .eq('id', user.id)
                .single();

            if (profile) {
                studentIdRef.current = profile.id;

                if (profile.payment_status === 'pending') {
                    // Check immediately
                    await checkExpiry(profile.id, profile.payment_expires_at);

                    // Start background interval (every 10s)
                    if (!checkIntervalRef.current) {
                        checkIntervalRef.current = setInterval(() => {
                            checkExpiry(profile.id, profile.payment_expires_at);
                        }, 10000);
                    }
                }
            }

            // Realtime Listener for status changes
            channel = supabase
                .channel('global_payment_monitor')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`
                    },
                    (payload) => {
                        const updated = payload.new as any;
                        console.log("🔔 PaymentMonitor: Profile update detected", updated.payment_status);

                        if (updated.payment_status === 'pending') {
                            // Start/Continue monitoring
                            if (!checkIntervalRef.current) {
                                checkIntervalRef.current = setInterval(() => {
                                    checkExpiry(updated.id, updated.payment_expires_at);
                                }, 10000);
                            }
                        } else {
                            // Paid or Unpaid (Manual cancel elsewhere)
                            stopMonitoring();

                            if (updated.payment_status === 'paid' && location.pathname !== '/payment') {
                                toast.success("Pembayaran Terverifikasi!", {
                                    description: "Terima kasih telah membayar iuran.",
                                });
                            }

                            // Clear session if it's back to unpaid
                            if (updated.payment_status === 'unpaid') {
                                localStorage.removeItem('payment_session');
                            }
                        }
                    }
                )
                .subscribe();
        };

        initMonitor();

        return () => {
            stopMonitoring();
            if (channel) supabase.removeChannel(channel);
        };
    }, [location.pathname]); // Re-run effect on location change to ensure listener stays active

    return null;
}
