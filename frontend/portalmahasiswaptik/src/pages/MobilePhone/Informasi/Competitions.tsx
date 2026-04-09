import { motion } from 'framer-motion';
import { Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompetitions, categories } from '@/SharedLogic/hooks/useCompetitions';
import { CompetitionCard } from '@/components/Features/Informasi/CompetitionCard';
import { CompetitionDialog } from '@/components/Features/Informasi/CompetitionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const staggerTop = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export default function Competitions() {
    const hook = useCompetitions();
    const {
        loading,
        selectedCategory,
        canManage,
        filteredCompetitions,
        isDeleteDialogOpen,
        currentCompetition,
        isSubmitting
    } = hook.state;
    const {
        setSelectedCategory,
        handleOpenDialog,
        setCurrentCompetition,
        setIsDeleteDialogOpen,
        handleDelete
    } = hook.actions;

    return (
        <motion.div
            className="space-y-6 pt-12 md:pt-0 pb-20 px-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            layout={false}
        >
            {/* Header */}
            <motion.div variants={staggerTop as any} layout={false} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            </motion.div>

            {/* Category Filter */}
            <div className="flex gap-2 pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                {categories.map((cat) => (
                    <Button
                        key={cat}
                        variant={selectedCategory === cat ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className={selectedCategory === cat ? 'primary-gradient transition-all flex-shrink-0' : 'text-muted-foreground flex-shrink-0'}
                    >
                        {cat}
                    </Button>
                ))}
            </div>

            {/* Loading / Cards */}
            {loading ? (
                <motion.div variants={staggerBottom as any} layout={false} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 rounded-2xl bg-secondary/20 animate-pulse" />
                    ))}
                </motion.div>
            ) : (
                <motion.div variants={staggerBottom as any} layout={false} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredCompetitions.length > 0 ? (
                        filteredCompetitions.map((comp) => (
                            <CompetitionCard
                                key={comp.id}
                                competition={comp}
                                canManage={canManage}
                                onEdit={handleOpenDialog}
                                onDelete={(c) => {
                                    setCurrentCompetition(c);
                                    setIsDeleteDialogOpen(true);
                                }}
                            />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-muted-foreground bg-secondary/5 rounded-3xl border border-dashed border-border px-4">
                            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Belum ada lomba untuk kategori ini</p>
                        </div>
                    )}
                </motion.div>
            )}

            <CompetitionDialog hook={hook} />

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="w-[95%] sm:max-w-[400px] bg-white dark:bg-slate-950 shadow-2xl border-white/10 rounded-2xl">
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
        </motion.div>
    );
}
