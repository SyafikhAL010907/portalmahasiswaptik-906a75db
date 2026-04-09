import { Wallet, Calendar, Users, Zap, Eye, Download, Loader2, Check, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useFinance } from '@/SharedLogic/hooks/useFinance';
import { useAuth } from '@/contexts/AuthContext';

interface FinanceHeaderProps {
  finance: ReturnType<typeof useFinance>;
}

export function FinanceHeader({ finance }: FinanceHeaderProps) {
  const { hasRole, isAdmin: checkIsAdmin } = useAuth();
  const { localMonth, classes, selectedClassId, billingStart, billingEnd, isLoadingConfig, isUpdatingConfig } = finance.state;
  const { setLocalMonth, setSelectedClassId, updateBillingRange } = finance.actions;

  const role = hasRole('admin_dev') ? 'admin_dev' : hasRole('admin_kelas') ? 'admin_kelas' : hasRole('admin_dosen') ? 'admin_dosen' : 'mahasiswa';
  const isAdmin = checkIsAdmin();
  const isLifetime = localMonth === 0;

  const months = [
    { value: 0, label: 'Lifetime' },
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
    { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm mb-6 bg-card">
      {/* TIER 1: BRANDING BAR (Adaptive Gradients) */}
      <div className="relative px-6 py-6 border-b flex justify-between items-center bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-100 dark:opacity-0 pointer-events-none bg-gradient-to-br from-blue-200 via-purple-200 to-emerald-100" />
        <div className="absolute inset-0 opacity-0 dark:opacity-100 pointer-events-none bg-gradient-to-br from-blue-950/90 via-indigo-950/60 to-emerald-950/40" />
        
        <div className="relative z-10 flex flex-col">
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3 text-slate-950 dark:text-white">
            <div className="p-2 rounded-xl bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            Management Kas Angkatan
          </h2>
          <p className="text-xs md:text-sm mt-1 font-bold text-slate-700 dark:text-slate-400">Control Panel Keuangan Terpusat</p>
        </div>
        <div className="hidden md:block relative z-10">
          <span className="text-[10px] font-black tracking-widest uppercase px-4 py-2 rounded-full border bg-white/40 text-slate-900 border-white/60 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800">
            V1-PTIK
          </span>
        </div>
      </div>

      {/* TIER 2: CONTROL BAR - Adaptive Layout (xl forced wrap for sidebar compatibility) */}
      <div className="bg-white dark:bg-slate-950 px-6 py-4 flex flex-row flex-wrap justify-between items-center gap-6">
        
        {/* GROUP A: SELECTORS & CONFIG (Flex Wrap) */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Period Selector */}
          <div className="relative w-full sm:w-auto min-w-[140px]">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
            <Select value={localMonth.toString()} onValueChange={(v) => setLocalMonth(Number(v))}>
              <SelectTrigger className="w-full sm:w-[150px] pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Admin Billing Range Control (Optimized Density) */}
          {role === 'admin_dev' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800/50 w-full sm:w-auto group transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 ml-2">Mulai</span>
                <Select value={String(billingStart || 1)} onValueChange={(v) => updateBillingRange(Number(v), billingEnd || 6, localMonth, role)}>
                  <SelectTrigger className="w-[85px] h-8 text-[11px] border-0 bg-transparent shadow-none font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>{months.slice(1).map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <span className="h-4 w-[1px] bg-slate-300 dark:bg-slate-800 mx-0.5" />
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500">Sampai</span>
                <Select value={String(billingEnd || 6)} onValueChange={(v) => updateBillingRange(billingStart || 1, Number(v), localMonth, role)}>
                  <SelectTrigger className="w-[85px] h-8 text-[11px] border-0 bg-transparent shadow-none font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>{months.slice(1).map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {isUpdatingConfig && <Loader2 className="w-3 h-3 animate-spin mx-2" />}
            </div>
          )}

          {/* Class Selector */}
          <div className="relative w-full sm:w-auto min-w-[130px]">
            <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
            <Select value={selectedClassId} onValueChange={(v) => setSelectedClassId(v)} disabled={role === 'mahasiswa'}>
              <SelectTrigger className="w-full sm:w-[140px] pl-9 font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent>{classes.map((cls) => <SelectItem key={cls.id} value={cls.id}>Kelas {cls.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* GROUP B: ACTIONS (Flex-Wrap & Right Aligned on Desktop) */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
          {!isLifetime && (role === 'admin_dev' || (role === 'admin_kelas' && selectedClassId === finance.state.userProfile?.class_id)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 w-full sm:w-auto h-10 font-bold rounded-xl shadow-sm transition-all active:scale-95"
                >
                  <Zap className="w-4 h-4" /> Aksi Kelas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[100] animate-in slide-in-from-top-2">
                <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold px-4 py-2">Set Lunas Mingguan (Rp 5.000)</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                <DropdownMenuItem onClick={() => finance.actions.handleBatchUpdateAllWeeks('paid')} className="px-4 py-2.5 cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-800 rounded-lg">
                  <Check className="w-4 h-4 mr-2 text-blue-500" /> Set Semua Lunas (W1-W4)
                </DropdownMenuItem>
                {[1, 2, 3, 4].map(w => (
                  <DropdownMenuItem key={`paid-${w}`} onClick={() => finance.actions.handleBatchUpdateWeek(w, 'paid')} className="px-4 py-2 text-sm cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-800">
                    <Check className="w-4 h-4 mr-2 text-blue-500" /> Set Lunas (Minggu {w})
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-2" />
                <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold px-4 py-2">Set Bebas Kas Mingguan (Rp 0)</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                <DropdownMenuItem onClick={() => finance.actions.handleBatchUpdateAllWeeks('bebas')} className="px-4 py-2.5 cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-800 rounded-lg">
                  <Unlock className="w-4 h-4 mr-2 text-slate-500" /> Set Semua Bebas Kas (W1-W4)
                </DropdownMenuItem>
                {[1, 2, 3, 4].map(w => (
                  <DropdownMenuItem key={`bebas-${w}`} onClick={() => finance.actions.handleBatchUpdateWeek(w, 'bebas')} className="px-4 py-2 text-sm cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-800">
                    <Unlock className="w-4 h-4 mr-2 text-slate-500" /> Set Bebas Kas (Minggu {w})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => finance.actions.handlePreviewExcel()} 
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 w-full sm:w-auto shadow-md transition-all active:scale-95"
              >
                <Eye className="w-4 h-4" /> Buka File
              </Button>
              {(role === 'admin_dev' || (role === 'admin_kelas' && selectedClassId === finance.state.userProfile?.class_id)) && (
                <Button 
                  onClick={() => finance.actions.handleDownloadExcel()} 
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 w-full sm:w-auto shadow-md transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" /> Export Excel
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
