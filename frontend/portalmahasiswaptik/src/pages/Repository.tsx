 import { useState } from 'react';
 import { Folder, FileText, Video, Download, ChevronRight, ArrowLeft } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 
 // Semester data with pastel gradients
 const semesters = [
   { id: 1, name: 'Semester 1', gradient: 'from-primary/20 to-primary/5', courses: ['Pengantar Teknologi Informasi', 'Algoritma & Pemrograman', 'Matematika Dasar', 'Bahasa Inggris I', 'Pendidikan Pancasila', 'Fisika Dasar'] },
   { id: 2, name: 'Semester 2', gradient: 'from-success/20 to-success/5', courses: ['Struktur Data', 'Pemrograman Lanjut', 'Kalkulus', 'Bahasa Inggris II', 'Statistika', 'Sistem Digital'] },
   { id: 3, name: 'Semester 3', gradient: 'from-warning/20 to-warning/5', courses: ['Basis Data', 'Pemrograman Web', 'Sistem Operasi', 'Jaringan Komputer', 'Interaksi Manusia Komputer', 'Matematika Diskrit'] },
   { id: 4, name: 'Semester 4', gradient: 'from-destructive/20 to-destructive/5', courses: ['Rekayasa Perangkat Lunak', 'Pemrograman Mobile', 'Keamanan Informasi', 'Cloud Computing', 'Data Mining', 'Kecerdasan Buatan'] },
   { id: 5, name: 'Semester 5', gradient: 'from-accent/40 to-accent/10', courses: ['Machine Learning', 'Big Data', 'Pemrograman IoT', 'Manajemen Proyek TI', 'Etika Profesi', 'Kapita Selekta'] },
   { id: 6, name: 'Semester 6', gradient: 'from-primary/30 to-success/10', courses: ['Deep Learning', 'Blockchain', 'DevOps', 'Cyber Security', 'Metodologi Penelitian', 'Kerja Praktek'] },
   { id: 7, name: 'Semester 7', gradient: 'from-success/30 to-warning/10', courses: ['Skripsi', 'Seminar', 'Magang Industri', 'Pengembangan Karir', 'Kewirausahaan Digital', 'Proyek Akhir'] },
 ];
 
 // Mock files data
 const generateFiles = (courseName: string) => [
   { id: 1, name: `Modul ${courseName} - Pertemuan 1.pdf`, type: 'document', size: '2.4 MB' },
   { id: 2, name: `Slide Presentasi Minggu 1.pptx`, type: 'document', size: '5.1 MB' },
   { id: 3, name: `Video Pembelajaran - Intro.mp4`, type: 'video', size: '124 MB' },
   { id: 4, name: `Latihan Soal Bab 1.pdf`, type: 'document', size: '890 KB' },
   { id: 5, name: `Tutorial Praktikum.mp4`, type: 'video', size: '89 MB' },
   { id: 6, name: `Rangkuman Materi.pdf`, type: 'document', size: '1.2 MB' },
 ];
 
 type ViewState = 'semesters' | 'courses' | 'files';
 
 export default function Repository() {
   const [view, setView] = useState<ViewState>('semesters');
   const [selectedSemester, setSelectedSemester] = useState<typeof semesters[0] | null>(null);
   const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
   const [mediaFilter, setMediaFilter] = useState<'all' | 'document' | 'video'>('all');
 
   const handleSelectSemester = (semester: typeof semesters[0]) => {
     setSelectedSemester(semester);
     setView('courses');
   };
 
   const handleSelectCourse = (course: string) => {
     setSelectedCourse(course);
     setView('files');
   };
 
   const handleBack = () => {
     if (view === 'files') {
       setView('courses');
       setSelectedCourse(null);
     } else if (view === 'courses') {
       setView('semesters');
       setSelectedSemester(null);
     }
   };
 
   const files = selectedCourse ? generateFiles(selectedCourse) : [];
   const filteredFiles = mediaFilter === 'all' ? files : files.filter(f => f.type === mediaFilter);
 
   return (
     <div className="space-y-6 pt-12 md:pt-0">
       {/* Header with Breadcrumb */}
       <div className="flex items-center gap-4">
         {view !== 'semesters' && (
           <Button variant="ghost" size="icon" onClick={handleBack}>
             <ArrowLeft className="w-5 h-5" />
           </Button>
         )}
         <div>
           <h1 className="text-2xl md:text-3xl font-bold text-foreground">Repository Materi</h1>
           <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
             <span>Repository</span>
             {selectedSemester && (
               <>
                 <ChevronRight className="w-4 h-4" />
                 <span>{selectedSemester.name}</span>
               </>
             )}
             {selectedCourse && (
               <>
                 <ChevronRight className="w-4 h-4" />
                 <span className="truncate max-w-[200px]">{selectedCourse}</span>
               </>
             )}
           </div>
         </div>
       </div>
 
       {/* Semester Selection */}
       {view === 'semesters' && (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
           {semesters.map((semester) => (
             <button
               key={semester.id}
               onClick={() => handleSelectSemester(semester)}
               className={cn(
                 "glass-card rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-glow group",
                 `bg-gradient-to-br ${semester.gradient}`
               )}
             >
               <div className="w-14 h-14 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Folder className="w-7 h-7 text-primary" />
               </div>
               <h3 className="text-lg font-semibold text-foreground">{semester.name}</h3>
               <p className="text-sm text-muted-foreground mt-1">{semester.courses.length} Mata Kuliah</p>
             </button>
           ))}
         </div>
       )}
 
       {/* Course Selection */}
       {view === 'courses' && selectedSemester && (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {selectedSemester.courses.map((course, idx) => (
             <button
               key={idx}
               onClick={() => handleSelectCourse(course)}
               className="glass-card rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-soft group"
             >
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                   <Folder className="w-6 h-6 text-primary" />
                 </div>
                 <div className="min-w-0">
                   <h3 className="font-medium text-foreground line-clamp-2">{course}</h3>
                   <p className="text-sm text-muted-foreground mt-1">6 File tersedia</p>
                 </div>
               </div>
             </button>
           ))}
         </div>
       )}
 
       {/* Files List */}
       {view === 'files' && selectedCourse && (
         <div className="space-y-4">
           {/* Media Filter */}
           <div className="flex gap-2">
             {[
               { key: 'all', label: 'Semua' },
               { key: 'document', label: 'Dokumen', icon: FileText },
               { key: 'video', label: 'Video', icon: Video },
             ].map((filter) => (
               <Button
                 key={filter.key}
                 variant={mediaFilter === filter.key ? 'default' : 'ghost'}
                 size="sm"
                 onClick={() => setMediaFilter(filter.key as typeof mediaFilter)}
                 className={cn(mediaFilter === filter.key && 'primary-gradient')}
               >
                 {filter.icon && <filter.icon className="w-4 h-4 mr-2" />}
                 {filter.label}
               </Button>
             ))}
           </div>
 
           {/* File Cards */}
           <div className="space-y-3">
             {filteredFiles.map((file) => (
               <div
                 key={file.id}
                 className="glass-card rounded-xl p-4 flex items-center justify-between gap-4 hover:shadow-soft transition-shadow"
               >
                 <div className="flex items-center gap-4 min-w-0">
                   <div className={cn(
                     "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                     file.type === 'document' ? 'bg-primary/10' : 'bg-destructive/10'
                   )}>
                     {file.type === 'document' ? (
                       <FileText className="w-6 h-6 text-primary" />
                     ) : (
                       <Video className="w-6 h-6 text-destructive" />
                     )}
                   </div>
                   <div className="min-w-0">
                     <h4 className="font-medium text-foreground truncate">{file.name}</h4>
                     <p className="text-sm text-muted-foreground">{file.size}</p>
                   </div>
                 </div>
                 <Button variant="pill" size="sm" className="flex-shrink-0">
                   <Download className="w-4 h-4 mr-2" />
                   Download
                 </Button>
               </div>
             ))}
           </div>
         </div>
       )}
     </div>
   );
 }