import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fingerprint, ShieldCheck, Loader2, CheckCircle, Smartphone, Trash2, ScanFace } from "lucide-react";
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
  const [isSupported, setIsSupported] = useState<boolean>(true); // Default to true to keep button clickable
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Background check for hardware support
    webauthnService.isSupported().then(supported => {
      setIsSupported(supported);
      console.log("🛡️ BIOMETRIC DIAGNOSTIC | Support:", supported);
    });
    
    // Fetch current registration status from DB
    const checkStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${API_BASE_URL}/auth/webauthn/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setIsRegistered(!!data.is_registered);
          console.log("🛡️ BIOMETRIC DIAGNOSTIC | DB Status:", !!data.is_registered);
        }
      } catch (err) {
        console.error("🔍 Status Check Error:", err);
      }
    };

    checkStatus();
  }, [user]); // Re-run when user session becomes available

  const handleRegister = async () => {
    if (!user) return;
    setIsRegistering(true);
    try {
      const success = await webauthnService.register(user.id);
      if (success) {
        setIsRegistered(true);
        // Also mark as unlocked for the current session so refresh doesn't lock them out immediately
        sessionStorage.setItem('portal_biometric_unlocked', 'true');
      }
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
    <Card className="group md:col-span-1 border-primary/20 bg-primary/5 backdrop-blur-xl shadow-2xl overflow-hidden relative transition-all hover:border-primary/40 hover:shadow-primary/5">
      {/* Premium background gradient and icon - Added pointer-events-none to fix click interception */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all group-hover:scale-110 pointer-events-none">
        <Fingerprint className="w-24 h-24 text-primary" />
      </div>

      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-wider text-primary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Keamanan Biometrik
          </div>
          <div className="flex gap-1.5 opacity-50">
             <Fingerprint className="w-4 h-4" />
             <ScanFace className="w-4 h-4" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="relative">
                <Smartphone className="w-10 h-10 text-muted-foreground/30" />
                <Fingerprint className="w-4 h-4 text-primary absolute -bottom-1 -right-1" />
             </div>
             <div>
                <p className="text-sm font-bold italic">Biometrik Device</p>
                <div className="flex items-center gap-1.5">
                   <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">FaceID</p>
                   <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                   <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">Fingerprint</p>
                </div>
             </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed italic">
          Gunakan Wajah atau Sidik Jari untuk login dan absensi QR secara instan. Lebih cepat, aman, dan gak bisa dititip bro!
        </p>

        <Button
          onClick={handleRegister}
          disabled={isRegistering || isRegistered}
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
            <div className="flex items-center gap-1 mr-2">
               <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
               <ScanFace className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
          )}
          {isRegistering ? "PROSES DAFTAR..." : isRegistered ? "PERANGKAT TERDAFTAR" : "AKTIFKAN BIOMETRIK"}
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
