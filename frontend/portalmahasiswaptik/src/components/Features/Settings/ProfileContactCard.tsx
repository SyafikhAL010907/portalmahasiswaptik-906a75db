import { Phone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProfile } from '@/SharedLogic/hooks/useProfile';

interface ProfileContactCardProps {
    hook: ReturnType<typeof useProfile>;
}

export function ProfileContactCard({ hook }: ProfileContactCardProps) {
    const { isSaving, whatsapp } = hook.state;
    const { setWhatsapp, handleUpdateProfile } = hook.actions;

    return (
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
    );
}
