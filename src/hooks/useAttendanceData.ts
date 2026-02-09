import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
}

export interface Meeting {
  id: string;
  subject_id: string;
  meeting_number: number;
  topic: string | null;
}

export interface ClassData {
  id: string;
  name: string;
}

export interface AttendanceSession {
  id: string;
  meeting_id: string;
  class_id: string;
  qr_code: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  scanned_at: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  latitude: number | null;
  longitude: number | null;
  student_name?: string;
  student_nim?: string;
}

export function useAttendanceData() {
  const { user, isAdminDev, isAdminDosen } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Semester grouping
  const semesters = Array.from({ length: 7 }, (_, i) => i + 1);

  const fetchSubjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('semester', { ascending: true })
      .order('name');
    
    if (error) {
      console.error('Error fetching subjects:', error);
      return;
    }
    setSubjects(data || []);
  }, []);

  const fetchMeetings = useCallback(async (subjectId?: string) => {
    let query = supabase
      .from('meetings')
      .select('*')
      .order('meeting_number');
    
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching meetings:', error);
      return;
    }
    setMeetings(data || []);
  }, []);

  const fetchClasses = useCallback(async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching classes:', error);
      return;
    }
    setClasses(data || []);
  }, []);

  const fetchSessions = useCallback(async (meetingId?: string, classId?: string) => {
    let query = supabase
      .from('attendance_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (meetingId) {
      query = query.eq('meeting_id', meetingId);
    }
    if (classId) {
      query = query.eq('class_id', classId);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching sessions:', error);
      return;
    }
    setSessions(data || []);
  }, []);

  const fetchRecords = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', sessionId)
      .order('scanned_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching records:', error);
      return;
    }

    // Fetch student profiles
    const studentIds = data?.map(r => r.student_id).filter(Boolean) || [];
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, nim')
        .in('user_id', studentIds);
      
      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { name: p.full_name, nim: p.nim }]) || []
      );

      const enrichedRecords = (data || []).map(record => ({
        ...record,
        status: record.status as 'present' | 'late' | 'absent' | 'excused',
        student_name: profileMap.get(record.student_id)?.name,
        student_nim: profileMap.get(record.student_id)?.nim
      }));
      
      setRecords(enrichedRecords);
    } else {
      setRecords([]);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchSubjects(), fetchClasses()]);
      setLoading(false);
    };
    loadInitialData();
  }, [fetchSubjects, fetchClasses]);

  // CRUD Operations
  const createSubject = async (data: Omit<Subject, 'id'>) => {
    const { data: newSubject, error } = await supabase
      .from('subjects')
      .insert(data)
      .select()
      .single();
    
    if (error) {
      toast.error('Gagal membuat mata kuliah');
      throw error;
    }
    
    toast.success('Mata kuliah berhasil dibuat');
    await fetchSubjects();
    return newSubject;
  };

  const updateSubject = async (id: string, data: Partial<Subject>) => {
    const { error } = await supabase
      .from('subjects')
      .update(data)
      .eq('id', id);
    
    if (error) {
      toast.error('Gagal mengupdate mata kuliah');
      throw error;
    }
    
    toast.success('Mata kuliah berhasil diupdate');
    await fetchSubjects();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Gagal menghapus mata kuliah');
      throw error;
    }
    
    toast.success('Mata kuliah berhasil dihapus');
    await fetchSubjects();
  };

  const createMeeting = async (data: Omit<Meeting, 'id'>) => {
    const { data: newMeeting, error } = await supabase
      .from('meetings')
      .insert(data)
      .select()
      .single();
    
    if (error) {
      toast.error('Gagal membuat pertemuan');
      throw error;
    }
    
    toast.success('Pertemuan berhasil dibuat');
    return newMeeting;
  };

  const updateMeeting = async (id: string, data: Partial<Meeting>) => {
    const { error } = await supabase
      .from('meetings')
      .update(data)
      .eq('id', id);
    
    if (error) {
      toast.error('Gagal mengupdate pertemuan');
      throw error;
    }
    
    toast.success('Pertemuan berhasil diupdate');
  };

  const deleteMeeting = async (id: string) => {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Gagal menghapus pertemuan');
      throw error;
    }
    
    toast.success('Pertemuan berhasil dihapus');
  };

  const updateRecordStatus = async (id: string, status: AttendanceRecord['status']) => {
    const { error } = await supabase
      .from('attendance_records')
      .update({ status })
      .eq('id', id);
    
    if (error) {
      toast.error('Gagal mengupdate status');
      throw error;
    }
    
    toast.success('Status kehadiran berhasil diupdate');
  };

  const getSubjectsBySemester = (semester: number) => {
    return subjects.filter(s => s.semester === semester);
  };

  const getMeetingsBySubject = (subjectId: string) => {
    return meetings.filter(m => m.subject_id === subjectId);
  };

  return {
    loading,
    semesters,
    subjects,
    meetings,
    classes,
    sessions,
    records,
    fetchSubjects,
    fetchMeetings,
    fetchClasses,
    fetchSessions,
    fetchRecords,
    createSubject,
    updateSubject,
    deleteSubject,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    updateRecordStatus,
    getSubjectsBySemester,
    getMeetingsBySubject
  };
}
