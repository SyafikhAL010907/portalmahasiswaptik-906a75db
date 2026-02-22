import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Filter, Plus, Trash2, Edit2, Loader2, Clock, MapPin, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MaterialTimePicker } from '@/components/ui/material-time-picker';
import { cn } from '@/lib/utils';
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

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};
const staggerTop: Variants = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};
const staggerBottom: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export default function Schedule() {
  // --- STATE ---
  const [selectedDay, setSelectedDay] = useState<string>('Senin');
  const [selectedClass, setSelectedClass] = useState<string | null>(null); // Filter by Class ID
  const [classList, setClassList] = useState<ClassItem[]>([]);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [lecturers, setLecturers] = useState<Profile[]>([]); // State for lecturers
  const [isLoading, setIsLoading] = useState(false);

  // RBAC
  const [canManage, setCanManage] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userClassId, setUserClassId] = useState<string | null>(null);

  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
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
    // Always default to 'Senin' (Monday) - no auto-detection
    // setSelectedDay already defaults to 'Senin' in state (line 54)

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
    // Re-evaluate permissions when selectedClass changes
    evaluatePermissions();
  }, [selectedDay, selectedClass, userRole, userClassId]);

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. Get Roles
      const { data: roleProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const role = (roleProfile as any)?.role || null;
      setUserRole(role);

      // 2. Get Profile for Class ID
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
      // Admin Kelas can only manage their own class
      setCanManage(userClassId === selectedClass);
    } else {
      setCanManage(false);
    }
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('id, name').order('name');
    if (data) {
      setClassList(data);
      if (!selectedClass && data.length > 0) setSelectedClass(data[0].id);
    }
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
    // Fetch profiles that have the role 'admin_dosen'
    const { data: rolesData } = await (supabase as any)
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin_dosen');

    if (rolesData && rolesData.length > 0) {
      const lecturerIds = rolesData.map(r => r.user_id);
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
      // 1. Fetch Schedules
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

      if (error) throw error;

      // 2. Extract Lecturer IDs
      const lecturerIds = [...new Set(schedulesData?.map(s => s.lecturer_id).filter(Boolean) as string[])];

      // 3. Fetch Profiles for Lecturers
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

      // 4. Merge Data
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

  // --- HELPER: TIME STATUS VALIDATION ---
  const getStatus = (day: string, start: string, end: string) => {
    const now = new Date();
    const currentDayName = now.toLocaleDateString('id-ID', { weekday: 'long' });

    // Check Day
    if (day !== currentDayName) {
      const dayIdx = days.indexOf(day);
      const currIdx = days.indexOf(currentDayName);
      if (dayIdx < currIdx) return 'finished'; // Past days are finished
      if (dayIdx > currIdx) return 'upcoming'; // Next days are upcoming
    }

    // Check Time (HH:mm:ss)
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = start.split(':').map(Number);
    const startTime = startH * 60 + startM;

    const [endH, endM] = end.split(':').map(Number);
    const endTime = endH * 60 + endM;

    if (currentTime > endTime) return 'finished';
    if (currentTime >= startTime && currentTime <= endTime) return 'ongoing';
    return 'next'; // Or upcoming
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'border-l-4 border-l-blue-500';
      case 'next': return 'border-l-4 border-l-violet-500';
      case 'finished': return 'border-l-4 border-l-slate-400 opacity-70';
      default: return 'border-l-4 border-l-transparent';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing': return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold uppercase tracking-wider animate-pulse">Berlangsung</span>;
      case 'next': return <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20 font-bold uppercase tracking-wider">Selanjutnya</span>;
      case 'finished': return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-bold uppercase tracking-wider">Selesai</span>;
      default: return null;
    }
  };

  // --- CRUD HANDLERS ---
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

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus jadwal ini?")) return;
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
    if (!formData.subject_id || !formData.class_id || !formData.start_time || !formData.end_time || !formData.lecturer_id) {
      toast.error("Mohon lengkapi data, termasuk dosen");
      return;
    }

    setIsLoading(true);
    try {
      const { semester, ...payload } = formData;

      if (isEditing && currentId) {
        const { error } = await supabase.from('schedules').update(payload).eq('id', currentId);
        if (error) {
          console.error("Supabase Error Updating Schedule:", error);
          throw error;
        }
        toast.success("Jadwal diperbarui");
      } else {
        const { error } = await supabase.from('schedules').insert([payload]);
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

  // --- NAVIGATION ---
  const goToPrevDay = () => {
    if (currentDayIndex > 0) setSelectedDay(days[currentDayIndex - 1]);
  };

  const goToNextDay = () => {
    if (currentDayIndex < days.length - 1) setSelectedDay(days[currentDayIndex + 1]);
  };

  return (
    <motion.div
      className="space-y-6 pt-12 md:pt-0 pb-24"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      layout={false}
    >
      {/* Header */}
      <motion.div variants={staggerTop} layout={false} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Jadwal Kuliah</h1>
          <p className="text-muted-foreground mt-1">
            {selectedClass ? `Kelas ${classList.find(c => c.id === selectedClass)?.name}` : 'Pilih Kelas'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedClass || ''} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[140px] glass-card">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
              {classList.map(c => (
                <SelectItem key={c.id} value={c.id}>Kelas {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManage && (
            <Button onClick={handleOpenAdd} className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          )}
        </div>
      </motion.div>

      {/* Day Selector */}
      <motion.div variants={staggerTop} layout={false} className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={goToPrevDay} disabled={currentDayIndex === 0}>
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

          <Button variant="ghost" size="icon" onClick={goToNextDay} disabled={currentDayIndex === days.length - 1}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      {/* Schedule List */}
      <motion.div variants={staggerBottom} layout={false} className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
        ) : schedules.length > 0 ? (
          schedules.map((schedule) => {
            const status = getStatus(schedule.day, schedule.start_time, schedule.end_time);
            return (
              <div
                key={schedule.id}
                className="group rounded-2xl p-[1px] bg-transparent"
              >
                <div
                  className={cn(
                    "rounded-2xl p-6 relative w-full h-full",
                    "bg-transparent border border-border/50 shadow-sm",
                    getStatusColor(status)
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-start justify-between">
                        {/* PRIMARY: Course Name */}
                        <h3 className="font-extrabold text-2xl tracking-tight">
                          {schedule.subjects?.name || 'Unknown Subject'}
                        </h3>
                        {getStatusBadge(status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {/* PRIMARY: Time */}
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-400 dark:text-blue-600" />
                          <span className="font-bold opacity-90">
                            {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)} WIB
                          </span>
                        </div>

                        {/* SECONDARY: Room */}
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-rose-400 dark:text-rose-600" />
                          <span className="opacity-70 text-xs">Ruang:</span>
                          <span className="font-bold">{schedule.room}</span>
                        </div>

                        {/* SECONDARY: Lecturer */}
                        <div className="flex items-center gap-2 sm:col-span-2">
                          <User className="w-4 h-4 text-blue-400 dark:text-blue-600" />
                          <span className="opacity-70 text-xs">Dosen:</span>
                          <span className="font-bold">
                            {schedule.profiles?.full_name || 'Dosen Belum Ditentukan'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex gap-2 self-end md:self-start transition-opacity duration-300">
                        <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2 transition-all shadow-md active:scale-95 flex items-center justify-center" onClick={() => handleOpenEdit(schedule)}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 transition-all shadow-md active:scale-95 flex items-center justify-center" onClick={() => handleDelete(schedule.id)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Tidak ada jadwal kuliah untuk hari {selectedDay}</p>
          </div>
        )}
      </motion.div>

      {/* Legend */}
      <motion.div variants={staggerBottom} layout={false} className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500/30" />
            <span className="text-muted-foreground">Berlangsung</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500/30" />
            <span className="text-muted-foreground">Selanjutnya</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-400/30" />
            <span className="text-muted-foreground">Selesai</span>
          </div>
        </div>
      </motion.div>

      {/* --- ADD/EDIT DIALOG --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Jadwal' : 'Tambah Jadwal'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:gap-4 py-2 sm:py-4">
            <div className="grid gap-2">
              <Label>Semester</Label>
              <Select
                value={formData.semester}
                onValueChange={(val) => {
                  setFormData({ ...formData, semester: val, subject_id: '' });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
                <SelectContent>
                  {semesters.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Mata Kuliah</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(val) => setFormData({ ...formData, subject_id: val })}
                disabled={!formData.semester}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.semester ? "Pilih Mata Kuliah" : "Pilih semester terlebih dahulu"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.filter(s => Number(s.semester) === Number(formData.semester)).length > 0 ? (
                    subjects
                      .filter(s => Number(s.semester) === Number(formData.semester))
                      .map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>Belum ada mata kuliah di semester ini, silakan tambah di Repository.</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Dosen Pengampu</Label>
              <Select
                value={formData.lecturer_id}
                onValueChange={(val) => setFormData({ ...formData, lecturer_id: val })}
              >
                <SelectTrigger><SelectValue placeholder="Pilih Dosen" /></SelectTrigger>
                <SelectContent>
                  {lecturers.map(l => (
                    <SelectItem key={l.user_id} value={l.user_id}>{l.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Hari</Label>
              <Select
                value={formData.day}
                onValueChange={(val) => setFormData({ ...formData, day: val })}
              >
                <SelectTrigger><SelectValue placeholder="Pilih Hari" /></SelectTrigger>
                <SelectContent>
                  {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="grid gap-2">
                <Label>Jam Mulai</Label>
                <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formData.start_time ? formData.start_time : <span className="text-muted-foreground">Pilih Waktu</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 border-none shadow-none bg-transparent"
                    align="center"
                    side="bottom"
                    sideOffset={8}
                    avoidCollisions={true}
                  >
                    <MaterialTimePicker
                      time={formData.start_time || "00:00"}
                      onChange={(t) => setFormData({ ...formData, start_time: t })}
                      onClose={() => setIsStartOpen(false)}
                      onClear={() => setFormData({ ...formData, start_time: '' })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>Jam Selesai</Label>
                <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formData.end_time ? formData.end_time : <span className="text-muted-foreground">Pilih Waktu</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 border-none shadow-none bg-transparent"
                    align="center"
                    side="bottom"
                    sideOffset={8}
                    avoidCollisions={true}
                  >
                    <MaterialTimePicker
                      time={formData.end_time || "00:00"}
                      onChange={(t) => setFormData({ ...formData, end_time: t })}
                      onClose={() => setIsEndOpen(false)}
                      onClear={() => setFormData({ ...formData, end_time: '' })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Ruangan</Label>
              <Input value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} placeholder="Contoh: Lab Komputer 1" />
            </div>


          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit}>{isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
