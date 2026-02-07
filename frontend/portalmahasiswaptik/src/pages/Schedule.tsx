import { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduleCard } from '@/components/dashboard/ScheduleCard';

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

interface ScheduleItem {
  subject: string;
  time: string;
  room: string;
  lecturer: string;
  isActive?: boolean;
  isNext?: boolean;
}

const scheduleData: Record<string, ScheduleItem[]> = {
  Senin: [
    { subject: 'Pemrograman Web Lanjut', time: '08:00 - 10:30', room: 'Lab Komputer 3', lecturer: 'Dr. Bambang Susilo, M.Kom' },
    { subject: 'Algoritma & Struktur Data', time: '13:00 - 15:30', room: 'Ruang 301', lecturer: 'Prof. Dewi Anggraini, Ph.D' },
  ],
  Selasa: [
    { subject: 'Basis Data', time: '08:00 - 10:30', room: 'Ruang 405', lecturer: 'Prof. Sri Wahyuni, M.Sc' },
    { subject: 'Sistem Operasi', time: '13:00 - 15:30', room: 'Lab Komputer 2', lecturer: 'Agus Pratama, M.T' },
  ],
  Rabu: [
    { subject: 'Pemrograman Web Lanjut', time: '08:00 - 10:30', room: 'Lab Komputer 3', lecturer: 'Dr. Bambang Susilo, M.Kom', isActive: true },
    { subject: 'Basis Data', time: '13:00 - 15:30', room: 'Ruang 405', lecturer: 'Prof. Sri Wahyuni, M.Sc', isNext: true },
    { subject: 'Jaringan Komputer', time: '16:00 - 18:00', room: 'Lab Jarkom', lecturer: 'Agus Setiawan, M.T' },
  ],
  Kamis: [
    { subject: 'Kecerdasan Buatan', time: '08:00 - 10:30', room: 'Ruang 502', lecturer: 'Dr. Rini Wulandari, M.Kom' },
    { subject: 'Mobile Development', time: '13:00 - 15:30', room: 'Lab Komputer 1', lecturer: 'Budi Santoso, M.T' },
  ],
  Jumat: [
    { subject: 'Keamanan Sistem', time: '08:00 - 10:30', room: 'Lab Jarkom', lecturer: 'Andi Wijaya, M.Cs' },
    { subject: 'Manajemen Proyek TI', time: '13:00 - 15:30', room: 'Ruang 403', lecturer: 'Dr. Siti Rahayu, MBA' },
  ],
};



export default function Schedule() {
  const [selectedDay, setSelectedDay] = useState('Rabu');
  const currentDayIndex = days.indexOf(selectedDay);

  const goToPrevDay = () => {
    if (currentDayIndex > 0) {
      setSelectedDay(days[currentDayIndex - 1]);
    }
  };

  const goToNextDay = () => {
    if (currentDayIndex < days.length - 1) {
      setSelectedDay(days[currentDayIndex + 1]);
    }
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Jadwal Kuliah</h1>
          <p className="text-muted-foreground mt-1">Semester 5 • Kelas A</p>
        </div>
        <Button variant="glass" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter Kelas
        </Button>
      </div>

      {/* Day Selector */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToPrevDay}
            disabled={currentDayIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide">
            {days.map((day) => (
              <Button
                key={day}
                variant={selectedDay === day ? 'default' : 'ghost'}
                onClick={() => setSelectedDay(day)}
                className={`min-w-[80px] ${selectedDay === day ? 'primary-gradient' : ''}`}
              >
                {day}
              </Button>
            ))}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToNextDay}
            disabled={currentDayIndex === days.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Schedule List */}
      <div className="space-y-4">
        {scheduleData[selectedDay]?.length > 0 ? (
          scheduleData[selectedDay].map((schedule, index) => (
            <ScheduleCard key={index} {...schedule} />
          ))
        ) : (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Tidak ada jadwal untuk hari ini</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary glow-primary" />
            <span className="text-muted-foreground">Sedang Berlangsung</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-muted-foreground">Selanjutnya</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span className="text-muted-foreground">Selesai / Akan Datang</span>
          </div>
        </div>
      </div>
    </div>
  );
}
