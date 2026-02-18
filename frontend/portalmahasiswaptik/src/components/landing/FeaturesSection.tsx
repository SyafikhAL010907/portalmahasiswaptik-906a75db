import {
  Calendar,
  BookOpen,
  Calculator,
  QrCode,
  Wallet,
  Trophy,
  Megaphone,
  FileText
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Jadwal Pintar',
    description: 'Lihat jadwal kuliah dengan filter otomatis sesuai kelasmu. Matkul yang sedang berlangsung ditandai dengan glow effect.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: BookOpen,
    title: 'Repository Materi',
    description: 'Akses semua materi kuliah dari semester 1-7 dengan struktur folder yang rapi dan mudah diakses.',
    color: 'bg-success/10 text-success',
  },
  {
    icon: Calculator,
    title: 'Simulator IPK',
    description: 'Rencanakan target nilaimu dan lihat prediksi IPK secara real-time dengan visualisasi yang menarik.',
    color: 'bg-warning/10 text-warning-foreground',
  },
  {
    icon: QrCode,
    title: 'Absensi Digital',
    description: 'Scan QR dengan validasi lokasi GPS. Radius 150m untuk mode offline dan bebas untuk mode online.',
    color: 'bg-destructive/10 text-destructive',
  },
  {
    icon: Wallet,
    title: 'Kas Transparan',
    description: 'Kelola kas angkatan dengan transparansi penuh. Matrix pembayaran mingguan dan laporan detail.',
    color: 'bg-accent text-accent-foreground',
  },
  {
    icon: Trophy,
    title: 'Leaderboard',
    description: 'Kompetisi sehat antar kelas dengan sistem poin dan ranking. Dapatkan badge prestasi!',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Megaphone,
    title: 'Pengumuman',
    description: 'Informasi terbaru langsung di dashboard. Tidak ada lagi yang ketinggalan info penting.',
    color: 'bg-success/10 text-success',
  },
  {
    icon: FileText,
    title: 'Digital ID Card',
    description: 'Kartu identitas digital yang elegan dengan desain eksklusif UNJ. Selalu siap kapan saja.',
    color: 'bg-warning/10 text-warning-foreground',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-transparent">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Semua yang Kamu Butuhkan
          </h2>
          <p className="text-muted-foreground text-lg">
            Fitur lengkap untuk mendukung perjalanan akademikmu di PTIK UNJ
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
