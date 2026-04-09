import { motion } from 'framer-motion';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/SharedLogic/hooks/useDashboard';

const staggerBottom = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface DashboardDigitalCardProps {
  dashboard: ReturnType<typeof useDashboard>;
}

export function DashboardDigitalCard({ dashboard }: DashboardDigitalCardProps) {
  const { profile, getRoleDisplay } = dashboard.state;
  const { setIsQrOpen } = dashboard.actions;

  return (
    <motion.div variants={staggerBottom as any} layout={false} className="glass-card rounded-2xl p-6 relative overflow-hidden group w-full border border-border/50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-bold">Kartu Digital</h2>
            <p className="text-xs text-muted-foreground">PTIK 2025 Membership</p>
          </div>
          <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => setIsQrOpen(true)}>
            <QrCode className="w-6 h-6" />
          </Button>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />

          <div className="relative z-10 flex flex-col h-[180px] justify-between">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center">
                  <img src="/Logo UNJ.jpg" alt="Logo UNJ" className="w-full h-full object-contain mix-blend-screen" />
                </div>
                <span className="text-[10px] text-white/60 tracking-wider">Universitas Negeri Jakarta</span>
              </div>

              <div className="relative w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden shadow-lg shadow-black/40">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                    {profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "??"}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-0.5">
              <p className="text-white font-bold text-lg tracking-wide leading-tight break-words">
                {profile?.full_name || 'Memuat...'}
              </p>
              <p className="text-white/60 text-[10px] font-mono tracking-widest uppercase">
                {profile?.nim || '----------'}
              </p>
            </div>

            <div className="flex justify-between items-end border-t border-white/10 pt-2">
              <div className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-[9px] text-blue-400 font-black uppercase tracking-tighter">
                {getRoleDisplay()}
              </div>
              <p className="text-[9px] text-white/40 font-bold tracking-tight">
                {profile?.user_class ? `PTIK ${profile.user_class}-2025` : 'PTIK 2025'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
