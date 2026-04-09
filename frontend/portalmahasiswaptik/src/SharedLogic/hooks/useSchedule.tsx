import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// --- INTERFACES ---
interface Schedule {
  id: string;
  subject_id: string;
  class_id: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  lecturer_id?: string;
  // Joins
  subjects?: { name: string; semester: number };
  classes?: { name: string };
  profiles?: { full_name: string };
}

interface Subject {
  id: string;
  name: string;
  semester: number;
}

interface ClassItem {
  id: string;
  name: string;
}

interface SemesterItem {
  id: number;
  name: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export function useSchedule() {
  // --- STATE ---
  const [selectedDay, setSelectedDay] = useState<string>('Senin');
  const [selectedClass, setSelectedClass] = useState<string | null>(null); // Filter by Class ID
  const [classList, setClassList] = useState<ClassItem[]>([]);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [lecturers, setLecturers] = useState<Profile[]>([]); 
  const [isLoading, setIsLoading] = useState(false);

  // RBAC
  const [canManage, setCanManage] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userClassId, setUserClassId] = useState<string | null>(null);

  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [deleteScheduleConfig, setDeleteScheduleConfig] = useState<{
    isOpen: boolean;
    targetId: string;
  }>({
    isOpen: false,
    targetId: '',
  });
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: '',
    class_id: '',
    day: 'Senin',
    start_time: '',
    end_time: '',
    room: '',
    semester: '',
    lecturer_id: ''
  });

  const currentDayIndex = days.indexOf(selectedDay);

  // --- INITIAL LOAD ---
  useEffect(() => {
    checkRole();
    fetchClasses();
    fetchSemesters();
    fetchSubjects();
    fetchLecturers();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSchedules();
    }
    evaluatePermissions();
  }, [selectedDay, selectedClass, userRole, userClassId]);

  useEffect(() => {
    if (classList.length > 0 && !selectedClass) {
      if (userClassId && classList.some(c => c.id === userClassId)) {
        setSelectedClass(userClassId);
      } else if (userRole === 'admin_dev' || !userRole) {
        setSelectedClass(classList[0].id);
      }
    }
  }, [classList, userClassId, userRole]);

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const role = (roleProfile as any)?.role || null;
      setUserRole(role);

      const { data: profile } = await supabase
        .from('profiles')
        .select('class_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setUserClassId((profile as any).class_id);
      }
    }
  };

  const evaluatePermissions = () => {
    if (userRole === 'admin_dev') {
      setCanManage(true);
    } else if (userRole === 'admin_kelas') {
      setCanManage(userClassId === selectedClass);
    } else {
      setCanManage(false);
    }
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('id, name').order('name');
    if (data) setClassList(data);
  };

  const fetchSemesters = async () => {
    const { data } = await supabase.from('semesters').select('*').order('name');
    if (data) setSemesters(data);
  };

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('id, name, semester').order('name');
    if (data) setSubjects(data);
  };

  const fetchLecturers = async () => {
    const { data: rolesData } = await (supabase as any)
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin_dosen');

    if (rolesData && rolesData.length > 0) {
      const lecturerIds = rolesData.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', lecturerIds)
        .order('full_name');

      if (profiles) setLecturers(profiles);
    } else {
      setLecturers([]);
    }
  };

  const fetchSchedules = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      const { data: schedulesData, error } = await supabase
        .from('schedules')
        .select(`
          *,
          subjects ( name, semester ),
          classes ( name )
        `)
        .eq('class_id', selectedClass)
        .eq('day', selectedDay)
        .order('start_time');

      if (error) {
        console.error("❌ SUPABASE_JADWAL_ERROR:", error.message);
        toast.error("Database menolak akses jadwal (RLS issue)");
        throw error;
      }

      const lecturerIds = [...new Set(schedulesData?.map(s => s.lecturer_id).filter(Boolean) as string[])];
      let profilesMap: Record<string, { full_name: string }> = {};
      if (lecturerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', lecturerIds);

        if (profiles) {
          profiles.forEach(p => {
            profilesMap[p.user_id] = { full_name: p.full_name };
          });
        }
      }

      const enrichedSchedules = schedulesData?.map(s => ({
        ...s,
        profiles: s.lecturer_id ? profilesMap[s.lecturer_id] : undefined
      })) || [];

      setSchedules(enrichedSchedules);
    } catch (err: any) {
      toast.error("Gagal memuat jadwal: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatus = (day: string, start: string, end: string) => {
    const now = new Date();
    const currentDayName = now.toLocaleDateString('id-ID', { weekday: 'long' });

    if (day !== currentDayName) {
      const dayIdx = days.indexOf(day);
      const currIdx = days.indexOf(currentDayName);
      if (dayIdx < currIdx) return 'finished';
      if (dayIdx > currIdx) return 'upcoming';
    }

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = start.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const [endH, endM] = end.split(':').map(Number);
    const endTime = endH * 60 + endM;

    if (currentTime > endTime) return 'finished';
    if (currentTime >= startTime && currentTime <= endTime) return 'ongoing';
    return 'next';
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      subject_id: '',
      class_id: selectedClass || '',
      day: selectedDay,
      start_time: '',
      end_time: '',
      room: '',
      semester: '',
      lecturer_id: ''
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (schedule: Schedule) => {
    setIsEditing(true);
    setCurrentId(schedule.id);
    setFormData({
      subject_id: schedule.subject_id,
      class_id: schedule.class_id,
      day: schedule.day,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      room: schedule.room,
      semester: schedule.subjects?.semester?.toString() || '',
      lecturer_id: schedule.lecturer_id || ''
    });
    setIsDialogOpen(true);
  };

  const executeDeleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) {
        console.error("Supabase Error Deleting Schedule:", error);
        throw error;
      }
      toast.success("Jadwal dihapus");
      fetchSchedules();
    } catch (err: any) {
      console.error("Error Delete Schedule:", err);
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!formData.subject_id || !formData.class_id || !formData.start_time || !formData.end_time) {
      toast.error("Mohon lengkapi data mata kuliah, kelas, dan waktu");
      return;
    }

    setIsLoading(true);
    try {
      const { semester, ...payload } = formData;
      const finalPayload = {
        ...payload,
        lecturer_id: payload.lecturer_id === '' ? null : payload.lecturer_id
      };

      if (isEditing && currentId) {
        const { error } = await supabase.from('schedules').update(finalPayload).eq('id', currentId);
        if (error) {
          console.error("Supabase Error Updating Schedule:", error);
          throw error;
        }
        toast.success("Jadwal diperbarui");
      } else {
        const { error } = await supabase.from('schedules').insert([finalPayload]);
        if (error) {
          console.error("Supabase Error Inserting Schedule:", error);
          throw error;
        }
        toast.success("Jadwal ditambahkan");
      }

      setIsDialogOpen(false);
      fetchSchedules();
    } catch (err: any) {
      console.error("Error Submit Schedule:", err);
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPrevDay = () => {
    if (currentDayIndex > 0) setSelectedDay(days[currentDayIndex - 1]);
  };

  const goToNextDay = () => {
    if (currentDayIndex < days.length - 1) setSelectedDay(days[currentDayIndex + 1]);
  };

  return {
    state: {
      selectedDay, selectedClass, classList, schedules, subjects, semesters, lecturers,
      isLoading, canManage, userRole, isDialogOpen, isEditing, deleteScheduleConfig,
      isStartOpen, isEndOpen, formData, currentDayIndex, days
    },
    actions: {
      setSelectedDay, setSelectedClass, setIsDialogOpen, setDeleteScheduleConfig,
      setIsStartOpen, setIsEndOpen, setFormData, handleOpenAdd, handleOpenEdit,
      executeDeleteSchedule, handleSubmit, goToPrevDay, goToNextDay, getStatus, fetchSchedules
    }
  };
}
