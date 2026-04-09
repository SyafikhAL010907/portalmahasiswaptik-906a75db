import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// --- INTERFACES ---
export interface Student {
  id: string; // This corresponds to profile.user_id
  name: string;
  nim: string;
  status: 'present' | 'excused' | 'absent' | 'pending';
  scannedAt?: string | null;
  method?: string | null; // 'qr' or 'manual'
  avatarUrl?: string | null;
  distance_meters?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  is_misslock?: boolean | null;
}

export interface Semester {
  id: number;
  name: string;
}

export type ViewState = 'semesters' | 'courses' | 'meetings' | 'classes' | 'students';

export function useAttendance() {
  // --- STATE DATA (DYNAMIC) ---
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userClassId, setUserClassId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  
  // Local state for pending changes
  const [pendingChanges, setPendingChanges] = useState<{ [studentId: string]: string }>({});

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
  const [isMasterExportOpen, setIsMasterExportOpen] = useState(false);
  const [selectedExportClassId, setSelectedExportClassId] = useState<string>('');

  // --- CONFIRMATION MODAL STATE ---
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'info';
    confirmText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'danger',
    onConfirm: () => { },
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const openConfirmation = (
    title: string,
    description: string,
    onConfirm: () => Promise<void> | void,
    variant: 'danger' | 'warning' | 'info' = 'danger',
    confirmText: string = 'Konfirmasi'
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      description,
      variant,
      confirmText,
      onConfirm: async () => {
        await onConfirm();
        closeModal();
      }
    });
  };

  // --- INITIAL LOAD & ROLE CHECK ---
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, class_id')
          .eq('user_id', user.id)
          .maybeSingle();

        const rolesList = (profile as any)?.role ? [(profile as any).role] : [];
        const isDev = rolesList.includes('admin_dev');
        const isKelas = rolesList.includes('admin_kelas');
        const isDosen = rolesList.includes('admin_dosen');

        if (isDev) setUserRole('admin_dev');
        else if (isKelas) setUserRole('admin_kelas');
        else if (isDosen) setUserRole('admin_dosen');
        else setUserRole('mahasiswa');

        setCurrentUserId(user.id);

        if (profile) {
          const profileData = profile as any;
          if (profileData.class_id) {
            setUserClassId(profileData.class_id);
            setSelectedExportClassId(profileData.class_id);
          }
        }

        const isNotStudent = rolesList.length > 0 && !rolesList.includes('mahasiswa');
        setCanEdit(isDev || isKelas || isDosen || isNotStudent);
      }
    };
    checkUserRole();
    fetchSemesters();
    fetchClasses();
  }, []);

  // --- FETCH DATA ---
  const fetchSemesters = async () => {
    try {
      const { data, error } = await (supabase as any).from('semesters').select('*').order('id');
      if (error) throw error;
      if (data) setSemesters(data);
    } catch (err) {
      console.error("Error fetching semesters", err);
    }
  };

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
    setPendingChanges({});
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, nim, avatar_url')
        .eq('class_id', classId)
        .order('nim');

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) {
        setStudents([]);
        return;
      }

      const userIds = profiles.map(p => p.user_id);
      const { data: userRolesData, error: rolesError } = await (supabase as any)
        .from('profiles')
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

      let recordMap = new Map<string, { status: string, scannedAt: string, method?: string, distance_meters?: number, latitude?: number, longitude?: number, is_misslock?: boolean }>();

      if (sessions && sessions.length > 0) {
        const sessionId = sessions[0].id;
        setCurrentSessionId(sessionId);

        const { data: records, error: recordsError } = await (supabase as any)
          .from('attendance_records')
          .select('student_id, status, scanned_at, method, distance_meters, latitude, longitude, is_misslock')
          .eq('session_id', sessionId);

        if (recordsError) throw recordsError;
        if (records) {
          records.forEach(r => recordMap.set(r.student_id, { 
            status: r.status, 
            scannedAt: r.scanned_at, 
            method: r.method,
            distance_meters: r.distance_meters,
            latitude: r.latitude,
            longitude: r.longitude,
            is_misslock: r.is_misslock
          }));
        }
      } else {
        setCurrentSessionId(null);
      }

      const mappedStudents: Student[] = filteredProfiles.map(p => {
        const record = recordMap.get(p.user_id);
        const rawStatus = record?.status;
        let status: 'present' | 'excused' | 'absent' | 'pending' = 'pending';
        if (rawStatus === 'present' || rawStatus === 'hadir') status = 'present';
        else if (rawStatus === 'excused' || rawStatus === 'izin') status = 'excused';
        else if (rawStatus === 'absent' || rawStatus === 'alpha') status = 'absent';

        return {
          id: p.user_id,
          name: p.full_name,
          nim: p.nim,
          status: status,
          scannedAt: record?.scannedAt,
          method: record?.method,
          avatarUrl: p.avatar_url,
          distance_meters: record?.distance_meters,
          latitude: record?.latitude,
          longitude: record?.longitude,
          is_misslock: record?.is_misslock
        };
      });

      // FILTER FOR MAHASISWA ROLE: Only see own record 🛡️
      const finalStudents = userRole === 'mahasiswa' 
        ? mappedStudents.filter(s => s.id === currentUserId)
        : mappedStudents;

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
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${currentSessionId}`
        },
        (payload) => {
          const newRecord = payload.new as { 
            student_id: string, 
            status: string, 
            scanned_at: string,
            distance_meters?: number,
            latitude?: number,
            longitude?: number,
            is_misslock?: boolean
          };
          if (pendingChanges[newRecord.student_id]) return;

          setStudents(currentStudents =>
            currentStudents.map(s => {
              if (s.id === newRecord.student_id) {
                let newStatus: 'present' | 'excused' | 'absent' | 'pending' = 'pending';
                if (newRecord.status === 'present' || newRecord.status === 'hadir') newStatus = 'present';
                else if (newRecord.status === 'excused' || newRecord.status === 'izin') newStatus = 'excused';
                else if (newRecord.status === 'absent' || newRecord.status === 'alpha') newStatus = 'absent';

                return {
                  ...s,
                  status: newStatus,
                  scannedAt: newRecord.scanned_at,
                  distance_meters: newRecord.distance_meters,
                  latitude: newRecord.latitude,
                  longitude: newRecord.longitude,
                  is_misslock: newRecord.is_misslock
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
  }, [currentSessionId, pendingChanges]);

  // --- ACTIONS ---
  const handleSemesterClick = (id: number, name: string) => {
    setActiveId({ ...activeId, semester: id.toString(), semesterName: name });
    setView('courses');
    fetchCourses(id.toString());
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
    if (view === 'students') {
      setView('classes');
      setPendingChanges({});
    }
    else if (view === 'classes') setView('meetings');
    else if (view === 'meetings') setView('courses');
    else if (view === 'courses') setView('semesters');
  };

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
      if (view === 'meetings') {
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
    openConfirmation(
      'Hapus Data?',
      'Yakin mau hapus data ini? Tindakan ini tidak dapat dibatalkan.',
      async () => {
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
      }
    );
  };

  const toggleAttendance = async (studentId: string, current: string) => {
    if (!canEdit) return;
    if (userRole === 'admin_kelas' && userClassId !== activeId.class) {
      toast.error("Anda tidak memiliki akses untuk mengubah data kelas ini!");
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (student?.method === 'qr' && userRole !== 'admin_dev') {
      toast.error("Absensi via QR Code sudah valid dan tidak dapat diubah manual (Kunci Baris). Hubungi AdminDev jika butuh reset.");
      return;
    }
    const statuses: ('pending' | 'present' | 'excused' | 'absent')[] = ['pending', 'present', 'excused', 'absent'];
    const nextStatus = statuses[(statuses.indexOf(current as any) + 1) % statuses.length];
    setStudents(students.map(s => s.id === studentId ? { ...s, status: nextStatus, method: 'manual' } : s));
    setPendingChanges(prev => ({ ...prev, [studentId]: nextStatus }));
  };

  const handleResetQr = async (studentId: string, e: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEdit) return;
    openConfirmation(
      'Reset Status QR?',
      'Yakin mau RESET status QR mahasiswa ini di SEMUA pertemuan untuk mata kuliah ini?',
      async () => {
        try {
          setIsLoading(true);
          const { data: meetingsData } = await supabase.from('meetings').select('id').eq('subject_id', activeId.course);
          if (!meetingsData || meetingsData.length === 0) return;
          const meetingIds = meetingsData.map(m => m.id);
          const { data: sessionsData } = await supabase.from('attendance_sessions').select('id').in('meeting_id', meetingIds);
          if (!sessionsData || sessionsData.length === 0) return;
          const sessionIds = sessionsData.map(s => s.id);
          const { error } = await supabase.from('attendance_records').update({ scanned_at: null }).eq('student_id', studentId).in('session_id', sessionIds);
          if (error) throw error;
          setStudents(students.map(s => s.id === studentId ? { ...s, scannedAt: null } : s));
          toast.success("Status QR mahasiswa berhasil direset untuk mata kuliah ini!");
        } catch (err) {
          console.error("Failed to reset course QR status:", err);
          toast.error("Gagal sinkronisasi data ke server");
        } finally {
          setIsLoading(false);
        }
      },
      'warning',
      'Reset QR'
    );
  };

  const handleGlobalWipe = async () => {
    if (userRole !== 'admin_dev') {
      toast.error("Hanya AdminDev yang dapat melakukan Reset Masal!");
      return;
    }
    openConfirmation(
      'GLOBAL WIPE / RESET TOTAL',
      'PERINGATAN KERAS: Semua data absensi di SEMUA semester akan dihapus dan kembali ke "Menunggu Scan". Tindakan ini SANGAT BERBAHAYA dan TIDAK BISA DIBATALKAN. Lanjutkan?',
      async () => {
        setIsLoading(true);
        try {
          const { error: recordsError } = await supabase.from('attendance_records').delete().neq('status', 'placeholder');
          if (recordsError) throw recordsError;
          const { error: sessionsError } = await supabase.from('attendance_sessions').delete().neq('is_active', false);
          if (sessionsError) throw sessionsError;
          toast.success("BERHASIL! Semua data absensi telah dibersihkan secara global.");
          window.location.reload();
        } catch (err: any) {
          toast.error("Wipe gagal: " + err.message);
        } finally {
          setIsLoading(false);
        }
      },
      'danger',
      'HAPUS SEMUA DATA'
    );
  };

  const handleResetIndividual = (studentId: string, studentName: string) => {
    if (userRole !== 'admin_dev' || !currentSessionId) return;
    openConfirmation(
      `Reset Status ${studentName}?`,
      `Status kehadiran untuk ${studentName} di pertemuan ini akan direset menjadi "Menunggu Scan".`,
      async () => {
        setIsLoading(true);
        try {
          const { error } = await supabase.from('attendance_records').delete().eq('session_id', currentSessionId).eq('student_id', studentId);
          if (error) throw error;
          toast.success(`Status ${studentName} berhasil direset!`);
          await fetchStudentsAndAttendance(activeId.class, activeId.meeting);
        } catch (err: any) {
          toast.error("Gagal reset status: " + err.message);
        } finally {
          setIsLoading(false);
        }
      },
      'warning',
      'Reset Status'
    );
  };

  const handleResetSession = () => {
    if (userRole !== 'admin_dev' || !currentSessionId) {
      toast.error("Hanya AdminDev yang dapat melakukan Reset Pertemuan!");
      return;
    }
    openConfirmation(
      'Reset Status Pertemuan?',
      'SEMUA status mahasiswa di pertemuan ini akan direset menjadi "Menunggu Scan". Metode dan Waktu Scan akan dihapus tuntas.',
      async () => {
        setIsLoading(true);
        try {
          const { error } = await supabase.from('attendance_records').delete().eq('session_id', currentSessionId);
          if (error) throw error;
          toast.success("Status pertemuan berhasil direset total!");
          await fetchStudentsAndAttendance(activeId.class, activeId.meeting);
        } catch (err: any) {
          toast.error("Gagal reset pertemuan: " + err.message);
        } finally {
          setIsLoading(false);
        }
      },
      'warning',
      'Reset Pertemuan'
    );
  };

  const handleResetGlobalSubject = async () => {
    if (userRole !== 'admin_dev' || !activeId.course) {
      toast.error("Hanya AdminDev yang dapat melakukan Reset Global Matkul!");
      return;
    }
    openConfirmation(
      'Reset Global Mata Kuliah?',
      'SEMUA pertemuan di mata kuliah ini akan direset kembali ke status PENDING? Tindakan ini tidak dapat dibatalkan.',
      async () => {
        setIsLoading(true);
        try {
          const { data: meetingsData } = await supabase.from('meetings').select('id').eq('subject_id', activeId.course);
          if (!meetingsData || meetingsData.length === 0) {
            toast.info("Tidak ada pertemuan untuk mata kuliah ini.");
            return;
          }
          const meetingIds = meetingsData.map(m => m.id);
          const { data: sessionsData } = await supabase.from('attendance_sessions').select('id').in('meeting_id', meetingIds);
          if (sessionsData && sessionsData.length > 0) {
            const sessionIds = sessionsData.map(s => s.id);
            const { error } = await supabase.from('attendance_records').delete().in('session_id', sessionIds);
            if (error) throw error;
          }
          toast.success('Berhasil mereset seluruh data absensi mata kuliah ini ke status Pending.');
          fetchMeetings(activeId.course);
        } catch (err: any) {
          toast.error("Gagal reset global matkul: " + err.message);
        } finally {
          setIsLoading(false);
        }
      },
      'danger',
      'Reset Global Matkul'
    );
  };

  const saveAttendance = async () => {
    if (!canEdit) {
      toast.error("Anda tidak memiliki akses untuk menyimpan absensi");
      return;
    }
    if (Object.keys(pendingChanges).length === 0) {
      toast.info("Tidak ada perubahan yang perlu disimpan.");
      return;
    }
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User tidak terautentikasi");
      let sessionId = currentSessionId;
      if (!sessionId) {
        const { data: existingSessions } = await supabase.from('attendance_sessions').select('id').eq('meeting_id', activeId.meeting).eq('class_id', activeId.class).limit(1);
        sessionId = existingSessions?.[0]?.id;
      }
      if (!sessionId) {
        const { data: newSession, error: createError } = await supabase.from('attendance_sessions').insert([{
          meeting_id: activeId.meeting,
          class_id: activeId.class,
          lecturer_id: userData.user.id,
          is_active: true,
          qr_code: Math.random().toString(36).substring(7),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }]).select().single();
        if (createError) throw createError;
        sessionId = newSession.id;
      }
      const changes = Object.entries(pendingChanges);
      const updatePromises = changes.map(async ([studentId, status]) => {
        const existingStudent = students.find(s => s.id === studentId);
        if (existingStudent?.method === 'qr' && userRole !== 'admin_dev') return;
        if (status === 'pending') {
          const { error } = await supabase.from('attendance_records').delete().eq('session_id', sessionId!).eq('student_id', studentId);
          if (error) throw error;
        } else {
          const payload = {
            session_id: sessionId!,
            student_id: studentId,
            status: status,
            scanned_at: new Date().toISOString(),
            method: 'manual',
            updated_by: userData.user.id
          };
          const { error } = await (supabase as any).from('attendance_records').upsert(payload, { onConflict: 'session_id,student_id' });
          if (error) throw error;
        }
      });
      await Promise.all(updatePromises);
      toast.success("Absensi berhasil disimpan permanen!");
      await fetchStudentsAndAttendance(activeId.class, activeId.meeting);
      setPendingChanges({});
    } catch (err: any) {
      console.error("Save failed:", err);
      toast.error("Gagal simpan: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = async () => {
    let sessionId = currentSessionId;
    if (!sessionId && activeId.meeting && activeId.class) {
      toast.info("Mencari data sesi presensi...");
      const { data } = await supabase.from('attendance_sessions').select('id').eq('meeting_id', activeId.meeting).eq('class_id', activeId.class).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) sessionId = data[0].id;
    }
    if (!sessionId) {
      toast.error("Belum ada data presensi yang tercatat untuk pertemuan ini.");
      return;
    }
    if (userRole === 'admin_kelas' && activeId.class !== userClassId) {
      toast.error("Keamanan Dokumen", { description: "Anda hanya diperbolehkan mengunduh data kelas sendiri. Untuk kelas lain, gunakan 'Buka File'.", });
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sesi tidak ditemukan. Silakan login kembali.");
        return;
      }
      toast.info("Sedang menyiapkan laporan presensi...");
      const baseUrl = import.meta.env.VITE_API_URL;
      const exportUrl = `${baseUrl}/export/attendance/excel?session_id=${sessionId}&token=${session.access_token}&action=download`;
      const response = await fetch(exportUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try { const errorJson = JSON.parse(errorText); errorMessage = errorJson.error || errorMessage; } catch (e) { errorMessage = errorText || errorMessage; }
        if (response.status === 429) { toast.error("Batas Download Tercapai", { description: errorMessage, duration: 8000 }); return; }
        throw new Error(errorMessage);
      }
      const remainingQuota = response.headers.get('X-Download-Remaining');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const safeCourse = (activeId.courseName || 'Matkul').replace(/\s+/g, '_');
      const safeClass = (activeId.className || 'Kelas').replace(/\s+/g, '_');
      const safeMeeting = (activeId.meetingName || 'Pertemuan').replace(/\s+/g, '_');
      const fileName = `Absensi_${safeCourse}_${safeClass}_${safeMeeting}.xlsx`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      const remainingText = remainingQuota !== null ? ` Jatah download Anda sisa ${remainingQuota} lagi hari ini.` : "";
      toast.success(
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm text-foreground">Excel Berhasil!{remainingQuota !== null && " ✅"}</span>
            <span className="text-xs text-muted-foreground">{remainingText}</span>
            <span className="text-[10px] text-muted-foreground mt-1">File: <span className="font-mono break-all">{fileName}</span></span>
          </div>
        </div>,
        { duration: 8000 }
      );
      setTimeout(() => { window.URL.revokeObjectURL(url); if (document.body.contains(a)) document.body.removeChild(a); }, 5000);
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error("Gagal export Excel: " + error.message);
    }
  };

  const handlePreviewMeetingExcel = async () => {
    let sessionId = currentSessionId;
    if (!sessionId && activeId.meeting && activeId.class) {
      toast.info("Mencari Sesi Presensi...");
      const { data } = await supabase.from('attendance_sessions').select('id').eq('meeting_id', activeId.meeting).eq('class_id', activeId.class).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) sessionId = data[0].id;
    }
    if (!sessionId) {
      toast.error("Belum ada data presensi untuk pertemuan ini. Silakan buat absensi terlebih dahulu.");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sesi tidak ditemukan"); return; }
      const baseUrl = import.meta.env.VITE_API_URL;
      const exportUrl = `${baseUrl}/export/attendance/excel?session_id=${sessionId}&token=${session.access_token}`;
      toast.info("Menyiapkan pratinjau...", { description: "Sedang memproses file untuk Google Sheets..." });
      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error("Gagal mengambil data dari server");
      const blob = await response.blob();
      const fileName = `temp_att_${Date.now()}.xlsx`;
      const filePath = `temp/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const gviewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(publicUrl)}&embedded=true`;
      window.open(gviewUrl, '_blank');
      toast.success("Pratinjau Siap!", { duration: 5000 });
      setTimeout(() => { supabase.storage.from("avatars").remove([filePath]); }, 60000);
    } catch (error: any) {
      console.error("Preview failed:", error);
      toast.error("Gagal membuka preview: " + error.message);
    }
  };

  const handlePreviewMasterExcel = async () => {
    const classId = selectedExportClassId || activeId.class;
    if (!classId) { toast.error("Pilih kelas terlebih dahulu"); return; }
    if (userRole === 'admin_kelas' && classId !== userClassId) {
      toast.error("Keamanan Dokumen", { description: "Anda hanya diperbolehkan mengunduh Master Laporan kelas Anda sendiri.", });
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sesi tidak ditemukan"); return; }
      const baseUrl = import.meta.env.VITE_API_URL;
      const exportUrl = `${baseUrl}/export/attendance/master-excel?subject_id=${activeId.course}&class_id=${classId}&token=${session.access_token}&action=download`;
      toast.info("Menyiapkan pratinjau Master...", { description: "Sedang memproses file Master untuk Google Sheets..." });
      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error("Gagal mengambil data Master");
      const blob = await response.blob();
      const fileName = `temp_master_${Date.now()}.xlsx`;
      const filePath = `temp/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const gviewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(publicUrl)}&embedded=true`;
      window.open(gviewUrl, '_blank');
      toast.success("Pratinjau Master Siap!", { duration: 5000 });
      setTimeout(() => { supabase.storage.from("avatars").remove([filePath]); }, 60000);
    } catch (error: any) {
      console.error("Preview Master failed:", error);
      toast.error("Gagal membuka preview Master: " + error.message);
    }
  };

  const handleDownloadMasterExcel = async () => {
    const classId = selectedExportClassId || activeId.class;
    if (!classId) { toast.error("Pilih kelas terlebih dahulu"); return; }
    if (userRole === 'admin_kelas' && classId !== userClassId) {
      toast.error("Keamanan Dokumen", { description: "Anda hanya diperbolehkan mengunduh Master Laporan kelas Anda sendiri.", });
      return;
    }
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sesi tidak ditemukan"); return; }
      toast.info("Sedang generate Master Excel...");
      const baseUrl = import.meta.env.VITE_API_URL;
      const exportUrl = `${baseUrl}/export/attendance/master-excel?subject_id=${activeId.course}&class_id=${classId}&token=${session.access_token}&action=download`;
      const response = await fetch(exportUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try { const errorJson = JSON.parse(errorText); errorMessage = errorJson.error || errorMessage; } catch (e) { errorMessage = errorText || errorMessage; }
        if (response.status === 429) { toast.error("Batas Download Tercapai", { description: errorMessage, duration: 8000 }); return; }
        throw new Error(errorMessage);
      }
      const remainingQuota = response.headers.get('X-Download-Remaining');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const className = classes.find(c => c.id === classId)?.name || (activeId.className || 'Kelas');
      const safeSubject = (activeId.courseName || 'Subject').replace(/\s+/g, '_');
      const safeClass = className.replace(/\s+/g, '_');
      const fileName = `Master_Absensi_${safeSubject}_${safeClass}.xlsx`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      const remainingText = remainingQuota !== null ? ` Jatah download sisa ${remainingQuota} lagi hari ini.` : "";
      toast.success(
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm text-foreground">Master Excel Berhasil!{remainingQuota !== null && " ✅"}</span>
            <span className="text-xs text-muted-foreground">{remainingText}</span>
          </div>
        </div>,
        { duration: 8000 }
      );
      setIsMasterExportOpen(false);
      setTimeout(() => { window.URL.revokeObjectURL(url); if (document.body.contains(a)) document.body.removeChild(a); }, 5000);
    } catch (error: any) {
      console.error("Master Export Error:", error);
      toast.error("Gagal export master: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    state: {
      semesters, courses, meetings, classes, students, isLoading, userRole, userClassId, currentUserId, canEdit, pendingChanges, view, activeId, isAddOpen, isEditOpen, formData, editId, currentSessionId, isMasterExportOpen, selectedExportClassId, modalConfig
    },
    actions: {
      setViewState: setView, setActiveId, setIsAddOpen, setIsEditOpen, setFormData, setEditId, setIsMasterExportOpen, setSelectedExportClassId, closeModal, openConfirmation, handleSemesterClick, handleCourseClick, handleMeetingClick, handleClassClick, handleBack, openAddDialog, openEditDialog, submitAdd, submitEdit, handleDelete, toggleAttendance, handleResetQr, handleGlobalWipe, handleResetIndividual, handleResetSession, handleResetGlobalSubject, saveAttendance, handleExportExcel, handlePreviewMeetingExcel, handlePreviewMasterExcel, handleDownloadMasterExcel
    }
  };
}
