 import { useState } from 'react';
 import { Folder, FolderOpen, Users, ChevronRight, ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 
 // Generate student data
 const generateStudents = (classLetter: string) => {
   const names = [
     'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gilang', 'Hana', 'Irfan', 'Joko',
     'Kartika', 'Lukman', 'Maya', 'Nadia', 'Oscar', 'Putri', 'Qori', 'Rama', 'Sari', 'Taufik',
     'Umi', 'Vina', 'Wahyu', 'Xena', 'Yusuf'
   ];
   return names.map((name, idx) => ({
     id: idx + 1,
     name: `${name} ${classLetter}${idx + 1}`,
     nim: `${classLetter}25${String(idx + 1).padStart(3, '0')}`,
     status: Math.random() > 0.2 ? 'hadir' : Math.random() > 0.5 ? 'izin' : 'alpha'
   }));
 };
 
 // Data structure
 const semesters = Array.from({ length: 7 }, (_, i) => ({
   id: i + 1,
   name: `Semester ${i + 1}`,
 }));
 
 const courses = [
   'Pengantar Teknologi Informasi',
   'Algoritma & Pemrograman',
   'Matematika Dasar',
   'Bahasa Inggris',
   'Pendidikan Pancasila',
   'Fisika Dasar'
 ];
 
 const meetings = Array.from({ length: 14 }, (_, i) => ({
   id: i + 1,
   name: `Pertemuan Minggu ${i + 1}`,
 }));
 
 const classes = ['A', 'B', 'C'];
 
 type ViewState = 'semesters' | 'courses' | 'meetings' | 'classes' | 'students';
 
 export default function AttendanceHistory() {
   const [view, setView] = useState<ViewState>('semesters');
   const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
   const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
   const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
   const [selectedClass, setSelectedClass] = useState<string | null>(null);
 
   const handleBack = () => {
     if (view === 'students') {
       setView('classes');
       setSelectedClass(null);
     } else if (view === 'classes') {
       setView('meetings');
       setSelectedMeeting(null);
     } else if (view === 'meetings') {
       setView('courses');
       setSelectedCourse(null);
     } else if (view === 'courses') {
       setView('semesters');
       setSelectedSemester(null);
     }
   };
 
   const getBreadcrumb = () => {
     const parts = ['Riwayat Kehadiran'];
     if (selectedSemester) parts.push(`Semester ${selectedSemester}`);
     if (selectedCourse) parts.push(selectedCourse);
     if (selectedMeeting) parts.push(`Pertemuan ${selectedMeeting}`);
     if (selectedClass) parts.push(`Kelas ${selectedClass}`);
     return parts;
   };
 
   const students = selectedClass ? generateStudents(selectedClass) : [];
 
   const getStatusIcon = (status: string) => {
     switch (status) {
       case 'hadir':
         return <CheckCircle className="w-5 h-5 text-success" />;
       case 'izin':
         return <Clock className="w-5 h-5 text-warning-foreground" />;
       case 'alpha':
         return <XCircle className="w-5 h-5 text-destructive" />;
       default:
         return null;
     }
   };
 
   const getStatusBadge = (status: string) => {
     const styles = {
       hadir: 'bg-success/10 text-success',
       izin: 'bg-warning/20 text-warning-foreground',
       alpha: 'bg-destructive/10 text-destructive',
     };
     return styles[status as keyof typeof styles] || '';
   };
 
   return (
     <div className="space-y-6 pt-12 md:pt-0">
       {/* Header */}
       <div className="flex items-center gap-4">
         {view !== 'semesters' && (
           <Button variant="ghost" size="icon" onClick={handleBack}>
             <ArrowLeft className="w-5 h-5" />
           </Button>
         )}
         <div>
           <h1 className="text-2xl md:text-3xl font-bold text-foreground">Riwayat Kehadiran</h1>
           <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
             {getBreadcrumb().map((item, idx) => (
               <span key={idx} className="flex items-center gap-2">
                 {idx > 0 && <ChevronRight className="w-4 h-4" />}
                 <span className={idx === getBreadcrumb().length - 1 ? 'text-foreground' : ''}>
                   {item.length > 20 ? item.substring(0, 20) + '...' : item}
                 </span>
               </span>
             ))}
           </div>
         </div>
       </div>
 
       {/* Semesters */}
       {view === 'semesters' && (
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
           {semesters.map((sem) => (
             <button
               key={sem.id}
               onClick={() => {
                 setSelectedSemester(sem.id);
                 setView('courses');
               }}
               className="glass-card rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-glow group"
             >
               <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                 <Folder className="w-7 h-7 text-primary" />
               </div>
               <h3 className="font-semibold text-foreground">{sem.name}</h3>
               <p className="text-sm text-muted-foreground mt-1">6 Mata Kuliah</p>
             </button>
           ))}
         </div>
       )}
 
       {/* Courses */}
       {view === 'courses' && (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {courses.map((course, idx) => (
             <button
               key={idx}
               onClick={() => {
                 setSelectedCourse(course);
                 setView('meetings');
               }}
               className="glass-card rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-soft group"
             >
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0 group-hover:bg-success/20 transition-colors">
                   <FolderOpen className="w-6 h-6 text-success" />
                 </div>
                 <div className="min-w-0">
                   <h3 className="font-medium text-foreground line-clamp-2">{course}</h3>
                   <p className="text-sm text-muted-foreground mt-1">14 Pertemuan</p>
                 </div>
               </div>
             </button>
           ))}
         </div>
       )}
 
       {/* Meetings */}
       {view === 'meetings' && (
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
           {meetings.map((meeting) => (
             <button
               key={meeting.id}
               onClick={() => {
                 setSelectedMeeting(meeting.id);
                 setView('classes');
               }}
               className="glass-card rounded-xl p-4 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-soft group"
             >
               <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-warning/20 transition-colors">
                 <span className="font-bold text-warning-foreground">{meeting.id}</span>
               </div>
               <p className="text-xs text-muted-foreground">Minggu {meeting.id}</p>
             </button>
           ))}
         </div>
       )}
 
       {/* Classes */}
       {view === 'classes' && (
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           {classes.map((cls) => (
             <button
               key={cls}
               onClick={() => {
                 setSelectedClass(cls);
                 setView('students');
               }}
               className="glass-card rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-glow group"
             >
               <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                 <Users className="w-8 h-8 text-foreground" />
               </div>
               <h3 className="text-xl font-bold text-foreground">Kelas {cls}</h3>
               <p className="text-sm text-muted-foreground mt-1">25 Mahasiswa</p>
             </button>
           ))}
         </div>
       )}
 
       {/* Students List */}
       {view === 'students' && (
         <div className="glass-card rounded-2xl overflow-hidden">
           {/* Summary */}
           <div className="p-4 border-b border-border flex flex-wrap gap-4">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-success" />
               <span className="text-sm text-muted-foreground">
                 Hadir: {students.filter(s => s.status === 'hadir').length}
               </span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-warning" />
               <span className="text-sm text-muted-foreground">
                 Izin: {students.filter(s => s.status === 'izin').length}
               </span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-destructive" />
               <span className="text-sm text-muted-foreground">
                 Alpha: {students.filter(s => s.status === 'alpha').length}
               </span>
             </div>
           </div>
 
           {/* Table */}
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead>
                 <tr className="border-b border-border">
                   <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">No</th>
                   <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">NIM</th>
                   <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nama</th>
                   <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                 </tr>
               </thead>
               <tbody>
                 {students.map((student, idx) => (
                   <tr key={student.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                     <td className="py-3 px-4 text-sm text-muted-foreground">{idx + 1}</td>
                     <td className="py-3 px-4 text-sm font-mono text-foreground">{student.nim}</td>
                     <td className="py-3 px-4 text-sm text-foreground">{student.name}</td>
                     <td className="py-3 px-4 text-center">
                       <span className={cn(
                         "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                         getStatusBadge(student.status)
                       )}>
                         {getStatusIcon(student.status)}
                         <span className="capitalize">{student.status}</span>
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
       )}
     </div>
   );
 }