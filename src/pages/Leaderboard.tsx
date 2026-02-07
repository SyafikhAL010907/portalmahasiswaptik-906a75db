 import { Trophy, Medal, Crown, TrendingUp, Users, GraduationCap } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 // Student data sorted by IPK (GPA)
 const students = [
   { rank: 1, name: 'Citra Dewi Ayu', nim: 'A25001', class: 'A', ipk: 3.98, semester: 5 },
   { rank: 2, name: 'Ahmad Fauzan Rahman', nim: 'B25012', class: 'B', ipk: 3.95, semester: 5 },
   { rank: 3, name: 'Sari Indah Permata', nim: 'A25008', class: 'A', ipk: 3.92, semester: 5 },
   { rank: 4, name: 'Budi Santoso Wijaya', nim: 'C25003', class: 'C', ipk: 3.89, semester: 5 },
   { rank: 5, name: 'Dian Pratama Putra', nim: 'A25015', class: 'A', ipk: 3.87, semester: 5 },
   { rank: 6, name: 'Eka Putri Rahayu', nim: 'B25007', class: 'B', ipk: 3.85, semester: 5 },
   { rank: 7, name: 'Gilang Ramadhan', nim: 'C25011', class: 'C', ipk: 3.82, semester: 5 },
   { rank: 8, name: 'Hana Safitri', nim: 'A25020', class: 'A', ipk: 3.80, semester: 5 },
   { rank: 9, name: 'Irfan Maulana', nim: 'B25018', class: 'B', ipk: 3.78, semester: 5 },
   { rank: 10, name: 'Joko Widodo Pratama', nim: 'C25005', class: 'C', ipk: 3.76, semester: 5 },
   { rank: 11, name: 'Kartika Sari Dewi', nim: 'A25022', class: 'A', ipk: 3.74, semester: 5 },
   { rank: 12, name: 'Lukman Hakim', nim: 'B25009', class: 'B', ipk: 3.72, semester: 5 },
   { rank: 13, name: 'Maya Angelina', nim: 'C25014', class: 'C', ipk: 3.70, semester: 5 },
   { rank: 14, name: 'Nadia Putri Cantika', nim: 'A25025', class: 'A', ipk: 3.68, semester: 5 },
   { rank: 15, name: 'Oscar Pratama', nim: 'B25021', class: 'B', ipk: 3.65, semester: 5 },
 ];
 
 // Class statistics
 const classStats = [
   { class: 'A', avgIpk: 3.72, totalStudents: 25, cumlaude: 8 },
   { class: 'B', avgIpk: 3.68, totalStudents: 25, cumlaude: 6 },
   { class: 'C', avgIpk: 3.65, totalStudents: 25, cumlaude: 5 },
 ];
 
 export default function Leaderboard() {
   const getRankIcon = (rank: number) => {
     switch (rank) {
       case 1:
         return <Crown className="w-6 h-6 text-yellow-500" />;
       case 2:
         return <Medal className="w-6 h-6 text-gray-400" />;
       case 3:
         return <Medal className="w-6 h-6 text-amber-600" />;
       default:
         return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
     }
   };
 
   const getRankBg = (rank: number) => {
     switch (rank) {
       case 1:
         return 'bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
       case 2:
         return 'bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/30';
       case 3:
         return 'bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-600/30';
       default:
         return '';
     }
   };
 
   const getClassColor = (cls: string) => {
     switch (cls) {
       case 'A':
         return 'bg-primary/10 text-primary';
       case 'B':
         return 'bg-success/10 text-success';
       case 'C':
         return 'bg-warning/10 text-warning-foreground';
       default:
         return 'bg-muted text-muted-foreground';
     }
   };
 
   return (
     <div className="space-y-6 pt-12 md:pt-0">
       {/* Header */}
       <div>
         <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leaderboard IPK</h1>
         <p className="text-muted-foreground mt-1">Peringkat mahasiswa berdasarkan IPK tertinggi</p>
       </div>
 
       {/* Class Statistics */}
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         {classStats.map((stat, idx) => (
           <div key={stat.class} className="glass-card rounded-2xl p-5 relative overflow-hidden">
             {idx === 0 && (
               <div className="absolute top-2 right-2">
                 <Trophy className="w-5 h-5 text-yellow-500" />
               </div>
             )}
             <div className="flex items-center gap-3 mb-3">
               <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", getClassColor(stat.class))}>
                 <span className="text-xl font-bold">{stat.class}</span>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Kelas {stat.class}</p>
                 <p className="text-2xl font-bold text-foreground">{stat.avgIpk.toFixed(2)}</p>
               </div>
             </div>
             <div className="flex items-center justify-between text-sm">
               <div className="flex items-center gap-1 text-muted-foreground">
                 <Users className="w-4 h-4" />
                 <span>{stat.totalStudents} mahasiswa</span>
               </div>
               <div className="flex items-center gap-1 text-success">
                 <GraduationCap className="w-4 h-4" />
                 <span>{stat.cumlaude} cumlaude</span>
               </div>
             </div>
           </div>
         ))}
       </div>
 
       {/* Top 3 Podium */}
       <div className="glass-card rounded-2xl p-6">
         <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
           <Trophy className="w-5 h-5 text-yellow-500" />
           Top 3 Mahasiswa
         </h2>
         <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8">
           {/* 2nd Place */}
           <div className="order-2 md:order-1 flex flex-col items-center">
             <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center mb-3 shadow-lg">
               <Medal className="w-10 h-10 text-white" />
             </div>
             <div className="text-center">
               <p className="font-semibold text-foreground">{students[1].name}</p>
               <p className="text-sm text-muted-foreground">{students[1].nim}</p>
               <p className="text-xl font-bold text-gray-400 mt-1">{students[1].ipk.toFixed(2)}</p>
             </div>
             <div className="w-24 h-16 bg-gray-400/20 rounded-t-lg mt-4 flex items-center justify-center">
               <span className="text-2xl font-bold text-gray-400">2</span>
             </div>
           </div>
 
           {/* 1st Place */}
           <div className="order-1 md:order-2 flex flex-col items-center">
             <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mb-3 shadow-xl animate-pulse-glow">
               <Crown className="w-12 h-12 text-white" />
             </div>
             <div className="text-center">
               <p className="font-bold text-lg text-foreground">{students[0].name}</p>
               <p className="text-sm text-muted-foreground">{students[0].nim}</p>
               <p className="text-2xl font-bold text-yellow-500 mt-1">{students[0].ipk.toFixed(2)}</p>
             </div>
             <div className="w-28 h-24 bg-yellow-500/20 rounded-t-lg mt-4 flex items-center justify-center">
               <span className="text-3xl font-bold text-yellow-500">1</span>
             </div>
           </div>
 
           {/* 3rd Place */}
           <div className="order-3 flex flex-col items-center">
             <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mb-3 shadow-lg">
               <Medal className="w-10 h-10 text-white" />
             </div>
             <div className="text-center">
               <p className="font-semibold text-foreground">{students[2].name}</p>
               <p className="text-sm text-muted-foreground">{students[2].nim}</p>
               <p className="text-xl font-bold text-amber-600 mt-1">{students[2].ipk.toFixed(2)}</p>
             </div>
             <div className="w-24 h-12 bg-amber-600/20 rounded-t-lg mt-4 flex items-center justify-center">
               <span className="text-2xl font-bold text-amber-600">3</span>
             </div>
           </div>
         </div>
       </div>
 
       {/* Full Ranking Table */}
       <div className="glass-card rounded-2xl overflow-hidden">
         <div className="p-4 border-b border-border">
           <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
             <TrendingUp className="w-5 h-5 text-primary" />
             Peringkat Lengkap
           </h2>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full">
             <thead>
               <tr className="border-b border-border">
                 <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground w-16">Rank</th>
                 <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nama</th>
                 <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">NIM</th>
                 <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Kelas</th>
                 <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">IPK</th>
               </tr>
             </thead>
             <tbody>
               {students.map((student, idx) => (
                 <tr
                   key={student.nim}
                   className={cn(
                     "transition-colors",
                     idx % 2 === 0 ? 'bg-muted/30' : '',
                     student.rank <= 3 && getRankBg(student.rank),
                     student.rank <= 3 && 'border-l-4'
                   )}
                 >
                   <td className="py-3 px-4 text-center">
                     <div className="flex items-center justify-center">
                       {getRankIcon(student.rank)}
                     </div>
                   </td>
                   <td className="py-3 px-4">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                         <span className="text-xs font-medium text-primary">
                           {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                         </span>
                       </div>
                       <span className="font-medium text-foreground">{student.name}</span>
                     </div>
                   </td>
                   <td className="py-3 px-4 text-sm font-mono text-muted-foreground">{student.nim}</td>
                   <td className="py-3 px-4 text-center">
                     <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getClassColor(student.class))}>
                       Kelas {student.class}
                     </span>
                   </td>
                   <td className="py-3 px-4 text-center">
                     <span className={cn(
                       "font-bold",
                       student.ipk >= 3.75 ? 'text-success' : student.ipk >= 3.50 ? 'text-primary' : 'text-foreground'
                     )}>
                       {student.ipk.toFixed(2)}
                     </span>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
     </div>
   );
 }