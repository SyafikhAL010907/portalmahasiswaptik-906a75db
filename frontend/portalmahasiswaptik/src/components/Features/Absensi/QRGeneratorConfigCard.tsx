import { motion } from 'framer-motion';
import { BookOpen, Loader2, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQRGenerator } from '@/SharedLogic/hooks/useQRGenerator';

interface QRGeneratorConfigCardProps {
  qr: ReturnType<typeof useQRGenerator>;
}

export function QRGeneratorConfigCard({ qr }: QRGeneratorConfigCardProps) {
  const {
    subjects, meetings, classes, selectedSemester, selectedSubject, selectedMeeting, selectedClass, isLoading
  } = qr.state;

  const {
    setSelectedSemester, setSelectedSubject, setSelectedMeeting, setSelectedClass, handleGenerateQR
  } = qr.actions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 italic uppercase font-black tracking-tight">
          <BookOpen className="w-5 h-5 text-primary" />
          Konfigurasi Sesi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Semester</label>
          <Select
            value={selectedSemester}
            onValueChange={(val) => {
              setSelectedSemester(val);
              setSelectedSubject('');
              setSelectedMeeting('');
            }}
          >
            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-primary/20">
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
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mata Kuliah</label>
          <Select
            value={selectedSubject}
            onValueChange={(val) => {
              setSelectedSubject(val);
              setSelectedMeeting('');
            }}
            disabled={!selectedSemester}
          >
            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-primary/20">
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
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pertemuan</label>
          <Select
            value={selectedMeeting}
            onValueChange={setSelectedMeeting}
            disabled={!selectedSubject}
          >
            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-primary/20">
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
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kelas</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-primary/20">
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

        <div className="space-y-2 pb-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Metode Pembelajaran</label>
          <Select value={qr.state.selectedLearningMethod} onValueChange={qr.actions.setSelectedLearningMethod}>
            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-primary/20">
              <SelectValue placeholder="Pilih Metode Pembelajaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Luring">Luring (Offline)</SelectItem>
              <SelectItem value="Daring">Daring (Online)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full gap-2 h-14 text-lg font-black rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 border-none"
          onClick={handleGenerateQR}
          disabled={isLoading || !selectedSemester || !selectedSubject || !selectedMeeting || !selectedClass}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <QrCode className="w-6 h-6" />
          )}
          GENERATE QR CODE
        </Button>
      </CardContent>
    </Card>
  );
}
