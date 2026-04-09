import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MaterialTimePicker } from '@/components/ui/material-time-picker';
import { Clock, Loader2 } from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useSchedule } from '@/SharedLogic/hooks/useSchedule';

interface ScheduleModalsProps {
  schedule: ReturnType<typeof useSchedule>;
}

export function ScheduleModals({ schedule }: ScheduleModalsProps) {
  const { 
    isDialogOpen, isEditing, formData, semesters, subjects, lecturers, days, 
    isLoading, isStartOpen, isEndOpen, deleteScheduleConfig 
  } = schedule.state;
  
  const { 
    setIsDialogOpen, setFormData, setIsStartOpen, setIsEndOpen, 
    handleSubmit, executeDeleteSchedule, setDeleteScheduleConfig 
  } = schedule.actions;

  return (
    <>
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
                value={formData.lecturer_id || "null_placeholder"}
                onValueChange={(val) => setFormData({ ...formData, lecturer_id: val === "null_placeholder" ? "" : val })}
              >
                <SelectTrigger><SelectValue placeholder="Pilih Dosen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="null_placeholder">Tanpa Dosen</SelectItem>
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

      {/* Confirmation Modal - Hapus Jadwal */}
      <ConfirmationModal
        isOpen={deleteScheduleConfig.isOpen}
        onClose={() => setDeleteScheduleConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await executeDeleteSchedule(deleteScheduleConfig.targetId);
          setDeleteScheduleConfig(prev => ({ ...prev, isOpen: false }));
        }}
        title="Hapus Jadwal?"
        description="Jadwal kuliah ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
        variant="danger"
        confirmText="Ya, Hapus"
      />
    </>
  );
}
