import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fingerprint, ShieldCheck, Loader2, CheckCircle, Smartphone, Trash2 } from "lucide-react";
import { webauthnService } from "@/SharedLogic/services/webauthnService";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/constants";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

/**
 * BiometricSettings component allows users to register their device FaceID/Fingerprint
 * for WebAuthn-based passwordless authentication.
 */
export function BiometricSettings() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Check if browser and hardware support WebAuthn biometrics
    webauthnService.isSupported().then(setIsSupported);
    
    // Fetch current registration status from backend
    const checkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch(`${API_BASE_URL}/auth/webauthn/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setIsRegistered(!!data.is_registered);
      } catch (err) {
        console.error("Error fetching biometric status:", err);
      }
    };

    checkStatus();
  }, []);

  const handleRegister = async () => {
    if (!user) return;
    setIsRegistering(true);
    try {
      const success = await webauthnService.register(user.id);
      if (success) setIsRegistered(true);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Lo yakin mau hapus data biometrik di perangkat ini? Nanti lo harus daftar ulang lagi bro!")) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Lo belum login bro!");

      const res = await fetch(`${API_BASE_URL}/auth/webauthn/delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsRegistered(false);
        toast.success("Biometrik berhasil dihapus! Sekarang lo bisa daftar di HP baru.");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error("Gagal hapus biometrik: " + err.message);
    }
  };

  // If biometrics are not supported on this device/browser, don't show the card
  if (isSupported === false) return null;

  return (
    <Card className="md:col-span-1 border-primary/20 bg-primary/5 backdrop-blur-md shadow-xl overflow-hidden relative">
      {/* Decorative background icon */}
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Fingerprint className="w-24 h-24 text-primary" />
      </div>

      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Keamanan Biometrik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <Smartphone className="w-10 h-10 text-muted-foreground/40" />
             <div>
                <p className="text-sm font-bold italic">FaceID / Fingerprint</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Login & Absensi Instan</p>
             </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed italic">
          Daftarkan perangkat ini untuk melakukan absensi QR menggunakan **FaceID** atau **Sidik Jari**. Lebih cepat, aman, dan gak bisa dititip bro!
        </p>

        <Button
          onClick={handleRegister}
          disabled={isRegistering || isSupported === null || isRegistered}
          className={`w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 group ${
            isRegistered 
            ? "bg-emerald-500 hover:bg-emerald-500 cursor-not-allowed opacity-80" 
            : "bg-primary hover:bg-primary/90"
          }`}
        >
          {isRegistering ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : isRegistered ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <Fingerprint className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          )}
          {isRegistering ? "PROSES DAFTAR..." : isRegistered ? "PERANGKAT TERDAFTAR" : "DAFTARKAN DEVICE"}
        </Button>

        {isRegistered && (
          <button
            onClick={handleReset}
            className="w-full text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors flex items-center justify-center gap-1 mt-2 py-2"
          >
            <Trash2 className="w-3 h-3" />
            Hapus Data Biometrik
          </button>
        )}

        <div className="flex items-center justify-center gap-2 pt-2">
           <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
              <CheckCircle className="w-3 h-3 mr-1" />
              Sertifikasi FIDO2
           </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
