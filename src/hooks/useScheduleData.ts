import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ScheduleItem {
  id: string;
  class_id: string;
  subject_id: string;
  day_of_week: number; // 1=Monday, 5=Friday
  start_time: string; // "08:00"
  end_time: string; // "10:30"
  room: string;
  lecturer_name: string;
  subject_name?: string;
  class_name?: string;
}

export interface TimeStatus {
  status: 'ongoing' | 'next' | 'finished' | 'upcoming';
  label: string;
}

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

export function useScheduleData() {
  const { profile, isAdminDev, isAdminKelas } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay();
    // Convert Sunday(0) to Monday(1), and cap at Friday(5)
    if (today === 0 || today === 6) return 1;
    return today;
  });

  const fetchClasses = useCallback(async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching classes:', error);
      return;
    }
    
    setClasses(data || []);
    if (data && data.length > 0) {
      if (profile?.class_id) {
        setSelectedClassId(profile.class_id);
      } else {
        setSelectedClassId(data[0].id);
      }
    }
  }, [profile?.class_id]);

  const fetchSubjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching subjects:', error);
      return;
    }
    
    setSubjects(data || []);
  }, []);

  const fetchSchedules = useCallback(async () => {
    // For now, we'll use mock data since schedule table doesn't exist
    // In production, this would fetch from a 'schedules' table
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchClasses(), fetchSubjects()]);
      await fetchSchedules();
    };
    init();
  }, [fetchClasses, fetchSubjects, fetchSchedules]);

  // Mock schedule data based on subjects
  const mockSchedules = useMemo((): ScheduleItem[] => {
    if (!selectedClassId || subjects.length === 0) return [];
    
    const mockData: ScheduleItem[] = [];
    const times = [
      { start: '08:00', end: '10:30' },
      { start: '13:00', end: '15:30' },
      { start: '16:00', end: '18:00' },
    ];
    const rooms = ['Lab Komputer 1', 'Lab Komputer 2', 'Lab Komputer 3', 'Ruang 301', 'Ruang 405', 'Ruang 502'];
    const lecturers = [
      'Dr. Bambang Susilo, M.Kom',
      'Prof. Dewi Anggraini, Ph.D',
      'Prof. Sri Wahyuni, M.Sc',
      'Agus Pratama, M.T',
      'Dr. Rini Wulandari, M.Kom',
      'Budi Santoso, M.T'
    ];

    // Generate 2-3 classes per day
    for (let day = 1; day <= 5; day++) {
      const numClasses = Math.min(2 + Math.floor(Math.random() * 2), 3);
      const usedTimes: number[] = [];
      
      for (let i = 0; i < numClasses && i < subjects.length; i++) {
        let timeIdx: number;
        do {
          timeIdx = Math.floor(Math.random() * times.length);
        } while (usedTimes.includes(timeIdx) && usedTimes.length < times.length);
        
        if (usedTimes.length >= times.length) continue;
        usedTimes.push(timeIdx);
        
        const subjectIdx = (day * 3 + i) % subjects.length;
        mockData.push({
          id: `${day}-${i}`,
          class_id: selectedClassId,
          subject_id: subjects[subjectIdx].id,
          day_of_week: day,
          start_time: times[timeIdx].start,
          end_time: times[timeIdx].end,
          room: rooms[Math.floor(Math.random() * rooms.length)],
          lecturer_name: lecturers[Math.floor(Math.random() * lecturers.length)],
          subject_name: subjects[subjectIdx].name,
          class_name: classes.find(c => c.id === selectedClassId)?.name
        });
      }
    }
    
    return mockData;
  }, [selectedClassId, subjects, classes]);

  const getTimeStatus = useCallback((schedule: ScheduleItem): TimeStatus => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = schedule.start_time.split(':').map(Number);
    const [endH, endM] = schedule.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // Convert Sunday(0) to 7 for comparison
    const adjustedCurrentDay = currentDay === 0 ? 7 : currentDay;
    
    if (schedule.day_of_week < adjustedCurrentDay) {
      return { status: 'finished', label: 'Selesai' };
    }
    
    if (schedule.day_of_week > adjustedCurrentDay) {
      return { status: 'upcoming', label: 'Akan Datang' };
    }
    
    // Same day
    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return { status: 'ongoing', label: 'Sedang Berlangsung' };
    }
    
    if (currentMinutes < startMinutes) {
      return { status: 'next', label: 'Selanjutnya' };
    }
    
    return { status: 'finished', label: 'Selesai' };
  }, []);

  const filteredSchedules = useMemo(() => {
    return mockSchedules
      .filter(s => s.day_of_week === selectedDay)
      .sort((a, b) => {
        const [aH, aM] = a.start_time.split(':').map(Number);
        const [bH, bM] = b.start_time.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });
  }, [mockSchedules, selectedDay]);

  // Find the next class indicator
  const schedulesWithStatus = useMemo(() => {
    let foundNext = false;
    
    return filteredSchedules.map(schedule => {
      const timeStatus = getTimeStatus(schedule);
      
      // Mark first upcoming/next class as "next"
      if (!foundNext && (timeStatus.status === 'next' || timeStatus.status === 'upcoming')) {
        if (schedule.day_of_week === selectedDay) {
          foundNext = true;
          return { ...schedule, timeStatus: { ...timeStatus, status: 'next' as const, label: 'Selanjutnya' } };
        }
      }
      
      return { ...schedule, timeStatus };
    });
  }, [filteredSchedules, getTimeStatus, selectedDay]);

  const canEdit = isAdminDev() || isAdminKelas();

  return {
    loading,
    schedules: schedulesWithStatus,
    allSchedules: mockSchedules,
    classes,
    subjects,
    selectedClassId,
    setSelectedClassId,
    selectedDay,
    setSelectedDay,
    dayNames: DAY_NAMES,
    getTimeStatus,
    canEdit,
    refetch: fetchSchedules
  };
}
