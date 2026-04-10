import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

// --- NINJA DIAGNOSIS TOOLS ---
const ninjaUrl = "https://owqjsqvpmsctztpgensg.supabase.co";
const ninjaKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cWpzcXZwbXNjdHp0cGdlbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI0NTkwNCwiZXhwIjoyMDg1ODIxOTA0fQ.S9TInNnZHCsjuuYrpcXB5xpM4Lsr3MIE1YsFPdhq2Hg";

const getNinjaClient = () => {
  return createClient(ninjaUrl, ninjaKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};

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

export function useQRGenerator() {
  const { user, isAdminDosen, isAdminDev } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);

  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedLearningMethod, setSelectedLearningMethod] = useState<string>('Luring');

  const [isLoading, setIsLoading] = useState(false);
  const [tokenResetMinutes, setTokenResetMinutes] = useState(1);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isExpired, setIsExpired] = useState(false);
  const [scannedStudents, setScannedStudents] = useState<any[]>([]);
  const [totalClassStudents, setTotalClassStudents] = useState(0);

  // cleanup and fresh start
  useEffect(() => {
    localStorage.removeItem('qr_sem');
    localStorage.removeItem('qr_sub');
    localStorage.removeItem('qr_meet');
    localStorage.removeItem('qr_cls');
    localStorage.removeItem('qr_active_session');

    fetchSubjects();
    fetchClasses();

    setSelectedSemester('');
    setSelectedSubject('');
    setSelectedMeeting('');
    setSelectedClass('');
    setSelectedLearningMethod('Luring');
    setActiveSession(null);

    return () => {
      setSelectedSemester('');
      setSelectedSubject('');
      setSelectedMeeting('');
      setSelectedClass('');
      setActiveSession(null);
    };
  }, []);

  const fetchInitialScans = async () => {
    if (!activeSession) {
      setScannedStudents([]);
      return;
    }
    try {
      const { data: records, error } = await (supabase.from('attendance_records') as any)
        .select('id, scanned_at, student_id, status, latitude, longitude, distance_meters, is_misslock')
        .eq('session_id', activeSession.id)
        .order('scanned_at', { ascending: false });

      if (error) throw error;

      if (records && records.length > 0) {
        const studentIds = records.map(r => r.student_id);
        const { data: profiles, error: profileError } = await (supabase.from('profiles') as any)
          .select('user_id, full_name, nim, avatar_url')
          .in('user_id', studentIds);

        if (profileError) throw profileError;

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        const formatted = records.map(r => {
          const p = profileMap.get(r.student_id) as any;
          return {
            id: r.id,
            name: p?.full_name || 'Unknown',
            nim: p?.nim || '-',
            scanned_at: r.scanned_at,
            avatar_url: p?.avatar_url || undefined,
            status: r.status,
            distance_meters: (r as any).distance_meters,
            is_misslock: (r as any).is_misslock,
            latitude: (r as any).latitude,
            longitude: (r as any).longitude
          };
        });

        setScannedStudents(formatted);
      } else {
        setScannedStudents([]);
      }
    } catch (err: any) {
      console.error("Fetch scans error:", err);
    }
  };

  const fetchTotalStudents = async () => {
    if (!selectedClass) {
      setTotalClassStudents(0);
      return;
    }
    try {
      const { count, error } = await (supabase.from('profiles') as any)
        .select('*', { count: 'exact', head: true })
        .eq('class_id', selectedClass);
      
      if (error) throw error;
      setTotalClassStudents(count || 0);
    } catch (err) {
      console.error("Fetch total students error:", err);
      // Fallback
      setTotalClassStudents(0);
    }
  };

  const refreshData = async () => {
    await Promise.all([
      fetchInitialScans(),
      fetchTotalStudents()
    ]);
  };

  // REAL-TIME FEEDBACK: Watch for new scans
  useEffect(() => {
    if (!activeSession) {
      setScannedStudents([]);
      setTotalClassStudents(0);
      return;
    }

    console.log("Setting up attendance sync for session:", activeSession.id);
    refreshData();

    // Fallback Polling every 5 seconds
    const pollInterval = setInterval(() => {
      refreshData();
    }, 5000);

    const channel = supabase
      .channel(`session_scans_${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records',
        },
        async (payload) => {
          // FILTER IN FRONTEND (More reliable than server-side filter in some envs)
          if (payload.new.session_id !== activeSession.id) return;

          // --- SAVE PER-USER LEARNING METHOD ---
          localStorage.setItem(`learning_method_${activeSession.id}_${payload.new.student_id}`, selectedLearningMethod);

          console.log("New scan detected for our session!", payload.new);
          
          try {
            const ninja = getNinjaClient();
            const { data: profile } = await (ninja as any)
              .from('profiles')
              .select('full_name, nim, avatar_url')
              .eq('user_id', payload.new.student_id)
              .single();

            const formattedNewRecord = {
              id: payload.new.id,
              name: profile?.full_name || 'Mahasiswa',
              nim: profile?.nim || '-',
              scanned_at: payload.new.scanned_at,
              avatar_url: profile?.avatar_url || undefined,
              status: payload.new.status
            };

            setScannedStudents(prev => {
              if (prev.some(s => s.id === formattedNewRecord.id)) return prev;
              return [formattedNewRecord, ...prev];
            });
            toast.success(`${formattedNewRecord.name} berhasil absen!`, { icon: '👋' });
          } catch (err) {
            console.error("Error fetching profile for new record:", err);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [activeSession?.id]);

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
      // --- 🛠️ KALIBRASI JARAK (Ubah di sini bro) ---
      // Kalo GPS ngaco (misal jarak deket tapi kedetect 58m), isi angka 58 di bawah:
      const DISTANCE_FIX_METERS = 53.2; 

      // (Optional) Kalo mau lock koordinat manual (Google Maps), set ke true:
      const USE_MANUAL_COORDINATES = false; 
      const MANUAL_LAT = -6.200000;         
      const MANUAL_LNG = 106.800000;        
      // --------------------------------------------

      // 1. CAPTURE LECTURER GEOLOCATION FIRST (PRE-FLIGHT)
      let lecturerCoords: { lat: number; lng: number } | null = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              enableHighAccuracy: true, 
              timeout: 10000, 
              maximumAge: 0 
            });
          });
          lecturerCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
          console.log("📍 Pre-flight Lecturer Coords:", lecturerCoords);
        } catch (geoErr) {
          console.warn("Failed to get lecturer coords before session creation:", geoErr);
        }
      }

      // TERAPIN MANUAL OVERRIDE KALO DIAKTIFIN
      if (USE_MANUAL_COORDINATES) {
        lecturerCoords = { lat: MANUAL_LAT, lng: MANUAL_LNG };
      }

      // 2. Cleanup old sessions
      await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('lecturer_id', user.id)
        .eq('class_id', selectedClass)
        .eq('meeting_id', selectedMeeting);

      // 3. Create Session (Expires in 2 hours by default)
      const token = Math.random().toString(36).substring(7);
      const expiresAt = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          meeting_id: selectedMeeting,
          class_id: selectedClass,
          lecturer_id: user.id,
          qr_code: 'init',
          expires_at: expiresAt,
          is_active: true,
          latitude: lecturerCoords?.lat,
          longitude: lecturerCoords?.lng
        } as any)
        .select(`*, meetings(meeting_number, subjects(name)), classes(name)`)
        .single();

      if (error) throw error;

      // 4. Generate Payload with COORDS included
      const payloadObj = { 
        s: data.id, 
        c: selectedClass, 
        t: token,
        lat: lecturerCoords?.lat,
        lng: lecturerCoords?.lng,
        df: DISTANCE_FIX_METERS // 'df' = Distance Fix
      };
      const payloadStr = JSON.stringify(payloadObj);
      
      await supabase.from('attendance_sessions').update({ qr_code: payloadStr }).eq('id', data.id);

      setActiveSession({
        id: data.id,
        qr_code: payloadStr,
        expires_at: expiresAt,
        class_name: (data.classes as any)?.name || '-',
        subject_name: (data.meetings as any)?.subjects?.name || '-',
        meeting_number: (data.meetings as any)?.meeting_number || 0,
      });

      // --- SAVE LEARNING METHOD & COORDS TO LOCAL STORAGE ---
      localStorage.setItem(`learning_method_${data.id}`, selectedLearningMethod);
      if (lecturerCoords) {
        localStorage.setItem(`lecturer_coords_${data.id}`, JSON.stringify(lecturerCoords));
        localStorage.setItem(`lecturer_coords_${data.id}_${token}`, JSON.stringify(lecturerCoords));
      }

      setIsExpired(false);
      setTimeLeft(tokenResetMinutes * 60);
      toast.success('Sesi Absensi Dimulai!');
      if (lecturerCoords) toast.info("📍 Lokasi Titik Nol Berhasil Dikunci!", { icon: "📍" });
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
      // --- 🛠️ KALIBRASI JARAK (Ubah di sini juga bro) ---
      const DISTANCE_FIX_METERS = 0; 
      const USE_MANUAL_COORDINATES = false; 
      const MANUAL_LAT = -6.200000;         
      const MANUAL_LNG = 106.800000;        
      // --------------------------------------------------

      setIsExpired(false);
      setTimeLeft(tokenResetMinutes * 60);
      const newCode = Math.random().toString(36).substring(7);
      const currentPayload = JSON.parse(activeSession.qr_code);
      const payload = JSON.stringify({ 
        ...currentPayload, 
        t: newCode,
        df: DISTANCE_FIX_METERS 
      });

      const { error } = await supabase.from('attendance_sessions').update({ qr_code: payload }).eq('id', activeSession.id);
      if (error) throw error;

      setActiveSession(prev => prev ? { ...prev, qr_code: payload } : null);
      
      // RE-DETECT LOCATION ON REFRESH (Dynamic Geofencing)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            let coords = { lat: position.coords.latitude, lng: position.coords.longitude };

            if (USE_MANUAL_COORDINATES) {
              coords = { lat: MANUAL_LAT, lng: MANUAL_LNG };
            }
            
            // PERSIST TO SUPABASE
            await (supabase.from('attendance_sessions') as any).update({ 
              latitude: coords.lat, 
              longitude: coords.lng 
            }).eq('id', activeSession.id);

            // Update BOTH the latest and the token-specific location (LocalStorage Fallback)
            localStorage.setItem(`lecturer_coords_${activeSession.id}`, JSON.stringify(coords));
            localStorage.setItem(`lecturer_coords_${activeSession.id}_${newCode}`, JSON.stringify(coords));
            console.log(`Token ${newCode} location locked & synced:`, coords);
          },
          (err) => console.error("Refresh location fail:", err),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

      toast.success('QR Code & Lokasi diperbarui!');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Gagal refresh QR');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    state: {
      subjects, meetings, classes, selectedSemester, selectedSubject, selectedMeeting, selectedClass, selectedLearningMethod, tokenResetMinutes, isLoading, activeSession, timeLeft, isExpired, scannedStudents, totalClassStudents, isAdminDosen, isAdminDev
    },
    actions: {
      setSelectedSemester, setSelectedSubject, setSelectedMeeting, setSelectedClass, setSelectedLearningMethod, setTokenResetMinutes, handleGenerateQR, handleRefreshQR, refreshData, formatTime
    }
  };
}
