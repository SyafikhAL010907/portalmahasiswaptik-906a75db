import { Link } from 'react-router-dom';
import { GraduationCap, Instagram, Github, Mail, Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-transparent border-t border-white/5 transition-colors duration-500">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-foreground">
                PTIK <span className="text-primary font-black">2025</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
              Portal resmi angkatan PTIK 2025 Universitas Negeri Jakarta.
              Memudahkan koordinasi akademik dan non-akademik dalam satu platform terintegrasi.
              <br />
              <span className="font-bold text-primary mt-2 inline-block">#SolidaritasDalamKode</span>
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Menu Cepat</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Fitur Unggulan
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Masuk Portal
                </Link>
              </li>
              <li>
                <Link to="/dashboard/finance" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Kas Angkatan
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Ikuti Kami</h3>
            <div className="flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="mailto:ptik2025@unj.ac.id"
                className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            Made with <Terminal className="w-4 h-4 text-primary animate-pulse" /> by PTIK 2025
          </p>
          <div className="flex items-center gap-6">
            <p className="text-muted-foreground text-sm">
              © 2025 PTIK UNJ. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
