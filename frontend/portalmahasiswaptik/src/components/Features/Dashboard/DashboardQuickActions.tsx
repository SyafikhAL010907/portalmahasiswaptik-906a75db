import { motion } from 'framer-motion';
import { QrCode, Wallet, FileText, Users, Megaphone, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboard } from '@/SharedLogic/hooks/useDashboard';

const staggerBottom = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface DashboardQuickActionsProps {
  dashboard: ReturnType<typeof useDashboard>;
}

export function DashboardQuickActions({ dashboard }: DashboardQuickActionsProps) {
  const { userRole } = dashboard.state;

  return (
    <motion.div variants={staggerBottom as any} layout={false} className="glass-card rounded-2xl p-6">
      <h2 className="text-lg font-bold mb-4">Aksi Cepat</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scan Absen / Info */}
        <Link to={userRole === 'Dosen' ? "/dashboard/announcements" : "/dashboard/scan-qr"} className="block group">
          <button className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(59,130,246,0.2)] hover:border-blue-400/50 active:scale-95 shadow-sm">
            <div className="p-3 rounded-full bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500/20">
              {userRole === 'Dosen' ? <Megaphone size={20} strokeWidth={2.5} /> : <QrCode size={20} strokeWidth={2.5} />}
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">
              {userRole === 'Dosen' ? 'INFO' : 'Scan Absen'}
            </span>
          </button>
        </Link>

        {/* Bayar Kas / Riwayat */}
        <Link to={userRole === 'Dosen' ? "/dashboard/attendance-history" : "/dashboard/payment"} className="block group">
          <button className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(59,130,246,0.2)] hover:border-blue-400/50 active:scale-95 shadow-sm">
            <div className="p-3 rounded-full bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500/20">
              {userRole === 'Dosen' ? <History size={20} strokeWidth={2.5} /> : <Wallet size={20} strokeWidth={2.5} />}
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">
              {userRole === 'Dosen' ? 'RIWAYAT' : 'Bayar Kas'}
            </span>
          </button>
        </Link>

        {/* Materi */}
        <Link to="/dashboard/repository" className="block group">
          <button className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(245,158,11,0.2)] hover:border-amber-400/50 active:scale-95 shadow-sm">
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-500 transition-colors group-hover:bg-amber-500/20">
              <FileText size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors uppercase tracking-tight">Materi</span>
          </button>
        </Link>

        {/* IPK Sim / Buat QR */}
        <Link to={userRole === 'Dosen' ? "/dashboard/qr-generator" : "/dashboard/ipk-simulator"} className="block group">
          <button className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(168,85,247,0.2)] hover:border-purple-400/50 active:scale-95 shadow-sm">
            <div className="p-3 rounded-full bg-purple-500/10 text-purple-500 transition-colors group-hover:bg-purple-500/20">
              {userRole === 'Dosen' ? <QrCode size={20} strokeWidth={2.5} /> : <Users size={20} strokeWidth={2.5} />}
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors uppercase tracking-tight">
              {userRole === 'Dosen' ? 'BUAT QR' : 'IPK Sim'}
            </span>
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
