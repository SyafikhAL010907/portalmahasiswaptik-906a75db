import { motion } from 'framer-motion';
import { FileText, MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRepository } from '@/SharedLogic/hooks/useRepository';

interface RepositoryCoursesProps {
  repository: ReturnType<typeof useRepository>;
}

const SUBJECT_PASTELS = [
  { gradient: 'from-violet-50 to-white dark:from-violet-950/20 dark:to-background', iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400', shadowColor: 'hover:shadow-violet-200/50 dark:hover:shadow-violet-900/50' },
  { gradient: 'from-sky-50 to-white dark:from-sky-950/20 dark:to-background', iconBg: 'bg-sky-100 dark:bg-sky-900/30', iconColor: 'text-sky-600 dark:text-sky-400', shadowColor: 'hover:shadow-sky-200/50 dark:hover:shadow-sky-900/50' },
  { gradient: 'from-rose-50 to-white dark:from-rose-950/20 dark:to-background', iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400', shadowColor: 'hover:shadow-rose-200/50 dark:hover:shadow-rose-900/50' },
  { gradient: 'from-amber-50 to-white dark:from-amber-950/20 dark:to-background', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400', shadowColor: 'hover:shadow-amber-200/50 dark:hover:shadow-amber-900/50' },
  { gradient: 'from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', shadowColor: 'hover:shadow-cyan-200/50 dark:hover:shadow-cyan-900/50' },
  { gradient: 'from-lime-50 to-white dark:from-lime-950/20 dark:to-background', iconBg: 'bg-lime-100 dark:bg-lime-900/30', iconColor: 'text-lime-600 dark:text-lime-400', shadowColor: 'hover:shadow-lime-200/50 dark:hover:shadow-lime-900/50' },
];

export function RepositoryCourses({ repository }: RepositoryCoursesProps) {
  const { subjects, canManage, view, isLoading } = repository.state;
  const { handleSelectCourse, handleEditCourseClick, handleDeleteCourse } = repository.actions;

  if (view !== 'courses') return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {subjects.length === 0 ? (
        <div className="col-span-full text-center py-10 text-muted-foreground glass-card rounded-xl border border-dashed border-muted/50">
          Belum ada mata kuliah di semester ini.
        </div>
      ) : (
        subjects.map((course, idx) => {
          const pastel = SUBJECT_PASTELS[idx % SUBJECT_PASTELS.length];
          return (
            <div key={course.id} className="relative group w-full">
              <PremiumCard
                variant="pastel"
                icon={FileText}
                title={course.name}
                subtitle={course.code || "TBA"}
                gradient={pastel.gradient}
                iconClassName={`${pastel.iconBg} ${pastel.iconColor}`}
                className={cn("w-full h-full cursor-pointer", pastel.shadowColor)}
                onClick={() => handleSelectCourse(course)}
                actions={canManage && (
                  <div className="flex gap-2 items-center px-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 sm:h-8 sm:w-8 bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-sm rounded-full flex items-center justify-center p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl glass-card border-none shadow-xl">
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleEditCourseClick(course); }} 
                          className="gap-2 cursor-pointer focus:bg-primary/10 rounded-lg m-1"
                        >
                          <Pencil className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Edit Matkul</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }} 
                          className="gap-2 cursor-pointer focus:bg-red-500/10 text-red-500 rounded-lg m-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="font-medium">Hapus</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                actionsClassName="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300"
              />
            </div>
          );
        })
      )}
    </motion.div>
  );
}
