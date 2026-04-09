import { Check, Clock, Unlock, X, MoreVertical, Loader2, Folder, AlertCircle } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { cn, formatIDR } from '@/lib/utils';
import { useFinance } from '@/SharedLogic/hooks/useFinance';
import { useAuth } from '@/contexts/AuthContext';

interface FinanceMatrixProps {
  finance: ReturnType<typeof useFinance>;
}

export function FinanceMatrix({ finance }: FinanceMatrixProps) {
  const { user } = useAuth();
  const { 
    localMonth, matrixData, isLoadingMatrix, selectedClassId, 
    classes 
  } = finance.state;

  const { setSelectedCell, setIsDialogOpen } = finance.actions;

  const userProfile = finance.state.userProfile;
  const isLifetime = localMonth === 0;
  
  const canEdit = useCallback(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin_dev') return true;
    if (userProfile.role === 'admin_kelas') {
      return userProfile.class_id === selectedClassId;
    }
    return false;
  }, [userProfile, selectedClassId]);

  const isAdmin = userProfile?.role === 'admin_dev' || userProfile?.role === 'admin_kelas';
  const userId = user?.id;

  // --- PRIVACY FILTER (SYNCED WITH ORIGINAL) ---
  const dataToRender = (userProfile?.role === 'mahasiswa')
    ? matrixData.filter(student => student.student_id === userId)
    : matrixData;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <Check className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'bebas': return <Unlock className="w-4 h-4" />;
      case 'unpaid': return <X className="w-4 h-4" />;
      default: return <span className="text-xs">-</span>;
    }
  };

  const handleCellClick = (studentId: string, studentName: string, weekIdx: number) => {
    if (!canEdit()) {
      toast.error("Anda tidak memiliki akses edit untuk kelas ini.");
      return;
    }
    if (isLifetime) return;
    setSelectedCell({ studentId, studentName, weekIndex: weekIdx + 1 });
    setIsDialogOpen(true);
  };

  if (isLoadingMatrix) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Memuat data matrix...</p>
      </div>
    );
  }

  if (dataToRender.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4 bg-muted/20 rounded-xl border border-dashed border-border mb-6">
        <Folder className="w-10 h-10 text-muted-foreground opacity-50" />
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Data Tidak Ditemukan</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Belum ada data mahasiswa atau iuran di kelas ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4 -mx-1 sm:mx-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
      {/* 1. DESKTOP VIEW - Balanced ratios for iPad/MacBook */}
      <table className="w-full hidden md:table min-w-[600px] table-fixed border-collapse">
        <colgroup>
          <col className="w-[38%]" />
          {!isLifetime ? (
            <>
              <col className="w-[15.5%]" />
              <col className="w-[15.5%]" />
              <col className="w-[15.5%]" />
              <col className="w-[15.5%]" />
            </>
          ) : (
            <>
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[22%]" />
            </>
          )}
        </colgroup>
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-4 px-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-card">Nama Mahasiswa</th>
            {!isLifetime ? (
              ['W1', 'W2', 'W3', 'W4'].map(w => (
                <th key={w} className="text-center py-4 px-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-card">{w}</th>
              ))
            ) : (
              <>
                <th className="text-center py-4 px-1 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-card">Bulan</th>
                <th className="text-center py-4 px-1 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-card">Minus</th>
                <th className="text-center py-4 px-1 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-card">Status</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {dataToRender.map((student) => (
            <tr key={student.student_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
              <td className="py-2.5 px-3 font-bold text-[11px] text-slate-900 dark:text-slate-100">
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                  <span className="truncate block leading-tight">{student.name}</span>
                  {canEdit() && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuLabel>Aksi Cepat Iuran</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => finance.actions.handleBulkUpdateStudent(student.student_id, 'paid')} className="cursor-pointer gap-2 font-bold"><Check className="w-4 h-4 text-blue-500" /> Set Lunas W1-W4</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => finance.actions.handleBulkUpdateStudent(student.student_id, 'unpaid')} className="cursor-pointer gap-2 font-bold text-rose-500"><X className="w-4 h-4" /> Reset W1-W4</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </td>
              {!isLifetime ? (
                student.payments.map((status: string, idx: number) => (
                  <td key={idx} className="py-2.5 px-1 text-center">
                    <div
                      onClick={() => handleCellClick(student.student_id, student.name, idx)}
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center mx-auto border transition-all",
                        status === 'paid' ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                        status === 'pending' ? "bg-cyan-500/10 text-cyan-600 border-cyan-200" :
                        status === 'bebas' ? "bg-slate-500/10 text-slate-600 border-slate-200" :
                        "bg-rose-500/10 text-rose-600 border-rose-200",
                        canEdit() ? "cursor-pointer hover:scale-110 shadow-sm active:scale-90" : "cursor-not-allowed opacity-80"
                      )}
                    >
                      <div className="scale-75 sm:scale-90">{getStatusIcon(status)}</div>
                    </div>
                  </td>
                ))
              ) : (
                <>
                  <td className="py-2.5 px-1 text-center text-[11px] font-bold">{student.lifetime_paid_count} Bln</td>
                  <td className="py-2.5 px-1 text-center text-[11px] font-black text-rose-600">
                    {student.lifetime_deficiency_amount ? `-${formatIDR(student.lifetime_deficiency_amount)}` : formatIDR(0)}
                  </td>
                  <td className="py-2.5 px-1 text-center text-[10px]">
                    {student.lifetime_deficiency && student.lifetime_deficiency.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 font-black inline-block leading-none">
                        {student.lifetime_deficiency.join('+')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 font-black inline-block leading-none">✓</span>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 2. MOBILE CARD VIEW */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {dataToRender.map((student) => (
          <div key={student.student_id} className="p-4 rounded-2xl border border-border/50 bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{student.name}</div>
               {canEdit() && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card">
                    <DropdownMenuLabel>Aksi Cepat</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => finance.actions.handleBulkUpdateStudent(student.student_id, 'paid')} className="cursor-pointer gap-2 font-bold"><Check className="w-4 h-4 text-blue-500" /> Set Lunas W1-W4</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => finance.actions.handleBulkUpdateStudent(student.student_id, 'unpaid')} className="cursor-pointer gap-2 font-bold text-rose-500"><X className="w-4 h-4" /> Reset W1-W4</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {!isLifetime ? (
              <div className="flex justify-between items-center bg-background/50 p-2 rounded-xl border border-border/30">
                {student.payments.map((status: string, idx: number) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground">W{idx + 1}</span>
                    <div
                      onClick={() => handleCellClick(student.student_id, student.name, idx)}
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center border transition-all",
                        status === 'paid' ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                        "bg-rose-500/10 text-rose-600 border-rose-200"
                      )}
                    >
                      {getStatusIcon(status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-border/50 text-xs">
                <div className="flex justify-between"><span>Bulan:</span><span className="font-bold">{student.lifetime_paid_count} Bulan</span></div>
                <div className="flex justify-between"><span>Kurang:</span><span className="font-bold text-rose-600">-{formatIDR(student.lifetime_deficiency_amount || 0)}</span></div>
                <div className="pt-1 text-center font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg py-1">
                  {student.lifetime_deficiency?.join(' + ') || 'Lunas'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
