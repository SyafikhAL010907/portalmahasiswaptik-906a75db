import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Folder, FileText, Video, Download, ChevronRight, ArrowLeft, Plus, Trash2, Loader2, Image as ImageIcon, File, Pencil, BookOpen, GraduationCap, Calendar, UploadCloud } from 'lucide-react';
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

// Dynamically determine backend URL - Use import.meta.env.VITE_API_URL for Koyeb Sync
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:9000/api";

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

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};
const staggerTop: Variants = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};
const staggerBottom: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

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
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        // Access allowed for 'admin_dev', 'admin_kelas', and 'admin kelas'
        const role = (profile as any)?.role;
        const hasAccess = role === 'admin_dev' || role === 'admin_kelas' || role === 'admin kelas';
        setCanManage(hasAccess);
      }
    };
    checkRole();
  }, []);

  // --- FETCH DATA ---
  const fetchSemesters = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('semesters').select('*').order('id');
      if (error && error.code === '42P01') {
        console.warn("Semesters table not found"); // Should exist after migration
      }
      if (data) setSemesters(data);
    } catch (err) {
      console.error("Error fetching semesters", err);
    } finally {
      setIsLoading(false);
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
        const { data: { user } } = await supabase.auth.getUser();
        console.log("🛠️ Attempting to update course:", courseForm.id, "to:", courseForm.name);
        console.log("👤 Current User ID:", user?.id);

        const { data, error, status } = await supabase.from('subjects')
          .update({
            name: courseForm.name,
            code: courseForm.code || 'TBA',
          })
          .eq('id', courseForm.id)
          .select(); // Get affected rows

        console.log("📡 Supabase response status:", status, "data length:", data?.length);

        if (error) {
          console.error("❌ Supabase update error:", error);
          throw error;
        }

        if (!data || data.length === 0) {
          toast.error("Gagal: Akses Ditolak atau data tidak ditemukan.");
          setIsLoading(false);
          return;
        }

        // Update local state immediately for better UX
        setSubjects(prev => prev.map(s => s.id === courseForm.id ? { ...s, name: courseForm.name, code: courseForm.code || 'TBA' } : s));

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
      await fetchSubjects(selectedSemester.id);
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
        console.log("🛠️ Attempting to update semester:", semesterForm.id, "to:", semesterForm.name);
        const { data, error, status } = await supabase.from('semesters')
          .update({ name: semesterForm.name })
          .eq('id', semesterForm.id)
          .select();

        console.log("📡 Supabase response status:", status, "data length:", data?.length);

        if (error) {
          console.error("❌ Supabase update error:", error);
          throw error;
        }

        if (!data || data.length === 0) {
          toast.error("Gagal: Akses Ditolak atau data tidak ditemukan.");
          setIsLoading(false);
          return;
        }

        // Update local state immediately
        setSemesters(prev => prev.map(s => s.id === semesterForm.id ? { ...s, name: semesterForm.name } : s));
      } else {
        const { error } = await supabase.from('semesters').insert({ name: semesterForm.name });
        if (error) throw error;
      }
      toast.success(isEditingSemester ? "Semester diperbarui" : "Semester ditambahkan");
      setIsSemesterDialogOpen(false);
      await fetchSemesters();
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
      const fileName = file.title;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      toast.success(
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm text-foreground">File Berhasil!</span>
            <span className="text-xs text-muted-foreground">File: <span className="font-mono text-[10px] break-all">{fileName}</span></span>
          </div>
          <button
            onClick={() => {
              toast.info(`File ${fileName} sudah tersimpan di folder 'Download' Chrome Anda!`);
            }}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-sm text-sm"
          >
            LIHAT DOWNLOAD
          </button>
        </div>,
        { duration: 7000 }
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
    <motion.div
      className="space-y-6 pt-12 md:pt-0 pb-10 px-4 md:px-0 max-w-full"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      layout={false}
    >
      {/* Header with Breadcrumb */}
      <motion.div variants={staggerTop} layout={false} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          {view !== 'semesters' && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full bg-muted/50 flex-shrink-0 mt-1 sm:mt-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">Repository Materi</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mt-1">
              <span>Repository</span>
              {selectedSemester && (
                <>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words">{selectedSemester.name}</span>
                </>
              )}
              {selectedCourse && (
                <>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words">{selectedCourse.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Add Actions */}
        {canManage && (
          <div className="w-full sm:w-auto flex justify-start sm:justify-end">
            {view === 'semesters' && (
              <Button onClick={() => { setSemesterForm({ id: 0, name: '' }); setIsEditingSemester(false); setIsSemesterDialogOpen(true); }} className="w-full sm:w-auto rounded-xl gap-2 shadow-lg">
                <Plus className="w-4 h-4" /> Tambah Semester
              </Button>
            )}
            {view === 'courses' && (
              <Button onClick={handleResetCourseForm} className="w-full sm:w-auto rounded-xl gap-2 shadow-lg">
                <Plus className="w-4 h-4" /> Tambah Matkul
              </Button>
            )}
            {view === 'files' && (
              <Button onClick={() => setIsAddMaterialOpen(true)} className="w-full sm:w-auto rounded-xl gap-2 shadow-lg">
                <Plus className="w-4 h-4" /> Upload Materi
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* 1. Semester Selection */}
      {view === 'semesters' && (
        <motion.div variants={staggerBottom} layout={false} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {semesters.map((semester, idx) => (
            <div key={semester.id} className="relative group w-full">
              <PremiumCard
                onClick={() => handleSelectSemester(semester)}
                variant="pastel"
                icon={Folder}
                title={semester.name}
                subtitle="Klik untuk lihat matkul"
                gradient={semester.gradient || SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].gradient}
                iconClassName={`${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconBg} ${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconColor}`}
                className={cn("w-full", SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].shadowColor)}
                actions={canManage && (
                  <div className="flex gap-3 items-center px-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 sm:h-8 sm:w-8 bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center p-0"
                      onClick={(e) => openEditSemester(semester, e)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 sm:h-8 sm:w-8 bg-red-500/90 text-white hover:bg-red-600 backdrop-blur-md border border-red-400/20 rounded-full flex items-center justify-center p-0"
                      onClick={(e) => handleDeleteSemester(semester.id, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                actionsClassName="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300"
              />
            </div>
          ))}
        </motion.div>
      )}

      {/* 2. Course Selection */}
      {view === 'courses' && selectedSemester && (
        <>
          {isLoading ? (
            <motion.div variants={staggerBottom} layout={false} className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></motion.div>
          ) : (
            <motion.div variants={staggerBottom} layout={false} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.length === 0 ? (
                <div className="col-span-full text-center py-10 text-muted-foreground glass-card rounded-xl">Belum ada mata kuliah.</div>
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
                    <div key={course.id} className="relative group w-full">
                      <PremiumCard
                        variant="pastel"
                        icon={FileText}
                        title={course.name}
                        subtitle={course.code}
                        gradient={pastel.gradient}
                        iconClassName={`${pastel.iconBg} ${pastel.iconColor}`}
                        className={cn("w-full", pastel.shadowColor)}
                        onClick={() => handleSelectCourse(course)}
                        actions={canManage && (
                          <div className="flex gap-3 items-center px-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-10 w-10 sm:h-8 sm:w-8 bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-sm rounded-full flex items-center justify-center p-0"
                              onClick={(e) => handleEditCourseClick(course, e)}
                            >
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-10 w-10 sm:h-8 sm:w-8 bg-red-50/90 hover:bg-red-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 backdrop-blur-md border border-red-200/50 dark:border-rose-900/50 shadow-sm rounded-full flex items-center justify-center p-0"
                              onClick={(e) => handleDeleteCourse(course.id, e)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                        actionsClassName="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300"
                      />
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </>
      )}

      {/* 3. Files List */}
      {view === 'files' && selectedCourse && (
        <motion.div variants={staggerBottom} layout={false} className="space-y-4">
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
                    className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-soft transition-shadow w-full"
                  >
                    <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1 pr-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0",
                        file.file_type === 'pdf' ? 'bg-primary/10' :
                          file.file_type === 'video' ? 'bg-destructive/10' : 'bg-accent/10'
                      )}>
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-foreground truncate leading-snug">{file.title}</h4>
                        {file.storage_type !== 'google_drive' ? (
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-1">
                            {file.file_size && <span className="flex-shrink-0">{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>}
                            <span className="hidden sm:inline">•</span>
                            <span className="flex-shrink-0">{new Date(file.created_at).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground mt-1">Google Drive Content</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-muted/30">
                      <Button variant="pill" size="sm" onClick={() => handleDownload(file)} className="flex-1 sm:flex-none justify-center">
                        <Download className="w-4 h-4 mr-2" />
                        <span className="truncate">
                          {file.storage_type === 'google_drive' ? `Buka Drive` : 'Download'}
                        </span>
                      </Button>
                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 sm:h-9 sm:w-9 text-destructive hover:bg-destructive/10 bg-destructive/5 sm:bg-transparent flex-shrink-0 rounded-full"
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
        </motion.div>
      )}

      {/* --- ADD/EDIT COURSE DIALOG --- */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="sm:max-w-md border-none glass-card p-0 overflow-hidden">
          <div className="bg-primary/10 px-6 py-6 border-b border-primary/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogHeader className="p-0">
                <DialogTitle className="text-xl font-bold text-foreground leading-none">
                  {isEditingCourse ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground mt-1">
                {isEditingCourse ? 'Perbarui informasi mata kuliah Anda.' : 'Tambahkan mata kuliah baru ke semester ini.'}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-muted-foreground ml-1">Nama Mata Kuliah</Label>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Required</span>
              </div>
              <Input
                placeholder="Contoh: Algoritma & Pemrograman"
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                className="rounded-xl border-muted/30 focus:border-primary/50 bg-background/50 backdrop-blur-sm transition-all h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Kode Mata Kuliah</Label>
              <Input
                placeholder="Contoh: TIK123"
                value={courseForm.code}
                onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                className="rounded-xl border-muted/30 focus:border-primary/50 bg-background/50 backdrop-blur-sm transition-all h-11"
              />
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 flex sm:justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsCourseDialogOpen(false)} className="rounded-xl hover:bg-muted/50 font-medium">
              Batal
            </Button>
            <Button
              onClick={handleSaveCourse}
              disabled={isLoading}
              className="rounded-xl px-8 primary-gradient shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all font-bold gap-2 h-11"
            >
              {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD MATERIAL DIALOG --- */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="sm:max-w-md border-none glass-card p-0 overflow-hidden">
          <div className="bg-success/10 px-6 py-6 border-b border-success/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-6 h-6 text-success" />
            </div>
            <div>
              <DialogHeader className="p-0">
                <DialogTitle className="text-xl font-bold text-foreground leading-none">
                  Upload Materi
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground mt-1">
                Berbagi materi belajar untuk teman-teman seangkatan.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Judul Materi</Label>
              <Input
                placeholder="Contoh: Slide Pertemuan 1"
                value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                className="rounded-xl border-muted/30 focus:border-success/50 bg-background/50 backdrop-blur-sm transition-all h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Deskripsi (Opsional)</Label>
              <Textarea
                placeholder="Deskripsi singkat..."
                value={materialForm.description}
                onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                className="rounded-xl border-muted/30 focus:border-success/50 bg-background/50 backdrop-blur-sm transition-all min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Pilih File</Label>
              <div className="relative group">
                <Input
                  type="file"
                  onChange={handleFileChange}
                  className="rounded-xl border-dashed border-2 border-muted/50 hover:border-success/50 transition-colors bg-background/30 h-16 pt-5"
                />
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center text-xs text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                  <div className="flex flex-col items-center gap-1">
                    <Plus className="w-4 h-4 mb-1" />
                    <span>Klik atau drag file ke sini</span>
                  </div>
                </div>
              </div>

              {isFileTooLarge && isLoading && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4 rounded-xl mt-3 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-blue-700 dark:text-blue-400">Sedang Mengunggah...</h5>
                    <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-medium">
                      Mengunggah ke Google Drive Cloud Storage
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 flex sm:justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAddMaterialOpen(false)} className="rounded-xl hover:bg-muted/50">
              Batal
            </Button>
            <Button
              onClick={handleAddMaterial}
              disabled={isLoading}
              className="rounded-xl px-10 bg-success hover:bg-success/90 text-white shadow-lg shadow-success/20 hover:shadow-success/40 active:scale-95 transition-all font-bold gap-2 h-11"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  {isFileTooLarge ? 'Sabar...' : 'Simpan...'}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Simpan Materi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD/EDIT SEMESTER DIALOG --- */}
      <Dialog open={isSemesterDialogOpen} onOpenChange={setIsSemesterDialogOpen}>
        <DialogContent className="sm:max-w-md border-none glass-card p-0 overflow-hidden">
          <div className="bg-primary/10 px-6 py-6 border-b border-primary/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogHeader className="p-0">
                <DialogTitle className="text-xl font-bold text-foreground leading-none">
                  {isEditingSemester ? 'Edit Semester' : 'Tambah Semester'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground mt-1">
                {isEditingSemester ? 'Perbarui nama semester ini.' : 'Buat folder semester baru.'}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Nama Semester</Label>
              <Input
                placeholder="Contoh: Semester 9"
                value={semesterForm.name}
                onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                className="rounded-xl border-muted/30 focus:border-primary/50 bg-background/50 backdrop-blur-sm transition-all h-11 text-lg font-medium"
              />
              <p className="text-[10px] text-muted-foreground ml-1 italic">* Contoh: Semester 1, Semester 2, dst.</p>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 flex sm:justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsSemesterDialogOpen(false)} className="rounded-xl hover:bg-muted/50 font-medium">
              Batal
            </Button>
            <Button
              onClick={handleSaveSemester}
              disabled={isLoading}
              className="rounded-xl px-10 primary-gradient shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all font-bold gap-2 h-11"
            >
              {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isEditingSemester ? 'Update' : 'Simpan'}
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
    </motion.div>
  );
}