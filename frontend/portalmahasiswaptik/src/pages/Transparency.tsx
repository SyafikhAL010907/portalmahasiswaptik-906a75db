 import { Link } from 'react-router-dom';
 import { TrendingUp, TrendingDown, ArrowRight, Download, Filter } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 import { useState } from 'react';
 
 // Extended transaction data
 const allTransactions = [
   { type: 'income', description: 'Iuran Minggu ke-4', amount: 520000, date: '22 Jan 2025', category: 'Iuran' },
   { type: 'expense', description: 'Sewa Sound System Acara', amount: -300000, date: '20 Jan 2025', category: 'Event' },
   { type: 'income', description: 'Iuran Minggu ke-3', amount: 500000, date: '15 Jan 2025', category: 'Iuran' },
   { type: 'expense', description: 'Cetak Banner Kegiatan', amount: -150000, date: '14 Jan 2025', category: 'Perlengkapan' },
   { type: 'income', description: 'Iuran Minggu ke-2', amount: 480000, date: '08 Jan 2025', category: 'Iuran' },
   { type: 'expense', description: 'Konsumsi Rapat', amount: -200000, date: '07 Jan 2025', category: 'Konsumsi' },
   { type: 'income', description: 'Iuran Minggu ke-1', amount: 510000, date: '01 Jan 2025', category: 'Iuran' },
   { type: 'expense', description: 'Pembelian ATK', amount: -75000, date: '30 Dec 2024', category: 'Perlengkapan' },
   { type: 'income', description: 'Donasi Alumni', amount: 1000000, date: '28 Dec 2024', category: 'Donasi' },
   { type: 'expense', description: 'Biaya Administrasi', amount: -50000, date: '25 Dec 2024', category: 'Admin' },
   { type: 'income', description: 'Iuran Desember W4', amount: 490000, date: '22 Dec 2024', category: 'Iuran' },
   { type: 'expense', description: 'Dekorasi Natal', amount: -180000, date: '20 Dec 2024', category: 'Event' },
 ];
 
 export default function Transparency() {
   const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
 
   const filteredTransactions = filter === 'all' 
     ? allTransactions 
     : allTransactions.filter(tx => tx.type === filter);
 
   const totalIncome = allTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
   const totalExpense = allTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
   const balance = totalIncome - totalExpense;
 
   return (
     <div className="space-y-6 pt-12 md:pt-0">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl md:text-3xl font-bold text-foreground">Laporan Transparansi</h1>
           <p className="text-muted-foreground mt-1">Riwayat lengkap transaksi kas angkatan</p>
         </div>
         <Link to="/dashboard/finance">
           <Button variant="ghost" size="sm" className="gap-2">
             Lihat Dashboard Kas
             <ArrowRight className="w-4 h-4" />
           </Button>
         </Link>
       </div>
 
       {/* Summary Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <div className="glass-card rounded-2xl p-5">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
               <TrendingUp className="w-5 h-5 text-success" />
             </div>
             <span className="text-sm text-muted-foreground">Total Pemasukan</span>
           </div>
           <p className="text-2xl font-bold text-success">Rp {totalIncome.toLocaleString()}</p>
         </div>
         <div className="glass-card rounded-2xl p-5">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
               <TrendingDown className="w-5 h-5 text-destructive" />
             </div>
             <span className="text-sm text-muted-foreground">Total Pengeluaran</span>
           </div>
           <p className="text-2xl font-bold text-destructive">Rp {totalExpense.toLocaleString()}</p>
         </div>
         <div className="glass-card rounded-2xl p-5">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
               <TrendingUp className="w-5 h-5 text-primary" />
             </div>
             <span className="text-sm text-muted-foreground">Saldo Bersih</span>
           </div>
           <p className="text-2xl font-bold text-primary">Rp {balance.toLocaleString()}</p>
         </div>
       </div>
 
       {/* Filter & Export */}
       <div className="flex flex-col sm:flex-row justify-between gap-4">
         <div className="flex gap-2">
           {[
             { key: 'all', label: 'Semua' },
             { key: 'income', label: 'Pemasukan' },
             { key: 'expense', label: 'Pengeluaran' },
           ].map((f) => (
             <Button
               key={f.key}
               variant={filter === f.key ? 'default' : 'ghost'}
               size="sm"
               onClick={() => setFilter(f.key as typeof filter)}
               className={filter === f.key ? 'primary-gradient' : ''}
             >
               {f.label}
             </Button>
           ))}
         </div>
         <Button variant="pill-outline" size="sm">
           <Download className="w-4 h-4 mr-2" />
           Export PDF
         </Button>
       </div>
 
       {/* Transactions List */}
       <div className="glass-card rounded-2xl p-6">
         <h2 className="text-lg font-semibold text-foreground mb-4">Riwayat Transaksi</h2>
         <div className="space-y-3">
           {filteredTransactions.map((tx, idx) => (
             <div
               key={idx}
               className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
             >
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
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-sm text-muted-foreground">{tx.date}</span>
                     <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                       {tx.category}
                     </span>
                   </div>
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