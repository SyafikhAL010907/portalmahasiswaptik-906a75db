import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLeaderboard } from '@/SharedLogic/hooks/useLeaderboard';

interface AchievementDialogProps {
    hook: ReturnType<typeof useLeaderboard>;
}

export function AchievementDialog({ hook }: AchievementDialogProps) {
    const { state, actions } = hook;
    const { isDialogOpen, currentAchievement, formData, isSubmitting, classesList, isAdminDev } = state;
    const { setIsDialogOpen, setFormData, handleSubmit } = actions;

    return (
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
                        {isAdminDev && (
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
                        <div className={cn("space-y-2", !isAdminDev && "col-span-2")}>
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
    );
}
