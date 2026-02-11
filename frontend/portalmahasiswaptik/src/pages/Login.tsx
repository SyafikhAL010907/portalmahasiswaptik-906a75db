import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ArrowLeft, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [classes, setClasses] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase.from('classes').select('id, name').order('name');
      if (!error && data) {
        setClasses(data);
      }
    };
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nim || !password) {
      toast.error('Masukkan NIM dan password');
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(nim, password);

    if (error) {
      toast.error(error);
      setIsLoading(false);
    } else {
      toast.success('Berhasil masuk!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-20 w-96 h-96 bg-success/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Top Bar */}
      <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-20">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
        </Link>
        <ThemeToggle />
      </div>

      {/* Login Card */}
      <div className="glass-card rounded-3xl p-8 md:p-10 w-full max-w-md animate-scale-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl primary-gradient flex items-center justify-center mx-auto mb-4 shadow-glow">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Selamat Datang!</h1>
          <p className="text-muted-foreground mt-1">Masuk ke portal PTIK 2025</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nim" className="text-foreground">NIM / ID</Label>
            <Input
              id="nim"
              type="text"
              placeholder="Masukkan NIM atau ID"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary pr-12"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
              <span className="text-sm text-muted-foreground">Ingat saya</span>
            </label>
          </div>

          <Button type="submit" variant="hero" className="w-full h-12" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Butuh Bantuan?</span>
          </div>
        </div>

        {/* WhatsApp Support Link */}
        <a
          href="https://wa.me/628568025957"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
        >
          <Button variant="outline" className="w-full h-12 gap-2">
            <MessageCircle className="w-5 h-5 text-cyan-500" />
            Hubungi Admin via WhatsApp
          </Button>
        </a>

        {/* Class Selector Info */}
        <div className="bg-muted/50 rounded-xl p-4 text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Kelas akan terdeteksi otomatis berdasarkan NIM yang terdaftar
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {classes.length > 0 ? (
              classes.map((c, idx) => (
                <span key={c.id} className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border",
                  idx % 4 === 0 ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                    idx % 4 === 1 ? "bg-violet-500/10 text-violet-600 border-violet-500/20" :
                      idx % 4 === 2 ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                        "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
                )}>
                  Kelas {c.name}
                </span>
              ))
            ) : (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium animate-pulse">Memuat kelas...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
