import { motion } from 'framer-motion';
import { useIPKSimulator } from '@/SharedLogic/hooks/useIPKSimulator';
import { IPKSimulatorHeader } from '@/components/Features/Akademik/IPKSimulatorHeader';
import { IPKSimulatorTargetCard } from '@/components/Features/Akademik/IPKSimulatorTargetCard';
import { IPKSimulatorList } from '@/components/Features/Akademik/IPKSimulatorList';

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12 }
    }
};

export default function IPKSimulator() {
    const hook = useIPKSimulator();

    return (
        <motion.div
            className="container mx-auto p-4 space-y-6 pb-24 fade-in min-h-screen bg-transparent transition-colors duration-300"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            layout={false}
        >
            <IPKSimulatorHeader hook={hook} />
            <IPKSimulatorTargetCard hook={hook} />
            <IPKSimulatorList hook={hook} />
        </motion.div>
    );
}
