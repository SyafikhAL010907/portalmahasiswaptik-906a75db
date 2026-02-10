import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, GraduationCap, Hash, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserProfileModalProps {
    userId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserProfile();
        } else {
            setProfile(null);
        }
    }, [isOpen, userId]);

    const fetchUserProfile = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
          *,
          classes ( name )
        `)
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (err) {
            console.error('Error fetching profile:', err);
            toast.error('Gagal memuat profil');
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppChat = () => {
        if (profile?.whatsapp) {
            // Karena sudah di-convert di Profile.tsx, kita bisa langsung buka
            window.open(profile.whatsapp, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-white/10 shadow-2xl rounded-3xl">
                {loading ? (
                    <div className="h-[400px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : profile ? (
                    <div className="flex flex-col">
                        {/* Header / Cover Area */}
                        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                                <Avatar className="w-32 h-32 border-4 border-white dark:border-slate-950 shadow-2xl">
                                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                                    <AvatarFallback className="bg-slate-100 dark:bg-slate-900 text-4xl font-black text-blue-500">
                                        {profile.full_name?.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="pt-20 pb-8 px-6 text-center space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{profile.full_name}</h2>
                                <p className="text-sm font-mono text-blue-500 dark:text-blue-400 tracking-widest mt-1">{profile.nim}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 border border-slate-100 dark:border-white/5">
                                    <GraduationCap className="w-4 h-4 text-purple-500 dark:text-purple-400 mx-auto mb-1" />
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">Kelas</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile.classes?.name || '---'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 border border-slate-100 dark:border-white/5">
                                    <Hash className="w-4 h-4 text-blue-500 dark:text-blue-400 mx-auto mb-1" />
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">Angkatan</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">2025</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {profile.whatsapp && (
                                    <Button
                                        onClick={handleWhatsAppChat}
                                        className="w-full h-12 font-bold rounded-2xl gap-2 shadow-lg transition-all duration-300 bg-green-600 hover:bg-green-700 text-white shadow-green-900/20"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        Chat WhatsApp
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="w-full h-12 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl font-bold"
                                >
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-500 font-bold">
                        Profil tidak ditemukan
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
