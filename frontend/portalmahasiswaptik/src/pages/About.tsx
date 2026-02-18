import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { motion } from 'framer-motion';
import { Shield, Users, MapPin, Terminal, Cpu } from 'lucide-react';

export default function About() {
    return (
        <div className="min-h-screen bg-slate-950 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-foreground transition-colors duration-500 selection:bg-primary/30 relative overflow-hidden">
            {/* Background Glows for Dark Mode */}
            <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-1000">
                <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>
            </div>

            <Navbar />

            {/* UPGRADE: pt-40 md:pt-48 supaya judul bener-bener punya ruang dari navbar */}
            <main className="pt-32 md:pt-48 pb-40 px-4 relative z-10">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

                        {/* Left Column: Visual/Logo */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative group order-1 lg:order-none"
                        >
                            <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-[40px] blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-60"></div>
                            <div className="relative glass-card rounded-[40px] p-8 md:p-12 border border-border/50 dark:border-white/10 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-600/5 dark:from-primary/10 dark:to-purple-500/10 animate-pulse"></div>
                                <img
                                    src="https://ft.unj.ac.id/ptik/wp-content/uploads/2021/07/LOGO-BEMP-PTIK-150x150.png"
                                    alt="Logo PTIK"
                                    className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10 drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                                />
                            </div>

                            {/* Floating Badge - Disesuaikan supaya tidak menempel garis logo */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                                className="absolute -bottom-8 -right-2 md:-right-6 glass-card px-5 py-3 md:px-6 md:py-4 rounded-2xl border border-border dark:border-white/20 shadow-xl z-20"
                            >
                                <div className="flex items-center gap-3">
                                    <Terminal className="w-5 h-5 text-primary" />
                                    <span className="font-bold text-sm md:text-base">Solidaritas Dalam Kode</span>
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Right Column: Content */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="order-2 lg:order-none"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-medium mb-6">
                                <Cpu className="w-4 h-4" />
                                PTIK UNJ PRIDE
                            </div>

                            {/* FIX JARAK: mb-12 di mobile, mb-20 di desktop. Leading-normal supaya gradient gak kepotong */}
                            <h1 className="text-4xl md:text-6xl font-bold mb-12 md:mb-20 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-primary to-purple-500 leading-normal py-2">
                                Tentang Angkatan 2025
                            </h1>

                            <div className="space-y-12">
                                {/* Deskripsi dengan margin bottom ekstra */}
                                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-prose mb-12">
                                    Kami adalah angkatan Pendidikan Teknik Informatika dan Komputer (PTIK) 2025 Universitas Negeri Jakarta.
                                    Sebuah komunitas akademik yang dinamis dan inovatif, bertekad untuk menjadi pelopor dalam pengembangan teknologi pendidikan di Indonesia.
                                </p>

                                {/* List Info dengan Gap yang lebih lega */}
                                <div className="grid gap-8">
                                    <div className="flex gap-5 group">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-lg shadow-blue-500/5">
                                            <Users className="w-6 h-6 text-blue-600 dark:text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl mb-1.5">Populasi Solid</h3>
                                            <p className="text-sm md:text-base text-muted-foreground">Terdiri dari 75+ Mahasiswa berdedikasi dari 4 Kelas (A, B, C, D) yang solid.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-5 group">
                                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-lg shadow-purple-500/5">
                                            <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl mb-1.5">Markas Akademik</h3>
                                            <p className="text-sm md:text-base text-muted-foreground">Beroperasi secara aktif antara Gedung L dan Gedung Dewi Sartika, Kampus UNJ.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-5 group">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-lg shadow-emerald-500/5">
                                            <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl mb-1.5">Visi Utama</h3>
                                            <p className="text-sm md:text-base text-muted-foreground">Mewujudkan angkatan yang inklusif, kolaboratif, dan unggul dalam penguasaan kompetensi digital.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Branding Footer */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="mt-16 md:mt-24 p-8 rounded-[32px] bg-gradient-to-br from-primary/10 via-transparent to-purple-500/5 border border-border dark:border-white/5 relative overflow-hidden"
                            >
                                <div className="absolute -top-4 -right-4 p-4 opacity-5 dark:opacity-10 rotate-12">
                                    <Terminal className="w-32 h-32" />
                                </div>
                                <h4 className="font-black italic text-xl md:text-2xl mb-3 text-foreground tracking-tight">#SolidaritasDalamKode</h4>
                                <p className="text-muted-foreground text-sm md:text-base italic leading-relaxed">
                                    "Bukan hanya tentang satu baris kode, tapi tentang bagaimana kita membangun masa depan bersama."
                                </p>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>

                {/* EFEK GRADASI BAWAH - DIPERTANDAM UNTUK KONSISTENSI */}
                <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-primary/20 via-purple-500/10 to-transparent blur-[120px] -z-10 pointer-events-none" />
            </main>

            <Footer />
        </div>
    );
}