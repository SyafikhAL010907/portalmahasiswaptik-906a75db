import { useState, useEffect } from 'react';
import {
  Folder, FolderOpen, Users, ChevronRight, ArrowLeft, Calendar,
  CheckCircle, XCircle, Clock, Plus, Pencil, Trash2, Save, Loader2,
  UserCheck, FileText, Search, Edit, QrCode, RotateCcw, Download, FileSpreadsheet
} from 'lucide-react';
// import XLSX from 'xlsx-js-style'; // REMOVED to fix 'stream' error
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PremiumCard } from '@/components/ui/PremiumCard';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

// --- INTERFACES ---
interface Student {
  id: string; // This corresponds to profile.user_id
  name: string;
  nim: string;
  status: 'hadir' | 'izin' | 'alpha' | 'pending';
  scannedAt?: string | null;
  method?: string | null; // 'qr' or 'manual'
}

interface Semester {
  id: number;
  name: string;
}

// SOFT PASTEL MODE: Finance Dashboard Style
const SEMESTER_GRADIENTS = [
  { gradient: 'from-purple-50 to-white dark:from-purple-950/20 dark:to-background', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', shadowColor: 'hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50' },
  { gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
  { gradient: 'from-orange-50 to-white dark:from-orange-950/20 dark:to-background', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', shadowColor: 'hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50' },
  { gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
  { gradient: 'from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400', shadowColor: 'hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50' },
  { gradient: 'from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background', iconBg: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400', shadowColor: 'hover:shadow-yellow-200/50 dark:hover:shadow-yellow-900/50' },
  { gradient: 'from-pink-50 to-white dark:from-pink-950/20 dark:to-background', iconBg: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400', shadowColor: 'hover:shadow-pink-200/50 dark:hover:shadow-pink-900/50' },
];

type ViewState = 'semesters' | 'courses' | 'meetings' | 'classes' | 'students';

export default function AttendanceHistory() {
  // --- STATE DATA (DYNAMIC) ---
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  // NEW: Local state for pending changes
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
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const rolesList = roles?.map(r => r.role) || [];
        const isDev = rolesList.includes('admin_dev');
        const isKelas = rolesList.includes('admin_kelas');
        const isDosen = rolesList.includes('admin_dosen');

        if (isDev) setUserRole('admin_dev');
        else if (isKelas) setUserRole('admin_kelas');
        else if (isDosen) setUserRole('admin_dosen');

        // Role check for export button (anything but 'mahasiswa')
        const isNotStudent = rolesList.length > 0 && !rolesList.includes('mahasiswa');
        // STRICT ACCESS: 'admin_dev', 'admin_kelas', or 'admin_dosen' can edit
        setCanEdit(isDev || isKelas || isDosen || isNotStudent); // Inclusive for export
      }
    };
    checkUserRole();
    fetchSemesters();
    fetchClasses();
  }, []);

  // --- FETCH DATA ---
  const fetchSemesters = async () => {
    try {
      // Use (supabase as any) because 'semesters' table types might not be generated yet
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
    setPendingChanges({}); // Reset pending changes on fetch
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, nim')
        .eq('class_id', classId)
        .order('nim');

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

      let recordMap = new Map<string, { status: string, scannedAt: string, method?: string }>();

      if (sessions && sessions.length > 0) {
        const sessionId = sessions[0].id;
        setCurrentSessionId(sessionId); // Track active session for Realtime

        const { data: records, error: recordsError } = await (supabase as any)
          .from('attendance_records')
          .select('student_id, status, scanned_at, method')
          .eq('session_id', sessionId);

        if (recordsError) throw recordsError;

        if (records) {
          records.forEach(r => recordMap.set(r.student_id, { status: r.status, scannedAt: r.scanned_at, method: r.method }));
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
          scannedAt: record?.scannedAt,
          method: record?.method
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

          // SKIP Realtime update if we have pending changes for this user to avoid jitter
          if (pendingChanges[newRecord.student_id]) return;

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
  }, [currentSessionId, pendingChanges]); // Added pendingChanges dependency check logic inside

  // --- NAVIGATION HANDLERS ---
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
      setPendingChanges({}); // Clear pending on back
    }
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
        // NOTE: Editing courses is now mainly done in Repository, but we keep this just in case for now unless asked to remove.
        // User asked to remove "Add Course", but didn't explicitly forbid editing existing ones here.
        // However, for consistency, we probably shouldn't edit courses here either.
        // BUT, I will leave it for now as the instruction was specifically about "Hapus tombol tambah course".
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
            // See note above about editing. Same for deleting.
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

  // --- ATTENDANCE LOGIC ---
  const toggleAttendance = async (studentId: string, current: string) => {
    if (!canEdit) return;

    // RULE: If method is 'qr' and user is not 'admin_dev', LOCK editing.
    const student = students.find(s => s.id === studentId);
    if (student?.method === 'qr' && userRole !== 'admin_dev') {
      toast.error("Absensi via QR Code sudah valid dan tidak dapat diubah manual (Kunci Baris). Hubungi AdminDev jika butuh reset.");
      return;
    }

    // Cycle: Pending -> Hadir -> Izin -> Alpha -> Pending
    const statuses: ('pending' | 'hadir' | 'izin' | 'alpha')[] = ['pending', 'hadir', 'izin', 'alpha'];
    const nextStatus = statuses[(statuses.indexOf(current as any) + 1) % statuses.length];

    // Optimistic Update (Local)
    setStudents(students.map(s => s.id === studentId ? { ...s, status: nextStatus, method: 'manual' } : s));

    // Store in pendingChanges (Purely Local)
    setPendingChanges(prev => ({ ...prev, [studentId]: nextStatus }));
  };

  const handleResetQr = async (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;

    openConfirmation(
      'Reset Status QR?',
      'Yakin mau RESET status QR mahasiswa ini di SEMUA pertemuan untuk mata kuliah ini?',
      async () => {
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
      },
      'warning',
      'Reset QR'
    );
  };

  const handleGlobalWipe = async () => {
    // STRICT: Only admin_dev can wipe
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
      },
      'danger',
      'HAPUS SEMUA DATA'
    );
  };

  // ✅ NEW FEATURE: Reset Status Individual for AdminDev
  const handleResetIndividual = (studentId: string, studentName: string) => {
    if (userRole !== 'admin_dev' || !currentSessionId) return;

    openConfirmation(
      `Reset Status ${studentName}?`,
      `Status kehadiran untuk ${studentName} di pertemuan ini akan direset menjadi "Menunggu Scan".`,
      async () => {
        setIsLoading(true);
        try {
          const { error } = await supabase
            .from('attendance_records')
            .delete()
            .eq('session_id', currentSessionId)
            .eq('student_id', studentId);

          if (error) throw error;

          toast.success(`Status ${studentName} berhasil direset!`);

          // Re-fetch to sync
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

  // ✅ NEW FEATURE: Reset Status Pertemuan for AdminDev ONLY
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
          const { error } = await supabase
            .from('attendance_records')
            .delete()
            .eq('session_id', currentSessionId);

          if (error) throw error;

          toast.success("Status pertemuan berhasil direset total!");

          // Explicit re-fetch
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

  const saveAttendance = async () => {
    if (!canEdit) {
      toast.error("Anda tidak memiliki akses untuk menyimpan absensi");
      return;
    }

    // CHECK IF THERE ARE CHANGES TO SAVE
    if (Object.keys(pendingChanges).length === 0) {
      toast.info("Tidak ada perubahan yang perlu disimpan.");
      return;
    }

    openConfirmation(
      'Simpan Permanen?',
      'Yakin ingin menyimpan perubahan status secara permanen?',
      async () => {
        setIsLoading(true);
        console.log("Starting Save Attendance...");
        console.log("Pending Changes:", pendingChanges);
        console.log("Active Context:", activeId);

        try {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) throw new Error("User tidak terautentikasi");

          // Check existing session
          let sessionId = currentSessionId;

          if (!sessionId) {
            console.log("No active session ID, checking database...");
            const { data: existingSessions } = await supabase
              .from('attendance_sessions')
              .select('id')
              .eq('meeting_id', activeId.meeting)
              .eq('class_id', activeId.class)
              .limit(1);

            sessionId = existingSessions?.[0]?.id;
          }

          if (!sessionId) {
            console.log("Creating new session...");
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
          console.log("Using Session ID:", sessionId);

          // Process pending changes
          const changes = Object.entries(pendingChanges);

          const updatePromises = changes.map(async ([studentId, status]) => {
            console.log(`Processing student ${studentId} -> ${status}`);

            // SECURITY CHECK: If existing record is 'qr' and current user is NOT 'admin_dev', reject this specific change.
            const existingStudent = students.find(s => s.id === studentId);
            if (existingStudent?.method === 'qr' && userRole !== 'admin_dev') {
              console.warn(`Attempt to overwrite QR record for student ${studentId} by non-dev user rejected.`);
              return; // Skip this change
            }

            if (status === 'pending') {
              // DELETE record if status returned to pending
              console.log(`Deleting record for ${studentId}`);
              const { error } = await supabase
                .from('attendance_records')
                .delete()
                .eq('session_id', sessionId!)
                .eq('student_id', studentId);

              if (error) {
                console.error(`Error deleting ${studentId}:`, error);
                throw error;
              }
            } else {
              // UPSERT record
              // Use current time for scanned_at if it's a manual update, unless strictly preserving old scan time is needed
              // For manual entry, we treat it as "now" if it wasn't scanned before, or valid status update
              const payload = {
                session_id: sessionId!,
                student_id: studentId,
                status: status,
                scanned_at: new Date().toISOString(),
                method: 'manual',
                updated_by: userData.user.id
              };
              console.log(`Upserting record for ${studentId}:`, payload);

              const { error } = await (supabase as any)
                .from('attendance_records')
                .upsert(payload, { onConflict: 'session_id, student_id' });

              if (error) {
                console.error(`Error upserting ${studentId}:`, error);
                throw error;
              }
            }
          });

          await Promise.all(updatePromises);

          toast.success("Absensi berhasil disimpan permanen!");

          // Refresh data FIRST
          await fetchStudentsAndAttendance(activeId.class, activeId.meeting);

          // THEN clear pending changes
          setPendingChanges({});

        } catch (err: any) {
          console.error("Save failed:", err);
          let errorMessage = "Gagal simpan absensi.";
          if (err.message?.includes('violates row-level security')) {
            errorMessage = "Akses ditolak (RLS). Pastikan Anda memiliki izin Dosen/Admin untuk menyimpan.";
          } else if (err.message) {
            errorMessage += " " + err.message;
          }
          toast.error(errorMessage);
        } finally {
          setIsLoading(false);
        }
      },
      'info',
      'Simpan Permanen'
    );
  };

  const handleExportExcel = async () => {
    if (!currentSessionId) {
      toast.error("Pilih pertemuan dan kelas untuk export");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sesi tidak ditemukan. Silakan login kembali.");
        return;
      }

      toast.info("Sedang menyiapkan laporan presensi...");

      const response = await fetch(`http://localhost:9000/api/export/attendance/excel?session_id=${currentSessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const safeCourse = (activeId.courseName || 'Matkul').replace(/\s+/g, '_');
      const safeClass = (activeId.className || 'Kelas').replace(/\s+/g, '_');
      const safeMeeting = (activeId.meetingName || 'Pertemuan').replace(/\s+/g, '_');
      a.download = `Absensi_${safeCourse}_${safeClass}_${safeMeeting}.xlsx`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Laporan Presensi berhasil diunduh!");
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error("Gagal export Excel: " + error.message);
    }
  };

  const handleDownloadMasterExcel = async () => {
    toast.error("Fitur Export Master Excel dinonaktifkan sementara.");
    /*
    // ... rest of the code ...
    */
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
      case 'courses': return ''; // Disabled
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
          {view !== 'students' && view !== 'semesters' && view !== 'courses' && (
            view === 'classes' ? userRole === 'admin_dev' : canEdit
          ) && (
              <Button onClick={openAddDialog} className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform flex-1 md:flex-initial h-9 px-4">
                <Plus className="w-4 h-4" /> Tambah {view === 'classes' ? 'Kelas' : view.slice(0, -1)}
              </Button>
            )}
          {view === 'semesters' && userRole === 'admin_dev' && (
            <Button variant="destructive" onClick={handleGlobalWipe} className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform flex-1 md:flex-initial h-9 px-4">
              <Trash2 className="w-4 h-4" /> Reset Masal (Global Wipe)
            </Button>
          )}
          {view === 'meetings' && canEdit && (
            <Button
              onClick={() => setIsMasterExportOpen(true)}
              className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform flex-1 md:flex-initial h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileSpreadsheet className="w-4 h-4" /> Download Master Excel (Semester)
            </Button>
          )}
        </div>
      </div>

      {/* LOADING STATE */}
      {isLoading && view !== 'students' && !isAddOpen && !isEditOpen ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* VIEW SEMESTERS - DYNAMIC & SOFT PASTEL */}
          {view === 'semesters' && semesters.map((sem, idx) => (
            <PremiumCard
              key={sem.id}
              variant="pastel"
              icon={Folder}
              title={sem.name}
              subtitle="Klik untuk lihat matkul"
              gradient={SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].gradient}
              iconClassName={`${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconBg} ${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconColor}`}
              className={SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].shadowColor}
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
              </div>
            );
          })}

          {/* VIEW MEETINGS */}
          {view === 'meetings' && meetings.map((meeting, idx) => (
            <div key={meeting.id} className="relative group">
              <PremiumCard
                variant="pastel"
                icon={Calendar}
                title={meeting.topic}
                subtitle={`Pertemuan Ke-${meeting.meeting_number}`}
                gradient="from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background"
                iconClassName="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                className="hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/50"
                onClick={() => handleMeetingClick(meeting.id, meeting.topic)}
              />
              {canEdit && (
                <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => openEditDialog(meeting.id, meeting.topic, e)}>
                    <Pencil className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => handleDelete(meeting.id, e)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* VIEW CLASSES */}
          {view === 'classes' && classes.map((cls, idx) => (
            <div key={cls.id} className="relative group">
              <PremiumCard
                variant="pastel"
                icon={Users}
                title={cls.name}
                subtitle="Klik untuk absen"
                gradient="from-teal-50 to-white dark:from-teal-950/20 dark:to-background"
                iconClassName="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
                className="hover:shadow-teal-200/50 dark:hover:shadow-teal-900/50"
                onClick={() => handleClassClick(cls.id, cls.name)}
              />
              {userRole === 'admin_dev' && (
                <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => openEditDialog(cls.id, cls.name, e)}>
                    <Pencil className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" onClick={(e) => handleDelete(cls.id, e)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* STUDENT LIST TABLE (Only when view === students) */}
      {view === 'students' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm flex-wrap gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Daftar Mahasiswa
              <span className="text-sm font-normal text-muted-foreground ml-2">({students.length} Total)</span>
            </h2>
            <div className="flex gap-2 items-center flex-wrap">
              {userRole === 'admin_dev' && (
                <Button variant="destructive" onClick={handleResetSession} className="gap-2 h-9">
                  <RotateCcw className="w-4 h-4" /> Reset Status Pertemuan
                </Button>
              )}
              {canEdit && (
                <div className="flex gap-2">
                  {userRole !== 'mahasiswa' && userRole !== null && (
                    <Button
                      onClick={handleExportExcel}
                      className="gap-2 h-10 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.03] active:scale-[0.97]"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="font-bold">Download Excel</span>
                    </Button>
                  )}
                  <Button
                    onClick={saveAttendance}
                    disabled={Object.keys(pendingChanges).length === 0 || isLoading}
                    className={cn(
                      "gap-2 h-10 px-5 transition-all duration-300 rounded-full font-bold",
                      Object.keys(pendingChanges).length > 0
                        ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white shadow-lg shadow-indigo-500/25 dark:shadow-emerald-500/20 hover:scale-[1.03] active:scale-[0.97]"
                        : "bg-muted/50 text-muted-foreground cursor-not-allowed border border-dashed border-muted-foreground/20"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Save className={cn("w-4 h-4", Object.keys(pendingChanges).length > 0 ? "text-white" : "text-muted-foreground")} />
                    )}
                    <span className="tracking-tight">
                      {isLoading ? 'Menyimpan...' : `Simpan Permanen ${Object.keys(pendingChanges).length > 0 ? `(${Object.keys(pendingChanges).length})` : ''}`}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Mahasiswa</th>
                    <th className="px-6 py-4 font-semibold text-center">NIM</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-center">Metode</th>
                    <th className="px-6 py-4 font-semibold text-center">Waktu Scan</th>
                    {userRole === 'admin_dev' && <th className="px-6 py-4 font-semibold text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((student) => (
                    <tr key={student.id} className={cn(
                      "transition-colors",
                      student.method === 'qr' ? "bg-slate-50/50 dark:bg-slate-900/40 opacity-90" : "hover:bg-muted/30"
                    )}>
                      <td className="px-6 py-4 font-medium flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-offset-2 ring-offset-background",
                          getStatusColor(student.status)
                        )}>
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{student.name}</div>
                          <div className="text-xs text-muted-foreground md:hidden">{student.nim}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center hidden md:table-cell font-mono text-muted-foreground">
                        {student.nim}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleAttendance(student.id, student.status)}
                          disabled={!canEdit || (student.method === 'qr' && userRole !== 'admin_dev')}
                          className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all",
                            getStatusBadge(student.status),
                            (canEdit && !(student.method === 'qr' && userRole !== 'admin_dev')) ? "hover:scale-105 active:scale-95 cursor-pointer" : "cursor-default opacity-90"
                          )}
                        >
                          {getStatusIcon(student.status)}
                          {student.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {student.method === 'manual' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            MANUAL
                          </span>
                        ) : student.method === 'qr' || student.scannedAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <QrCode className="w-3 h-3" /> QR CODE
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-muted-foreground">
                        {student.scannedAt ? new Date(student.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      {userRole === 'admin_dev' && (
                        <td className="px-6 py-4 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleResetIndividual(student.id, student.name)}
                            title="Reset Status Individual"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                        Tidak ada data mahasiswa ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD DIALOG --- */}
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
                  placeholder="Contoh: TIK101"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={submitAdd} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- EDIT DIALOG --- */}
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

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        description={modalConfig.description}
        variant={modalConfig.variant}
        confirmText={modalConfig.confirmText}
        isLoading={isLoading}
      />
      {/* MASTER EXPORT DIALOG */}
      <Dialog open={isMasterExportOpen} onOpenChange={setIsMasterExportOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Download Master Laporan
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label>Pilih Kelas</Label>
              <Select value={selectedExportClassId} onValueChange={setSelectedExportClassId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Pilih Kelas..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Laporan akan digenerate untuk seluruh pertemuan (Semester-Wide) dalam satu file Excel.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMasterExportOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button
              onClick={handleDownloadMasterExcel}
              disabled={!selectedExportClassId || isLoading}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Generate & Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper specific to student list coloring
function getStatusColor(status: string) {
  switch (status) {
    case 'hadir': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'izin': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'alpha': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    default: return 'bg-muted/50 text-muted-foreground border-transparent';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'hadir': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'izin': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'alpha': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
}