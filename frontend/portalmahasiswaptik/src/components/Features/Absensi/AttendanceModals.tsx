import { Plus, Loader2, FileSpreadsheet, Eye, Download } from 'lucide-react';
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
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useAttendance } from '@/SharedLogic/hooks/useAttendance';

interface AttendanceModalsProps {
  at: ReturnType<typeof useAttendance>;
}

export function AttendanceModals({ at }: AttendanceModalsProps) {
  const { isAddOpen, isEditOpen, formData, isLoading, view, modalConfig, isMasterExportOpen, classes, selectedExportClassId } = at.state;
  const { setIsAddOpen, setIsEditOpen, setFormData, submitAdd, submitEdit, closeModal, setIsMasterExportOpen, setSelectedExportClassId, handlePreviewMasterExcel, handleDownloadMasterExcel } = at.actions;

  const getAddTitle = () => {
    switch (view) {
      case 'courses': return ''; // Disabled in History but kept for parity
      case 'meetings': return 'Tambah Pertemuan';
      case 'classes': return 'Tambah Kelas';
      default: return 'Tambah Data';
    }
  };

  return (
    <>
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
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300"
            >
              Batal
            </Button>
            <Button
              onClick={submitAdd}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            >
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
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300"
            >
              Batal
            </Button>
            <Button
              onClick={submitEdit}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            >
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsMasterExportOpen(false)} className="rounded-xl w-full sm:w-auto">
              Batal
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={handlePreviewMasterExcel}
                disabled={!selectedExportClassId || isLoading}
                className="rounded-xl flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Buka File
              </Button>
              <Button
                onClick={handleDownloadMasterExcel}
                disabled={!selectedExportClassId || isLoading}
                className="rounded-xl flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
