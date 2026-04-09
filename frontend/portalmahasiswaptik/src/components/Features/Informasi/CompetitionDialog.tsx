import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { useCompetitions, formCategories } from '@/SharedLogic/hooks/useCompetitions';

interface CompetitionDialogProps {
    hook: ReturnType<typeof useCompetitions>;
}

export function CompetitionDialog({ hook }: CompetitionDialogProps) {
    const { state, actions } = hook;
    const { isDialogOpen, currentCompetition, formData, isSubmitting } = state;
    const { setIsDialogOpen, setFormData, handleSubmit, handlePrizeChange } = actions;

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="w-[95%] sm:max-w-4xl bg-white dark:bg-slate-950 shadow-2xl border-white/10 max-h-[90vh] overflow-y-auto p-0 sm:p-6 no-scrollbar">
                <DialogHeader className="p-6 sm:p-0">
                    <DialogTitle>{currentCompetition ? 'Edit Lomba' : 'Tambah Lomba Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4 p-6 sm:p-0">
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
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/40 active:scale-95"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Lomba'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
