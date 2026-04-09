import { useMemo } from 'react';
import { TrendingUp, Users, Wallet, Gift } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Skeleton } from '@/components/ui/skeleton';
import { formatIDR } from '@/lib/utils';
import { useFinance } from '@/SharedLogic/hooks/useFinance';

interface FinanceStatsProps {
  finance: ReturnType<typeof useFinance>;
}

export function FinanceStats({ finance }: FinanceStatsProps) {
  const { 
    localMonth, selectedYear, selectedClassId, classes, 
    isLoadingStats, batchNetBalance, classDuesTotal, 
    classSpecificTotalIncome, saldoBersih, duesTotal
  } = finance.state;

  const isLifetime = localMonth === 0;
  const className = classes.find(c => c.id === selectedClassId)?.name || '...';

  return (
    <div className="space-y-6">
      {/* 1. AGGREGATE BALANCE (LIFETIME ONLY) */}
      {isLifetime && (
        <PremiumCard
          centered={true}
          icon={TrendingUp}
          title="Total Saldo Bersih Angkatan (Aggregated)"
          subtitle="Validasi: Total Iuran (4 Kelas) + Total Hibah - Pengeluaran Angkatan"
          value={isLoadingStats ? <Skeleton className="h-9 w-48 bg-emerald-500/10" /> : formatIDR(batchNetBalance)}
          gradient="from-emerald-500/20 to-emerald-500/5"
          iconClassName="bg-emerald-500/10 text-emerald-600"
          className="w-full"
        />
      )}

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
        <PremiumCard
          icon={Users}
          title={`Saldo Kas Kelas ${className}`}
          subtitle={isLifetime ? "Total iuran terbayar (Jan - Des)" : "Total iuran terbayar bulan ini"}
          value={isLoadingStats ? <Skeleton className="h-9 w-24 bg-purple-500/10" /> : formatIDR(classDuesTotal)}
          gradient="from-purple-500/20 to-purple-500/5"
          iconClassName="bg-purple-500/10 text-purple-600"
        />
        <PremiumCard
          icon={Wallet}
          title="Total Kas Angkatan"
          subtitle={isLifetime ? "Seluruh kelas (A, B, C, D) 12 Bulan" : "Seluruh kelas bulan ini"}
          value={isLoadingStats ? <Skeleton className="h-9 w-32 bg-blue-500/10" /> : formatIDR(duesTotal)}
          gradient="from-blue-500/20 to-blue-500/5"
          iconClassName="bg-blue-500/10 text-blue-600"
        />
        <PremiumCard
          icon={Gift}
          title={`Hibah/Income ${className}`}
          subtitle={isLifetime ? "Pemasukan di luar iuran" : "Hibah/Donasi masuk bulan ini"}
          value={isLoadingStats ? <Skeleton className="h-9 w-24 bg-orange-500/10" /> : formatIDR(classSpecificTotalIncome)}
          gradient="from-orange-500/20 to-orange-500/5"
          iconClassName="bg-orange-500/10 text-orange-600"
        />
        <PremiumCard
          icon={Wallet}
          title={`Saldo Akhir ${className}`}
          subtitle="Iuran + Hibah - Pengeluaran"
          value={isLoadingStats ? <Skeleton className="h-9 w-32 bg-indigo-500/10" /> : formatIDR(saldoBersih)}
          gradient="from-indigo-500/20 to-indigo-500/5"
          iconClassName="bg-indigo-500/10 text-indigo-600"
          titleClassName={saldoBersih < 0 ? "text-rose-500" : ""}
        />
      </div>
    </div>
  );
}
