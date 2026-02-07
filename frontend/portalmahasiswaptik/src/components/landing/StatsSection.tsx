import { Wallet, Users, TrendingUp } from 'lucide-react';

export function StatsSection() {
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
              Rp 12.500.000
            </div>
            <div className="text-muted-foreground">Total Saldo Kas</div>
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
              127
            </div>
            <div className="text-muted-foreground">Total Mahasiswa</div>
            <div className="mt-4 flex justify-center gap-4 text-sm">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">A: 42</span>
              <span className="px-3 py-1 rounded-full bg-success/10 text-success">B: 43</span>
              <span className="px-3 py-1 rounded-full bg-warning/20 text-warning-foreground">C: 42</span>
            </div>
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
