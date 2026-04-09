import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAnnouncements, formCategories } from '@/SharedLogic/hooks/useAnnouncements';

interface AnnouncementDialogProps {
    hook: ReturnType<typeof useAnnouncements>;
}

export function AnnouncementDialog({ hook }: AnnouncementDialogProps) {
    const { state, actions } = hook;
    const { isDialogOpen, currentAnnouncement, formData, isSubmitting } = state;
    const { setIsDialogOpen, setFormData, handleSubmit } = actions;

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-950 shadow-2xl border-white/10">
                <DialogHeader>
                    <DialogTitle>{currentAnnouncement ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label className="text-slate-900 dark:text-slate-200 font-medium">Judul Pengumuman</Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Contoh: Jadwal UAS..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-900 dark:text-slate-200 font-medium">Kategori</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {formCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-900 dark:text-slate-200 font-medium">Prioritas</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(val: any) => setFormData({ ...formData, priority: val })}
                            >
                                <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">Normal (Info)</SelectItem>
                                    <SelectItem value="important">Penting (Merah)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-900 dark:text-slate-200 font-medium">Isi Pengumuman</Label>
                        <Textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Tulis detail pengumuman di sini..."
                            className="min-h-[150px] w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-sm"
                            required
                        />
                    </div>

                    <div className="flex gap-6 pt-2">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.is_pinned}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                                id="pin-mode"
                            />
                            <Label htmlFor="pin-mode" className="cursor-pointer text-slate-900 dark:text-slate-200 font-medium">Sematkan (Pin)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.is_new}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_new: checked })}
                                id="new-mode"
                            />
                            <Label htmlFor="new-mode" className="cursor-pointer text-slate-900 dark:text-slate-200 font-medium">Tandai "New"</Label>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                        <Button
                            type="submit"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Pengumuman'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
