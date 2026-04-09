import { motion, Variants } from 'framer-motion';
import { useUserManagement } from '@/SharedLogic/hooks/useUserManagement';
import { UserHeader } from '@/components/Features/Admin/AdminManagement/UserHeader';
import { UserFilters } from '@/components/Features/Admin/AdminManagement/UserFilters';
import { UserTabs } from '@/components/Features/Admin/AdminManagement/UserTabs';
import { UserModals } from '@/components/Features/Admin/AdminManagement/UserModals';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};

export default function AdminManagement() {
  const um = useUserManagement();

  return (
    <motion.div
      className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-12 md:pt-0 pb-10 overflow-x-hidden"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      layout={false}
    >
      <UserHeader um={um} />
      <UserFilters um={um} />
      <UserTabs um={um} />
      <UserModals um={um} />
    </motion.div>
  );
}
