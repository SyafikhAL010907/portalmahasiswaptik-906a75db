import { motion } from 'framer-motion';

const staggerTop = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any as any } }
};

export function ChangePasswordHeader() {
    return (
        <motion.div variants={staggerTop} layout={false} className="flex flex-col gap-2">
            <h1 className="text-3xl font-black text-foreground">Keamanan Akun</h1>
            <p className="text-muted-foreground">Kelola kata sandi Anda untuk memastikan keamanan akses portal.</p>
        </motion.div>
    );
}
