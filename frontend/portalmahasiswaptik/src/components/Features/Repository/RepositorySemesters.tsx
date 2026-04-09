import { motion } from 'framer-motion';
import { Folder, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRepository, SEMESTER_GRADIENTS } from '@/SharedLogic/hooks/useRepository';

interface RepositorySemestersProps {
  repository: ReturnType<typeof useRepository>;
}

export function RepositorySemesters({ repository }: RepositorySemestersProps) {
  const { semesters, canManage, view } = repository.state;
  const { handleSelectSemester, openEditSemester, handleDeleteSemester } = repository.actions;

  if (view !== 'semesters') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
    >
      {semesters.map((semester, idx) => (
        <div key={semester.id} className="relative group w-full">
          <PremiumCard
            onClick={() => handleSelectSemester(semester)}
            variant="pastel"
            icon={Folder}
            title={semester.name}
            subtitle="Klik untuk lihat matkul"
            gradient={SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].gradient}
            iconClassName={`${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconBg} ${SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].iconColor}`}
            className={cn("w-full transition-all duration-300", SEMESTER_GRADIENTS[idx % SEMESTER_GRADIENTS.length].shadowColor)}
            actions={canManage && (
              <div className="flex gap-2 items-center px-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 sm:h-8 sm:w-8 bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl glass-card border-none shadow-xl">
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); openEditSemester(semester); }} 
                      className="gap-2 cursor-pointer focus:bg-primary/10 rounded-lg m-1"
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Edit Semester</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); handleDeleteSemester(semester.id); }} 
                      className="gap-2 cursor-pointer focus:bg-red-500/10 text-red-500 rounded-lg m-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="font-medium">Hapus</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            actionsClassName="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300"
          />
        </div>
      ))}
    </motion.div>
  );
}
