import { useState, useEffect } from 'react';
import { Award, Calendar, Users, MapPin, ExternalLink, Clock, Trophy, Sparkles, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Competition {
  id: string;
  title: string;
  organizer: string;
  description: string | null;
  deadline: string;
  event_dates: string | null;
  location: string | null;
  prize: string | null;
  category: string;
  badge: string | null;
  team_size: string | null;
  link_url: string | null;
  created_at: string;
}

const categories = ['Semua', 'Hackathon', 'Design', 'Data Science', 'Programming', 'Startup', 'Security'];
const formCategories = ['Hackathon', 'Design', 'Data Science', 'Programming', 'Startup', 'Security'];

export default function Competitions() {
  const { user, isAdminDev, isAdminKelas, isAdminDosen } = useAuth();
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentCompetition, setCurrentCompetition] = useState<Competition | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    organizer: '',
    description: '',
    deadline: '',
    event_dates: '',
    location: '',
    prize: '',
    category: 'Hackathon',
    badge: 'None',
    team_size: '',
    link_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RBAC Access
  const canManage = isAdminDev() || isAdminKelas() || isAdminDosen();

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompetitions(data as Competition[]);
    } catch (error: any) {
      console.error('Error fetching competitions:', error);
      toast({
        variant: "destructive",
        title: "Gagal memuat lomba",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (competition?: Competition) => {
    if (competition) {
      setCurrentCompetition(competition);
      setFormData({
        title: competition.title,
        organizer: competition.organizer,
        description: competition.description || '',
        deadline: competition.deadline,
        event_dates: competition.event_dates || '',
        location: competition.location || '',
        prize: competition.prize ? competition.prize.replace(/^Rp\.\s?/, '') : '',
        category: competition.category,
        badge: competition.badge || 'None',
        team_size: competition.team_size || '',
        link_url: competition.link_url || ''
      });
    } else {
      setCurrentCompetition(null);
      setFormData({
        title: '',
        organizer: '',
        description: '',
        deadline: '',
        event_dates: '',
        location: '',
        prize: '',
        category: 'Hackathon',
        badge: 'None',
        team_size: '',
        link_url: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSubmitting(true);

      const payload = {
        title: formData.title,
        organizer: formData.organizer,
        description: formData.description,
        deadline: formData.deadline,
        event_dates: formData.event_dates,
        location: formData.location,
        prize: formData.prize ? `Rp. ${formData.prize}` : '',
        category: formData.category,
        badge: formData.badge === 'None' ? null : formData.badge,
        team_size: formData.team_size,
        link_url: formData.link_url,
        created_by: user.id
      };

      let error;
      if (currentCompetition) {
        const { error: updateError } = await supabase
          .from('competitions')
          .update(payload)
          .eq('id', currentCompetition.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('competitions')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: currentCompetition ? "Lomba diperbarui" : "Lomba ditambahkan",
        description: "Data lomba berhasil disimpan."
      });

      setIsDialogOpen(false);
      fetchCompetitions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentCompetition) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('id', currentCompetition.id);

      if (error) throw error;

      toast({
        title: "Lomba dihapus",
        description: "Berhasil menghapus data lomba."
      });

      setIsDeleteDialogOpen(false);
      fetchCompetitions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    const numericValue = value.replace(/\D/g, '');
    // Format with dots
    const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setFormData({ ...formData, prize: formattedValue });
  };

  const filteredCompetitions = selectedCategory === 'Semua'
    ? competitions
    : competitions.filter(c => c.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Hackathon': 'bg-primary/10 text-primary',
      'Design': 'bg-success/10 text-success',
      'Data Science': 'bg-warning/10 text-warning-foreground',
      'Programming': 'bg-destructive/10 text-destructive',
      'Startup': 'bg-accent text-accent-foreground',
      'Security': 'bg-muted text-muted-foreground',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Info Lomba</h1>
          <p className="text-muted-foreground mt-1">Kompetisi dan lomba untuk mahasiswa PTIK</p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenDialog()} className="primary-gradient shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Lomba
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap pb-2 overflow-x-auto">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? 'primary-gradient transition-all' : 'text-muted-foreground'}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-secondary/20 animate-pulse" />
          ))}
        </div>
      ) : (
        /* Competition Cards */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCompetitions.length > 0 ? (
            filteredCompetitions.map((comp) => (
              <div
                key={comp.id}
                className={cn(
                  "glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-glow relative overflow-hidden group",
                  comp.badge === 'Hot' && "border-2 border-primary/30"
                )}
              >
                {comp.badge === 'Hot' && (
                  <div className="absolute top-4 right-4">
                    <span className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Hot
                    </span>
                  </div>
                )}
                {comp.badge === 'New' && (
                  <div className="absolute top-4 right-4">
                    <span className="flex items-center gap-1 px-3 py-1 bg-indigo-500 text-white text-xs font-medium rounded-full">
                      <Sparkles className="w-3 h-3" />
                      New
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-success/20 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 pr-16">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", getCategoryColor(comp.category))}>
                        {comp.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-foreground line-clamp-1">{comp.title}</h3>
                    <p className="text-sm text-muted-foreground">{comp.organizer}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-foreground/80 line-clamp-2 min-h-[3rem]">{comp.description}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 text-destructive" />
                    <span className="truncate">Deadline: {new Date(comp.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="truncate">{comp.event_dates}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-success" />
                    <span className="truncate">{comp.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4 text-warning-foreground" />
                    <span className="truncate">{comp.team_size}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Hadiah</span>
                    <p className="font-bold text-success truncate max-w-[120px]">{comp.prize}</p>
                  </div>
                  <div className="flex gap-2">
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(comp);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentCompetition(comp);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="pill" size="sm" asChild className="h-8">
                      <a href={comp.link_url || '#'} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Daftar
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-secondary/5 rounded-3xl border border-dashed border-border">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Belum ada lomba untuk kategori ini</p>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-white dark:bg-slate-950 shadow-2xl border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentCompetition ? 'Edit Lomba' : 'Tambah Lomba Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Judul Lomba</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Penyelenggara</Label>
                <Input
                  value={formData.organizer}
                  onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-slate-200 font-medium">Deskripsi Singkat</Label>
              <Textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Kategori</Label>
                <Select value={formData.category} onValueChange={val => setFormData({ ...formData, category: val })}>
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Badge</Label>
                <Select value={formData.badge} onValueChange={val => setFormData({ ...formData, badge: val })}>
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Hot">Hot</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Deadline Pendaftaran</Label>
                <DatePicker
                  date={formData.deadline ? new Date(formData.deadline) : undefined}
                  setDate={(date) => setFormData({ ...formData, deadline: date ? format(date, "yyyy-MM-dd") : "" })}
                  placeholder="Pilih deadline"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Tanggal Acara/Final</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
                  <Input
                    value={formData.event_dates || ''}
                    onChange={e => setFormData({ ...formData, event_dates: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 pl-12 pr-4 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm"
                    placeholder="Contoh: 15-17 Feb 2025"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Lokasi</Label>
                <Input
                  value={formData.location || ''}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm"
                  placeholder="Online / Jakarta"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Ukuran Tim</Label>
                <Input
                  value={formData.team_size || ''}
                  onChange={e => setFormData({ ...formData, team_size: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm"
                  placeholder="Contoh: 3-5 orang"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Total Hadiah</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp.</div>
                  <Input
                    value={formData.prize || ''}
                    onChange={handlePrizeChange}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm"
                    placeholder="50.000.000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-slate-200 font-medium">Link Pendaftaran</Label>
                <Input
                  value={formData.link_url || ''}
                  onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all shadow-sm"
                  placeholder="https://..."
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/40 active:scale-95" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Lomba'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-950 shadow-2xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-destructive">Hapus Data Lomba?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Apakah Anda yakin ingin menghapus <strong>"{currentCompetition?.title}"</strong>?
          </p>
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
              {isSubmitting ? 'Menghapus...' : 'Hapus Permanen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}