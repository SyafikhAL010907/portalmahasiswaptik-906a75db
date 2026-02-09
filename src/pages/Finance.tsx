import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, Check, Clock, X, Loader2, Lock } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Finance() {
  const { isAdminDev, isAdminKelas, isMahasiswa } = useAuth();
  const {
    loading,
    weeks,
    studentRows,
    classSummaries,
    classes,
    selectedClassId,
    setSelectedClassId,
    batchBalance,
    totalExpense,
    updateDueStatus,
    canEditClass,
    WEEKLY_AMOUNT
  } = useFinanceData();

  const [updatingCell, setUpdatingCell] = useState<string | null>(null);

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

  const handleStatusChange = async (
    dueId: string, 
    newStatus: 'paid' | 'pending' | 'unpaid',
    classId: string
  ) => {
    setUpdatingCell(dueId);
    await updateDueStatus(dueId, newStatus, classId);
    setUpdatingCell(null);
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedClassSummary = classSummaries.find(s => s.class_id === selectedClassId);
  const classBalance = selectedClassSummary?.balance || 0;
  const paidCount = selectedClassSummary?.total_paid || 0;
  const totalDues = (selectedClassSummary?.total_paid || 0) + 
                   (selectedClassSummary?.total_pending || 0) + 
                   (selectedClassSummary?.total_unpaid || 0);
  const paidPercentage = totalDues > 0 ? Math.round((paidCount / totalDues) * 100) : 0;

  // Calculate chart data for donut
  const totalBatchPaid = classSummaries.reduce((sum, s) => sum + s.balance, 0);
  const chartData = classSummaries.map((summary, idx) => ({
    ...summary,
    percentage: totalBatchPaid > 0 ? Math.round((summary.balance / totalBatchPaid) * 100) : 0,
    color: idx === 0 ? 'hsl(var(--primary))' : idx === 1 ? 'hsl(var(--success))' : 'hsl(var(--warning))'
  }));

  if (loading) {
    return (
      <div className="space-y-6 pt-12 md:pt-0">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

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
          label="Saldo Angkatan"
          value={`Rp ${batchBalance.toLocaleString('id-ID')}`}
          trend={{ value: `${classSummaries.length} kelas`, positive: true }}
          iconBg="bg-success/10 text-success"
        />
        <StatCard
          icon={TrendingUp}
          label={`Saldo Kelas ${selectedClass?.name || ''}`}
          value={`Rp ${classBalance.toLocaleString('id-ID')}`}
          iconBg="bg-primary/10 text-primary"
        />
        <StatCard
          icon={TrendingDown}
          label="Total Pengeluaran"
          value={`Rp ${totalExpense.toLocaleString('id-ID')}`}
          iconBg="bg-destructive/10 text-destructive"
        />
        <StatCard
          icon={Users}
          label="Lunas Kelas Ini"
          value={`${paidPercentage}%`}
          iconBg="bg-warning/20 text-warning-foreground"
        />
      </div>

      {/* Donut Chart */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Kontribusi per Kelas</h2>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              {chartData.map((data, idx) => {
                const offset = chartData.slice(0, idx).reduce((sum, d) => sum + d.percentage, 0);
                return (
                  <circle 
                    key={data.class_id}
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke={data.color}
                    strokeWidth="3" 
                    strokeDasharray={`${data.percentage} ${100 - data.percentage}`}
                    strokeDashoffset={-offset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-foreground">100%</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {chartData.map((data, idx) => (
              <div key={data.class_id} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: data.color }}
                />
                <span className="text-sm text-foreground">Kelas {data.class_name} - {data.percentage}%</span>
                <span className="text-sm text-muted-foreground">Rp {data.balance.toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Matrix */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Matrix Iuran Mingguan</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Iuran per minggu: Rp {WEEKLY_AMOUNT.toLocaleString('id-ID')}
              {!canEditClass(selectedClassId) && !isMahasiswa() && (
                <span className="ml-2 text-warning-foreground">
                  (View Only - Bukan kelas Anda)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {classes.map((cls) => (
              <Button
                key={cls.id}
                variant={selectedClassId === cls.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedClassId(cls.id)}
                className={cn(
                  selectedClassId === cls.id ? 'primary-gradient' : '',
                  'gap-2'
                )}
              >
                Kelas {cls.name}
                {!canEditClass(cls.id) && !isMahasiswa() && (
                  <Lock className="w-3 h-3" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {studentRows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada data iuran untuk kelas ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground sticky left-0 bg-card/90 backdrop-blur">
                    Nama
                  </th>
                  {weeks.map((week) => (
                    <th key={week} className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      W{week}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studentRows.map((student, idx) => {
                  const canEdit = canEditClass(student.class_id) && !isMahasiswa();
                  
                  return (
                    <tr key={student.student_id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                      <td className="py-3 px-4 text-sm text-foreground sticky left-0 bg-inherit">
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.nim}</p>
                        </div>
                      </td>
                      {weeks.map((week) => {
                        const due = student.dues[week];
                        const status = due?.status || 'unpaid';
                        const isUpdating = updatingCell === due?.id;
                        
                        if (!canEdit) {
                          return (
                            <td key={week} className="py-3 px-4 text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center mx-auto border cursor-not-allowed opacity-80",
                                    getStatusClass(status)
                                  )}>
                                    {getStatusIcon(status)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isMahasiswa() ? 'View only' : 'Kelas lain tidak dapat diedit'}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        }

                        return (
                          <td key={week} className="py-3 px-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center mx-auto border transition-all hover:scale-105 hover:shadow-md",
                                  getStatusClass(status),
                                  isUpdating && 'opacity-50'
                                )}>
                                  {isUpdating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    getStatusIcon(status)
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() => due && handleStatusChange(due.id, 'paid', student.class_id)}
                                  className="gap-2"
                                >
                                  <Check className="w-4 h-4 text-success" />
                                  Lunas
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => due && handleStatusChange(due.id, 'pending', student.class_id)}
                                  className="gap-2"
                                >
                                  <Clock className="w-4 h-4 text-warning-foreground" />
                                  Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => due && handleStatusChange(due.id, 'unpaid', student.class_id)}
                                  className="gap-2"
                                >
                                  <X className="w-4 h-4 text-destructive" />
                                  Belum Bayar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg matrix-paid flex items-center justify-center border">
              <Check className="w-3 h-3 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">Lunas (Rp {WEEKLY_AMOUNT.toLocaleString('id-ID')})</span>
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
    </div>
  );
}
