 import { Link } from 'react-router-dom';
 import { useState } from 'react';
 import { Check, Clock, X, Upload, Image, ArrowRight } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 
 // Mock data for weekly payment matrix (same as Finance)
 const weeks = ['W1', 'W2', 'W3', 'W4'];
 const students = [
   { name: 'Ahmad Fauzan', payments: ['paid', 'paid', 'paid', 'pending'] },
   { name: 'Budi Santoso', payments: ['paid', 'paid', 'unpaid', 'unpaid'] },
   { name: 'Citra Dewi', payments: ['paid', 'paid', 'paid', 'paid'] },
   { name: 'Dian Pratama', payments: ['paid', 'pending', 'unpaid', 'unpaid'] },
   { name: 'Eka Putra', payments: ['paid', 'paid', 'paid', 'pending'] },
 ];
 
 export default function Payment() {
   const [selectedClass, setSelectedClass] = useState('A');
   const [uploadedImage, setUploadedImage] = useState<string | null>(null);
   const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
 
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
 
   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onloadend = () => {
         setUploadedImage(reader.result as string);
       };
       reader.readAsDataURL(file);
     }
   };
 
   return (
     <div className="space-y-6 pt-12 md:pt-0">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bayar Iuran</h1>
           <p className="text-muted-foreground mt-1">Upload bukti pembayaran iuran mingguan</p>
         </div>
         <Link to="/dashboard/finance">
           <Button variant="ghost" size="sm" className="gap-2">
             Lihat Dashboard Kas
             <ArrowRight className="w-4 h-4" />
           </Button>
         </Link>
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
                       <button
                         onClick={() => status === 'unpaid' && setSelectedWeek(weeks[weekIdx])}
                         className={cn(
                           "w-10 h-10 rounded-xl flex items-center justify-center mx-auto border transition-transform",
                           getStatusClass(status),
                           status === 'unpaid' && 'hover:scale-110 cursor-pointer'
                         )}
                       >
                         {getStatusIcon(status)}
                       </button>
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
             <span className="text-sm text-muted-foreground">Belum Bayar (Klik untuk upload)</span>
           </div>
         </div>
       </div>
 
       {/* Upload Section */}
       <div className="glass-card rounded-2xl p-6">
         <h2 className="text-lg font-semibold text-foreground mb-4">Upload Bukti Transfer</h2>
         
         {selectedWeek && (
           <div className="mb-4 p-3 bg-primary/10 rounded-xl">
             <p className="text-sm text-primary font-medium">
               Mengupload bukti untuk: <span className="font-bold">{selectedWeek}</span>
             </p>
           </div>
         )}
 
         <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
           {uploadedImage ? (
             <div className="space-y-4">
               <img
                 src={uploadedImage}
                 alt="Bukti Transfer"
                 className="max-w-xs mx-auto rounded-xl shadow-soft"
               />
               <div className="flex gap-3 justify-center">
                 <Button variant="pill" size="sm">
                   <Check className="w-4 h-4 mr-2" />
                   Kirim Bukti
                 </Button>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setUploadedImage(null)}
                 >
                   Ganti Gambar
                 </Button>
               </div>
             </div>
           ) : (
             <label className="cursor-pointer">
               <input
                 type="file"
                 accept="image/*"
                 onChange={handleImageUpload}
                 className="hidden"
               />
               <div className="space-y-4">
                 <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                   <Upload className="w-8 h-8 text-muted-foreground" />
                 </div>
                 <div>
                   <p className="font-medium text-foreground">Klik untuk upload bukti transfer</p>
                   <p className="text-sm text-muted-foreground mt-1">PNG, JPG hingga 5MB</p>
                 </div>
               </div>
             </label>
           )}
         </div>
       </div>
     </div>
   );
 }