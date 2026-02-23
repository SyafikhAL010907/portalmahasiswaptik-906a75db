import { useState, useRef, useEffect } from "react";
import { motion, Variants } from 'framer-motion';
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    User,
    MapPin,
    Phone,
    Camera,
    Trash2,
    Loader2,
    ShieldCheck,
    GraduationCap
} from "lucide-react";

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12 }
    }
};
const staggerTop: Variants = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};
const staggerBottom: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export default function Profile() {
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
            // Logic konversi nomor WA ke link wa.me
            let finalWhatsapp = whatsapp.trim();
            if (finalWhatsapp) {
                // Hapus karakter non-digit kecuali jika sudah ada http
                if (!finalWhatsapp.startsWith('http')) {
                    const cleanNumber = finalWhatsapp.replace(/\D/g, '');
                    if (cleanNumber.startsWith('0')) {
                        finalWhatsapp = `https://wa.me/62${cleanNumber.slice(1)}`;
                    } else if (cleanNumber.startsWith('62')) {
                        finalWhatsapp = `https://wa.me/${cleanNumber}`;
                    } else if (cleanNumber.length > 0) {
                        // Jika input angka biasa tanpa 0 atau 62 (asumsi Indonesia)
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

            const allowedTypes = [
                'image/jpeg',
                'image/png',
                'image/jpg'
            ];

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

            // Upload new file
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            // Delete old file if exists (cleanup)
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

            // Update profile
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

            // 1. Remove from storage
            const oldPath = profile.avatar_url.split("/").pop();
            if (oldPath) {
                await supabase.storage.from("avatars").remove([`avatars/${oldPath}`]);
            }

            // 2. Remove from DB
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

    const getInitials = (name: string) => {
        return name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "??";
    };

    if (!profile) {
        return (
            <div className="space-y-6 animate-in fade-in duration-200">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    const roleLabels: Record<AppRole, string> = {
        admin_dev: "AdminDev",
        admin_kelas: "Admin Kelas",
        admin_dosen: "Dosen",
        mahasiswa: "Mahasiswa",
    };

    const roleColors: Record<AppRole, string> = {
        admin_dev: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20",
        admin_kelas: "bg-primary text-primary-foreground",
        admin_dosen: "bg-warning text-warning-foreground",
        mahasiswa: "bg-success text-success-foreground",
    };

    const primaryRole = roles[0] || "mahasiswa";

    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            layout={false}
            className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200"
        >
            {/* Header Profile */}
            <motion.div variants={staggerTop} layout={false} className="relative group">
                <div className="h-32 md:h-48 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-secondary/30 overflow-hidden border border-border/50">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-from),transparent_40%)]" />
                </div>

                <div className="absolute -bottom-12 left-8 flex items-end gap-6">
                    <div className="relative">
                        <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-xl rounded-2xl">
                            <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                            <AvatarFallback className="bg-indigo-600 text-white text-3xl font-black rounded-xl">
                                {getInitials(profile.full_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-1 right-1 flex gap-1">
                            <Button
                                size="icon"
                                variant="glass"
                                className="h-8 w-8 rounded-lg shadow-lg"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </Button>
                            {profile.avatar_url && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 shadow-lg"
                                    onClick={handleDeleteAvatar}
                                    disabled={isUploading}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".jpg,.jpeg,.png,image/jpeg,image/png,image/jpg"
                            onChange={handleUploadAvatar}
                        />
                    </div>
                    <div className="mb-4">
                        <h1 className="text-2xl font-black text-foreground">{profile.full_name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge className={roleColors[primaryRole as AppRole]}>
                                {roleLabels[primaryRole as AppRole]}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">{profile.nim}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <motion.div variants={staggerBottom} layout={false} className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                {/* Identity Details (Read Only) */}
                <Card className="md:col-span-1 shadow-soft border-border/40 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            Identitas Akademik
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Nama Lengkap</Label>
                            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/30 text-sm font-medium">
                                <User className="w-4 h-4 text-muted-foreground/60" />
                                {profile.full_name}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Nomor Induk Mahasiswa</Label>
                            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/30 text-sm font-mono">
                                <GraduationCap className="w-4 h-4 text-muted-foreground/60" />
                                {profile.nim}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Kelas</Label>
                            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/30 text-sm font-medium">
                                <MapPin className="w-4 h-4 text-muted-foreground/60" />
                                Kelas {profile.user_class || '-'}
                            </div>
                        </div>
                        <p className="text-[10px] text-amber-600 bg-amber-500/10 p-2 rounded-lg leading-relaxed italic border border-amber-500/20">
                            * Data identitas akademik dikunci oleh sistem. Hubungi AdminDev jika ada kesalahan data.
                        </p>
                    </CardContent>
                </Card>

                {/* Editable Profile */}
                <Card className="md:col-span-2 shadow-soft border-border/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Phone className="w-5 h-5 text-primary" />
                            Informasi Kontak
                        </CardTitle>
                        <CardDescription>
                            Pastikan nomor WhatsApp aktif untuk koordinasi pembayaran iuran dan informasi akademik lainnya.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="whatsapp" className="text-sm font-bold">Nomor WhatsApp</Label>
                                <div className="relative group">
                                    <Input
                                        id="whatsapp"
                                        placeholder="Contoh: 08123456789"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        className="pl-10 h-12 rounded-xl focus:ring-primary/20 border-border/60 transition-all"
                                    />
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/50">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full h-12 rounded-xl font-black tracking-wide shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            MENYIMPAN...
                                        </>
                                    ) : (
                                        "SIMPAN PERUBAHAN"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
