import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useChangePassword() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: ""
    });

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

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

    return {
        state: { isLoading, showPassword, formData },
        actions: { setShowPassword, setFormData, handleUpdatePassword }
    };
}
