import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Fingerprint, LogOut, Loader2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LockScreen() {
  const { user, profile, unlock, signOut, isBiometricRegistered, isLoading } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  const handleUnlock = async () => {
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

        {/* Fingerprint Interaction Section */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="relative group cursor-pointer" onClick={handleUnlock}>
            {/* Fingerprint Animation Layers */}
            <AnimatePresence>
              {isVerifying ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 bg-primary rounded-full"
                  />
                  <motion.div 
                    animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-primary/50 rounded-full"
                  />
                </motion.div>
              ) : (
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-primary/5 rounded-full blur-md"
                />
              )}
            </AnimatePresence>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-500",
                isVerifying ? "bg-primary text-white shadow-primary/50" : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              {isVerifying ? (
                <Loader2 className="w-10 h-10 md:w-14 md:h-14 animate-spin" />
              ) : (
                <Fingerprint className="w-10 h-10 md:w-14 md:h-14" />
              )}
              
              {/* Scan Line Animation */}
              {!isVerifying && (
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.5)] z-20 pointer-events-none"
                />
              )}
            </motion.div>
          </div>

          <Button 
            variant="ghost" 
            className="mt-6 text-primary font-bold hover:bg-primary/5 transition-all active:scale-95"
            onClick={handleUnlock}
            disabled={isVerifying}
          >
            Tekan untuk verifikasi
          </Button>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-border/50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 mx-auto text-sm md:text-base text-muted-foreground hover:text-error transition-colors group"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:-translate-x-1" />
            <span>Berahlik ke akun lain</span>
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
