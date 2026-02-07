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
    if (ipk >= 3.5) return { label: 'Cumlaude', color: 'text-success', bg: 'bg-success/20', icon: Award };
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
                backgroundColor: ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))'][i % 3],
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

      {/* IPK Display */}
      <div className="glass-card rounded-3xl p-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", status.bg)}>
            <StatusIcon className={cn("w-8 h-8", status.color)} />
          </div>
        </div>
        
        <div className="text-6xl md:text-7xl font-bold text-foreground mb-2">
          {ipk.toFixed(2)}
        </div>
        
        <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", status.bg, status.color)}>
          <StatusIcon className="w-4 h-4" />
          {status.label}
        </div>

        {/* IPK Scale */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full rounded-full primary-gradient transition-all duration-500"
              style={{ width: `${(ipk / 4) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>0.00</span>
            <span>2.00</span>
            <span>3.00</span>
            <span>3.50</span>
            <span>4.00</span>
          </div>
        </div>
      </div>

      {/* Grade Input Grid */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Pilih Target Nilai
        </h2>

        <div className="space-y-4">
          {subjects.map((subject) => (
            <div key={subject.name} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-muted/30">
              <div>
                <p className="font-medium text-foreground">{subject.name}</p>
                <p className="text-sm text-muted-foreground">{subject.sks} SKS</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {grades.map((grade) => (
                  <Button
                    key={grade}
                    size="sm"
                    variant={selectedGrades[subject.name] === grade ? 'default' : 'ghost'}
                    onClick={() => setSelectedGrades(prev => ({ ...prev, [subject.name]: grade }))}
                    className={cn(
                      "min-w-[40px]",
                      selectedGrades[subject.name] === grade && "primary-gradient"
                    )}
                  >
                    {grade}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Ringkasan</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-primary/10">
            <div className="text-2xl font-bold text-primary">{subjects.length}</div>
            <div className="text-sm text-muted-foreground">Mata Kuliah</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-success/10">
            <div className="text-2xl font-bold text-success">
              {subjects.reduce((acc, s) => acc + s.sks, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total SKS</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-warning/20">
            <div className="text-2xl font-bold text-warning-foreground">
              {Object.values(selectedGrades).filter(g => g === 'A' || g === 'A-').length}
            </div>
            <div className="text-sm text-muted-foreground">Target A</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-accent">
            <div className="text-2xl font-bold text-accent-foreground">{ipk.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Prediksi IPK</div>
          </div>
        </div>
      </div>
    </div>
  );
}
