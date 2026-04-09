import { motion } from 'framer-motion';
import { Search, Wallet, Loader2, Calendar, AlertCircle, CheckCircle2, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatIDR } from '@/lib/utils';
import { usePayment, MONTH_NAMES } from '@/SharedLogic/hooks/usePayment';

interface PaymentSelectorProps {
  payment: ReturnType<typeof usePayment>;
}

export function PaymentSelector({ payment }: PaymentSelectorProps) {
  const {
    nim, isLoading, isPaying, studentData, unpaidWeeks, activePeriod, selectedWeeks, selectedTotal, isMahasiswa
  } = payment.state;

  const {
    setNim, handleCheckBill, handleToggleWeek, handlePayNow, handleCancelSingleItem
  } = payment.actions;

  return (
    <div className="space-y-6">
      {/* 1. Search Section */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-2xl border border-border bg-card/50 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Masukkan NIM Mahasiswa"
              className="pl-10 h-12 bg-background/50 border-primary/20 focus-visible:ring-primary rounded-xl w-full"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckBill()}
            />
          </div>
          <Button
            className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-purple-500/50 hover:-translate-y-0.5 active:scale-95 min-w-[160px] border-none"
            onClick={handleCheckBill}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Cek Detail Tagihan"}
          </Button>
        </div>
      </motion.div>

      {/* 2. Bill Details Section */}
      {studentData && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-2xl border border-border bg-card shadow-lg flex flex-col h-fit">
          <div className="flex items-center gap-4 mb-6 border-b border-border pb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Wallet className="text-primary w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-xl">{studentData.full_name}</h3>
              <p className="text-sm text-muted-foreground">NIM: {studentData.nim} • {studentData.classes?.name || `Kelas ${studentData.classLetter}`}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Rincian Item Mingguan
              </h4>
              {unpaidWeeks.length > 0 && (
                <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold">
                  {unpaidWeeks.filter(w => w.status === 'unpaid').length} Item Belum Lunas
                </span>
              )}
            </div>

            {activePeriod && (
              <div className="mb-4 px-3 py-2 bg-muted/30 rounded-lg text-[10px] text-muted-foreground border border-border/50 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                <span>
                  Periode Tagihan Aktif: <strong className="text-foreground">{MONTH_NAMES[activePeriod.start]} - {MONTH_NAMES[activePeriod.end]}</strong>
                </span>
              </div>
            )}

            {unpaidWeeks.length > 0 ? (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {unpaidWeeks.map((item, idx) => {
                  const uniqueId = `${item.month}-${item.week}`;
                  const isDisabled = item.status === 'pending';

                  return (
                    <div key={`${uniqueId}-${idx}`} className="flex justify-between items-center p-4 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/50 transition-all group">
                      <div className="flex items-center gap-4">
                        {!isDisabled && (
                          <Checkbox
                            id={`cb-${uniqueId}`}
                            checked={selectedWeeks.includes(uniqueId)}
                            onCheckedChange={() => handleToggleWeek(uniqueId)}
                            className="w-5 h-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        )}
                        <div className="flex flex-col gap-0.5">
                          <label
                            htmlFor={`cb-${uniqueId}`}
                            className={cn(
                              "text-sm font-semibold transition-colors cursor-pointer",
                              isDisabled ? "opacity-50 cursor-not-allowed" : "group-hover:text-primary"
                            )}
                          >
                            {MONTH_NAMES[item.month]} - Minggu {item.week}
                          </label>
                          {item.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md w-fit italic">
                                Menunggu Konfirmasi
                              </span>
                              {!isMahasiswa && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-rose-500 hover:bg-rose-500/20"
                                  onClick={() => handleCancelSingleItem(item.month, item.week)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md w-fit italic">
                              Hutang Belum Terbayar
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-black text-rose-600">Rp 5.000</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-blue-500 bg-blue-500/5 rounded-2xl border border-blue-500/20 animate-in zoom-in duration-300">
                <CheckCircle2 className="w-12 h-12 mb-3 drop-shadow-sm" />
                <p className="font-black text-lg">Semua Tagihan Lunas!</p>
                <p className="text-xs text-muted-foreground mt-1 px-6 text-center">Terima kasih atas partisipasinya bro. Data matrix aman!</p>
              </div>
            )}
          </div>

          {unpaidWeeks.length > 0 && (
            <div className="pt-6 border-t border-border mt-auto">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-end bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <div>
                    <p className="text-[10px] text-primary/70 uppercase font-black tracking-tighter mb-1">Total Yang Dipilih:</p>
                    <p className="text-4xl font-black text-primary tracking-tight">
                      {formatIDR(selectedTotal)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handlePayNow}
                  disabled={isPaying || selectedTotal === 0}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-14 rounded-xl font-bold text-lg shadow-md shadow-purple-500/20 transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-purple-500/50 hover:-translate-y-0.5 active:scale-95 w-full border-none"
                >
                  {isPaying ? <Loader2 className="animate-spin w-6 h-6 mr-2" /> : <CreditCard className="w-6 h-6 mr-2 text-white" />}
                  BAYAR SEKARANG
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
