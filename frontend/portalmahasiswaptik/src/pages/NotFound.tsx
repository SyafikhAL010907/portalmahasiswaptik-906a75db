import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Compass, Info } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors duration-500 p-4 overflow-hidden relative">
      {/* Background Glows for Dark Mode */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-1000">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center z-10 max-w-lg"
      >
        <h1 className="mb-2 text-8xl font-black bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/20">404</h1>
        <h2 className="mb-6 text-3xl font-bold">Sabar Brok Belum Di Muat</h2>
        <p className="mb-10 text-muted-foreground text-lg">
          Oops! Halaman yang Anda cari tidak ditemukan atau masih dalam tahap pengembangan.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/">
            <Button variant="hero" className="gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Button>
          </Link>
          <Link to="/features">
            <Button variant="outline" className="gap-2 w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10">
              <Compass className="w-4 h-4" />
              Cek Fitur
            </Button>
          </Link>
          <Link to="/about">
            <Button variant="ghost" className="gap-2 w-full sm:w-auto text-slate-400 hover:text-white">
              <Info className="w-4 h-4" />
              Tentang Kami
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
