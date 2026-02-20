import { useState, useEffect } from 'react';
import { Folder, FileText, Video, Download, ChevronRight, ArrowLeft, Plus, Trash2, Loader2, Image as ImageIcon, File, Pencil } from 'lucide-react';
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
import ConfirmationModal from '@/components/ui/ConfirmationModal';

// --- CONSTANTS ---
const GOOGLE_DRIVE_FOLDER_LINK = 'https://drive.google.com/drive/folders/1Ar_jm913F57k7WcchYkv8o6ZUbX4s3KP';
const PARENT_FOLDER_ID = '1b4bby3CRLAX9pL1QKD87HU0Os0slKaIi';

// Dynamically determine backend URL - Use relative path /api to leverage Vite proxy
// This ensures it works on localhost AND local network IPs
const API_BASE_URL = window.location.origin;

// --- INTERFACES ---
interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  drive_folder_id?: string | null;
}

interface Semester {
  id: number;
  name: string;
  created_at?: string;
  drive_folder_id?: string | null;
  gradient?: string;
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
  storage_type: 'supabase' | 'google_drive';
  external_url: string | null;
  category: string | null;
  is_pinned: boolean | null;
  subject_name?: string; // For UI display
}

// SOFT PASTEL MODE: Finance Dashboard Style
// Hardcoded gradients for dynamic semesters display
const SEMESTER_GRADIENTS = [
  { gradient: 'from-purple-50 to-white dark:from-purple-950/20 dark:to-background', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', shadowColor: 'hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50' },
  { gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
  { gradient: 'from-orange-50 to-white dark:from-orange-950/20 dark:to-background', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', shadowColor: 'hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50' },
  { gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
  { gradient: 'from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400', shadowColor: 'hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50' },
  { gradient: 'from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background', iconBg: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400', shadowColor: 'hover:shadow-yellow-200/50 dark:hover:shadow-yellow-900/50' },
  { gradient: 'from-pink-50 to-white dark:from-pink-950/20 dark:to-background', iconBg: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400', shadowColor: 'hover:shadow-pink-200/50 dark:hover:shadow-pink-900/50' },
];

type ViewState = 'semesters' | 'courses' | 'files';

export default function Repository() {
  // --- STATE ---
  const [view, setView] = useState<ViewState>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Subject | null>(null);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'document' | 'video' | 'image' | 'other'>('all');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // RBAC
  const [canManage, setCanManage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Course Dialog
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({ id: '', name: '', code: '' });
  const [isEditingCourse, setIsEditingCourse] = useState(false);

  // Material Dialog
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: '', description: '' });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isFileTooLarge, setIsFileTooLarge] = useState(false);

  // Semester Dialog
  const [isSemesterDialogOpen, setIsSemesterDialogOpen] = useState(false);
  const [semesterForm, setSemesterForm] = useState({ id: 0, name: '' });
  const [isEditingSemester, setIsEditingSemester] = useState(false);

  // Modal Config
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'info';
    confirmText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'danger',
    onConfirm: () => { },
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const openConfirmation = (
    title: string,
    description: string,
    onConfirm: () => Promise<void> | void,
    variant: 'danger' | 'warning' | 'info' = 'danger',
    confirmText: string = 'Konfirmasi'
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      description,
      variant,
      confirmText,
      onConfirm: async () => {
        await onConfirm();
        closeModal();
      }
    });
  };

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

        // Access allowed for 'admin_dev' and 'admin_kelas'
        const hasAccess = roles?.some(r => r.role === 'admin_dev' || r.role === 'admin_kelas') || false;
        setCanManage(hasAccess);
      }
    };
    checkRole();
  }, []);

  // --- FETCH DATA ---
  const fetchSemesters = async () => {
    try {
      const { data, error } = await supabase.from('semesters').select('*').order('id');
      if (error && error.code === '42P01') {
        console.warn("Semesters table not found"); // Should exist after migration
      }
      if (data) setSemesters(data);
    } catch (err) {
      console.error("Error fetching semesters", err);
    }
  };

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

  useEffect(() => {
    fetchSemesters();
  }, []);

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
  const handleSelectSemester = (semester: Semester) => {
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
  const handleResetCourseForm = () => {
    setCourseForm({ id: '', name: '', code: '' });
    setIsEditingCourse(false);
    setIsCourseDialogOpen(true);
  };

  const handleEditCourseClick = (course: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourseForm({ id: course.id, name: course.name, code: course.code });
    setIsEditingCourse(true);
    setIsCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.name || !selectedSemester) return;
    setIsLoading(true);
    try {
      if (isEditingCourse) {
        // Update
        const { error } = await supabase.from('subjects')
          .update({
            name: courseForm.name,
            code: courseForm.code || 'TBA',
          })
          .eq('id', courseForm.id);

        if (error) throw error;
        toast.success("Mata kuliah diperbarui");
      } else {
        // Insert
        const { error } = await supabase.from('subjects').insert([{
          name: courseForm.name,
          code: courseForm.code || 'TBA',
          semester: selectedSemester.id
        }]);

        if (error) throw error;
        toast.success("Mata kuliah ditambahkan");
      }

      setIsCourseDialogOpen(false);
      fetchSubjects(selectedSemester.id);
    } catch (err: any) {
      toast.error("Gagal menyimpan mata kuliah: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    openConfirmation(
      'Hapus Mata Kuliah?',
      'Semua materi di dalamnya akan ikut terhapus. Lanjutkan?',
      async () => {
        try {
          const { error } = await supabase.from('subjects').delete().eq('id', id);
          if (error) throw error;
          toast.success("Mata kuliah dihapus");
          if (selectedSemester) fetchSubjects(selectedSemester.id);
        } catch (err: any) {
          toast.error("Gagal menghapus: " + err.message);
        }
      }
    );
  };

  // 1.5 Semester CRUD
  const handleSaveSemester = async () => {
    if (!semesterForm.name) return;
    setIsLoading(true);
    try {
      if (isEditingSemester) {
        const { error } = await supabase.from('semesters').update({ name: semesterForm.name }).eq('id', semesterForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('semesters').insert({ name: semesterForm.name });
        if (error) throw error;
      }
      toast.success(isEditingSemester ? "Semester diperbarui" : "Semester ditambahkan");
      setIsSemesterDialogOpen(false);
      fetchSemesters();
    } catch (err: any) {
      toast.error("Gagal menyimpan semester: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSemester = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    openConfirmation(
      'Hapus Semester?',
      'Semua mata kuliah dan materi di semester ini akan ikut terhapus. Yakin?',
      async () => {
        try {
          const { error } = await supabase.from('semesters').delete().eq('id', id);
          if (error) throw error;
          toast.success("Semester dihapus");
          fetchSemesters();
        } catch (err: any) {
          toast.error("Gagal menghapus: " + err.message);
        }
      }
    );
  };

  const openEditSemester = (sem: Semester, e: React.MouseEvent) => {
    e.stopPropagation();
    setSemesterForm({ id: sem.id, name: sem.name });
    setIsEditingSemester(true);
    setIsSemesterDialogOpen(true);
  };

  // 2. Material Actions
  const handleAddMaterial = async () => {
    if (!materialForm.title || !selectedCourse || !selectedSemester || !userId) {
      toast.error("Mohon lengkapi form");
      return;
    }

    if (!fileToUpload) {
      toast.error("Mohon pilih file");
      return;
    }

    setIsLoading(true);
    try {
      let finalFileUrl = '';
      let storageType: 'supabase' | 'google_drive' = 'supabase';
      let type = 'other';
      let fileSize = fileToUpload?.size || null;
      let category = null;
      let isPinned = false;

      if (isFileTooLarge) {
        // --- Automate Server-side Upload to Google Drive ---
        const driveFolderId = selectedCourse.drive_folder_id || PARENT_FOLDER_ID; // Fallback to parent if not set

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('parent_id', driveFolderId);

        // 1. Refresh & Get Fresh Supabase session token for Auth
        const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
        if (sessionError) throw new Error('Sesi habis, silakan login ulang');

        const response = await fetch(`${API_BASE_URL}/api/repository/upload-drive`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Gagal upload ke Google Drive');

        storageType = 'google_drive';
        finalFileUrl = result.webViewLink; // Direct view link from Drive
        category = 'Umum';
        isPinned = true;
      } else if (fileToUpload) {
        // 1. Upload File to Supabase
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

        finalFileUrl = publicUrl;
        storageType = 'supabase';

        // 3. Determine Type
        if (fileToUpload.type.startsWith('image/')) type = 'image';
        else if (fileToUpload.type.startsWith('video/')) type = 'video';
        else if (fileToUpload.type.includes('pdf')) type = 'pdf';
      }

      // 4. Insert Record
      const driveFolderId = selectedCourse.drive_folder_id;
      const folderLink = driveFolderId
        ? `https://drive.google.com/drive/folders/${driveFolderId}`
        : GOOGLE_DRIVE_FOLDER_LINK; // Fallback to parent

      const insertData: any = {
        subject_id: selectedCourse.id,
        semester: selectedSemester.id,
        title: materialForm.title,
        description: materialForm.description,
        file_type: type,
        file_url: finalFileUrl,
        file_size: storageType === 'google_drive' ? null : fileSize,
        uploaded_by: userId,
        storage_type: storageType,
        external_url: storageType === 'google_drive' ? folderLink : null,
        is_pinned: isPinned
      };

      // Only add category if storage_type is google_drive to avoid issues if column is missing
      if (storageType === 'google_drive') {
        insertData.category = category;
      }

      const { error: insertError } = await supabase.from('materials').insert([insertData]);

      if (insertError) throw insertError;

      toast.success("Materi berhasil disimpan");
      setIsAddMaterialOpen(false);
      setFileToUpload(null);
      setIsFileTooLarge(false);
      setMaterialForm({ title: '', description: '' });
      fetchMaterials(selectedCourse.id);

    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMaterial = async (id: string, url: string) => {
    openConfirmation(
      'Hapus File?',
      'Apakah Anda yakin ingin menghapus file ini?',
      async () => {
        try {
          // Ideally delete from storage too
          const { error } = await supabase.from('materials').delete().eq('id', id);
          if (error) throw error;

          toast.success("File dihapus");
          if (selectedCourse) fetchMaterials(selectedCourse.id);
        } catch (err: any) {
          toast.error("Gagal menghapus: " + err.message);
        }
      }
    );
  };

  const handleDownload = async (file: Material) => {
    try {
      if (file.storage_type === 'google_drive') {
        window.open(file.file_url, '_blank');
        toast.info("Membuka Google Drive...", {
          description: "Cek folder 'Unduhan' jika Anda mendownload dari Drive.",
          duration: 4000
        });
        return;
      }

      toast.info("Menyiapkan file...");

      const response = await fetch(file.file_url);
      if (!response.ok) throw new Error("Gagal mengambil file");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = file.title;
      document.body.appendChild(a);
      a.click();

      // Fallback for mobile
      setTimeout(() => {
        window.open(url, '_blank');
      }, 100);

      toast.success(
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm text-foreground">File Berhasil!</span>
            <span className="text-xs text-muted-foreground">Cek folder 'Unduhan' di browser atau HP Anda.</span>
          </div>
          <button
            onClick={() => {
              toast.info("Cek menu 'Downloads' atau 'Unduhan' di pojok browser Chrome/HP Anda.");
            }}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-sm text-sm"
          >
            LIHAT DOWNLOAD
          </button>
        </div>,
        { duration: 8000 }
      );

      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 5000);
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error("Gagal mendownload file: " + error.message);
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
      if (mediaFilter === 'document') return m.file_type === 'pdf';
      return m.file_type === mediaFilter;
    });

  const getGoogleDriveDirectLink = (url: string) => {
    if (!url.includes('drive.google.com')) return url;

    // Handle standard drive links
    const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/) || url.match(/id=([^\&]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    }
    return url;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileToUpload(file);
    if (file && file.size > 2 * 1024 * 1024) {
      setIsFileTooLarge(true);
      // No warning toast anymore, we handle it automatically via "Full Courier" mode
    } else {
      setIsFileTooLarge(false);
    }
  };

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
            {view === 'semesters' && (
              <Button onClick={() => { setSemesterForm({ id: 0, name: '' }); setIsEditingSemester(false); setIsSemesterDialogOpen(true); }} className="rounded-xl gap-2 shadow-lg">
                <Plus className="w-4 h-4" /> Tambah Semester
              </Button>
            )}
            {view === 'courses' && (
              <Button onClick={handleResetCourseForm} className="rounded-xl gap-2 shadow-lg">
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
          {semesters.map((semester, idx) => (
            <div key={semester.id} className="relative group">
              <PremiumCard
                onClick={() => handleSelectSemester(semester)}
                variant="pastel"
                icon={Folder}
                title={semester.name}
                subtitle="Klik untuk lihat matkul"
                gradient={semester.gradient || SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].gradient}
                iconClassName={`${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconBg} ${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconColor}`}
                className={SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].shadowColor}
              />
              {canManage && (
                <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/20 text-white hover:bg-black/30" onClick={(e) => openEditSemester(semester, e)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 bg-red-500/80 text-white hover:bg-red-600" onClick={(e) => handleDeleteSemester(semester.id, e)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
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
                    <div key={course.id} className="relative group">
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
                        <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                            onClick={(e) => handleEditCourseClick(course, e)}
                          >
                            <Pencil className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                            onClick={(e) => handleDeleteCourse(course.id, e)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
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
                        {file.storage_type !== 'google_drive' && (
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {file.file_size && <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>}
                            <span>•</span>
                            <span>{new Date(file.created_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button variant="pill" size="sm" onClick={() => handleDownload(file)}>
                        <Download className="w-4 h-4 mr-2" />
                        {file.storage_type === 'google_drive' ? `Buka Folder ${selectedCourse?.name || 'Materi Umum'}` : 'Download'}
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

      {/* --- ADD/EDIT COURSE DIALOG --- */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingCourse ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}</DialogTitle>
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
            <Button variant="outline" onClick={() => setIsCourseDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveCourse} disabled={isLoading}>
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
                onChange={handleFileChange}
              />
              {isFileTooLarge && isLoading && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 rounded-lg mt-2 flex items-center gap-3">
                  <Loader2 className="animate-spin w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Sedang Mengunggah ke Google Drive...
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)}>Batal</Button>
            <Button onClick={handleAddMaterial} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  {isFileTooLarge ? 'Sabar, Lagi Upload...' : 'Simpan...'}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD/EDIT SEMESTER DIALOG --- */}
      <Dialog open={isSemesterDialogOpen} onOpenChange={setIsSemesterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingSemester ? 'Edit Semester' : 'Tambah Semester'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Semester</Label>
              <Input
                placeholder="Contoh: Semester 9"
                value={semesterForm.name}
                onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSemesterDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveSemester} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}