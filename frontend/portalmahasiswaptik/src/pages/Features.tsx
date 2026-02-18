import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { QrCode, Wallet, BookOpen, Calculator, CreditCard, Megaphone, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Features() {
    const features = [
        {
            icon: QrCode,
            title: "Absensi QR (Real-time)",
            subtitle: "Sistem presensi canggih dengan pemindaian QR Code instan dan rekapitulasi kehadiran otomatis.",
            gradient: "from-blue-600/20 to-indigo-600/5",
            iconClassName: "bg-blue-500/10 text-blue-500"
        },
        {
            icon: Wallet,
            title: "Transparansi Kas (Aggregated)",
            subtitle: "Laporan keuangan transparan yang mencakup iuran mingguan, hibah, dan pengeluaran operasional angkatan.",
            gradient: "from-purple-600/20 to-pink-600/5",
            iconClassName: "bg-purple-500/10 text-purple-500"
        },
        {
            icon: BookOpen,
            title: "Academic Vault (Repository)",
            subtitle: "Akses mudah ke seluruh materi perkuliahan, bank soal, dan referensi akademik yang terorganisir per semester.",
            gradient: "from-emerald-600/20 to-teal-600/5",
            iconClassName: "bg-emerald-500/10 text-emerald-500"
        },
        {
            icon: Calculator,
            title: "Simulasi IPK",
            subtitle: "Prediksi pencapaian akademik Anda dengan kalkulator IPK yang akurat berdasarkan target nilai mata kuliah.",
            gradient: "from-orange-600/20 to-amber-600/5",
            iconClassName: "bg-orange-500/10 text-orange-500"
        },
        {
            icon: CreditCard,
            title: "ID Card Digital",
            subtitle: "Identitas digital eksklusif untuk setiap anggota angkatan PTIK 2025 dengan QR unik.",
            gradient: "from-cyan-600/20 to-sky-600/5",
            iconClassName: "bg-cyan-500/10 text-cyan-500"
        },
        {
            icon: Megaphone,
            title: "Info & Kompetisi",
            subtitle: "Pusat informasi lomba, leaderboard prestasi kelas, dan pengumuman akademik terbaru dalam satu pintu.",
            gradient: "from-rose-600/20 to-pink-600/5",
            iconClassName: "bg-rose-500/10 text-rose-500"
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-foreground transition-colors duration-500 selection:bg-primary/30 relative overflow-hidden">
            {/* Dynamic Background Glows for Dark Mode */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-1000">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
            </div>

            <Navbar />

            {/* UPGRADE: pt-32 md:pt-48 untuk menghindari navbar menutupi judul */}
            <main className="pt-32 md:pt-48 pb-40 px-4 relative z-10">
                <div className="container mx-auto">
                    {/* Header Section dengan Spacing mb-24 md:mb-32 yang jauh lebih lega */}
                    <div className="text-center max-w-4xl mx-auto mb-24 md:mb-32">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8"
                        >
                            <Terminal className="w-4 h-4" />
                            Eksplorasi Portal Kami
                        </motion.div>

                        {/* FIX KETIBAN: mb-12 di mobile, mb-20 di desktop. Leading-normal supaya gradient tidak kepotong */}
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-6xl font-bold mb-12 md:mb-20 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-primary to-purple-500 leading-normal py-2"
                        >
                            Fitur Unggulan
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                        >
                            Dirancang khusus untuk mendukung efisiensi akademik dan transparansi organisasi angkatan PTIK 2025.
                        </motion.p>
                    </div>

                    {/* Grid Section */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12"
                    >
                        {features.map((feature, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <PremiumCard
                                    icon={feature.icon}
                                    title={feature.title}
                                    subtitle={feature.subtitle}
                                    gradient={feature.gradient}
                                    iconClassName={feature.iconClassName}
                                    className="h-full border border-border/50 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-500 shadow-xl shadow-black/5 dark:shadow-none bg-card/50 backdrop-blur-sm rounded-[32px]"
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* EFEK GRADASI BAWAH - DIPERTANDAM UNTUK KONSISTENSI MEWAH */}
                <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-primary/20 via-purple-500/10 to-transparent blur-[120px] -z-10 pointer-events-none" />
            </main>

            <Footer />
        </div>
    );
}