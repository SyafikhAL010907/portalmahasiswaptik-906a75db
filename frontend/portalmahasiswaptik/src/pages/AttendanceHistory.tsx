import { useState, useEffect } from 'react';
import {
  Folder, FolderOpen, Users, ChevronRight, ArrowLeft, Calendar,
  CheckCircle, XCircle, Clock, Plus, Pencil, Trash2, Save, Loader2,
  UserCheck, FileText, Search, Edit, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PremiumCard } from '@/components/ui/PremiumCard';

// --- INTERFACES ---
interface Student {
  id: string; // This corresponds to profile.user_id
  name: string;
  nim: string;
  status: 'hadir' | 'izin' | 'alpha' | 'pending';
  scannedAt?: string | null;
}

type ViewState = 'semesters' | 'courses' | 'meetings' | 'classes' | 'students';

export default function AttendanceHistory() {
  // --- STATE DATA (DYNAMIC) ---
  // SOFT PASTEL MODE: Finance Dashboard Style
  const [semesters] = useState([
    { id: '1', name: 'Semester 1', gradient: 'from-purple-50 to-white dark:from-purple-950/20 dark:to-background', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', shadowColor: 'hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50' },
    { id: '2', name: 'Semester 2', gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
    { id: '3', name: 'Semester 3', gradient: 'from-orange-50 to-white dark:from-orange-950/20 dark:to-background', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', shadowColor: 'hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50' },
    { id: '4', name: 'Semester 4', gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
    { id: '5', name: 'Semester 5', gradient: 'from-purple-50 to-white dark:from-purple-950/20 dark:to-background', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', shadowColor: 'hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50' },
    { id: '6', name: 'Semester 6', gradient: 'from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400', shadowColor: 'hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50' },
    { id: '7', name: 'Semester 7', gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
    { id: '8', name: 'Semester 8', gradient: 'from-violet-50 to-white dark:from-violet-950/20 dark:to-background', iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400', shadowColor: 'hover:shadow-violet-200/50 dark:hover:shadow-violet-900/50' },
  ]);

  const [courses, setCourses] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // --- VIEW STATE ---
  const [view, setView] = useState<ViewState>('semesters');
  const [activeId, setActiveId] = useState({
    semester: '', semesterName: '',
    course: '', courseName: '',
    meeting: '', meetingName: '',
    class: '', className: ''
  });

  // --- DIALOG STATES ---
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // --- INITIAL LOAD & ROLE CHECK ---
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const rolesList = roles?.map(r => r.role) || [];

        // STRICT ACCESS: Only 'admin_dev' (AdminDev) can edit/save manual attendance
        const hasAccess = rolesList.includes('admin_dev');
        setCanEdit(hasAccess);
      }
    };
    checkUserRole();
  }, []);

  // --- FETCH DATA ---
  const fetchCourses = async (semesterId: string) => {
    setIsLoading(true);
    try {
      const semesterNum = parseInt(semesterId);
      if (isNaN(semesterNum)) throw new Error("Invalid semester ID");

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('semester', semesterNum)
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat mata kuliah: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMeetings = async (courseId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('subject_id', courseId)
        .order('meeting_number');

      if (error) throw error;
      setMeetings(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat pertemuan: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat kelas: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentsAndAttendance = async (classId: string, meetingId: string) => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, nim')
        .eq('class_id', classId)
        .order('full_name');

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) {
        setStudents([]);
        return;
      }

      const userIds = profiles.map(p => p.user_id);
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      const excludedRoles = ['admin_dosen', 'admin_dev'];
      const usersToExclude = new Set(
        userRolesData
          ?.filter(ur => excludedRoles.includes(ur.role))
          .map(ur => ur.user_id)
      );

      const filteredProfiles = profiles.filter(p => !usersToExclude.has(p.user_id));

      if (filteredProfiles.length === 0) {
        setStudents([]);
        return;
      }

      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(1);

      let recordMap = new Map<string, { status: string, scannedAt: string }>();

      if (sessions && sessions.length > 0) {
        const sessionId = sessions[0].id;
        setCurrentSessionId(sessionId); // Track active session for Realtime

        const { data: records, error: recordsError } = await supabase
          .from('attendance_records')
          .select('student_id, status, scanned_at')
          .eq('session_id', sessionId);

        if (recordsError) throw recordsError;

        if (records) {
          records.forEach(r => recordMap.set(r.student_id, { status: r.status, scannedAt: r.scanned_at }));
        }
      } else {
        setCurrentSessionId(null);
      }

      const finalStudents: Student[] = filteredProfiles.map(p => {
        const record = recordMap.get(p.user_id);
        const rawStatus = record?.status;
        let status: 'hadir' | 'izin' | 'alpha' | 'pending' = 'pending';

        if (rawStatus === 'hadir' || rawStatus === 'izin' || rawStatus === 'alpha') {
          status = rawStatus;
        }

        return {
          id: p.user_id,
          name: p.full_name,
          nim: p.nim,
          status: status,
          scannedAt: record?.scannedAt
        };
      });

      setStudents(finalStudents);

    } catch (err: any) {
      toast.error("Gagal memuat data mahasiswa: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!currentSessionId) return;

    const channel = supabase
      .channel('attendance-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${currentSessionId}`
        },
        (payload) => {
          // Update local state immediately
          const newRecord = payload.new as { student_id: string, status: string, scanned_at: string };

          setStudents(currentStudents =>
            currentStudents.map(s => {
              if (s.id === newRecord.student_id) {
                // Map DB status to UI status type
                let newStatus: 'hadir' | 'izin' | 'alpha' | 'pending' = 'pending';
                if (['hadir', 'izin', 'alpha'].includes(newRecord.status)) {
                  newStatus = newRecord.status as any;
                }

                return {
                  ...s,
                  status: newStatus,
                  scannedAt: newRecord.scanned_at
                };
              }
              return s;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSessionId]);

  // --- NAVIGATION HANDLERS ---
  const handleSemesterClick = (id: string, name: string) => {
    setActiveId({ ...activeId, semester: id, semesterName: name });
    setView('courses');
    fetchCourses(id);
  };

  const handleCourseClick = (id: string, name: string) => {
    setActiveId({ ...activeId, course: id, courseName: name });
    setView('meetings');
    fetchMeetings(id);
  };

  const handleMeetingClick = (id: string, name: string) => {
    setActiveId({ ...activeId, meeting: id, meetingName: name });
    setView('classes');
    fetchClasses();
  };

  const handleClassClick = (id: string, name: string) => {
    setActiveId({ ...activeId, class: id, className: name });
    setView('students');
    fetchStudentsAndAttendance(id, activeId.meeting);
  };

  const handleBack = () => {
    if (view === 'students') setView('classes');
    else if (view === 'classes') setView('meetings');
    else if (view === 'meetings') setView('courses');
    else if (view === 'courses') setView('semesters');
  };

  // --- CRUD HELPERS ---
  const openAddDialog = () => {
    if (!canEdit) return;
    setFormData({ name: '', code: '' });
    setIsAddOpen(true);
  };

  const openEditDialog = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setFormData({ name: currentName, code: '' });
    setEditId(id);
    setIsEditOpen(true);
  };

  const submitAdd = async () => {
    if (!formData.name) return;
    setIsLoading(true);
    try {
      if (view === 'courses') {
        const { error } = await supabase.from('subjects').insert([{
          name: formData.name,
          semester: parseInt(activeId.semester),
          code: formData.code || "TBA"
        }]);
        if (error) throw error;
        fetchCourses(activeId.semester);
      }
      else if (view === 'meetings') {
        const { error } = await supabase.from('meetings').insert([{
          topic: formData.name,
          subject_id: activeId.course,
          meeting_number: meetings.length + 1
        }]);
        if (error) throw error;
        fetchMeetings(activeId.course);
      }
      else if (view === 'classes') {
        const { error } = await supabase.from('classes').insert([{ name: formData.name }]);
        if (error) throw error;
        fetchClasses();
      }

      toast.success(`Berhasil menambah ${formData.name}`);
      setIsAddOpen(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!editId || !formData.name) return;
    setIsLoading(true);
    try {
      let error;
      if (view === 'courses') {
        ({ error } = await supabase.from('subjects').update({ name: formData.name }).eq('id', editId));
      } else if (view === 'meetings') {
        ({ error } = await supabase.from('meetings').update({ topic: formData.name }).eq('id', editId));
      } else if (view === 'classes') {
        ({ error } = await supabase.from('classes').update({ name: formData.name }).eq('id', editId));
      }

      if (error) throw error;

      if (view === 'courses') fetchCourses(activeId.semester);
      else if (view === 'meetings') fetchMeetings(activeId.course);
      else if (view === 'classes') fetchClasses();
      toast.success("Perubahan disimpan");
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error("Gagal update: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (!confirm('Yakin mau hapus data ini?')) return;

    try {
      let error;
      if (view === 'courses') {
        ({ error } = await supabase.from('subjects').delete().eq('id', id));
      } else if (view === 'meetings') {
        ({ error } = await supabase.from('meetings').delete().eq('id', id));
      } else if (view === 'classes') {
        ({ error } = await supabase.from('classes').delete().eq('id', id));
      }

      if (error) throw error;

      if (view === 'courses') fetchCourses(activeId.semester);
      else if (view === 'meetings') fetchMeetings(activeId.course);
      else if (view === 'classes') fetchClasses();

      toast.success("Data berhasil dihapus");
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  // --- ATTENDANCE LOGIC ---
  const toggleAttendance = async (studentId: string, current: string) => {
    if (!canEdit) return;

    // Cycle: Pending -> Hadir -> Izin -> Alpha -> Pending
    const statuses: ('pending' | 'hadir' | 'izin' | 'alpha')[] = ['pending', 'hadir', 'izin', 'alpha'];
    const nextStatus = statuses[(statuses.indexOf(current as any) + 1) % statuses.length];

    // Optimistic Update (Local)
    setStudents(students.map(s => s.id === studentId ? { ...s, status: nextStatus } : s));

    // Immediate DB Update (Realtime Trigger)
    if (currentSessionId) {
      try {
        if (nextStatus === 'pending') {
          // If cycling back to pending, remove the record
          await supabase
            .from('attendance_records')
            .delete()
            .eq('session_id', currentSessionId)
            .eq('student_id', studentId);
        } else {
          // Upsert new status
          await supabase
            .from('attendance_records')
            .upsert({
              session_id: currentSessionId,
              student_id: studentId,
              status: nextStatus,
              scanned_at: new Date().toISOString()
            }, { onConflict: 'session_id, student_id' });
        }
      } catch (err) {
        console.error("Failed to sync attendance:", err);
        toast.error("Gagal sinkronisasi data ke server");
      }
    } else {
      toast("Sesi belum dibuat. Klik 'Simpan Permanen' untuk membuat sesi.", {
        description: "Perubahan hanya tersimpan lokal untuk saat ini."
      });
    }
  };

  const handleResetQr = async (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (!confirm('Yakin mau RESET status QR mahasiswa ini di SEMUA pertemuan untuk mata kuliah ini?')) return;

    try {
      setIsLoading(true);
      // 1. Get all meetings for this course
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('id')
        .eq('subject_id', activeId.course);

      if (!meetingsData || meetingsData.length === 0) return;
      const meetingIds = meetingsData.map(m => m.id);

      // 2. Get all sessions for these meetings
      const { data: sessionsData } = await supabase
        .from('attendance_sessions')
        .select('id')
        .in('meeting_id', meetingIds);

      if (!sessionsData || sessionsData.length === 0) return;
      const sessionIds = sessionsData.map(s => s.id);

      // 3. Update records: set scanned_at to null for this student in these sessions
      const { error } = await supabase
        .from('attendance_records')
        .update({ scanned_at: null })
        .eq('student_id', studentId)
        .in('session_id', sessionIds);

      if (error) throw error;

      // Optimistic Update (Local view)
      setStudents(students.map(s => s.id === studentId ? { ...s, scannedAt: null } : s));
      toast.success("Status QR mahasiswa berhasil direset untuk mata kuliah ini!");
    } catch (err) {
      console.error("Failed to reset course QR status:", err);
      toast.error("Gagal sinkronisasi data ke server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGlobalWipe = async () => {
    if (!canEdit) return;
    if (!confirm('BAHAYA! Yakin mau RESET TOTAL semua data absensi di riwayat kehadiran?')) return;
    if (!confirm('PERINGATAN TERAKHIR: Semua data absensi di SEMUA semester akan dihapus dan kembali ke "Menunggu Scan". Lanjutkan?')) return;

    setIsLoading(true);
    try {
      // 1. Delete all records
      const { error: recordsError } = await supabase.from('attendance_records').delete().neq('status', 'placeholder');
      if (recordsError) throw recordsError;

      // 2. Delete all sessions
      const { error: sessionsError } = await supabase.from('attendance_sessions').delete().neq('is_active', false);
      if (sessionsError) throw sessionsError;

      toast.success("BERHASIL! Semua data absensi telah dibersihkan secara global.");
      window.location.reload(); // Refresh to clear all states
    } catch (err: any) {
      toast.error("Wipe gagal: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAttendance = async () => {
    if (!canEdit) {
      toast.error("Anda tidak memiliki akses untuk menyimpan absensi");
      return;
    }
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User tidak terautentikasi");

      // Check existing session
      const { data: existingSessions } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('meeting_id', activeId.meeting)
        .eq('class_id', activeId.class)
        .limit(1);

      let sessionId = existingSessions?.[0]?.id;

      if (!sessionId) {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('attendance_sessions')
          .insert([{
            meeting_id: activeId.meeting,
            class_id: activeId.class,
            lecturer_id: userData.user.id,
            is_active: true,
            qr_code: Math.random().toString(36).substring(7),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }])
          .select()
          .single();

        if (createError) throw createError;
        sessionId = newSession.id;
      }

      // Upsert records
      // Upsert records
      // Filter out 'pending' status - do NOT save them to DB (treat as no record)
      // OR if we want to explicitly save them as 'alpha' we can, but 'pending' usually means no record.
      // However, upserting requires handling missing records. 
      // Strategy: Only upsert 'hadir', 'izin', 'alpha'.
      // If a student was previously 'hadir' and is now 'pending', we should DELETE the record?
      // Supabase upsert doesn't delete. 
      // Be simpler: 'pending' = 'alpha' in DB? Or just don't save?
      // Request says: "Awalnya menunggu scan". If admin saves, what happens?
      // Let's assume 'pending' should not be saved to DB.

      const recordsToUpsert = students
        .filter(s => s.status !== 'pending')
        .map(s => ({
          session_id: sessionId!,
          student_id: s.id,
          status: s.status,
          scanned_at: s.scannedAt || (s.status === 'hadir' ? new Date().toISOString() : null)
        }));

      if (recordsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('attendance_records')
          .upsert(recordsToUpsert, { onConflict: 'session_id, student_id' });

        if (upsertError) throw upsertError;
      }

      // Ideally we should also DELETE records for students who are now 'pending' but had records before.
      // But for now, let's just save valid statuses.

      toast.success("Absensi berhasil disimpan permanen!");
    } catch (err: any) {
      toast.error("Gagal simpan absensi: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- HELPERS ---
  const getStatusIcon = (status: string) => {
    if (status === 'hadir') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'izin') return <Clock className="w-5 h-5 text-yellow-500" />;
    if (status === 'alpha') return <XCircle className="w-5 h-5 text-destructive" />;
    return <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />; // Pending
  };

  const getAddTitle = () => {
    switch (view) {
      case 'courses': return 'Tambah Mata Kuliah';
      case 'meetings': return 'Tambah Pertemuan';
      case 'classes': return 'Tambah Kelas';
      default: return 'Tambah Data';
    }
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {view !== 'semesters' && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full bg-muted/50 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" /> Sistem Absensi
            </h1>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold">
              Level: <span className="text-primary">{view}</span>
              {activeId.semesterName && <span className="text-muted-foreground"> • {activeId.semesterName}</span>}
              {activeId.courseName && <span className="text-muted-foreground"> • {activeId.courseName}</span>}
              {activeId.meetingName && <span className="text-muted-foreground"> • {activeId.meetingName}</span>}
              {activeId.className && <span className="text-muted-foreground"> • {activeId.className}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {view !== 'students' && view !== 'semesters' && canEdit && (
            <Button onClick={openAddDialog} className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform flex-1 md:flex-initial h-9 px-4">
              <Plus className="w-4 h-4" /> Tambah {view.slice(0, -1)}
            </Button>
          )}
          {view === 'semesters' && canEdit && (
            <Button variant="destructive" onClick={handleGlobalWipe} className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform flex-1 md:flex-initial h-9 px-4">
              <Trash2 className="w-4 h-4" /> Reset Masal (Global Wipe)
            </Button>
          )}
        </div>
      </div>

      {/* LOADING STATE */}
      {isLoading && view !== 'students' && !isAddOpen && !isEditOpen ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* VIEW SEMESTERS - SOFT PASTEL */}
          {view === 'semesters' && semesters.map(sem => (
            <PremiumCard
              key={sem.id}
              variant="pastel"
              icon={Folder}
              title={sem.name}
              subtitle="Klik untuk lihat matkul"
              gradient={sem.gradient}
              iconClassName={`${sem.iconBg} ${sem.iconColor}`}
              className={sem.shadowColor}
              onClick={() => handleSemesterClick(sem.id, sem.name)}
            />
          ))}

          {/* VIEW COURSES - SOFT PASTEL */}
          {view === 'courses' && courses.map((course, idx) => {
            const coursePastels = [
              { gradient: 'from-violet-50 to-white dark:from-violet-950/20 dark:to-background', iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400', shadowColor: 'hover:shadow-violet-200/50 dark:hover:shadow-violet-900/50' },
              { gradient: 'from-sky-50 to-white dark:from-sky-950/20 dark:to-background', iconBg: 'bg-sky-100 dark:bg-sky-900/30', iconColor: 'text-sky-600 dark:text-sky-400', shadowColor: 'hover:shadow-sky-200/50 dark:hover:shadow-sky-900/50' },
              { gradient: 'from-rose-50 to-white dark:from-rose-950/20 dark:to-background', iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400', shadowColor: 'hover:shadow-rose-200/50 dark:hover:shadow-rose-900/50' },
              { gradient: 'from-amber-50 to-white dark:from-amber-950/20 dark:to-background', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400', shadowColor: 'hover:shadow-amber-200/50 dark:hover:shadow-amber-900/50' },
              { gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
              { gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
            ];
            const pastel = coursePastels[idx % coursePastels.length];
            return (
              <div key={course.id} className="relative">
                <PremiumCard
                  variant="pastel"
                  icon={FileText}
                  title={course.name}
                  subtitle={course.code}
                  gradient={pastel.gradient}
                  iconClassName={`${pastel.iconBg} ${pastel.iconColor}`}
                  className={pastel.shadowColor}
                  onClick={() => handleCourseClick(course.id, course.name)}
                />
                {canEdit && (
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 hover:opacity-100 transition-opacity z-10">
                    <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => { e.stopPropagation(); openEditDialog(course.id, course.name, e); }}><Pencil className="w-3 h-3 text-slate-600 dark:text-slate-300" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => { e.stopPropagation(); handleDelete(course.id, e); }}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* VIEW MEETINGS - SOFT PASTEL (Yellow/Orange tint) */}
          {view === 'meetings' && meetings.map(meeting => (
            <PremiumCard
              key={meeting.id}
              variant="pastel"
              icon={Calendar}
              title={meeting.topic || `Pertemuan ${meeting.meeting_number}`}
              subtitle={`Pertemuan ke-${meeting.meeting_number}`}
              gradient="from-orange-50 to-white dark:from-orange-950/20 dark:to-background"
              iconClassName="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              className="hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50"
              onClick={() => handleMeetingClick(meeting.id, meeting.topic || `Pertemuan ${meeting.meeting_number}`)}
            />
          ))}

          {/* VIEW CLASSES - SOFT PASTEL (Green/Teal tint) */}
          {view === 'classes' && classes.map(cls => (
            <PremiumCard
              key={cls.id}
              variant="pastel"
              icon={Users}
              title={cls.name}
              subtitle="Klik untuk lihat mahasiswa"
              gradient="from-blue-50 to-white dark:from-blue-950/20 dark:to-background"
              iconClassName="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              className="hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50"
              onClick={() => handleClassClick(cls.id, cls.name)}
            />
          ))}
        </div>
      )}

      {/* VIEW STUDENTS (TABLE MODE) */}
      {view === 'students' && (
        <div className="glass-card rounded-3xl overflow-hidden border-2 border-primary/10">
          <div className="p-6 bg-muted/30 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Daftar Absensi Mahasiswa</h3>
              <p className="text-xs text-muted-foreground mt-1">Kelas: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeId.className}</span> | <span className="font-semibold text-slate-700 dark:text-slate-300">{activeId.meetingName}</span></p>
            </div>
            {canEdit && (
              <Button size="sm" onClick={saveAttendance} disabled={isLoading} className="bg-success hover:bg-success/80 primary-gradient gap-2 px-6">
                {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                Simpan Permanen
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
          ) : (
            <div className="overflow-x-auto">
              {students.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">Belum ada mahasiswa di kelas ini.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-border/50">
                      <th className="p-4 pl-6">NIM</th>
                      <th className="p-4">Nama</th>
                      <th className="p-4 text-center">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-muted/50 transition-colors border-b border-border/10 last:border-0">
                        <td className="p-4 pl-6 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{s.nim}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                        <td className="p-4 flex justify-center">
                          <button
                            onClick={() => canEdit && toggleAttendance(s.id, s.status)}
                            disabled={!canEdit}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 outline-none focus:ring-2 ring-primary/50",
                              s.status === 'hadir' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                s.status === 'izin' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' :
                                  s.status === 'alpha' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                    'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                              !canEdit && "opacity-80 cursor-default active:scale-100"
                            )}
                          >
                            {getStatusIcon(s.status)}
                            <span className="capitalize">{s.status === 'pending' ? 'Menunggu Scan' : s.status}</span>
                            {s.status === 'hadir' && s.scannedAt && (
                              <div className="ml-2 flex items-center gap-1 group/qr">
                                <div className="px-1.5 py-0.5 bg-indigo-600 dark:bg-indigo-700/80 rounded text-[10px] text-white flex items-center gap-1 shadow-sm" title={`Scanned at: ${new Date(s.scannedAt).toLocaleTimeString()}`}>
                                  <QrCode className="w-3 h-3" />
                                  QR
                                </div>
                                {canEdit && (
                                  <div
                                    onClick={(e) => handleResetQr(s.id, e)}
                                    className="p-1 hover:bg-destructive/20 hover:text-destructive rounded-full transition-colors cursor-pointer"
                                    title="Reset Status QR"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* DIALOGS */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getAddTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama / Topik</Label>
              <Input
                id="name"
                placeholder="Masukkan nama..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {view === 'courses' && (
              <div className="space-y-2">
                <Label htmlFor="code">Kode Mata Kuliah</Label>
                <Input
                  id="code"
                  placeholder="Contoh: PTIK-101"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={submitAdd} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama / Topik</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={submitEdit} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}