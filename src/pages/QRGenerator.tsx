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
import QRCode from 'qrcode';

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
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    fetchSubjects();
    fetchClasses();
    fetchActiveSession();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchMeetings(selectedSubject);
    }
  }, [selectedSubject]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const expires = new Date(activeSession.expires_at).getTime();
        const diff = Math.max(0, Math.floor((expires - now) / 1000));
        setTimeLeft(diff);

        if (diff === 0) {
          setActiveSession(null);
          setQrCodeDataUrl('');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

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

  const fetchActiveSession = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        meetings(meeting_number, subjects(name)),
        classes(name)
      `)
      .eq('lecturer_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (data) {
      const session: ActiveSession = {
        id: data.id,
        qr_code: data.qr_code,
        expires_at: data.expires_at,
        class_name: (data.classes as any)?.name || '-',
        subject_name: (data.meetings as any)?.subjects?.name || '-',
        meeting_number: (data.meetings as any)?.meeting_number || 0,
      };
      setActiveSession(session);
      generateQRCodeImage(data.qr_code);
    }
  };

  const generateQRCodeImage = async (text: string) => {
    try {
      const url = await QRCode.toDataURL(text, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(url);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedSubject || !selectedMeeting || !selectedClass) {
      toast.error('Pilih mata kuliah, pertemuan, dan kelas');
      return;
    }

    if (!user) {
      toast.error('Anda harus login terlebih dahulu');
      return;
    }

    setIsLoading(true);

    try {
      // Generate unique QR code
      const qrCode = `PTIK-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Set expiry to 5 minutes from now
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Deactivate any existing sessions for this lecturer
      await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('lecturer_id', user.id);

      // Create new session
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          meeting_id: selectedMeeting,
          class_id: selectedClass,
          lecturer_id: user.id,
          qr_code: qrCode,
          expires_at: expiresAt,
          is_active: true,
        })
        .select(`
          *,
          meetings(meeting_number, subjects(name)),
          classes(name)
        `)
        .single();

      if (error) throw error;

      const session: ActiveSession = {
        id: data.id,
        qr_code: data.qr_code,
        expires_at: data.expires_at,
        class_name: (data.classes as any)?.name || '-',
        subject_name: (data.meetings as any)?.subjects?.name || '-',
        meeting_number: (data.meetings as any)?.meeting_number || 0,
      };

      setActiveSession(session);
      await generateQRCodeImage(qrCode);
      toast.success('QR Code berhasil dibuat!');
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Gagal membuat QR Code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    if (!activeSession) return;

    setIsLoading(true);

    try {
      const newQrCode = `PTIK-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('attendance_sessions')
        .update({
          qr_code: newQrCode,
          expires_at: newExpiresAt,
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      setActiveSession({
        ...activeSession,
        qr_code: newQrCode,
        expires_at: newExpiresAt,
      });

      await generateQRCodeImage(newQrCode);
      toast.success('QR Code berhasil diperbarui!');
    } catch (error) {
      console.error('Error refreshing QR:', error);
      toast.error('Gagal memperbarui QR Code');
    } finally {
      setIsLoading(false);
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
              <label className="text-sm font-medium">Mata Kuliah</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata kuliah" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subj) => (
                    <SelectItem key={subj.id} value={subj.id}>
                      {subj.name} (Semester {subj.semester})
                    </SelectItem>
                  ))}
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
                  <SelectValue placeholder="Pilih pertemuan" />
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
              disabled={isLoading}
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
            {activeSession && qrCodeDataUrl ? (
              <div className="text-center space-y-4">
                {/* Session Info */}
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="secondary">{activeSession.subject_name}</Badge>
                  <Badge variant="outline">Pertemuan {activeSession.meeting_number}</Badge>
                  <Badge className="bg-primary">Kelas {activeSession.class_name}</Badge>
                </div>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-2xl inline-block shadow-lg">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code Absensi"
                    className="w-64 h-64 mx-auto"
                  />
                </div>

                {/* Timer */}
                <div className={`flex items-center justify-center gap-2 text-lg font-mono ${
                  timeLeft < 60 ? 'text-destructive' : 'text-foreground'
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

                {/* Instructions */}
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-success" />
                    QR Code akan berubah otomatis setiap 5 menit
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
                  Pilih mata kuliah dan pertemuan, lalu klik Generate untuk membuat QR Code
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
