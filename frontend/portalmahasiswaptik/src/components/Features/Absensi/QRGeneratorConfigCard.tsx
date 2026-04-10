import { motion } from 'framer-motion';
import { BookOpen, Clock, Loader2, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MaterialTimePicker } from '@/components/ui/material-time-picker';
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
    setSelectedSemester, setSelectedSubject, setSelectedMeeting, setSelectedClass, handleGenerateQR,
    setTokenResetMinutes
  } = qr.actions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 italic uppercase font-black tracking-tight">
          <BookOpen className="w-5 h-5 text-primary" />
          Konfigurasi Sesi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Semester</label>
            <Select
              value={selectedSemester}
              onValueChange={(val) => {
                setSelectedSemester(val);
                setSelectedSubject('');
                setSelectedMeeting('');
              }}
            >
              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/20 hover:border-primary/40 transition-colors">
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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mata Kuliah</label>
            <Select
              value={selectedSubject}
              onValueChange={(val) => {
                setSelectedSubject(val);
                setSelectedMeeting('');
              }}
              disabled={!selectedSemester}
            >
              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/20 hover:border-primary/40 transition-colors text-xs">
                <SelectValue placeholder={!selectedSemester ? "Pilih semester dulu" : "Pilih mata kuliah"} />
              </SelectTrigger>
              <SelectContent>
                {subjects
                  .filter(s => !selectedSemester || s.semester === parseInt(selectedSemester))
                  .length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">Tidak ada matkul</div>
                ) : (
                  subjects
                    .filter(s => !selectedSemester || s.semester === parseInt(selectedSemester))
                    .map((subj) => (
                      <SelectItem key={subj.id} value={subj.id}>
                         <span className="text-xs">{subj.name}</span>
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pertemuan</label>
            <Select
              value={selectedMeeting}
              onValueChange={setSelectedMeeting}
              disabled={!selectedSubject}
            >
              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/20 hover:border-primary/40 transition-colors">
                <SelectValue placeholder={!selectedSubject ? "Pilih matkul dulu" : "Pilih pertemuan"} />
              </SelectTrigger>
              <SelectContent>
                {meetings.map((meet) => (
                  <SelectItem key={meet.id} value={meet.id}>
                    Pertemuan {meet.meeting_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kelas</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/20 hover:border-primary/40 transition-colors">
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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Metode Pembelajaran</label>
            <Select value={qr.state.selectedLearningMethod} onValueChange={qr.actions.setSelectedLearningMethod}>
              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/20 hover:border-primary/40 transition-colors">
                <SelectValue placeholder="Pilih Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Luring">Luring (Offline)</SelectItem>
                <SelectItem value="Daring">Daring (Online)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Token Reset</label>
            <Select 
              value={qr.state.tokenResetMinutes.toString()} 
              onValueChange={(val) => setTokenResetMinutes(parseInt(val))}
            >
              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/20 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="font-bold text-primary text-sm">{qr.state.tokenResetMinutes}m</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 10, 15, 30].map((m) => (
                  <SelectItem key={m} value={m.toString()}>{m} Menit</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
