import { useState, useRef, useEffect } from "react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useProfile() {
    const { profile, roles, refreshProfile } = useAuth();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [whatsapp, setWhatsapp] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            setWhatsapp(profile.whatsapp || "");
        }
    }, [profile]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setIsSaving(true);
        try {
            let finalWhatsapp = whatsapp.trim();
            if (finalWhatsapp) {
                if (!finalWhatsapp.startsWith('http')) {
                    const cleanNumber = finalWhatsapp.replace(/\D/g, '');
                    if (cleanNumber.startsWith('0')) {
                        finalWhatsapp = `https://wa.me/62${cleanNumber.slice(1)}`;
                    } else if (cleanNumber.startsWith('62')) {
                        finalWhatsapp = `https://wa.me/${cleanNumber}`;
                    } else if (cleanNumber.length > 0) {
                        finalWhatsapp = `https://wa.me/62${cleanNumber}`;
                    }
                }
            }

            const { error } = await (supabase.from("profiles") as any)
                .update({ whatsapp: finalWhatsapp })
                .eq("user_id", profile.user_id);

            if (error) throw error;

            await refreshProfile();
            toast({
                title: "Berhasil",
                description: "Nomor WhatsApp berhasil disimpan & siap dipakai chat!",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal Update",
                description: error.message,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file || !profile) return;

            if (file.name.split('.').length > 2) {
                toast({
                    variant: "destructive",
                    title: "File Tidak Valid",
                    description: "Nama file tidak boleh mengandung double extension / lebih dari satu titik.",
                });
                e.target.value = '';
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
            if (!allowedTypes.includes(file.type)) {
                toast({
                    variant: "destructive",
                    title: "File Tidak Valid",
                    description: "Hanya file gambar (JPG, JPEG, PNG) yang diperbolehkan.",
                });
                e.target.value = '';
                return;
            }

            setIsUploading(true);
            const fileExt = file.name.split(".").pop();
            const fileName = `${profile.nim}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            if (profile.avatar_url) {
                try {
                    const oldPath = profile.avatar_url.split("/").pop();
                    if (oldPath) {
                        await supabase.storage.from("avatars").remove([`avatars/${oldPath}`]);
                    }
                } catch (err) {
                    console.error("Cleanup error:", err);
                }
            }

            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl })
                .eq("user_id", profile.user_id);

            if (updateError) throw updateError;

            await refreshProfile();
            toast({
                title: "Berhasil",
                description: "Foto profil berhasil diperbarui",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal Upload",
                description: error.message,
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAvatar = async () => {
        if (!profile || !profile.avatar_url) return;
        try {
            setIsUploading(true);
            const oldPath = profile.avatar_url.split("/").pop();
            if (oldPath) {
                await supabase.storage.from("avatars").remove([`avatars/${oldPath}`]);
            }
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: null })
                .eq("user_id", profile.user_id);
            if (updateError) throw updateError;
            await refreshProfile();
            toast({
                title: "Foto dihapus",
                description: "Foto profil Anda telah dihapus",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal menghapus",
                description: error.message,
            });
        } finally {
            setIsUploading(false);
        }
    };

    return {
        state: { profile, roles, isUploading, isSaving, whatsapp, fileInputRef },
        actions: { setWhatsapp, handleUpdateProfile, handleUploadAvatar, handleDeleteAvatar, refreshProfile }
    };
}
