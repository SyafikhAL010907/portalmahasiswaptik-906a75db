import { GraduationCap, QrCode } from 'lucide-react';

interface DigitalIDCardProps {
  name: string;
  nim: string;
  className: string;
  photoUrl?: string;
}

export function DigitalIDCard({ name, nim, className, photoUrl }: DigitalIDCardProps) {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Card Background */}
      <div className="glass-card rounded-3xl overflow-hidden">
        {/* Top Pattern */}
        <div className="h-24 primary-gradient relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {/* Abstract pattern */}
            <div className="absolute top-4 left-4 w-16 h-16 border-2 border-white/30 rounded-full" />
            <div className="absolute top-8 right-8 w-24 h-24 border-2 border-white/20 rounded-full" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 border-2 border-white/10 rounded-full" />
          </div>
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-white/80" />
            <span className="text-white/80 font-medium text-sm">PTIK 2025</span>
          </div>
          <div className="absolute top-4 right-4">
            <span className="text-white/60 text-xs">Universitas Negeri Jakarta</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-14 relative">
          {/* Photo */}
          <div className="absolute -top-10 left-6 w-20 h-20 rounded-2xl bg-muted border-4 border-card overflow-hidden shadow-lg">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <span className="text-2xl font-bold text-primary">
                  {name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="absolute -top-6 right-6 w-16 h-16 bg-white rounded-xl p-2 shadow-lg">
            <div className="w-full h-full bg-foreground/5 rounded flex items-center justify-center">
              <QrCode className="w-8 h-8 text-foreground/60" />
            </div>
          </div>

          {/* Info */}
          <div className="mt-4">
            <h3 className="text-xl font-bold text-foreground">{name}</h3>
            <p className="text-muted-foreground text-sm mt-1">{nim}</p>
            <div className="mt-4 inline-flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {className}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
                Aktif
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
