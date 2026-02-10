import { useState, useEffect } from 'react';
import {
  QrCode, Clock, CheckCircle2, RefreshCw,
  BookOpen, Calendar, Loader2, AlertCircle, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { QRCodeCanvas } from 'qrcode.react';

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
}

interface Meeting {
  id: string;
  meeting_number: number;
  topic: string;
}

interface ClassData {
  id: string;
  name: string;
}

interface ActiveSession {
  id: string;
  qr_code: string;
  expires_at: string;
  class_name: string;
  subject_name: string;
  meeting_number: number;
}

export default function QRGenerator() {
  const { user, isAdminDosen, isAdminDev } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);

  // FRESH START: No LocalStorage, defaults to empty
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isExpired, setIsExpired] = useState(false);
  const [scannedStudents, setScannedStudents] = useState<any[]>([]);

  // cleanup and fresh start
  useEffect(() => {
    // Clear any potential leftover local storage on mount just in case
    localStorage.removeItem('qr_sem');
    localStorage.removeItem('qr_sub');
    localStorage.removeItem('qr_meet');
    localStorage.removeItem('qr_cls');
    localStorage.removeItem('qr_active_session');

    // Fetch initial options
    fetchSubjects();
    fetchClasses();

    // Explicitly reset state (redundant but requested)
    setSelectedSemester('');
    setSelectedSubject('');
    setSelectedMeeting('');
    setSelectedClass('');
    setActiveSession(null);

    // Cleanup on unmount
    return () => {
      setSelectedSemester('');
      setSelectedSubject('');
      setSelectedMeeting('');
      setSelectedClass('');
      setActiveSession(null);
    };
  }, []);

  // REAL-TIME FEEDBACK: Watch for new scans
  useEffect(() => {
    if (!activeSession) {
      setScannedStudents([]);
      return;
    }

    // Fetch initial scans
    const fetchInitialScans = async () => {
      const { data } = await (supabase
        .from('attendance_records' as any)
        .select(`
          id,
          scanned_at,
          profiles:student_id (
            full_name,
            nim,
            avatar_url
          )
        `)
        .eq('session_id', activeSession.id)
        .order('scanned_at', { ascending: false }) as any);

      if (data) setScannedStudents(data);
    };

    fetchInitialScans();

    const channel = supabase
      .channel(`session_scans_${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${activeSession.id}`
        },
        async (payload) => {
          // Fetch the full student info for the new record
          const { data } = await (supabase
            .from('attendance_records' as any)
            .select(`
              id,
              scanned_at,
              profiles:student_id (
                full_name,
                nim,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single() as any);

          if (data) {
            setScannedStudents(prev => {
              if (prev.some(s => s.id === data.id)) return prev;
              return [data, ...prev];
            });
            toast.success(`${(data.profiles as any)?.full_name} berhasil absen!`, { icon: '👋' });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession]);

  useEffect(() => {
    if (selectedSubject) {
      fetchMeetings(selectedSubject);
    } else {
      setMeetings([]);
    }
  }, [selectedSubject]);

  // Timer logic for QR code expiration
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeSession && !isExpired) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [activeSession, isExpired]);

  const fetchSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .order('semester', { ascending: true });
    setSubjects(data || []);
  };

  const fetchMeetings = async (subjectId: string) => {
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('subject_id', subjectId)
      .order('meeting_number');
    setMeetings(data || []);
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    setClasses(data || []);
  };

  const handleGenerateQR = async () => {
    if (!selectedSemester || !selectedSubject || !selectedMeeting || !selectedClass) {
      toast.error('Mohon lengkapi semua data sesi (Semester, Matkul, Pertemuan, Kelas)');
      return;
    }

    if (!user) {
      toast.error('Anda harus login terlebih dahulu');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Deactivate existing sessions for this lecturer+class+meeting to avoid confusion
      await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('lecturer_id', user.id)
        .eq('class_id', selectedClass)
        .eq('meeting_id', selectedMeeting);

      // 2. Generate Initial Token
      const token = Math.random().toString(36).substring(7);

      // 3. Create Session Record
      // Use default duration for session (e.g. 100 minutes)
      const expiresAt = new Date(Date.now() + 100 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          meeting_id: selectedMeeting,
          class_id: selectedClass,
          lecturer_id: user.id,
          qr_code: 'init',
          expires_at: expiresAt,
          is_active: true,
        })
        .select(`*, meetings(meeting_number, subjects(name)), classes(name)`)
        .single();

      if (error) throw error;

      // 4. Actual Payload: Removed Radius Limit
      const payload = JSON.stringify({
        s: data.id,
        c: selectedClass,
        t: token
      });

      await supabase
        .from('attendance_sessions')
        .update({ qr_code: payload })
        .eq('id', data.id);

      // 5. Set State
      const newSession = {
        id: data.id,
        qr_code: payload,
        expires_at: expiresAt,
        class_name: (data.classes as any)?.name || '-',
        subject_name: (data.meetings as any)?.subjects?.name || '-',
        meeting_number: (data.meetings as any)?.meeting_number || 0,
      };

      setActiveSession(newSession);
      setIsExpired(false);
      setTimeLeft(60);

      toast.success('Sesi Absensi Dimulai!');

    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Gagal membuat sesi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    if (!activeSession) return;

    setIsLoading(true);
    try {
      setIsExpired(false);
      setTimeLeft(60);
      const newCode = Math.random().toString(36).substring(7);

      const currentPayload = JSON.parse(activeSession.qr_code);
      const payload = JSON.stringify({
        ...currentPayload,
        t: newCode
      });

      const { error } = await supabase
        .from('attendance_sessions')
        .update({ qr_code: payload })
        .eq('id', activeSession.id);

      if (error) throw error;

      setActiveSession(prev => prev ? { ...prev, qr_code: payload } : null);
      toast.success('QR Code diperbarui!');

    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Gagal refresh QR');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract class ID if state is lost (refresh)
  const parseClassIdFromPayload = (payload: string) => {
    try {
      return JSON.parse(payload).c;
    } catch {
      return '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isAdminDosen() && !isAdminDev()) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Akses Ditolak</h2>
          <p className="text-muted-foreground mt-2">
            Hanya Dosen yang dapat mengakses halaman ini
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="w-7 h-7 text-primary" />
          Generator QR Absensi
        </h1>
        <p className="text-muted-foreground mt-1">
          Buat QR Code untuk sesi perkuliahan
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Konfigurasi Sesi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select
                value={selectedSemester}
                onValueChange={(val) => {
                  setSelectedSemester(val);
                  setSelectedSubject(''); // Reset child
                  setSelectedMeeting(''); // Reset grandchild
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mata Kuliah</label>
              <Select
                value={selectedSubject}
                onValueChange={(val) => {
                  setSelectedSubject(val);
                  setSelectedMeeting(''); // Reset child
                }}
                disabled={!selectedSemester}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedSemester ? "Pilih semester dulu" : "Pilih mata kuliah"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects
                    .filter(s => !selectedSemester || s.semester === parseInt(selectedSemester))
                    .length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">Tidak ada matkul di semester ini</div>
                  ) : (
                    subjects
                      .filter(s => !selectedSemester || s.semester === parseInt(selectedSemester))
                      .map((subj) => (
                        <SelectItem key={subj.id} value={subj.id}>
                          {subj.name} ({subj.code})
                        </SelectItem>
                      ))
                  )
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pertemuan</label>
              <Select
                value={selectedMeeting}
                onValueChange={setSelectedMeeting}
                disabled={!selectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedSubject ? "Pilih matkul dulu" : "Pilih pertemuan"} />
                </SelectTrigger>
                <SelectContent>
                  {meetings.map((meet) => (
                    <SelectItem key={meet.id} value={meet.id}>
                      Pertemuan {meet.meeting_number} - {meet.topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      Kelas {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full gap-2 h-12 text-lg font-bold rounded-2xl primary-gradient shadow-lg"
              onClick={handleGenerateQR}
              disabled={isLoading || !selectedSemester || !selectedSubject || !selectedMeeting || !selectedClass}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <QrCode className="w-5 h-5" />
              )}
              Generate QR Code
            </Button>
          </CardContent>
        </Card>

        {/* QR Display Section */}
        <Card className="overflow-hidden border-none shadow-2xl">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              QR Code & Real-time Scans
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {activeSession ? (
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  {/* Session Info */}
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1 rounded-full">{activeSession.subject_name}</Badge>
                    <Badge variant="outline" className="px-3 py-1 rounded-full border-primary/30 text-primary">Pertemuan {activeSession.meeting_number}</Badge>
                    <Badge className="px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none">Kelas {activeSession.class_name}</Badge>
                  </div>

                  {isExpired ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed border-muted-foreground/30">
                      <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground font-medium mb-4">Sesi Absensi Berakhir</p>
                      <Button onClick={handleRefreshQR} className="gap-2 rounded-xl" disabled={isLoading}>
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        Mulai Sesi Baru
                      </Button>
                    </div>
                  ) : (
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                      <div className="relative bg-white p-6 rounded-3xl inline-block shadow-inner border border-white/50">
                        <QRCodeCanvas
                          value={activeSession.qr_code}
                          size={220}
                          level={"H"}
                          includeMargin={false}
                          className="mx-auto"
                        />
                      </div>
                    </div>
                  )}

                  {!isExpired && (
                    <div className="space-y-4">
                      {/* Timer */}
                      <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold shadow-sm transition-colors",
                        timeLeft < 10
                          ? 'bg-destructive/10 text-destructive animate-pulse'
                          : 'bg-primary/5 text-primary'
                      )}>
                        <Clock className="w-5 h-5" />
                        <span>Token Reset: {formatTime(timeLeft)}s</span>
                      </div>

                      <div className="flex gap-3 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 rounded-full px-4 border-primary/20 hover:bg-primary/5"
                          onClick={handleRefreshQR}
                          disabled={isLoading}
                        >
                          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                          Refresh Manual
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* REAL-TIME STUDENT LIST */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Mahasiswa Terabsen ({scannedStudents.length})
                    </h4>
                    {scannedStudents.length > 0 && (
                      <div className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                        Live
                      </div>
                    )}
                  </div>

                  <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {scannedStudents.length === 0 ? (
                      <div className="text-center py-8 bg-muted/30 rounded-2xl border-2 border-dashed border-border/50">
                        <div className="animate-bounce mb-2">
                          <Loader2 className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                        </div>
                        <p className="text-xs text-muted-foreground">Menunggu mahasiswa scanning...</p>
                      </div>
                    ) : (
                      scannedStudents.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/30 animate-in fade-in slide-in-from-top-2 duration-300"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                              {(item.profiles as any)?.avatar_url ? (
                                <img src={(item.profiles as any).avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-primary/50" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm">{(item.profiles as any)?.full_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{(item.profiles as any)?.nim}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-bold px-2 py-0.5 rounded-full text-[10px] inline-block">Hadir</div>
                            <p className="text-[9px] text-muted-foreground mt-1">
                              {new Date(item.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 px-8">
                <div className="w-40 h-40 mx-auto mb-6 rounded-full bg-primary/5 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-spin-slow"></div>
                  <QrCode className="w-20 h-20 text-primary/20" />
                </div>
                <h3 className="text-xl font-bold mb-2">Siap untuk Sesi Baru?</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Silakan pilih Semester, Mata Kuliah, Pertemuan, dan Kelas untuk memulai absensi.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
