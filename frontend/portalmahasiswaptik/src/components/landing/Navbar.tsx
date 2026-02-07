import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react'; // GraduationCap dihapus
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo - Modified by Vasya AI (Logo PTIK Asli) */}
          <Link to="/" className="flex items-center gap-2 group">
            {/* Container Logo: Pakai bg-white biar logo jelas */}
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-soft group-hover:shadow-glow transition-shadow duration-300 p-0.5 border border-gray-100">
              <img 
                src="https://ft.unj.ac.id/ptik/wp-content/uploads/2021/07/LOGO-BEMP-PTIK-150x150.png" 
                alt="Logo PTIK" 
                className="w-full h-full object-contain" 
              />
            </div>
            <span className="font-bold text-xl text-foreground">
              PTIK <span className="text-primary">2025</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Beranda
            </Link>
            <Link to="/features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Fitur
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Tentang
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="hidden md:block">
              <Button variant="pill-outline" size="sm">
                Masuk
              </Button>
            </Link>
            <Link to="/login" className="hidden md:block">
              <Button variant="hero" size="sm">
                Daftar
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link 
                to="/" 
                className="text-muted-foreground hover:text-primary transition-colors font-medium py-2"
                onClick={() => setIsOpen(false)}
              >
                Beranda
              </Link>
              <Link 
                to="/features" 
                className="text-muted-foreground hover:text-primary transition-colors font-medium py-2"
                onClick={() => setIsOpen(false)}
              >
                Fitur
              </Link>
              <Link 
                to="/about" 
                className="text-muted-foreground hover:text-primary transition-colors font-medium py-2"
                onClick={() => setIsOpen(false)}
              >
                Tentang
              </Link>
              <div className="flex gap-3 pt-2">
                <Link to="/login" className="flex-1" onClick={() => setIsOpen(false)}>
                  <Button variant="pill-outline" className="w-full">
                    Masuk
                  </Button>
                </Link>
                <Link to="/login" className="flex-1" onClick={() => setIsOpen(false)}>
                  <Button variant="hero" className="w-full">
                    Daftar
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}