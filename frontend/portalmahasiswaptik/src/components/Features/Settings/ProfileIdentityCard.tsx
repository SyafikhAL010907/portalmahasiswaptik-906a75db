import { User, MapPin, GraduationCap, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useProfile } from '@/SharedLogic/hooks/useProfile';

interface ProfileIdentityCardProps {
    hook: ReturnType<typeof useProfile>;
}

export function ProfileIdentityCard({ hook }: ProfileIdentityCardProps) {
    const { profile } = hook.state;

    if (!profile) return null;

    return (
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
    );
}
