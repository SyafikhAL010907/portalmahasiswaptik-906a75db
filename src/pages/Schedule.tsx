import { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, Clock, MapPin, User, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScheduleData } from '@/hooks/useScheduleData';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Schedule() {
  const {
    loading,
    schedules,
    classes,
    selectedClassId,
    setSelectedClassId,
    selectedDay,
    setSelectedDay,
    dayNames,
    canEdit
  } = useScheduleData();

  const currentDayIndex = selectedDay - 1; // Convert to 0-indexed

  const goToPrevDay = () => {
    if (selectedDay > 1) {
      setSelectedDay(selectedDay - 1);
    }
  };

  const goToNextDay = () => {
    if (selectedDay < 5) {
      setSelectedDay(selectedDay + 1);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'border-l-4 border-l-primary bg-primary/5';
      case 'next':
        return 'border-l-4 border-l-warning bg-warning/5';
      case 'finished':
        return 'opacity-60';
      case 'upcoming':
      default:
        return '';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-primary/20 text-primary';
      case 'next':
        return 'bg-warning/30 text-warning-foreground';
      case 'finished':
        return 'bg-muted text-muted-foreground';
      case 'upcoming':
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pt-12 md:pt-0">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-16" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Jadwal Kuliah</h1>
          <p className="text-muted-foreground mt-1">
            Semester 5 • {classes.find(c => c.id === selectedClassId)?.name ? `Kelas ${classes.find(c => c.id === selectedClassId)?.name}` : 'Pilih Kelas'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter Kelas" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  Kelas {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Jadwal
            </Button>
          )}
        </div>
      </div>

      {/* Day Selector */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToPrevDay}
            disabled={selectedDay === 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide">
            {dayNames.map((day, index) => (
              <Button
                key={day}
                variant={selectedDay === index + 1 ? 'default' : 'ghost'}
                onClick={() => setSelectedDay(index + 1)}
                className={cn(
                  "min-w-[80px]",
                  selectedDay === index + 1 && 'primary-gradient'
                )}
              >
                {day}
              </Button>
            ))}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToNextDay}
            disabled={selectedDay === 5}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Schedule List */}
      <div className="space-y-4">
        {schedules.length > 0 ? (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={cn(
                "glass-card rounded-2xl p-5 transition-all hover:shadow-soft",
                getStatusStyle(schedule.timeStatus.status)
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-foreground">
                      {schedule.subject_name}
                    </h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      getStatusBadgeStyle(schedule.timeStatus.status)
                    )}>
                      {schedule.timeStatus.label}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{schedule.start_time} - {schedule.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{schedule.room}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{schedule.lecturer_name}</span>
                    </div>
                  </div>
                </div>

                {schedule.timeStatus.status === 'ongoing' && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse glow-primary" />
                    <span className="text-sm font-medium text-primary">Live</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card rounded-2xl p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
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
