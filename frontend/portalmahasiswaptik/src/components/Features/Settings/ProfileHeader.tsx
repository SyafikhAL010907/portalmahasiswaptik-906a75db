import { motion } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { AppRole } from "@/contexts/AuthContext";
import { useProfile } from '@/SharedLogic/hooks/useProfile';

interface ProfileHeaderProps {
    hook: ReturnType<typeof useProfile>;
}

const staggerTop = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export function ProfileHeader({ hook }: ProfileHeaderProps) {
    const { profile, roles, isUploading, fileInputRef } = hook.state;
    const { handleUploadAvatar, handleDeleteAvatar } = hook.actions;

    if (!profile) return null;

    const getInitials = (name: string) => {
        return name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "??";
    };

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
        <motion.div variants={staggerTop as any} layout={false} className="relative group">
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
    );
}
