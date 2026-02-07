 import { useState } from 'react';
 import { Megaphone, Calendar, Pin, ChevronRight, Bell, AlertCircle, Info } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { Button } from '@/components/ui/button';
 
 const announcements = [
   {
     id: 1,
     title: 'Jadwal UAS Semester Ganjil 2024/2025',
     content: 'Ujian Akhir Semester akan dilaksanakan pada tanggal 15-27 Januari 2025. Mahasiswa diharapkan mempersiapkan diri dengan baik. Jadwal lengkap dapat dilihat di SIAKAD.',
     date: '20 Jan 2025',
     category: 'Akademik',
     isPinned: true,
     isNew: true,
     type: 'warning'
   },
   {
     id: 2,
     title: 'Pembayaran SPP Semester Genap',
     content: 'Batas akhir pembayaran SPP semester genap adalah 31 Januari 2025. Mahasiswa yang belum melakukan pembayaran tidak dapat mengakses KRS online.',
     date: '18 Jan 2025',
     category: 'Keuangan',
     isPinned: true,
     isNew: true,
     type: 'alert'
   },
   {
     id: 3,
     title: 'Workshop AI & Machine Learning',
     content: 'Himpunan PTIK mengadakan workshop AI & Machine Learning pada Sabtu, 25 Januari 2025 di Lab Komputer Gedung D. Pendaftaran melalui link di grup angkatan.',
     date: '15 Jan 2025',
     category: 'Event',
     isPinned: false,
     isNew: true,
     type: 'info'
   },
   {
     id: 4,
     title: 'Pendaftaran KKN Semester Genap',
     content: 'Pendaftaran KKN untuk semester genap telah dibuka. Mahasiswa semester 6 ke atas dapat mendaftar melalui portal KKN UNJ.',
     date: '10 Jan 2025',
     category: 'Akademik',
     isPinned: false,
     isNew: false,
     type: 'info'
   },
   {
     id: 5,
     title: 'Maintenance Server SIAKAD',
     content: 'Server SIAKAD akan mengalami maintenance pada Minggu, 12 Januari 2025 pukul 00.00-06.00 WIB. Harap simpan pekerjaan sebelum waktu tersebut.',
     date: '08 Jan 2025',
     category: 'Sistem',
     isPinned: false,
     isNew: false,
     type: 'warning'
   },
   {
     id: 6,
     title: 'Lomba Hackathon Nasional 2025',
     content: 'Pendaftaran Hackathon Nasional telah dibuka! Hadiah total 50 juta rupiah. Daftar sekarang di halaman Info Lomba.',
     date: '05 Jan 2025',
     category: 'Lomba',
     isPinned: false,
     isNew: false,
     type: 'info'
   },
 ];
 
 const categories = ['Semua', 'Akademik', 'Keuangan', 'Event', 'Sistem', 'Lomba'];
 
 export default function Announcements() {
   const [selectedCategory, setSelectedCategory] = useState('Semua');
   const [expandedId, setExpandedId] = useState<number | null>(null);
 
   const filteredAnnouncements = selectedCategory === 'Semua'
     ? announcements
     : announcements.filter(a => a.category === selectedCategory);
 
   const pinnedAnnouncements = filteredAnnouncements.filter(a => a.isPinned);
   const regularAnnouncements = filteredAnnouncements.filter(a => !a.isPinned);
 
   const getTypeIcon = (type: string) => {
     switch (type) {
       case 'warning':
         return <AlertCircle className="w-5 h-5 text-warning-foreground" />;
       case 'alert':
         return <Bell className="w-5 h-5 text-destructive" />;
       default:
         return <Info className="w-5 h-5 text-primary" />;
     }
   };
 
   const getTypeBg = (type: string) => {
     switch (type) {
       case 'warning':
         return 'bg-warning/10 border-warning/30';
       case 'alert':
         return 'bg-destructive/10 border-destructive/30';
       default:
         return 'bg-primary/5 border-primary/20';
     }
   };
 
   return (
     <div className="space-y-6 pt-12 md:pt-0">
       {/* Header */}
       <div>
         <h1 className="text-2xl md:text-3xl font-bold text-foreground">Pengumuman</h1>
         <p className="text-muted-foreground mt-1">Informasi terbaru untuk angkatan PTIK 2025</p>
       </div>
 
       {/* Category Filter */}
       <div className="flex gap-2 flex-wrap">
         {categories.map((cat) => (
           <Button
             key={cat}
             variant={selectedCategory === cat ? 'default' : 'ghost'}
             size="sm"
             onClick={() => setSelectedCategory(cat)}
             className={selectedCategory === cat ? 'primary-gradient' : ''}
           >
             {cat}
           </Button>
         ))}
       </div>
 
       {/* Pinned Announcements */}
       {pinnedAnnouncements.length > 0 && (
         <div className="space-y-3">
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <Pin className="w-4 h-4" />
             <span>Disematkan</span>
           </div>
           {pinnedAnnouncements.map((announcement) => (
             <div
               key={announcement.id}
               className={cn(
                 "glass-card rounded-2xl p-5 border-2 transition-all duration-300 cursor-pointer hover:shadow-soft",
                 getTypeBg(announcement.type)
               )}
               onClick={() => setExpandedId(expandedId === announcement.id ? null : announcement.id)}
             >
               <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
                   {getTypeIcon(announcement.type)}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                     <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                     {announcement.isNew && (
                       <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                         New
                       </span>
                     )}
                   </div>
                   <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                     <span className="flex items-center gap-1">
                       <Calendar className="w-3 h-3" />
                       {announcement.date}
                     </span>
                     <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
                       {announcement.category}
                     </span>
                   </div>
                   {expandedId === announcement.id && (
                     <p className="mt-3 text-foreground/80 animate-fade-in">
                       {announcement.content}
                     </p>
                   )}
                 </div>
                 <ChevronRight className={cn(
                   "w-5 h-5 text-muted-foreground transition-transform",
                   expandedId === announcement.id && "rotate-90"
                 )} />
               </div>
             </div>
           ))}
         </div>
       )}
 
       {/* Regular Announcements */}
       <div className="space-y-3">
         {pinnedAnnouncements.length > 0 && regularAnnouncements.length > 0 && (
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <Megaphone className="w-4 h-4" />
             <span>Pengumuman Lainnya</span>
           </div>
         )}
         {regularAnnouncements.map((announcement) => (
           <div
             key={announcement.id}
             className="glass-card rounded-2xl p-5 transition-all duration-300 cursor-pointer hover:shadow-soft"
             onClick={() => setExpandedId(expandedId === announcement.id ? null : announcement.id)}
           >
             <div className="flex items-start gap-4">
               <div className={cn(
                 "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                 announcement.type === 'warning' ? 'bg-warning/10' : 'bg-primary/10'
               )}>
                 {getTypeIcon(announcement.type)}
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 flex-wrap">
                   <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                   {announcement.isNew && (
                     <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                       New
                     </span>
                   )}
                 </div>
                 <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                   <span className="flex items-center gap-1">
                     <Calendar className="w-3 h-3" />
                     {announcement.date}
                   </span>
                   <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
                     {announcement.category}
                   </span>
                 </div>
                 {expandedId === announcement.id && (
                   <p className="mt-3 text-foreground/80 animate-fade-in">
                     {announcement.content}
                   </p>
                 )}
               </div>
               <ChevronRight className={cn(
                 "w-5 h-5 text-muted-foreground transition-transform",
                 expandedId === announcement.id && "rotate-90"
               )} />
             </div>
           </div>
         ))}
       </div>
     </div>
   );
 }