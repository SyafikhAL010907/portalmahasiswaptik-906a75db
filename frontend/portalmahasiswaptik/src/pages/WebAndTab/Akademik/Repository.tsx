import { useRepository } from '@/SharedLogic/hooks/useRepository';
import { motion, AnimatePresence } from 'framer-motion';
import { RepositoryHeader } from '@/components/Features/Repository/RepositoryHeader';
import { RepositorySemesters } from '@/components/Features/Repository/RepositorySemesters';
import { RepositoryCourses } from '@/components/Features/Repository/RepositoryCourses';
import { RepositoryMaterials } from '@/components/Features/Repository/RepositoryMaterials';
import { RepositoryModals } from '@/components/Features/Repository/RepositoryModals';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

export default function Repository() {
  const repository = useRepository();
  const { view } = repository.state;

  return (
    <motion.div
      className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-12 md:pt-0 pb-16"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      layout={false}
    >
      <RepositoryHeader repository={repository} />
      
      <div className="min-h-[60vh]">
        <AnimatePresence mode="wait">
          {view === 'semesters' && (
            <motion.div
              key="semesters"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <RepositorySemesters repository={repository} />
            </motion.div>
          )}

          {view === 'courses' && (
            <motion.div
              key="courses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <RepositoryCourses repository={repository} />
            </motion.div>
          )}

          {view === 'files' && (
            <motion.div
              key="files"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
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
