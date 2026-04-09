import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/constants';

// --- CONSTANTS (SYNCED WITH ORIGINAL) ---
export const GOOGLE_DRIVE_FOLDER_LINK = 'https://drive.google.com/drive/folders/1Ar_jm913F57k7WcchYkv8o6ZUbX4s3KP';
export const PARENT_FOLDER_ID = '1b4bby3CRLAX9pL1QKD87HU0Os0slKaIi';

export const GDRIVE_LINKS: any = {
  root: "https://drive.google.com/drive/folders/13yX9ZKvKGzIQILXd2UdD_blDYuazKgN_?usp=drive_link",
  semesters: {
    "1": {
      root: "https://drive.google.com/drive/folders/1toLQ-50GuExXB54o2IObbxqtKvwINsrz?usp=drive_link",
      subjects: {
        "Kalkulus": "https://drive.google.com/drive/folders/1IhipgI2HKDgVMWeyOVejQE7D8g5-A2-v?usp=drive_link",
        "Matematika Diskrit": "https://drive.google.com/drive/folders/1rU6WvgzGCQfQhrMlIxxU7pIk7qypZ15C?usp=drive_link",
        "Fisika": "https://drive.google.com/drive/folders/1e-NLyE1wsh-DQvHvWqxqoRRuf18Qyu1j?usp=drive_link",
        "Pengantar Sistem Teknologi Informasi": "https://drive.google.com/drive/folders/1yQwacflMQe-HQ2VC4SQpPZiz9K_U0Bhv?usp=drive_link",
        "Konsep Pemrograman": "https://drive.google.com/drive/folders/1iUhBhaM5A6_0Q9fgK-XC2TlLVCLU0ydR?usp=drive_link",
        "Filsafat Ilmu": "https://drive.google.com/drive/folders/1ZRdQeFxGqSOmD8SOlln9oEwbC-sUwG9E?usp=drive_link",
        "Bahasa Indonesia": "https://drive.google.com/drive/folders/1EaSJJhApoo4otfWsme9G16wE2PtCzT_B?usp=drive_link",
        "Pendidikan Pancasila": "https://drive.google.com/drive/folders/1BGJAxU3UKc3EbvZFamLS-rIu9Dr2-jAU?usp=drive_link",
        "Landasan Pendidikan": "https://drive.google.com/drive/folders/1xi4ndt_M6E1nDS69vk5KpdxNIZfOnbzh?usp=drive_link"
      }
    },
    "2": {
      root: "https://drive.google.com/drive/folders/1y54fOcRVijaYLLNRc6Jr1KWvIp_DpY77?usp=drive_link",
      subjects: {
        "Wawasan Pendidikan": "https://drive.google.com/drive/folders/1oXjnCkh3pOJ8DerXVZSQ_zUOFVZwOKq_?usp=drive_link",
        "Organisasi dan Arsitektur Komputer": "https://drive.google.com/drive/folders/1rsc3GBCfqTV2QoQ4oPstFqnL2TdOnWR8?usp=drive_link",
        "Komunikasi Data": "https://drive.google.com/drive/folders/1JecqqoYfKTaT6fDGupGyGyPHiYTeAEs7?usp=drive_link",
        "Algoritma dan Pemrograman": "https://drive.google.com/drive/folders/1CzdvXCUIwFQaLukgI3WAEYqP0PZgPMo1?usp=drive_link",
        "Aljabar Linier": "https://drive.google.com/drive/folders/10ygtLSA2x0oSy4tlbqUCXz7Fb6FPtGBs?usp=drive_link",
        "Pendidikan Agama Islam": "https://drive.google.com/drive/folders/1xqhftYtXwJA7s5FgkvRvQuybZV2J8T6r?usp=drive_link",
        "Pendidikan Kewarganegaraan": "https://drive.google.com/drive/folders/1Rx75KAmzfYNZ-HgoYfvAWXCqZUAtoL9i?usp=drive_link",
        "Perkembangan Peserta Didik": "https://drive.google.com/drive/folders/1CMFONA_1lEcZToyDGIzqIaczd0sVqmld?usp=drive_link",
        "E-Learning": "https://drive.google.com/drive/folders/1IyNs-DT-HLQA4AUE5ogn1J1Uo0_apSyI?usp=drive_link",
        "Interaksi Manusia & Komputer": "https://drive.google.com/drive/folders/14pmreIKjNgnDtKKgCKO78zK9KecKnG7N?usp=sharing"
      }
    },
    "3": { root: "https://drive.google.com/drive/folders/1dnQ4pR4SBbxvGOw3QXefz738fm18dp3g?usp=drive_link", subjects: {} },
    "4": { root: "https://drive.google.com/drive/folders/1g-KOucr0pM-uGdZ5LaJyM6fYbv1BFTWw?usp=drive_link", subjects: {} },
    "5": { root: "https://drive.google.com/drive/folders/1nYPoR-I4R3K8aOunkq0kmibikRoeKMU2?usp=drive_link", subjects: {} },
    "6": { root: "https://drive.google.com/drive/folders/1dRL0RoQVEdvspMSiculvlPK99hlNqPIA?usp=drive_link", subjects: {} },
    "7": { root: "https://drive.google.com/drive/folders/195F9fgbiDAUmz4AVZQf2Zdguaz37pLoe?usp=drive_link", subjects: {} },
    "8": { root: "https://drive.google.com/drive/folders/14BYO4Cs-IZGK792cvpv98rd_eZgaqnwQ?usp=drive_link", subjects: {} },
    "9": { root: "https://drive.google.com/drive/folders/1_VK9PxcyZ36fZbs93SENj2h6sTo2xvUM?usp=drive_link", subjects: {} }
  }
};

