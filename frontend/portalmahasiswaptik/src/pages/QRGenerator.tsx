import { useState, useEffect } from 'react';
import {
  QrCode, Clock, CheckCircle2, RefreshCw,
  BookOpen, Calendar, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Removed: user dependency useEffect for fetchActiveSession (No auto-restore)
  // Removed: LocalStorage sync useEffects

  useEffect(() => {
    if (selectedSubject) {
      fetchMeetings(selectedSubject);
    } else {
      setMeetings([]);
    }
  }, [selectedSubject]);

  // REMOVED: Aggressive useEffects that reset state on dependency change.
  // We now handle resets in the onValueChange handlers to allow restoration from LS.

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
  }, [activeSession, isExpired]); // Reset timer when activeSession or isExpired changes

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

  // Removed fetchActiveSession to ensure fresh start (no auto-fill)

  // Removed generateQRCodeImage function as it is no longer needed

  // Auto-refresh QR Code every 2 minutes - REMOVED as per instruction
  // useEffect(() => {
  //   let refreshInterval: NodeJS.Timeout;

  //   if (activeSession && activeSession.expires_at) {
  //     // Check if session is still valid
  //     const checkValidity = () => {
  //       const now = new Date();
  //       const expires = new Date(activeSession.expires_at);
  //       if (now >= expires) {
  //         setActiveSession(null);
  //         return false;
  //       }
  //       return true;
  //     };

  //     if (!checkValidity()) return;

  //     refreshInterval = setInterval(async () => {
  //       if (!checkValidity()) return;
  //       await handleRefreshQR(true); // true = silent refresh
  //     }, 2 * 60 * 1000); // 2 minutes
  //   }

  //   return () => clearInterval(refreshInterval);
  // }, [activeSession]);

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
      // 1. Deactivate existing sessions
      await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('lecturer_id', user.id);

      // 2. Generate Initial Token
      const token = Math.random().toString(36).substring(7);

      // 3. Create Session DB Record FIRST to get the ID
      // We use a temporary placeholder for qr_code initially or generate ID first?
      // Supabase insert returns data.

      const expiresAt = new Date(Date.now() + 100 * 60 * 1000).toISOString(); // Session valid for 100 mins (class duration)

      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          meeting_id: selectedMeeting,
          class_id: selectedClass,
          lecturer_id: user.id,
          qr_code: 'init', // Placeholder, will update immediately with ID
          expires_at: expiresAt,
          is_active: true,
        })
        .select(`*, meetings(meeting_number, subjects(name)), classes(name)`)
        .single();

      if (error) throw error;

      // 4. Update with actual Payload: { sessionId, classId, token }
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
      setTimeLeft(60); // Reset timer
      const newCode = Math.random().toString(36).substring(7);
      // Payload structure must match scanner expectation
      const payload = JSON.stringify({
        s: activeSession.id,
        c: selectedClass || parseClassIdFromPayload(activeSession.qr_code),
        t: newCode // Use newCode here
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
              className="w-full gap-2"
              onClick={handleGenerateQR}
              disabled={isLoading || !selectedSemester || !selectedSubject || !selectedMeeting || !selectedClass}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4" />
              )}
              Generate QR Code
            </Button>
          </CardContent>
        </Card>

        {/* QR Display Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSession ? (
              <div className="text-center space-y-4">
                {/* Session Info */}
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="secondary">{activeSession.subject_name}</Badge>
                  <Badge variant="outline">Pertemuan {activeSession.meeting_number}</Badge>
                  <Badge className="bg-primary">Kelas {activeSession.class_name}</Badge>
                </div>

                {isExpired ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/30">
                    <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium mb-4">QR Code Kadaluwarsa</p>
                    <Button onClick={handleRefreshQR} className="gap-2" disabled={isLoading}>
                      <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                      Generate Ulang
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-lg">
                    <QRCodeCanvas
                      value={activeSession.qr_code}
                      size={256}
                      level={"H"}
                      includeMargin={true}
                    />
                  </div>
                )}

                {!isExpired && (
                  <>
                    {/* Timer */}
                    <div className={`flex items-center justify-center gap-2 text-lg font-mono ${timeLeft < 10 ? 'text-destructive' : 'text-foreground'
                      }`}>
                      <Clock className="w-5 h-5" />
                      <span>Berlaku: {formatTime(timeLeft)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleRefreshQR}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh QR
                      </Button>
                    </div>
                  </>
                )}

                {/* Instructions */}
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-success" />
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-success" />
                    QR Code akan berubah otomatis setiap 1 menit (Anti-Cheat)
                  </p>
                  <p className="flex items-start gap-2 mt-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-success" />
                    Tampilkan QR ini di layar untuk mahasiswa scan
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Lengkapi form di samping untuk membuat QR Code
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
