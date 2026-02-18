import { Wallet, Users, TrendingUp } from 'lucide-react';
import { LandingStats } from '@/pages/Landing';
import { cn, formatIDR } from '@/lib/utils';

// formatRupiah removed and replaced by formatIDR from utils.ts

export function StatsSection({
  stats,
  attendancePercentage,
  semesterName,
  aggregatedBalance
}: {
  stats: LandingStats | null,
  attendancePercentage?: number,
  semesterName?: string,
  aggregatedBalance?: number
}) {
  return (
    <section className="py-16 bg-transparent transition-colors duration-500">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Total Saldo Bersih Angkatan (Aggregated) */}
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 text-center border border-slate-200 dark:border-white/10 hover:scale-105 transition-transform duration-300 shadow-sm hover:shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-success/20 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-emerald-600 dark:text-success" />
            </div>
            <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              {aggregatedBalance && aggregatedBalance > 0 ? formatIDR(aggregatedBalance) : '...'}
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-bold text-sm">Total Saldo Bersih Angkatan (Aggregated)</div>
            <div className="mt-4 inline-flex items-center gap-1 text-emerald-600 dark:text-success text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              Transparansi Dana Real-time
            </div>
          </div>

          {/* Jumlah Mahasiswa */}
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 text-center border border-slate-200 dark:border-white/10 hover:scale-105 transition-transform duration-300 shadow-sm hover:shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              {stats && stats.total_students ? stats.total_students : '...'}
            </div>
            <div className="text-slate-500 dark:text-slate-400">Total Mahasiswa</div>
            {stats && stats.class_breakdown && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-black uppercase">
                {stats.class_breakdown.map((item, idx) => (
                  <span key={item.name} className={cn(
                    "px-2 py-1 rounded-lg border",
                    idx % 4 === 0 ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                      idx % 4 === 1 ? "bg-violet-500/10 text-violet-600 border-violet-500/20" :
                        idx % 4 === 2 ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                          "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
                  )}>
                    {item.name}: {item.count}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tingkat Kehadiran */}
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 text-center border border-slate-200 dark:border-white/10 hover:scale-105 transition-transform duration-300 shadow-sm hover:shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-accent flex items-center justify-center mx-auto mb-4">
              <div className="text-2xl font-bold text-primary dark:text-accent-foreground">%</div>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              {attendancePercentage && attendancePercentage > 0 ? `${attendancePercentage}%` : '...'}
            </div>
            <div className="text-slate-500 dark:text-slate-400">Tingkat Kehadiran {semesterName || 'Semester Aktif'}</div>
            <div className="mt-4 w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-1000"
                style={{ width: `${attendancePercentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
