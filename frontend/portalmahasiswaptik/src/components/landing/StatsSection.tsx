import { Wallet, Users, TrendingUp } from 'lucide-react';
import { LandingStats } from '@/pages/Landing';
import { cn } from '@/lib/utils';

const formatRupiah = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numericAmount || 0);
};

export function StatsSection({ stats }: { stats: LandingStats | null }) {
  return (
    <section className="py-16 hero-gradient">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Saldo Kas */}
          <div className="glass-card rounded-3xl p-8 text-center hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 rounded-2xl bg-success/20 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-success" />
            </div>
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {stats ? formatRupiah(stats.total_cash_lifetime) : 'Rp 0'}
            </div>
            <div className="text-muted-foreground">Saldo Bersih Lifetime</div>
            <div className="mt-4 inline-flex items-center gap-1 text-success text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              +15% dari bulan lalu
            </div>
          </div>

          {/* Jumlah Mahasiswa */}
          <div className="glass-card rounded-3xl p-8 text-center hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {stats ? stats.total_students : '0'}
            </div>
            <div className="text-muted-foreground">Total Mahasiswa</div>
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
          <div className="glass-card rounded-3xl p-8 text-center hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <div className="text-2xl font-bold text-accent-foreground">%</div>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              94.5%
            </div>
            <div className="text-muted-foreground">Tingkat Kehadiran</div>
            <div className="mt-4 w-full bg-muted rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: '94.5%' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
