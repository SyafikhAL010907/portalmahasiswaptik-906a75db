import { useState, useEffect } from 'react';
import {
  Folder, FolderOpen, Users, ChevronRight, ArrowLeft,
  CheckCircle, XCircle, Clock, Plus, Pencil, Trash2, Save, Loader2, UserCheck
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

// --- INTERFACES ---
interface Student {
  id: string; // This corresponds to profile.user_id
  name: string;
  nim: string;
  status: 'hadir' | 'izin' | 'alpha';
}

type ViewState = 'semesters' | 'courses' | 'meetings' | 'classes' | 'students';

export default function AttendanceHistory() {
  // --- STATE DATA (DYNAMIC) ---
  const [semesters, setSemesters] = useState([
    { id: '1', name: 'Semester 1' },
    { id: '2', name: 'Semester 2' },
    { id: '3', name: 'Semester 3' },
    { id: '4', name: 'Semester 4' },
    { id: '5', name: 'Semester 5' },
    { id: '6', name: 'Semester 6' },
    { id: '7', name: 'Semester 7' },
    { id: '8', name: 'Semester 8' },
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

        // Allow edit if user is admin_dev (Super Admin) or admin_kelas
        // Dosen and Mahasiswa cannot edit
        const hasAccess = rolesList.some(r => ['admin_dev', 'admin_kelas'].includes(r));
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
        .limit(1);

      let recordMap = new Map<string, string>();

      if (sessions && sessions.length > 0) {
        const sessionId = sessions[0].id;
        const { data: records, error: recordsError } = await supabase
          .from('attendance_records')
          .select('student_id, status')
          .eq('session_id', sessionId);

        if (recordsError) throw recordsError;

        if (records) {
          records.forEach(r => recordMap.set(r.student_id, r.status));
        }
      }

      const mappedStudents: Student[] = filteredProfiles.map(p => ({
        id: p.user_id,
        name: p.full_name,
        nim: p.nim,
        status: (recordMap.get(p.user_id) as any) || 'alpha'
      }));

      const finalStudents = mappedStudents.map(s => ({
        ...s,
        status: (recordMap.has(s.id) ? recordMap.get(s.id) : 'hadir') as 'hadir' | 'izin' | 'alpha'
      }));

      setStudents(finalStudents);

    } catch (err: any) {
      toast.error("Gagal memuat data mahasiswa: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
  const toggleAttendance = (studentId: string, current: string) => {
    if (!canEdit) return;
    const statuses: ('hadir' | 'izin' | 'alpha')[] = ['hadir', 'izin', 'alpha'];
    const nextStatus = statuses[(statuses.indexOf(current as any) + 1) % 3];
    setStudents(students.map(s => s.id === studentId ? { ...s, status: nextStatus } : s));
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
      const recordsToUpsert = students.map(s => ({
        session_id: sessionId!,
        student_id: s.id,
        status: s.status,
        scanned_at: new Date().toISOString()
      }));

      const { error: upsertError } = await supabase
        .from('attendance_records')
        .upsert(recordsToUpsert, { onConflict: 'session_id, student_id' });

      if (upsertError) throw upsertError;

      toast.success("Absensi berhasil disimpan permanen!");
    } catch (err: any) {
      toast.error("Gagal simpan absensi: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- HELPERS ---
  const getStatusIcon = (status: string) => {
    if (status === 'hadir') return <CheckCircle className="w-5 h-5 text-success" />;
    if (status === 'izin') return <Clock className="w-5 h-5 text-warning-foreground" />;
    return <XCircle className="w-5 h-5 text-destructive" />;
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {view !== 'semesters' && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full bg-muted/50">
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
        {view !== 'students' && view !== 'semesters' && canEdit && (
          <Button onClick={openAddDialog} className="rounded-xl gap-2 shadow-lg hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" /> Tambah {view.slice(0, -1)}
          </Button>
        )}
      </div>

      {/* LOADING STATE */}
      {isLoading && view !== 'students' && !isAddOpen && !isEditOpen ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* VIEW SEMESTERS */}
          {view === 'semesters' && semesters.map(sem => (
            <div key={sem.id} onClick={() => handleSemesterClick(sem.id, sem.name)} className="glass-card rounded-2xl p-6 relative group cursor-pointer hover:border-primary/50 hover:scale-[1.02] transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Folder className="w-7 h-7 text-primary" /></div>
              <h3 className="font-bold text-lg">{sem.name}</h3>
              <ChevronRight className="absolute bottom-6 right-6 w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          ))}

          {/* VIEW COURSES */}
          {view === 'courses' && courses.map(course => (
            <div key={course.id} onClick={() => handleCourseClick(course.id, course.name)} className="glass-card rounded-2xl p-6 relative group cursor-pointer hover:border-success/50 hover:scale-[1.02] transition-all">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4"><FolderOpen className="w-6 h-6 text-success" /></div>
              <h3 className="font-bold">{course.name}</h3>
              {canEdit && (
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => openEditDialog(course.id, course.name, e)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={(e) => handleDelete(course.id, e)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              )}
            </div>
          ))}

          {/* VIEW MEETINGS */}
          {view === 'meetings' && meetings.map(meeting => (
            <div key={meeting.id} onClick={() => handleMeetingClick(meeting.id, meeting.topic || `Pertemuan ${meeting.meeting_number}`)} className="glass-card rounded-2xl p-6 relative group cursor-pointer hover:border-warning/50 hover:scale-[1.02] transition-all">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4 text-warning font-black text-xl">{meeting.meeting_number}</div>
              <h3 className="font-bold">{meeting.topic || `Pertemuan ${meeting.meeting_number}`}</h3>
              {canEdit && (
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => openEditDialog(meeting.id, meeting.topic, e)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={(e) => handleDelete(meeting.id, e)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              )}
            </div>
          ))}

          {/* VIEW CLASSES */}
          {view === 'classes' && classes.map(cls => (
            <div key={cls.id} onClick={() => handleClassClick(cls.id, cls.name)} className="glass-card rounded-2xl p-6 relative group cursor-pointer hover:border-accent/50 text-center hover:scale-[1.02] transition-all">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"><Users className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold">{cls.name}</h3>
              {canEdit && (
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => openEditDialog(cls.id, cls.name, e)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={(e) => handleDelete(cls.id, e)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* VIEW STUDENTS (TABLE MODE) */}
      {view === 'students' && (
        <div className="glass-card rounded-3xl overflow-hidden border-2 border-primary/10">
          <div className="p-6 bg-muted/30 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Daftar Absensi Mahasiswa</h3>
              <p className="text-xs text-muted-foreground mt-1">Kelas: {activeId.className} | {activeId.meetingName}</p>
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
                    <tr className="text-left text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50">
                      <th className="p-4 pl-6">NIM</th>
                      <th className="p-4">Nama</th>
                      <th className="p-4 text-center">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-muted/50 transition-colors border-b border-border/10 last:border-0">
                        <td className="p-4 pl-6 font-mono text-sm text-foreground/70">{s.nim}</td>
                        <td className="p-4 font-bold text-foreground">{s.name}</td>
                        <td className="p-4 flex justify-center">
                          <button
                            onClick={() => canEdit && toggleAttendance(s.id, s.status)}
                            disabled={!canEdit}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95 outline-none focus:ring-2 ring-primary/50",
                              s.status === 'hadir' ? 'bg-success/10 text-success border border-success/20' :
                                s.status === 'izin' ? 'bg-warning/10 text-warning-foreground border border-warning/20' :
                                  'bg-destructive/10 text-destructive border border-destructive/20',
                              !canEdit && "opacity-80 cursor-default active:scale-100"
                            )}
                          >
                            {getStatusIcon(s.status)}
                            <span className="capitalize">{s.status}</span>
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