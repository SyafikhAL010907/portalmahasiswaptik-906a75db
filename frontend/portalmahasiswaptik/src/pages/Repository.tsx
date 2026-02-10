import { useState, useEffect } from 'react';
import { Folder, FileText, Video, Download, ChevronRight, ArrowLeft, Plus, Trash2, Loader2, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PremiumCard } from '@/components/ui/PremiumCard';

// --- INTERFACES ---
interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

// SOFT PASTEL MODE: Finance Dashboard Style (matching Attendance)
const semesters = [
  { id: 1, name: 'Semester 1', gradient: 'from-purple-50 to-white dark:from-purple-950/20 dark:to-background', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', shadowColor: 'hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50' },
  { id: 2, name: 'Semester 2', gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
  { id: 3, name: 'Semester 3', gradient: 'from-orange-50 to-white dark:from-orange-950/20 dark:to-background', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', shadowColor: 'hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50' },
  { id: 4, name: 'Semester 4', gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
  { id: 5, name: 'Semester 5', gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
  { id: 6, name: 'Semester 6', gradient: 'from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400', shadowColor: 'hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50' },
  { id: 7, name: 'Semester 7', gradient: 'from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background', iconBg: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400', shadowColor: 'hover:shadow-yellow-200/50 dark:hover:shadow-yellow-900/50' },
  { id: 8, name: 'Semester 8', gradient: 'from-pink-50 to-white dark:from-pink-950/20 dark:to-background', iconBg: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400', shadowColor: 'hover:shadow-pink-200/50 dark:hover:shadow-pink-900/50' },
];

type ViewState = 'semesters' | 'courses' | 'files';

export default function Repository() {
  // --- STATE ---
  const [view, setView] = useState<ViewState>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<typeof semesters[0] | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Subject | null>(null);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'document' | 'video' | 'image' | 'other'>('all');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // RBAC
  const [canManage, setCanManage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Dialogs
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({ name: '', code: '' });

  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: '', description: '' });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // --- INITIAL CHECK ---
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const hasAccess = roles?.some(r => ['admin_dev', 'admin_kelas'].includes(r.role)) || false;
        setCanManage(hasAccess);
      }
    };
    checkRole();
  }, []);

  // --- FETCH DATA ---
  const fetchSubjects = async (semesterId: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('semester', semesterId)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat mata kuliah: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMaterials = async (subjectId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat materi: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NAVIGATION ---
  const handleSelectSemester = (semester: typeof semesters[0]) => {
    setSelectedSemester(semester);
    setView('courses');
    fetchSubjects(semester.id);
  };

  const handleSelectCourse = (course: Subject) => {
    setSelectedCourse(course);
    setView('files');
    fetchMaterials(course.id);
  };

  const handleBack = () => {
    if (view === 'files') {
      setView('courses');
      setSelectedCourse(null);
    } else if (view === 'courses') {
      setView('semesters');
      setSelectedSemester(null);
    }
  };

  // --- CRUD ACTIONS ---

  // 1. Course Actions
  const handleAddCourse = async () => {
    if (!courseForm.name || !selectedSemester) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('subjects').insert([{
        name: courseForm.name,
        code: courseForm.code || 'TBA',
        semester: selectedSemester.id
        // Removed sks to avoid schema error
      }]);

      if (error) throw error;
      toast.success("Mata kuliah berhasil ditambahkan");
      setIsAddCourseOpen(false);
      setCourseForm({ name: '', code: '' });
      fetchSubjects(selectedSemester.id);
    } catch (err: any) {
      toast.error("Gagal menambah mata kuliah: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus mata kuliah ini? Semua materi di dalamnya akan ikut terhapus.")) return;

    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      toast.success("Mata kuliah dihapus");
      if (selectedSemester) fetchSubjects(selectedSemester.id);
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  // 2. Material Actions
  const handleAddMaterial = async () => {
    if (!materialForm.title || !fileToUpload || !selectedCourse || !selectedSemester || !userId) {
      toast.error("Mohon lengkapi form dan pilih file");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Upload File
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${selectedSemester.id}/${selectedCourse.code}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      // 3. Determine Type
      let type = 'other';
      if (fileToUpload.type.startsWith('image/')) type = 'image';
      else if (fileToUpload.type.startsWith('video/')) type = 'video';
      else if (fileToUpload.type.includes('pdf') || fileToUpload.type.includes('document') || fileToUpload.type.includes('text')) type = 'pdf'; // Mapping simple types

      // 4. Insert Record
      const { error: insertError } = await supabase.from('materials').insert([{
        subject_id: selectedCourse.id,
        semester: selectedSemester.id,
        title: materialForm.title,
        description: materialForm.description,
        file_type: type,
        file_url: publicUrl,
        file_size: fileToUpload.size,
        uploaded_by: userId
      }]);

      if (insertError) throw insertError;

      toast.success("Materi berhasil diunggah");
      setIsAddMaterialOpen(false);
      setFileToUpload(null);
      setMaterialForm({ title: '', description: '' });
      fetchMaterials(selectedCourse.id);

    } catch (err: any) {
      toast.error("Gagal mengunggah: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMaterial = async (id: string, url: string) => {
    if (!confirm("Yakin hapus file ini?")) return;
    try {
      // Ideally delete from storage too, but for now just delete record to avoid permission issues if storage delete policies aren't set
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;

      toast.success("File dihapus");
      if (selectedCourse) fetchMaterials(selectedCourse.id);
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  // --- HELPERS ---
  const getFileIcon = (type: string) => {
    if (type === 'pdf') return <FileText className="w-6 h-6 text-primary" />;
    if (type === 'video') return <Video className="w-6 h-6 text-destructive" />;
    if (type === 'image') return <ImageIcon className="w-6 h-6 text-success" />;
    return <File className="w-6 h-6 text-warning" />;
  };

  const filteredMaterials = mediaFilter === 'all'
    ? materials
    : materials.filter(m => {
      if (mediaFilter === 'document') return m.file_type === 'pdf'; // simple mapping
      return m.file_type === mediaFilter;
    });

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-10">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {view !== 'semesters' && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full bg-muted/50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Repository Materi</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>Repository</span>
              {selectedSemester && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span>{selectedSemester.name}</span>
                </>
              )}
              {selectedCourse && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{selectedCourse.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Add Actions */}
        {canManage && (
          <div>
            {view === 'courses' && (
              <Button onClick={() => setIsAddCourseOpen(true)} className="rounded-xl gap-2 shadow-lg">
                <Plus className="w-4 h-4" /> Tambah Matkul
              </Button>
            )}
            {view === 'files' && (
              <Button onClick={() => setIsAddMaterialOpen(true)} className="rounded-xl gap-2 shadow-lg">
                <Plus className="w-4 h-4" /> Upload Materi
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 1. Semester Selection */}
      {view === 'semesters' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {semesters.map((semester) => (
            <PremiumCard
              key={semester.id}
              onClick={() => handleSelectSemester(semester)}
              variant="pastel"
              icon={Folder}
              title={semester.name}
              subtitle="Klik untuk lihat matkul"
              gradient={semester.gradient}
              iconClassName={`${semester.iconBg} ${semester.iconColor}`}
              className={semester.shadowColor}
            />
          ))}
        </div>
      )}

      {/* 2. Course Selection */}
      {view === 'courses' && selectedSemester && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.length === 0 ? (
                <div className="col-span-full text-center py-10 text-muted-foreground">Belum ada mata kuliah.</div>
              ) : (
                subjects.map((course, idx) => {
                  const subjectPastels = [
                    { gradient: 'from-violet-50 to-white dark:from-violet-950/20 dark:to-background', iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400', shadowColor: 'hover:shadow-violet-200/50 dark:hover:shadow-violet-900/50' },
                    { gradient: 'from-sky-50 to-white dark:from-sky-950/20 dark:to-background', iconBg: 'bg-sky-100 dark:bg-sky-900/30', iconColor: 'text-sky-600 dark:text-sky-400', shadowColor: 'hover:shadow-sky-200/50 dark:hover:shadow-sky-900/50' },
                    { gradient: 'from-rose-50 to-white dark:from-rose-950/20 dark:to-background', iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400', shadowColor: 'hover:shadow-rose-200/50 dark:hover:shadow-rose-900/50' },
                    { gradient: 'from-amber-50 to-white dark:from-amber-950/20 dark:to-background', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400', shadowColor: 'hover:shadow-amber-200/50 dark:hover:shadow-amber-900/50' },
                    { gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
                    { gradient: 'from-lime-50 to-white dark:from-lime-950/20 dark:to-background', iconBg: 'bg-lime-100 dark:bg-lime-900/30', iconColor: 'text-lime-600 dark:text-lime-400', shadowColor: 'hover:shadow-lime-200/50 dark:hover:shadow-lime-900/50' },
                  ];
                  const pastel = subjectPastels[idx % subjectPastels.length];
                  return (
                    <div key={course.id} className="relative">
                      <PremiumCard
                        variant="pastel"
                        icon={FileText}
                        title={course.name}
                        subtitle={course.code}
                        gradient={pastel.gradient}
                        iconClassName={`${pastel.iconBg} ${pastel.iconColor}`}
                        className={pastel.shadowColor}
                        onClick={() => handleSelectCourse(course)}
                      />
                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-4 right-4 h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 z-10"
                          onClick={(e) => handleDeleteCourse(course.id, e)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* 3. Files List */}
      {view === 'files' && selectedCourse && (
        <div className="space-y-4">
          {/* Media Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Semua' },
              { key: 'document', label: 'Dokumen', icon: FileText },
              { key: 'video', label: 'Video', icon: Video },
              { key: 'image', label: 'Gambar', icon: ImageIcon },
            ].map((filter) => (
              <Button
                key={filter.key}
                variant={mediaFilter === filter.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMediaFilter(filter.key as any)}
                className={cn(mediaFilter === filter.key && 'primary-gradient')}
              >
                {filter.icon && <filter.icon className="w-4 h-4 mr-2" />}
                {filter.label}
              </Button>
            ))}
          </div>

          {/* File Cards */}
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground glass-card rounded-xl">Belum ada materi diunggah.</div>
              ) : (
                filteredMaterials.map((file) => (
                  <div
                    key={file.id}
                    className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-soft transition-shadow"
                  >
                    <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                        file.file_type === 'pdf' ? 'bg-primary/10' :
                          file.file_type === 'video' ? 'bg-destructive/10' : 'bg-accent/10'
                      )}>
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-foreground truncate max-w-[200px] sm:max-w-md">{file.title}</h4>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {file.file_size && <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>}
                          <span>•</span>
                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button variant="pill" size="sm" asChild>
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" download>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </a>
                      </Button>
                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteMaterial(file.id, file.file_url)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* --- ADD COURSE DIALOG --- */}
      <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Mata Kuliah</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Mata Kuliah</Label>
              <Input
                placeholder="Contoh: Algoritma & Pemrograman"
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Kode Mata Kuliah</Label>
              <Input
                placeholder="Contoh: TIK123"
                value={courseForm.code}
                onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCourseOpen(false)}>Batal</Button>
            <Button onClick={handleAddCourse} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD MATERIAL DIALOG --- */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Materi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Judul Materi</Label>
              <Input
                placeholder="Contoh: Slide Pertemuan 1"
                value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi (Opsional)</Label>
              <Textarea
                placeholder="Deskripsi singkat..."
                value={materialForm.description}
                onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>File (PDF, Doc, Image, Video)</Label>
              <Input
                type="file"
                onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)}>Batal</Button>
            <Button onClick={handleAddMaterial} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}