import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, Check, Clock, X } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Mock data for weekly payment matrix
const weeks = ['W1', 'W2', 'W3', 'W4'];
const students = [
  { name: 'Ahmad Fauzan', payments: ['paid', 'paid', 'paid', 'pending'] },
  { name: 'Budi Santoso', payments: ['paid', 'paid', 'unpaid', 'unpaid'] },
  { name: 'Citra Dewi', payments: ['paid', 'paid', 'paid', 'paid'] },
  { name: 'Dian Pratama', payments: ['paid', 'pending', 'unpaid', 'unpaid'] },
  { name: 'Eka Putra', payments: ['paid', 'paid', 'paid', 'pending'] },
];

const transactions = [
  { type: 'income', description: 'Iuran Minggu ke-3', amount: 500000, date: '15 Jan 2025' },
  { type: 'expense', description: 'Cetak Banner Kegiatan', amount: -150000, date: '14 Jan 2025' },
  { type: 'income', description: 'Iuran Minggu ke-2', amount: 480000, date: '08 Jan 2025' },
  { type: 'expense', description: 'Konsumsi Rapat', amount: -200000, date: '07 Jan 2025' },
];

export default function Finance() {
  const [selectedClass, setSelectedClass] = useState('A');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check className="w-4 h-4 text-success" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning-foreground" />;
      case 'unpaid':
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'matrix-paid';
      case 'pending':
        return 'matrix-pending';
      case 'unpaid':
        return 'matrix-unpaid';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard Keuangan</h1>
        <p className="text-muted-foreground mt-1">Laporan kas angkatan PTIK 2025</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          label="Total Saldo"
          value="Rp 12.500.000"
          trend={{ value: '15%', positive: true }}
          iconBg="bg-success/10 text-success"
        />
        <StatCard
          icon={TrendingUp}
          label="Pemasukan Bulan Ini"
          value="Rp 2.100.000"
          iconBg="bg-primary/10 text-primary"
        />
        <StatCard
          icon={TrendingDown}
          label="Pengeluaran Bulan Ini"
          value="Rp 450.000"
          iconBg="bg-destructive/10 text-destructive"
        />
        <StatCard
          icon={Users}
          label="Lunas Bulan Ini"
          value="85%"
          iconBg="bg-warning/20 text-warning-foreground"
        />
      </div>

      {/* Donut Chart Placeholder */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Kontribusi per Kelas</h2>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-48 h-48">
            {/* Simple donut chart visualization */}
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" 
                strokeDasharray="35 65" strokeDashoffset="0" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--success))" strokeWidth="3" 
                strokeDasharray="33 67" strokeDashoffset="-35" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--warning))" strokeWidth="3" 
                strokeDasharray="32 68" strokeDashoffset="-68" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-foreground">100%</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-primary" />
              <span className="text-sm text-foreground">Kelas A - 35%</span>
              <span className="text-sm text-muted-foreground">Rp 4.375.000</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-success" />
              <span className="text-sm text-foreground">Kelas B - 33%</span>
              <span className="text-sm text-muted-foreground">Rp 4.125.000</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-warning" />
              <span className="text-sm text-foreground">Kelas C - 32%</span>
              <span className="text-sm text-muted-foreground">Rp 4.000.000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Matrix */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground">Matrix Iuran Mingguan</h2>
          <div className="flex gap-2">
            {['A', 'B', 'C'].map((cls) => (
              <Button
                key={cls}
                variant={selectedClass === cls ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedClass(cls)}
                className={selectedClass === cls ? 'primary-gradient' : ''}
              >
                Kelas {cls}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nama</th>
                {weeks.map((week) => (
                  <th key={week} className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                    {week}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="py-3 px-4 text-sm text-foreground">{student.name}</td>
                  {student.payments.map((status, weekIdx) => (
                    <td key={weekIdx} className="py-3 px-4 text-center">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center mx-auto border",
                        getStatusClass(status)
                      )}>
                        {getStatusIcon(status)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg matrix-paid flex items-center justify-center border">
              <Check className="w-3 h-3 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">Lunas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg matrix-pending flex items-center justify-center border">
              <Clock className="w-3 h-3 text-warning-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg matrix-unpaid flex items-center justify-center border">
              <X className="w-3 h-3 text-destructive" />
            </div>
            <span className="text-sm text-muted-foreground">Belum Bayar</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Transaksi Terakhir</h2>
        <div className="space-y-3">
          {transactions.map((tx, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  tx.type === 'income' ? 'bg-success/20' : 'bg-destructive/20'
                )}>
                  {tx.type === 'income' ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">{tx.description}</p>
                  <p className="text-sm text-muted-foreground">{tx.date}</p>
                </div>
              </div>
              <span className={cn(
                "font-semibold",
                tx.type === 'income' ? 'text-success' : 'text-destructive'
              )}>
                {tx.type === 'income' ? '+' : ''}Rp {Math.abs(tx.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
