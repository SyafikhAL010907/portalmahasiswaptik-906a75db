import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { Fingerprint, LogOut, Loader2, ShieldCheck, User as UserIcon, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LockScreen() {
  const { user, profile, unlock, signOut, isBiometricRegistered, isLoading } = useAuth();
  const { deviceType } = useResponsive();
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  const handleUnlock = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    const success = await unlock();
    setIsVerifying(false);
    
    if (success) {
      toast.success('Akses Diterima! 🔓');
      navigate('/dashboard');
    } else {
      // Don't toast here as the service might have already handled it
      // or the user just cancelled the dialog.
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
    toast.info('Sesi diakhiri, silakan login ulang.');
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 2 }}
          className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[2.5rem] p-8 md:p-12 w-full max-w-sm md:max-w-md lg:max-w-lg text-center relative z-10 border-white/20 shadow-2xl backdrop-blur-2xl"
      >
        {/* User Info Section */}
        <div className="mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-6"
          >
            {/* Avatar Glow */}
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
            
            {/* Avatar/Profile Image */}
            <div className="relative w-full h-full rounded-full border-2 border-primary/50 overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-glow">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground" />
              )}
            </div>

            {/* Shield Icon Badge */}
            <motion.div 
              initial={{ rotate: -20, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-2 -right-2 bg-success text-white p-2 rounded-xl shadow-lg border-2 border-white dark:border-slate-900"
            >
              <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
            </motion.div>
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
            Halo, {profile?.full_name?.split(' ')[0] || 'Bro'}!
          </h2>
          <p className="text-muted-foreground text-sm md:text-base font-medium">
            Layar terkunci. Gunakan biometrik buat lanjut.
          </p>
        </div>

        {/* Biometric Interaction Section - Dual Icon Mode */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="flex gap-8 items-center justify-center">
            {/* Fingerprint Button */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer" onClick={handleUnlock}>
                <AnimatePresence>
                  {isVerifying ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                      <motion.div animate={{ scale: [1, 1.3], opacity: [0.5, 0] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-primary/20 rounded-2xl" />
                    </motion.div>
                  ) : (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-primary/5 rounded-2xl blur-md" />
                  )}
                </AnimatePresence>

                <motion.div 
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                    isVerifying ? "bg-primary text-white border-primary shadow-primary/30" : "bg-primary/5 text-primary border-primary/20 hover:border-primary/50"
                  )}
                >
                  <Fingerprint className="w-8 h-8 md:w-10 md:h-10" />
                </motion.div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Fingerprint</span>
            </div>

            {/* Separator */}
            <div className="h-12 w-[1px] bg-border/50 rotate-12" />

            {/* FaceID Button */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer" onClick={handleUnlock}>
                <AnimatePresence>
                  {isVerifying ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                      <motion.div animate={{ scale: [1, 1.3], opacity: [0.5, 0] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-primary/20 rounded-2xl" />
                    </motion.div>
                  ) : (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-primary/5 rounded-2xl blur-md" />
                  )}
                </AnimatePresence>

                <motion.div 
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                    isVerifying ? "bg-primary text-white border-primary shadow-primary/30" : "bg-primary/5 text-primary border-primary/20 hover:border-primary/50"
                  )}
                >
                  <ScanFace className="w-8 h-8 md:w-10 md:h-10" />
                </motion.div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Face ID</span>
            </div>
          </div>

          {isVerifying && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center gap-2 text-primary font-bold animate-pulse text-sm"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Menunggu Verifikasi...
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-border/50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 mx-auto py-2 px-4 rounded-xl text-sm md:text-base text-muted-foreground hover:text-error hover:bg-error/5 transition-all group"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:-translate-x-1" />
            <span className="font-bold">Keluar / Ganti Akun</span>
          </button>
        </div>
      </motion.div>

      {/* Security Info Label */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <p className="text-[10px] md:text-xs text-muted-foreground/60 tracking-widest uppercase font-bold flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-primary" />
          End-to-End Cryptographic Security
        </p>
      </div>
    </div>
  );
}
