import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Users, Calendar, Plus, Pencil, Trash2, Award, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Skeleton } from '@/components/ui/skeleton';

interface ClassAchievement {
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

interface ClassStat {
  className: string;
  total: number;
  achievements: ClassAchievement[];
}

export default function Leaderboard() {
  const { user, profile, isAdminDev, isAdminKelas, isAdminDosen } = useAuth();
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

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel('public:class_achievements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_achievements' }, (payload) => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const orderedStats = getClassStats();
  const [selectedClassFilter, setSelectedClassFilter] = useState('Semua');

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

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-8 h-8 text-yellow-500" />;
    if (index === 1) return <Medal className="w-8 h-8 text-gray-400" />;
    if (index === 2) return <Medal className="w-8 h-8 text-amber-600" />;
    return <span className="text-xl font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const getClassColor = (name: string) => {
    if (name?.includes('A')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (name?.includes('B')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    if (name?.includes('C')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    return 'bg-secondary text-secondary-foreground';
  };

  // Check if user has permission to edit/delete a specific achievement
  const hasPermission = (ach: ClassAchievement) => {
    if (isAdminDev()) return true;
    if (isAdminKelas() && profile?.class_id === ach.class_id) return true;
    return false;
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leaderboard Angkatan</h1>
          <p className="text-muted-foreground mt-1">Klasemen prestasi antar kelas PTIK 2025</p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" /> Tambah Prestasi
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 h-32">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-full rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-6">
            {(() => {
              const maxScore = Math.max(...orderedStats.map(s => s.total));
              return orderedStats.map((stat, idx) => (
                <div key={stat.className} className="bg-card rounded-2xl p-6 relative overflow-hidden group hover-glow-blue hover:border-primary/30 transition-all border border-border/50 shadow-sm">
                  {stat.total > 0 && stat.total === maxScore && (
                    <div className="absolute top-0 right-0 p-3 bg-yellow-500/10 rounded-bl-2xl">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center">
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-3 text-2xl font-bold border-2", getClassColor(stat.className))}>
                      {stat.className}
                    </div>
                    <h3 className="text-muted-foreground font-medium">Kelas {stat.className}</h3>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.total}</p>
                    <span className="text-xs text-muted-foreground">Total Prestasi</span>
                  </div>
                </div>
              ));
            })()}
          </div>

{/* Podium Section (Visual) - FIX JARAK DESKTOP (MOBILE TETAP) */}
{(() => {
  const sortedStats = [...orderedStats].sort((a, b) => b.total - a.total);

  return sortedStats.length >= 2 && (
    <div className="glass-card rounded-3xl p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <h2 className="text-lg md:text-xl font-bold mb-8 md:mb-12 flex items-center gap-2 relative z-10">
        <TrendingUp className="w-5 h-5 text-primary" />
        Peringkat Kelas
      </h2>
      
      {/* Container: Tinggi desktop ditambah dikit biar teks melayang enak dilihat */}
      <div className="flex flex-row items-end justify-center gap-1 md:gap-6 relative z-10 pb-4 min-h-[260px] md:min-h-[400px] w-full max-w-full">
        
        {/* 2nd Place */}
        {sortedStats[1] && (
          <div className="flex flex-col items-center justify-end h-full group transition-all duration-300 hover:-translate-y-1 order-1 flex-1 max-w-[80px] md:max-w-none">
            {/* Mobile mb-10 (Tetap), Desktop dinaikkan jadi md:mb-12 */}
            <span className="font-bold text-foreground text-[10px] md:text-lg mb-10 md:mb-12 text-center leading-tight">
              Kelas<br />{sortedStats[1].className}
            </span>
            <div className={cn(
              "w-full md:w-28 h-28 md:h-36 bg-gradient-to-t from-gray-400/30 to-gray-400/5 rounded-t-lg border-t border-x border-gray-400/30 flex items-center justify-center relative",
              "shadow-[0_0_40px_-5px_rgba(148,163,184,0.3)]"
            )}>
              <span className="text-2xl md:text-4xl font-bold text-gray-400 opacity-20">2</span>
              <div className="absolute -top-6 md:-top-10 transition-transform group-hover:scale-110 duration-300">
                <Medal className="w-8 h-8 md:w-14 md:h-14 text-gray-400 drop-shadow-lg" />
              </div>
            </div>
            <span className="font-mono text-[9px] md:text-base text-muted-foreground mt-2">{sortedStats[1].total} Poin</span>
          </div>
        )}

        {/* 1st Place */}
        {sortedStats[0] && (
          <div className="flex flex-col items-center justify-end h-full z-20 group transition-all duration-300 hover:-translate-y-2 order-2 flex-1 max-w-[95px] md:max-w-none">
            <div className="animate-bounce-slow mb-1">
              <Crown className="w-7 h-7 md:w-12 md:h-12 text-yellow-500" />
            </div>
            {/* Mobile mb-12 (Tetap), Desktop dinaikkan jadi md:mb-16 (Piala Juara 1 Tinggi) */}
            <span className="font-bold text-[11px] md:text-2xl text-yellow-500 mb-12 md:mb-16 drop-shadow-sm text-center leading-tight">
              Kelas<br />{sortedStats[0].className}
            </span>
            <div className={cn(
              "w-full md:w-36 h-36 md:h-48 bg-gradient-to-t from-yellow-500/30 to-yellow-500/5 rounded-t-lg border-t border-x border-yellow-500/30 flex items-center justify-center relative",
              "shadow-[0_0_50px_-10px_rgba(234,179,8,0.5)]"
            )}>
              <span className="text-4xl md:text-7xl font-bold text-yellow-500 opacity-20">1</span>
              <div className="absolute -top-8 md:-top-12 transition-transform group-hover:scale-110 duration-300">
                <Trophy className="w-10 h-10 md:w-20 md:h-20 text-yellow-500 [filter:drop-shadow(0_0_10px_rgba(234,179,8,0.4))]" />
              </div>
            </div>
            <span className="font-mono text-[10px] md:text-base font-bold text-yellow-500 mt-2">{sortedStats[0].total} Poin</span>
          </div>
        )}

        {/* 3rd Place */}
        {sortedStats[2] && (
          <div className="flex flex-col items-center justify-end h-full group transition-all duration-300 hover:-translate-y-1 order-3 flex-1 max-w-[80px] md:max-w-none">
            <span className="font-bold text-foreground text-[10px] md:text-lg mb-10 md:mb-12 text-center leading-tight">
              Kelas<br />{sortedStats[2].className}
            </span>
            <div className={cn(
              "w-full md:w-28 h-20 md:h-28 bg-gradient-to-t from-amber-700/30 to-amber-700/5 rounded-t-lg border-t border-x border-amber-700/30 flex items-center justify-center relative",
              "shadow-[0_0_40px_-5px_rgba(180,83,9,0.3)]"
            )}>
              <span className="text-2xl md:text-4xl font-bold text-amber-700 opacity-20">3</span>
              <div className="absolute -top-6 md:-top-10 transition-transform group-hover:scale-110 duration-300">
                <Medal className="w-8 h-8 md:w-14 md:h-14 text-amber-700 drop-shadow-lg" />
              </div>
            </div>
            <span className="font-mono text-[9px] md:text-base text-muted-foreground mt-2">{sortedStats[2].total} Poin</span>
          </div>
        )}

        {/* 4th Place */}
        {sortedStats[3] && (
          <div className="flex flex-col items-center justify-end h-full group transition-all duration-300 hover:-translate-y-1 order-4 flex-1 max-w-[75px] md:max-w-none">
            <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] md:text-lg mb-8 md:mb-10 text-center leading-tight">
              Kelas<br />{sortedStats[3].className}
            </span>
            <div className={cn(
              "w-full md:w-28 h-12 md:h-20 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700/80 rounded-t-lg border-t border-x border-slate-300/30 flex items-center justify-center relative shadow-sm"
            )}>
              <span className="text-xl md:text-4xl font-bold text-slate-400 opacity-20">4</span>
              <div className="absolute -top-4 md:-top-8 transition-transform group-hover:scale-110 duration-300">
                <Star className="w-6 h-6 md:w-12 md:h-12 text-slate-400 dark:text-slate-500 fill-slate-300" />
              </div>
            </div>
            <span className="font-mono text-[9px] md:text-base text-slate-500 mt-2">{sortedStats[3].total} Poin</span>
          </div>
        )}
      </div>
    </div>
  );
})()}
          {/* Detailed List */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Daftar Prestasi Angkatan
              </h3>

              {/* Class Filters */}
              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 whitespace-nowrap scrollbar-hide">
                {['Semua', ...classesList.map(c => c.name)].map((filter) => (
                  <Button
                    key={filter}
                    variant={selectedClassFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedClassFilter(filter)}
                    className={selectedClassFilter === filter ? 'primary-gradient border-none flex-shrink-0' : 'bg-transparent border-white/10 hover:bg-white/5 flex-shrink-0'}
                  >
                    {filter === 'Semua' ? 'Semua' : `Kelas ${filter}`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/20">
                  <tr>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Kegiatan / Lomba</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Nama Mahasiswa</th>
                    <th className="text-center py-4 px-6 font-medium text-muted-foreground text-sm">Kelas</th>
                    <th className="text-center py-4 px-6 font-medium text-muted-foreground text-sm">Peringkat</th>
                    <th className="text-right py-4 px-6 font-medium text-muted-foreground text-sm">Tanggal</th>
                    {canManage && <th className="py-4 px-6 w-20"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredAchievements.length > 0 ? filteredAchievements.map((ach) => (
                    <tr key={ach.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-medium text-foreground">{ach.competition_name}</p>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted-foreground">
                        {ach.student_names}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", getClassColor(ach.classes?.name || ''))}>
                          {ach.classes?.name}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                          <Trophy className="w-3 h-3" />
                          {ach.rank}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(ach.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      {canManage && (
                        <td className="py-4 px-6 text-right">
                          {hasPermission(ach) && (
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(ach)}>
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                setCurrentAchievement(ach);
                                setIsDeleteDialogOpen(true);
                              }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        Belum ada data prestasi untuk kategori ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CRUD Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-950 shadow-2xl border-white/10">
          <DialogHeader>
            <DialogTitle>{currentAchievement ? 'Edit Prestasi' : 'Tambah Prestasi Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-slate-200 font-medium">Nama Lomba / Kegiatan</Label>
              <Input
                value={formData.competition_name}
                onChange={e => setFormData({ ...formData, competition_name: e.target.value })}
                placeholder="Contoh: Hackathon Nasional 2025"
                required
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-slate-200 font-medium">Nama Mahasiswa</Label>
              <Input
                value={formData.student_names}
                onChange={e => setFormData({ ...formData, student_names: e.target.value })}
                placeholder="Nama mahasiswa (pisahkan koma jika banyak)"
                required
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {isAdminDev() && (
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-200 font-medium">Kelas</Label>
                  <Select
                    value={formData.class_id}
                    onValueChange={val => setFormData({ ...formData, class_id: val })}
                  >
                    <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm">
                      <SelectValue placeholder="Pilih Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={cn("space-y-2", !isAdminDev() && "col-span-2")}>
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Tanggal</Label>
                <DatePicker
                  date={formData.event_date ? new Date(formData.event_date) : undefined}
                  setDate={(date) => setFormData({ ...formData, event_date: date ? format(date, "yyyy-MM-dd") : "" })}
                  placeholder="Pilih tanggal"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-slate-200 font-medium">Peringkat / Capaian</Label>
              <Input
                value={formData.rank}
                onChange={e => setFormData({ ...formData, rank: e.target.value })}
                placeholder="Contoh: Juara 1 / Finalis"
                required
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm"
              />
            </div>
            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold h-12 rounded-xl shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/40 active:scale-95"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-950 shadow-2xl border-white/10">
          <DialogHeader><DialogTitle className="text-destructive">Hapus Data?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground py-4">Hapus data prestasi <strong>{currentAchievement?.competition_name}</strong>?</p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-rose-500/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}