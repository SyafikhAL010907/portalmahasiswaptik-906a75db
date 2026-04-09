import { motion } from 'framer-motion';
import { useProfile } from '@/SharedLogic/hooks/useProfile';
import { ProfileHeader } from '@/components/Features/Settings/ProfileHeader';
import { IdentityDetails } from '@/components/Features/Settings/IdentityDetails';
import { ContactForm } from '@/components/Features/Settings/ContactForm';
import { Skeleton } from "@/components/ui/skeleton";

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12 }
    }
};

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export default function Profile() {
    const hook = useProfile();
    const { profile } = hook.state;

    if (!profile) {
        return (
            <div className="space-y-6 animate-in fade-in duration-200">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            layout={false}
            className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200 pt-6"
        >
            <ProfileHeader hook={hook} />

            <motion.div variants={staggerBottom as any} layout={false} className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                <IdentityDetails hook={hook} />
                <ContactForm hook={hook} />
            </motion.div>
        </motion.div>
    );
}
