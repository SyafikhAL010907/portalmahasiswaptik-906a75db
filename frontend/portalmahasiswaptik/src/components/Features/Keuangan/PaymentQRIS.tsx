import { motion } from 'framer-motion';
import { Wallet, AlertCircle } from 'lucide-react';
import { cn, formatIDR } from '@/lib/utils';
import { usePayment } from '@/SharedLogic/hooks/usePayment';

interface PaymentQRISProps {
  payment: ReturnType<typeof usePayment>;
}

export function PaymentQRIS({ payment }: PaymentQRISProps) {
  const {
    showQRIS, studentData, paymentAmount, timeLeft
  } = payment.state;

  const { getQRISImage } = payment.actions;

  if (!showQRIS || !studentData) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="glass-card p-8 rounded-2xl border-2 border-primary/30 bg-card flex flex-col items-center shadow-2xl relative overflow-hidden h-fit"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Wallet className="w-32 h-32" />
      </div>

      <div className="w-full flex justify-between items-center mb-8 border-b border-border pb-4 z-10">
        <div className="flex flex-col">
          <h3 className="font-black text-2xl tracking-tight italic uppercase">QRIS DANA {studentData.classLetter}</h3>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">PTIK Portal Official Payment</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-black uppercase tracking-tighter shadow-sm">Verified</span>
        </div>
      </div>

      <div className="text-center mb-8 z-10">
        <p className="text-sm font-bold text-muted-foreground">Silakan Scan & Bayar Sejumlah</p>
        <p className="text-4xl font-black text-foreground tracking-tighter mt-1">{formatIDR(paymentAmount)}</p>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-2xl mb-8 border-8 border-primary/5 relative group transition-transform hover:scale-[1.02] duration-500">
        <img
          src={getQRISImage(studentData.classLetter, paymentAmount)}
          alt="QRIS"
          className="w-64 h-64 object-contain"
        />
      </div>

      {/* --- MANUAL TRANSFER SECTION (SYNCED WITH ORIGINAL NAMES) --- */}
      <div className="w-full max-w-sm bg-muted/30 border border-border/50 rounded-2xl p-5 mb-8 z-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <p className="text-center text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">
          Atau Pembayaran Melalui :
        </p>

        {(() => {
          const classLetter = (studentData.classLetter || 'A').toUpperCase();

          const transferMap: Record<string, { provider: string, number: string, color: string, bgColor: string, borderColor: string, name: string }> = {
            'A': {
              provider: 'Cash Payment',
              number: 'Nur Azizah Muslim',
              color: 'text-blue-600',
              bgColor: 'bg-blue-500/10',
              borderColor: 'border-blue-500/20',
              name: 'Melalui Bendahara Kelas'
            },
            'B': {
              provider: 'GOPAY',
              number: '081413024125',
              color: 'text-emerald-600',
              bgColor: 'bg-emerald-500/10',
              borderColor: 'border-emerald-500/20',
              name: 'Dea Annisyah Putri Hariyanto'
            },
            'C': {
              provider: 'BSI',
              number: '7323723634',
              color: 'text-purple-600',
              bgColor: 'bg-purple-500/10',
              borderColor: 'border-purple-500/20',
              name: 'Fadhiyah Syafiqah Ramadhani'
            },
            'D': {
              provider: 'Cash Payment',
              number: 'Citra Aprilia',
              color: 'text-blue-600',
              bgColor: 'bg-blue-500/10',
              borderColor: 'border-blue-500/20',
              name: 'Melalui Bendahara Kelas'
            },
          };

          const info = transferMap[classLetter] || transferMap['A'];

          return (
            <div className={cn("flex flex-col items-center p-4 rounded-xl border transition-all hover:scale-[1.01]", info.bgColor, info.borderColor)}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter border", info.color, info.borderColor.replace('20', '30'))}>
                  {info.provider}
                </div>
              </div>
              <p className={cn("text-2xl md:text-3xl font-black tracking-tight", info.color)}>
                {info.number}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 text-center">
                {info.name}
              </p>
            </div>
          );
        })()}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex gap-4 items-start max-w-sm mb-8 z-10">
        <div className="bg-amber-500/20 p-2 rounded-lg">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
        </div>
        <div>
          <p className="text-xs text-amber-800 font-bold leading-relaxed">
            Sistem sudah mencatat status <span className="underline italic">"Pending"</span>.
          </p>
          <p className="text-[10px] text-amber-700/80 mt-1 font-medium">
            Mohon segera transfer atau bayar dan berikan bukti ke Bendahara Kelas agar status berubah menjadi LUNAS.
          </p>
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="w-full text-center space-y-2 mb-6 animate-pulse">
        <p className="text-rose-500 font-black text-xl">
          Sisa Waktu: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </p>
        <p className="text-xs text-muted-foreground">
          Segera lakukan pembayaran dan lapor bendahara! <br />
          Jika waktu habis, status pending akan <span className="text-rose-500 font-bold">dibatalkan otomatis</span>.
        </p>
      </div>

      <div className="flex flex-col w-full gap-3">
        <p className="text-[10px] text-center text-muted-foreground italic opacity-70">
          Menunggu Konfirmasi Admin...
        </p>
      </div>
    </motion.div>
  );
}
