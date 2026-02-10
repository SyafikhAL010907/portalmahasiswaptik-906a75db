import { useState, useEffect } from 'react';
import { Calculator, Star, AlertTriangle, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const grades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'E'];
const gradePoints: Record<string, number> = {
  'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'D': 1.0, 'E': 0.0
};

const subjects = [
  { name: 'Pemrograman Web Lanjut', sks: 3 },
  { name: 'Basis Data', sks: 3 },
  { name: 'Jaringan Komputer', sks: 3 },
  { name: 'Kecerdasan Buatan', sks: 3 },
  { name: 'Mobile Development', sks: 3 },
  { name: 'Keamanan Sistem', sks: 3 },
];

export default function IPKSimulator() {
  const [selectedGrades, setSelectedGrades] = useState<Record<string, string>>(
    Object.fromEntries(subjects.map(s => [s.name, 'B+']))
  );
  const [ipk, setIpk] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    let totalPoints = 0;
    let totalSks = 0;

    subjects.forEach(subject => {
      const grade = selectedGrades[subject.name];
      totalPoints += gradePoints[grade] * subject.sks;
      totalSks += subject.sks;
    });

    const calculatedIpk = totalSks > 0 ? totalPoints / totalSks : 0;
    setIpk(Number(calculatedIpk.toFixed(2)));

    if (calculatedIpk >= 3.5 && !showConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, [selectedGrades]);

  const getIpkStatus = () => {
    if (ipk >= 3.5) return { label: 'Cumlaude', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', icon: Award };
    if (ipk >= 3.0) return { label: 'Sangat Memuaskan', color: 'text-primary', bg: 'bg-primary/20', icon: Star };
    if (ipk >= 2.5) return { label: 'Memuaskan', color: 'text-warning-foreground', bg: 'bg-warning/30', icon: Star };
    return { label: 'Perlu Peningkatan', color: 'text-destructive', bg: 'bg-destructive/20', icon: AlertTriangle };
  };

  const status = getIpkStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6 pt-12 md:pt-0 relative">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '100%',
                backgroundColor: ['hsl(var(--primary))', '#3b82f6', '#a855f7'][i % 3],
                animationDelay: `${Math.random() * 0.5}s`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Simulator IPK</h1>
        <p className="text-muted-foreground mt-1">Rencanakan target nilaimu dan lihat prediksi IPK</p>
      </div>

      {/* IPK Display - HERO CARD */}
      <div className={cn(
        "bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 dark:from-slate-900 dark:via-indigo-950/10 dark:to-purple-950/10",
        "rounded-3xl p-10 text-center border border-indigo-100/50 dark:border-indigo-900/30",
        "shadow-sm hover-glow-blue cursor-default relative overflow-hidden group"
      )}>
        {/* Decorative Glass Elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors duration-500" />

        <div className="relative z-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner", status.bg)}>
              <StatusIcon className={cn("w-10 h-10", status.color)} />
            </div>
          </div>

          <div className="text-7xl md:text-8xl font-black text-foreground mb-4 tracking-tighter transition-all duration-500 group-hover:scale-105">
            {ipk.toFixed(2)}
          </div>

          <div className={cn("inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm", status.bg, status.color)}>
            <StatusIcon className="w-4 h-4" />
            {status.label}
          </div>

          {/* IPK Scale */}
          <div className="mt-10 max-w-md mx-auto">
            <div className="h-4 rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 shadow-inner overflow-hidden border border-border/20">
              <div
                className="h-full rounded-full primary-gradient transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1)"
                style={{ width: `${(ipk / 4) * 100}%` }}
              >
                <div className="w-full h-full opacity-30 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px]" />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground mt-3 px-1 uppercase tracking-tighter">
              <span>0.00</span>
              <span>2.00</span>
              <span>3.00</span>
              <span>3.50</span>
              <span className="text-primary font-black">4.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Input - CARD CONTAINER */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground px-2 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Pilih Target Nilai
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {subjects.map((subject) => (
            <div
              key={subject.name}
              className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 group hover-glow-blue"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20 transition-colors group-hover:bg-primary group-hover:text-white">
                    {subject.sks}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{subject.name}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{subject.sks} Sks • Mata Kuliah Inti</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 p-1 bg-secondary/30 dark:bg-slate-900/50 rounded-xl">
                  {grades.map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setSelectedGrades(prev => ({ ...prev, [subject.name]: grade }))}
                      className={cn(
                        "flex-1 min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all duration-300",
                        selectedGrades[subject.name] === grade
                          ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                          : "text-muted-foreground hover:bg-white dark:hover:bg-slate-800 hover:text-primary hover:shadow-sm hover:-translate-y-0.5"
                      )}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-20">
        {[
          { label: 'Matkul', val: subjects.length, color: 'text-primary', bg: 'bg-card hover-glow-blue' },
          { label: 'Total SKS', val: subjects.reduce((acc, s) => acc + s.sks, 0), color: 'text-success', bg: 'bg-card hover-glow-blue' },
          { label: 'Target A', val: Object.values(selectedGrades).filter(g => g === 'A' || g === 'A-').length, color: 'text-warning-foreground', bg: 'bg-card hover-glow-yellow' },
          { label: 'Prediksi IPK', val: ipk.toFixed(2), color: 'text-white', bg: 'primary-gradient shadow-lg shadow-primary/20 hover:scale-105 group' }
        ].map((item, i) => (
          <div key={i} className={cn("p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all border border-border/50 shadow-sm cursor-default", item.bg)}>
            <span className={cn("text-[10px] font-black uppercase tracking-widest mb-1 opacity-70 group-hover:scale-110 transition-transform", item.color === 'text-white' ? 'text-white' : 'text-muted-foreground')}>
              {item.label}
            </span>
            <span className={cn("text-3xl font-black tracking-tighter transition-transform group-hover:scale-110", item.color)}>
              {item.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
