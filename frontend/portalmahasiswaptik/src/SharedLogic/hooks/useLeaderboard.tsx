import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { useUserPreferences } from '@/hooks/useUserPreferences';

export interface ClassAchievement {
  id: string;
  class_id: string;
  competition_name: string;
  student_names: string;
  rank: string;
  event_date: string;
  classes?: {
    name: string;
  };
}

export interface ClassStat {
  className: string;
  total: number;
  achievements: ClassAchievement[];
}

export function useLeaderboard() {
  const { user, profile, isAdminDev, isAdminKelas } = useAuth();
  const { last_selected_class, updatePreference } = useUserPreferences();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<ClassAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<ClassAchievement | null>(null);
  const [formData, setFormData] = useState({
    class_id: '',
    competition_name: '',
    student_names: '',
    rank: '',
    event_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classesList, setClassesList] = useState<{ id: string, name: string }[]>([]);

  // RBAC
  const canManage = isAdminDev() || isAdminKelas();

  // Initialization: Sync filter with Sticky Class ID
  const [selectedClassFilter, setSelectedClassFilter] = useState('Semua');

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel('public:class_achievements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_achievements' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (last_selected_class && classesList.length > 0) {
      const cls = classesList.find(c => c.id === last_selected_class);
      if (cls) {
        setSelectedClassFilter(cls.name);
      }
    }
  }, [last_selected_class, classesList]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch achievements
      const { data: achData, error: achError } = await supabase
        .from('class_achievements')
        .select(`
          *,
          classes (
            id,
            name
          )
        `)
        .order('event_date', { ascending: false });

      if (achError) throw achError;

      // Fetch classes for dropdown
      const { data: clsData, error: clsError } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (clsError) throw clsError;

      setAchievements(achData as ClassAchievement[] || []);
      setClassesList(clsData || []);
    } catch (error: any) {
      console.error('Error fetching leaderboard data:', error);
      toast({
        variant: "destructive",
        title: "Gagal memuat data",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Processing Stats
  const getClassStats = (): ClassStat[] => {
    const stats: Record<string, ClassStat> = {};

    classesList.forEach(cls => {
      stats[cls.name] = { className: cls.name, total: 0, achievements: [] };
    });

    achievements.forEach(ach => {
      const clsName = ach.classes?.name || 'Unknown';
      if (!stats[clsName]) {
        stats[clsName] = { className: clsName, total: 0, achievements: [] };
      }
      stats[clsName].total += 1;
      stats[clsName].achievements.push(ach);
    });

    // Validasi: Urutan A, B, C tetap (By Name)
    return Object.values(stats).sort((a, b) => a.className.localeCompare(b.className));
  };

  const handleFilterChange = (filterName: string) => {
    setSelectedClassFilter(filterName);

    // Reverse lookup ID to persist
    if (filterName === 'Semua') {
      updatePreference({ last_selected_class: null });
    } else {
      const cls = classesList.find(c => c.name === filterName);
      if (cls) {
        updatePreference({ last_selected_class: cls.id });
      }
    }
  };

  const filteredAchievements = selectedClassFilter === 'Semua'
    ? achievements
    : achievements.filter(ach => ach.classes?.name === selectedClassFilter);

  // CRUD Handlers
  const handleOpenDialog = (ach?: ClassAchievement) => {
    if (ach) {
      setCurrentAchievement(ach);
      setFormData({
        class_id: ach.class_id,
        competition_name: ach.competition_name,
        student_names: ach.student_names,
        rank: ach.rank,
        event_date: ach.event_date
      });
    } else {
      setCurrentAchievement(null);
      // Pre-fill class_id for Class Admin
      const initialClassId = isAdminKelas() && profile?.class_id ? profile.class_id : '';

      setFormData({
        class_id: initialClassId,
        competition_name: '',
        student_names: '',
        rank: '',
        event_date: new Date().toISOString().split('T')[0]
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setIsSubmitting(true);

      // Enforce class_id for Class Admin
      let finalClassId = formData.class_id;
      if (isAdminKelas() && !isAdminDev() && profile?.class_id) {
        finalClassId = profile.class_id; // Override class_id
      }

      // Check for tampering: Admin Kelas modifying other class?
      if (currentAchievement && isAdminKelas() && !isAdminDev()) {
        if (currentAchievement.class_id !== profile?.class_id) {
          throw new Error("Anda tidak memiliki akses untuk mengubah data kelas lain.");
        }
      }

      const payload = { ...formData, class_id: finalClassId, created_by: user.id };

      if (currentAchievement) {
        const { error } = await supabase
          .from('class_achievements')
          .update(payload)
          .eq('id', currentAchievement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('class_achievements')
          .insert([payload]);
        if (error) throw error;
      }

      toast({ title: "Berhasil", description: "Data prestasi berhasil disimpan." });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentAchievement) return;
    try {
      // Permission Check
      if (isAdminKelas() && !isAdminDev() && currentAchievement.class_id !== profile?.class_id) {
        throw new Error("Anda tidak memiliki akses untuk menghapus data kelas lain.");
      }

      setIsSubmitting(true);
      const { error } = await supabase
        .from('class_achievements')
        .delete()
        .eq('id', currentAchievement.id);
      if (error) throw error;

      toast({ title: "Terhapus", description: "Data prestasi berhasil dihapus." });
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user has permission to edit/delete a specific achievement
  const hasPermission = (ach: ClassAchievement) => {
    if (isAdminDev()) return true;
    if (isAdminKelas() && profile?.class_id === ach.class_id) return true;
    return false;
  };

  return {
    state: {
      achievements, loading, classesList, selectedClassFilter, isDialogOpen,
      isDeleteDialogOpen, currentAchievement, formData, isSubmitting, canManage,
      profile, isAdminDev, filteredAchievements
    },
    actions: {
      setSelectedClassFilter, setIsDialogOpen, setIsDeleteDialogOpen,
      setCurrentAchievement, setFormData, handleOpenDialog, handleSubmit,
      handleDelete, handleFilterChange, fetchData, getClassStats, hasPermission
    }
  };
}
