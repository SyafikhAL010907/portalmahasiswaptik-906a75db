import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SplashScreenProps {
    finishLoading: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setIsMounted(true), 10);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <motion.div
            className="fixed inset-0 flex items-center justify-center z-[9999] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
        >
            {/* Background with Adaptive Gradients */}
            <div className="absolute inset-0 w-full h-full">
                {/* Light Mode Mesh Gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,_#E0F2FE_0,_transparent_50%),_radial-gradient(at_50%_0%,_#F3E8FF_0,_transparent_50%),_radial-gradient(at_100%_0%,_#D1FAE5_0,_transparent_50%),_radial-gradient(at_0%_100%,_#F3E8FF_0,_transparent_50%),_radial-gradient(at_100%_100%,_#E0F2FE_0,_transparent_50%)] bg-white mix-blend-multiply transition-opacity duration-1000 dark:opacity-0 animate-mesh-move bg-[length:400%_400%]" />

                {/* Dark Mode Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a103c] via-[#0f172a] to-[#020617] opacity-0 transition-opacity duration-1000 dark:opacity-100">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(139,92,246,0.1),_transparent_70%)] animate-pulse-slow" />
                </div>
            </div>

            {/* Glassmorphism Container */}
            <motion.div
                className="relative z-10 flex flex-col items-center gap-8 p-12 rounded-3xl backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 shadow-2xl"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <div className="flex items-center gap-8">
                    {/* Logo UNJ */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.3,
                        }}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-white/80 p-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    >
                        <img
                            src="/Logo UNJ.jpg"
                            alt="Logo UNJ"
                            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                        />
                    </motion.div>

                    {/* Logo BEMP */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.6,
                        }}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-white/80 p-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                    >
                        <img
                            src="/pwa-icon.png"
                            alt="Logo BEMP"
                            className="w-full h-full object-contain drop-shadow-md"
                        />
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.8 }}
                    className="text-center"
                >
                    <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 dark:from-purple-400 dark:to-blue-400 font-poppins">
                        Portal Mahasiswa
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2 font-medium tracking-wide">
                        Pendidikan Teknik Informatika dan Komputer
                    </p>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default SplashScreen;
