import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, Plus, BookOpen, UploadCloud, 
  Calendar, Edit, File, X 
} from 'lucide-react';
import { useRepository } from '@/SharedLogic/hooks/useRepository';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface RepositoryModalsProps {
  repository: ReturnType<typeof useRepository>;
}

export function RepositoryModals({ repository }: RepositoryModalsProps) {
  const { 
    isCourseDialogOpen, courseForm, isEditingCourse, isLoading,
    isAddMaterialOpen, materialForm, isEditingMaterial, isFileTooLarge,
    filesToUpload, isSemesterDialogOpen, semesterForm, isEditingSemester
  } = repository.state;

  const { 
    setIsCourseDialogOpen, setCourseForm, handleSaveCourse,
    setIsAddMaterialOpen, setMaterialForm, handleFileChange, setFilesToUpload, handleSaveMaterial,
    setIsSemesterDialogOpen, setSemesterForm, handleSaveSemester
  } = repository.actions;

  return (
    <>
      {/* 1. Course Dialog (SYNCED WITH ORIGINAL) */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full border-none glass-card p-0 overflow-hidden mx-auto rounded-2xl">
          <div className="bg-primary/10 px-4 sm:px-6 py-5 sm:py-6 border-b border-primary/20 flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner flex-shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0 pr-6">
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                  {isEditingCourse ? 'Edit Mata Kuliah' : 'Tambah Matkul'}
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                  Atur mata kuliah untuk semester pembelajaran.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Nama Mata Kuliah</Label>
              <Input
                placeholder="Masukkan Nama Mata Kuliah"
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                className="rounded-xl border-muted/30 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Kode Mata Kuliah</Label>
              <Input
                placeholder="Contoh: TIK123"
                value={courseForm.code}
                onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                className="rounded-xl border-muted/30 h-11"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 flex gap-3">
            <Button variant="ghost" onClick={() => setIsCourseDialogOpen(false)} className="rounded-xl">Batal</Button>
            <Button onClick={handleSaveCourse} disabled={isLoading} className="rounded-xl flex-1 primary-gradient font-bold h-11 gap-2">
              {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Material Upload Dialog (SYNCED WITH ORIGINAL) */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="w-[95vw] max-w-lg sm:w-full border-none glass-card p-0 overflow-hidden mx-auto rounded-3xl">
          <div className="bg-success/10 px-6 py-6 border-b border-success/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center shadow-inner flex-shrink-0">
              <UploadCloud className="w-6 h-6 text-success" />
            </div>
            <div>
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-xl font-black text-foreground italic uppercase tracking-tight">
                  {isEditingMaterial ? 'Edit Detail Materi' : 'Upload Materi Baru'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1 font-medium">
                  {isEditingMaterial ? 'Perbarui informasi materi yang sudah ada.' : 'Berbagi materi belajar untuk teman-teman seangkatan.'}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">Judul Materi {(!isEditingMaterial && filesToUpload.length > 0) ? '(Opsional)' : ''}</Label>
              <Input
                placeholder="Contoh: Slide Pertemuan 1"
                value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                className="rounded-xl border-muted/30 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">Deskripsi (Opsional)</Label>
              <Textarea
                placeholder="Deskripsi singkat materi ini..."
                value={materialForm.description}
                onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                className="rounded-xl border-muted/30 min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">Pilih File</Label>
              <div className="relative group w-full min-h-[140px] border-2 border-dashed border-muted/40 hover:border-success/50 rounded-2xl bg-muted/5 hover:bg-success/5 transition-all flex flex-col items-center justify-center">
                <Input
                  type="file" multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground opacity-80 group-hover:opacity-100 p-4 text-center pointer-events-none">
                  {filesToUpload.length === 0 ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center"><Plus className="w-5 h-5 text-success" /></div>
                      <div>
                        <span className="text-sm font-bold block text-foreground">Klik atau drag file ke sini</span>
                        <span className="text-[10px] text-muted-foreground mt-1 block">Maksimal 2MB per file (Otomatis Drive jika lebih)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center"><File className="w-5 h-5 text-success" /></div>
                      <div className="w-full flex flex-col items-center">
                        <span className="text-sm font-black text-success truncate max-w-[200px]">{filesToUpload.length} File Terpilih</span>
                        <span className="text-[10px] font-bold text-success/70 mt-0.5 opacity-80">{filesToUpload[0].name} {filesToUpload.length > 1 ? `dan ${filesToUpload.length - 1} lainnya` : ''}</span>
                      </div>
                    </>
                  )}
                </div>
                {filesToUpload.length > 0 && (
                  <Button 
                    variant="ghost" size="icon" 
                    onClick={(e) => { e.stopPropagation(); setFilesToUpload([]); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 z-20 h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {isFileTooLarge && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4 rounded-xl mt-3 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 animate-spin">
                    <UploadCloud className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-blue-700 dark:text-blue-400">File Besar Terdeteksi (&gt;2MB)</h5>
                    <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-medium">Bakal diunggah lewat Google Drive (Proses agak lama bro)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 pt-0">
            <Button 
              onClick={handleSaveMaterial} disabled={isLoading} 
              className="rounded-xl w-full bg-success hover:bg-success/90 text-white shadow-lg shadow-success/20 font-black text-lg h-14 gap-3 border-none"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (isEditingMaterial ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
              {isEditingMaterial ? 'SIMPAN PERUBAHAN' : 'TAMBAH MATERI'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Semester Dialog (SYNCED WITH ORIGINAL) */}
      <Dialog open={isSemesterDialogOpen} onOpenChange={setIsSemesterDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md border-none glass-card p-0 overflow-hidden mx-auto rounded-2xl">
          <div className="bg-primary/10 px-6 py-6 border-b border-primary/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-xl font-bold text-foreground">{isEditingSemester ? 'Edit Semester' : 'Tambah Semester'}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Nama Semester</Label>
              <Input
                placeholder="Contoh: Semester 1"
                value={semesterForm.name}
                onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                className="rounded-xl border-muted/30 h-11 text-lg font-bold"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 flex gap-3">
             <Button variant="ghost" onClick={() => setIsSemesterDialogOpen(false)} className="rounded-xl">Batal</Button>
             <Button onClick={handleSaveSemester} disabled={isLoading} className="rounded-xl flex-1 primary-gradient font-bold h-11">
               {isEditingSemester ? 'Update' : 'Simpan'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
