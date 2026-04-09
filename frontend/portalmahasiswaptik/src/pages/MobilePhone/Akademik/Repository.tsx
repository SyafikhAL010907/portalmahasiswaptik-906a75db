import { useRepository } from '@/SharedLogic/hooks/useRepository';
import { motion, AnimatePresence } from 'framer-motion';
import { RepositoryHeader } from '@/components/Features/Repository/RepositoryHeader';
import { RepositorySemesters } from '@/components/Features/Repository/RepositorySemesters';
import { RepositoryCourses } from '@/components/Features/Repository/RepositoryCourses';
import { RepositoryMaterials } from '@/components/Features/Repository/RepositoryMaterials';
import { RepositoryModals } from '@/components/Features/Repository/RepositoryModals';

export default function Repository() {
  const repository = useRepository();
  const { view } = repository.state;

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-4 space-y-6 pt-8 pb-32"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      layout={false}
    >
      <RepositoryHeader repository={repository} />
      
      <div className="min-h-[50vh]">
        <AnimatePresence mode="wait">
          {view === 'semesters' && (
            <motion.div
              key="semesters"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <RepositorySemesters repository={repository} />
            </motion.div>
          )}

          {view === 'courses' && (
            <motion.div
              key="courses"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <RepositoryCourses repository={repository} />
            </motion.div>
          )}

          {view === 'files' && (
            <motion.div
              key="files"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <RepositoryMaterials repository={repository} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RepositoryModals repository={repository} />
    </motion.div>
  );
}
