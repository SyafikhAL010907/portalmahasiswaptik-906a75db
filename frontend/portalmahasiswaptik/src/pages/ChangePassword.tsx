import { useState } from "react";
import { motion, Variants } from 'framer-motion';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Loader2, ShieldAlert } from "lucide-react";

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

export default function ChangePassword() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: ""
    });

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (formData.newPassword.length < 8) {
            toast({
                variant: "destructive",
                title: "Password Lemah",
                description: "Password baru minimal harus 8 karakter Bro.",
            });
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            toast({
                variant: "destructive",
                title: "Password Tidak Cocok",
                description: "Konfirmasi password harus sama dengan password baru.",
            });
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: formData.newPassword
            });

            if (error) throw error;

            toast({
                title: "Sukses!",
                description: "Password Anda berhasil diperbarui. Gunakan password baru untuk login berikutnya.",
            });

            setFormData({ newPassword: "", confirmPassword: "" });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal Ganti Password",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            layout={false}
            className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-200"
        >
            <motion.div variants={staggerTop} layout={false} className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-foreground">Keamanan Akun</h1>
                <p className="text-muted-foreground">Kelola kata sandi Anda untuk memastikan keamanan akses portal.</p>
            </motion.div>

            <motion.div variants={staggerBottom} layout={false}>
                <Card className="shadow-soft border-border/40">
                    <CardHeader className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            Ganti Password
                        </CardTitle>
                        <CardDescription>
                            Gunakan minimal 8 karakter dengan kombinasi huruf dan angka untuk keamanan maksimal.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">Password Baru</Label>
                                    <div className="relative group">
                                        <Input
                                            id="newPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Minimal 8 karakter"
                                            value={formData.newPassword}
                                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                            className="pl-10 h-12 rounded-xl focus:ring-primary/20 border-border/60 transition-all"
                                        />
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                                    <div className="relative group">
                                        <Input
                                            id="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Ulangi password baru"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="pl-10 h-12 rounded-xl focus:ring-primary/20 border-border/60 transition-all"
                                        />
                                        <ShieldAlert className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border/50">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 rounded-xl font-black tracking-wide shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            MEMPROSES...
                                        </>
                                    ) : (
                                        "PERBARUI PASSWORD SEKARANG"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={staggerBottom} layout={false} className="p-4 bg-muted/30 rounded-2xl border border-dashed border-border/50">
                <p className="text-xs text-muted-foreground italic text-center">
                    * Anda akan tetap masuk setelah password diganti. Namun, disarankan untuk login ulang di perangkat lain.
                </p>
            </motion.div>
        </motion.div>
    );
}
