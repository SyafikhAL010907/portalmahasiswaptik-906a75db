import { motion } from 'framer-motion';
import { ChangePasswordForm } from '@/components/Features/Settings/ChangePasswordForm';

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12 }
    }
};

const staggerTop = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export default function ChangePassword() {
    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            layout={false}
            className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-200 p-4 pt-12"
        >
            <motion.div variants={staggerTop as any} layout={false} className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-foreground">Keamanan Akun</h1>
                <p className="text-muted-foreground text-sm">Kelola kata sandi Anda untuk memastikan keamanan akses portal.</p>
            </motion.div>

            <motion.div variants={staggerBottom as any} layout={false}>
                <ChangePasswordForm />
            </motion.div>

            <motion.div variants={staggerBottom as any} layout={false} className="p-4 bg-muted/30 rounded-2xl border border-dashed border-border/50">
                <p className="text-[10px] text-muted-foreground italic text-center leading-relaxed">
                    * Anda akan tetap masuk setelah password diganti. Namun, disarankan untuk login ulang di perangkat lain.
                </p>
            </motion.div>
        </motion.div>
    );
}
