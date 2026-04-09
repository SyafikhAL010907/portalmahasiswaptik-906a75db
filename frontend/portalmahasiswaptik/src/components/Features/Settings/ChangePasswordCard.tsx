import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChangePassword } from '@/SharedLogic/hooks/useChangePassword';

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any as any } }
};

interface ChangePasswordCardProps {
    hook: ReturnType<typeof useChangePassword>;
}

export function ChangePasswordCard({ hook }: ChangePasswordCardProps) {
    const { isLoading, showPassword, formData } = hook.state;
    const { setShowPassword, setFormData, handleUpdatePassword } = hook.actions;

    return (
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
                                        variant="glass"
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
    );
}