export const SEMESTER_GRADIENTS = [
  { gradient: 'from-purple-50 to-white dark:from-purple-950/20 dark:to-background', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', shadowColor: 'hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50' },
  { gradient: 'from-blue-50 to-white dark:from-blue-950/20 dark:to-background', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', shadowColor: 'hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50' },
  { gradient: 'from-orange-50 to-white dark:from-orange-950/20 dark:to-background', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', shadowColor: 'hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50' },
  { gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
  { gradient: 'from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400', shadowColor: 'hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50' },
  { gradient: 'from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background', iconBg: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400', shadowColor: 'hover:shadow-yellow-200/50 dark:hover:shadow-yellow-900/50' },
  { gradient: 'from-pink-50 to-white dark:from-pink-950/20 dark:to-background', iconBg: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400', shadowColor: 'hover:shadow-pink-200/50 dark:hover:shadow-pink-900/50' },
];

export function useRepository() {
  const [view, setView] = useState<'semesters' | 'courses' | 'files'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'document' | 'video' | 'image' | 'other'>('all');

  const [subjects, setSubjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [exhaustedMaterials, setExhaustedMaterials] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [canManage, setCanManage] = useState(false);
  const [isMahasiswa, setIsMahasiswa] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({ id: '', name: '', code: '' });
  const [isEditingCourse, setIsEditingCourse] = useState(false);

  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({ id: '', title: '', description: '' });
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isFileTooLarge, setIsFileTooLarge] = useState(false);

  const [isSemesterDialogOpen, setIsSemesterDialogOpen] = useState(false);
  const [semesterForm, setSemesterForm] = useState({ id: 0, name: '' });
  const [isEditingSemester, setIsEditingSemester] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await (supabase as any).from('profiles').select('role').eq('user_id', user.id).maybeSingle();
        const role = profile?.role;
        setCanManage(role === 'admin_dev' || role === 'admin_kelas' || role === 'admin kelas');
        const { data: isMhsData } = await supabase.rpc('is_mahasiswa', { _user_id: user.id });
        setIsMahasiswa(!!isMhsData || role === 'mahasiswa');
      }
    };
    checkRole();
  }, []);

  const fetchSemesters = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from('semesters').select('*').order('id');
      if (data) setSemesters(data);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, []);

  const fetchSubjects = useCallback(async (semesterId: number) => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from('subjects').select('*').eq('semester', semesterId).order('name');
      setSubjects(data || []);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, []);

  const syncQuotaStatus = useCallback(async (materialList: any[]) => {
    if (!userId || materialList.length === 0) return;
    try {
      const { data: logs } = await (supabase as any).from('download_logs').select('resource_id').eq('user_id', userId).eq('download_type', 'material')
        .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      if (logs) {
        const exhausted: Record<string, boolean> = {};
        logs.forEach((log: any) => { if (log.resource_id) exhausted[log.resource_id] = true; });
        setExhaustedMaterials(exhausted);
      }
    } catch (err) { console.error(err); }
  }, [userId]);

  const fetchMaterials = useCallback(async (subjectId: string) => {
    setIsLoading(true);
    try {
      const { data } = await (supabase as any).from('materials').select('*').eq('subject_id', subjectId).order('created_at', { ascending: false });
      setMaterials(data || []);
      if (data) await syncQuotaStatus(data);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [syncQuotaStatus]);

  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('quota-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'download_logs', filter: `user_id=eq.${userId}` }, () => syncQuotaStatus(materials)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, materials, syncQuotaStatus]);

  const handleSelectSemester = (semester: any) => { setSelectedSemester(semester); setView('courses'); fetchSubjects(semester.id); };
  const handleSelectCourse = (course: any) => { setSelectedCourse(course); setView('files'); fetchMaterials(course.id); };
  const handleBack = () => { if (view === 'files') { setView('courses'); setSelectedCourse(null); } else if (view === 'courses') { setView('semesters'); setSelectedSemester(null); } };

  const handleOpenFile = (file: any) => {
    if (!userId) return toast.error("Silakan login dulu, Bro!");
    const url = file.file_url;
    if (!url) return toast.error("URL file tidak ditemukan!");
    const cleanUrl = url.split('?')[0];
    const ext = cleanUrl.split('.').pop()?.toLowerCase() || '';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      window.open(`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`, '_blank');
      toast.success("Pratinjau dibuka!");
    } else {
      window.open(url, '_blank');
      toast.success("File dibuka!");
    }
  };

  const handleDownload = async (file: any) => {
    if (!userId) return toast.error("Silakan login dulu, Bro!");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesi tidak ditemukan");
      const response = await fetch(`${API_BASE_URL}/repository/download/${file.id}`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 || response.status === 429) {
          toast.error("Jatah Habis!", { description: errorData.error });
          setExhaustedMaterials(prev => ({ ...prev, [file.id]: true }));
          return;
        }
        throw new Error(errorData.error || "Gagal mengambil file");
      }
      const data = await response.json();
      const fileResponse = await fetch(data.url);
      const blob = await fileResponse.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl; link.download = file.title;
      document.body.appendChild(link); link.click();
      toast.success("Download Dimulai!", { description: `Sisa jatah: ${data.remaining} kali lagi.` });
      if (data.remaining === 0) setExhaustedMaterials(prev => ({ ...prev, [file.id]: true }));
      setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(link.href); }, 200);
    } catch (error: any) { toast.error("Gagal Verifikasi!"); }
  };

  const handleSaveMaterial = async () => {
    if ((!isEditingMaterial && filesToUpload.length === 0) || (isEditingMaterial && !materialForm.title.trim())) {
      return toast.error("Lengkapi data materi bro!");
    }
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      const driveFolderId = selectedCourse!.drive_folder_id || PARENT_FOLDER_ID;
      const filesToProcess = isEditingMaterial ? [filesToUpload[0]].filter(Boolean) : filesToUpload;

      for (let i = 0; i < filesToProcess.length; i++) {
        const currentFile = filesToProcess[i];
        let finalFileUrl = '';
        let storageType: 'supabase' | 'google_drive' = 'supabase';
        let type = 'pdf'; // Default

        const fileExt = currentFile.name.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png'].includes(fileExt)) type = 'image';
        else if (fileExt === 'mp4') type = 'video';
        else type = 'pdf';

        if (currentFile.size > 2 * 1024 * 1024) {
          const formData = new FormData(); formData.append('file', currentFile); formData.append('parent_id', driveFolderId);
          const response = await fetch(`${API_BASE_URL}/api/repository/upload-drive`, { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token}` }, body: formData });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          storageType = 'google_drive'; finalFileUrl = result.webViewLink;
        } else {
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${selectedSemester.id}/${selectedCourse.code}/${fileName}`;
          const { error } = await supabase.storage.from('materials').upload(filePath, currentFile);
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('materials').getPublicUrl(filePath);
          finalFileUrl = publicUrl; storageType = 'supabase';
        }

        let finalTitle = isEditingMaterial ? materialForm.title.trim() : (filesToProcess.length > 1 || !materialForm.title.trim() ? currentFile.name.split('.').slice(0, -1).join('.') : materialForm.title.trim());
        if (!finalTitle.toLowerCase().endsWith('.' + fileExt)) finalTitle += '.' + fileExt;

        const insertData: any = {
          subject_id: selectedCourse.id, semester: selectedSemester.id, title: finalTitle,
          description: materialForm.description, file_type: type, file_url: finalFileUrl,
          file_size: storageType === 'google_drive' ? null : currentFile.size, uploaded_by: userId,
          storage_type: storageType, is_pinned: storageType === 'google_drive'
        };
        if (storageType === 'google_drive') insertData.external_url = `https://drive.google.com/drive/folders/${driveFolderId}`;

        if (isEditingMaterial) {
          const { error } = await supabase.from('materials').update(insertData).eq('id', materialForm.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('materials').insert([insertData]);
          if (error) throw error;
        }
      }
      toast.success("Materi berhasil disimpan!");
      setIsAddMaterialOpen(false); setFilesToUpload([]); fetchMaterials(selectedCourse.id);
    } catch (err: any) { toast.error("Gagal menyimpan: " + err.message); } finally { setIsLoading(false); }
  };

  const handleSaveCourse = async () => {
    if (!courseForm.name) return;
    setIsLoading(true);
    try {
      const data = { name: courseForm.name, code: courseForm.code || 'TBA', semester: selectedSemester.id };
      if (isEditingCourse) { await supabase.from('subjects').update(data).eq('id', courseForm.id); }
      else { await supabase.from('subjects').insert([data]); }
      setIsCourseDialogOpen(false); fetchSubjects(selectedSemester.id);
      toast.success("Mata kuliah disimpan");
    } catch (err: any) { toast.error(err.message); } finally { setIsLoading(false); }
  };

  const handleSaveSemester = async () => {
    if (!semesterForm.name) return;
    setIsLoading(true);
    try {
      if (isEditingSemester) { await supabase.from('semesters').update({ name: semesterForm.name }).eq('id', semesterForm.id); }
      else { await supabase.from('semesters').insert({ name: semesterForm.name }); }
      setIsSemesterDialogOpen(false); fetchSemesters();
      toast.success("Semester disimpan");
    } catch (err: any) { toast.error(err.message); } finally { setIsLoading(false); }
  };

  const handleResetCourseForm = () => { setCourseForm({ id: '', name: '', code: '' }); setIsEditingCourse(false); };
  const handleEditCourseClick = (course: any) => { setCourseForm({ id: course.id, name: course.name, code: course.code }); setIsEditingCourse(true); setIsCourseDialogOpen(true); };
  const openEditSemester = (semester: any) => { setSemesterForm({ id: semester.id, name: semester.name }); setIsEditingSemester(true); setIsSemesterDialogOpen(true); };

  const handleDeleteSemester = async (id: number) => {
    if (!confirm("Hapus semester ini? Semua matkul di dalamnya bakal hilang bro!")) return;
    try { await supabase.from('semesters').delete().eq('id', id); fetchSemesters(); toast.success("Semester dihapus"); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Hapus mata kuliah ini? Semua materi di dalamnya bakal hilang bro!")) return;
    try { await supabase.from('subjects').delete().eq('id', id); fetchSubjects(selectedSemester.id); toast.success("Matkul dihapus"); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleEditMaterialClick = (material: any) => {
    setMaterialForm({ id: material.id, title: material.title, description: material.description || '' });
    setIsEditingMaterial(true); setIsAddMaterialOpen(true);
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Hapus materi ini?")) return;
    try { await (supabase as any).from('materials').delete().eq('id', id); fetchMaterials(selectedCourse.id); toast.success("Materi dihapus"); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFilesToUpload(files);
      setIsFileTooLarge(files.some(f => f.size > 2 * 1024 * 1024));
    }
  };

  return {
    state: { view, selectedSemester, selectedCourse, mediaFilter, subjects, materials, semesters, exhaustedMaterials, isLoading, canManage, isMahasiswa, isCourseDialogOpen, courseForm, isEditingCourse, isAddMaterialOpen, materialForm, isEditingMaterial, filesToUpload, isFileTooLarge, isSemesterDialogOpen, semesterForm, isEditingSemester },
    actions: {
      setView, setMediaFilter, handleSelectSemester, handleSelectCourse, handleBack, handleOpenFile, handleDownload, handleSaveMaterial, handleSaveCourse, handleSaveSemester,
      setIsCourseDialogOpen, setCourseForm, setIsEditingCourse, setIsAddMaterialOpen, setMaterialForm, setIsEditingMaterial, setFilesToUpload, setIsFileTooLarge, setIsSemesterDialogOpen, setSemesterForm, setIsEditingSemester,
      fetchSubjects, fetchMaterials, fetchSemesters, handleResetCourseForm, handleEditCourseClick, openEditSemester, handleDeleteSemester, handleDeleteCourse, handleEditMaterialClick, handleDeleteMaterial, handleFileChange
    }
  };
}
