 import { useState } from 'react';
 import { Award, Calendar, Users, MapPin, ExternalLink, Clock, Trophy, Sparkles } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 
 const competitions = [
   {
     id: 1,
     title: 'Hackathon Nasional 2025',
     organizer: 'Kemenkominfo RI',
     description: 'Kompetisi inovasi teknologi tingkat nasional dengan tema "Digital Transformation for Indonesia".',
     deadline: '30 Jan 2025',
     eventDate: '15-17 Feb 2025',
     location: 'Jakarta Convention Center',
     prize: 'Rp 50.000.000',
     category: 'Hackathon',
     isHot: true,
     teamSize: '3-5 orang',
     link: '#'
   },
   {
     id: 2,
     title: 'UI/UX Design Competition',
     organizer: 'Google Developer Student Club',
     description: 'Kompetisi desain aplikasi mobile dengan fokus pada aksesibilitas dan user experience.',
     deadline: '25 Jan 2025',
     eventDate: '10 Feb 2025',
     location: 'Online',
     prize: 'Rp 15.000.000',
     category: 'Design',
     isHot: true,
     teamSize: '1-2 orang',
     link: '#'
   },
   {
     id: 3,
     title: 'Data Science Challenge',
     organizer: 'Tokopedia',
     description: 'Analisis data e-commerce untuk menemukan insight bisnis dan prediksi tren pasar.',
     deadline: '05 Feb 2025',
     eventDate: '20 Feb 2025',
     location: 'Tokopedia Tower, Jakarta',
     prize: 'Rp 30.000.000',
     category: 'Data Science',
     isHot: false,
     teamSize: '2-4 orang',
     link: '#'
   },
   {
     id: 4,
     title: 'Competitive Programming Contest',
     organizer: 'ICPC Indonesia',
     description: 'Lomba pemrograman kompetitif tingkat regional untuk persiapan ICPC World Finals.',
     deadline: '01 Feb 2025',
     eventDate: '25 Feb 2025',
     location: 'Universitas Indonesia',
     prize: 'Rp 25.000.000',
     category: 'Programming',
     isHot: false,
     teamSize: '3 orang',
     link: '#'
   },
   {
     id: 5,
     title: 'Startup Pitch Competition',
     organizer: 'Bekraf & UNJ',
     description: 'Kompetisi pitching ide startup teknologi untuk mahasiswa se-Indonesia.',
     deadline: '10 Feb 2025',
     eventDate: '01 Mar 2025',
     location: 'Gedung Rektorat UNJ',
     prize: 'Rp 20.000.000 + Inkubasi',
     category: 'Startup',
     isHot: false,
     teamSize: '2-5 orang',
     link: '#'
   },
   {
     id: 6,
     title: 'Cyber Security CTF',
     organizer: 'BSSN',
     description: 'Capture The Flag competition untuk menguji kemampuan keamanan siber.',
     deadline: '15 Feb 2025',
     eventDate: '05 Mar 2025',
     location: 'Online',
     prize: 'Rp 35.000.000',
     category: 'Security',
     isHot: false,
     teamSize: '3-4 orang',
     link: '#'
   },
 ];
 
 const categories = ['Semua', 'Hackathon', 'Design', 'Data Science', 'Programming', 'Startup', 'Security'];
 
 export default function Competitions() {
   const [selectedCategory, setSelectedCategory] = useState('Semua');
 
   const filteredCompetitions = selectedCategory === 'Semua'
     ? competitions
     : competitions.filter(c => c.category === selectedCategory);
 
   const getCategoryColor = (category: string) => {
     const colors: Record<string, string> = {
       'Hackathon': 'bg-primary/10 text-primary',
       'Design': 'bg-success/10 text-success',
       'Data Science': 'bg-warning/10 text-warning-foreground',
       'Programming': 'bg-destructive/10 text-destructive',
       'Startup': 'bg-accent text-accent-foreground',
       'Security': 'bg-muted text-muted-foreground',
     };
     return colors[category] || 'bg-muted text-muted-foreground';
   };
 
   return (
     <div className="space-y-6 pt-12 md:pt-0">
       {/* Header */}
       <div>
         <h1 className="text-2xl md:text-3xl font-bold text-foreground">Info Lomba</h1>
         <p className="text-muted-foreground mt-1">Kompetisi dan lomba untuk mahasiswa PTIK</p>
       </div>
 
       {/* Category Filter */}
       <div className="flex gap-2 flex-wrap">
         {categories.map((cat) => (
           <Button
             key={cat}
             variant={selectedCategory === cat ? 'default' : 'ghost'}
             size="sm"
             onClick={() => setSelectedCategory(cat)}
             className={selectedCategory === cat ? 'primary-gradient' : ''}
           >
             {cat}
           </Button>
         ))}
       </div>
 
       {/* Competition Cards */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         {filteredCompetitions.map((comp) => (
           <div
             key={comp.id}
             className={cn(
               "glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-glow relative overflow-hidden",
               comp.isHot && "border-2 border-primary/30"
             )}
           >
             {comp.isHot && (
               <div className="absolute top-4 right-4">
                 <span className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                   <Sparkles className="w-3 h-3" />
                   Hot
                 </span>
               </div>
             )}
 
             <div className="flex items-start gap-4">
               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-success/20 flex items-center justify-center flex-shrink-0">
                 <Trophy className="w-7 h-7 text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 flex-wrap mb-1">
                   <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", getCategoryColor(comp.category))}>
                     {comp.category}
                   </span>
                 </div>
                 <h3 className="font-bold text-lg text-foreground">{comp.title}</h3>
                 <p className="text-sm text-muted-foreground">{comp.organizer}</p>
               </div>
             </div>
 
             <p className="mt-4 text-sm text-foreground/80 line-clamp-2">{comp.description}</p>
 
             <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
               <div className="flex items-center gap-2 text-muted-foreground">
                 <Clock className="w-4 h-4 text-destructive" />
                 <span>Deadline: {comp.deadline}</span>
               </div>
               <div className="flex items-center gap-2 text-muted-foreground">
                 <Calendar className="w-4 h-4 text-primary" />
                 <span>{comp.eventDate}</span>
               </div>
               <div className="flex items-center gap-2 text-muted-foreground">
                 <MapPin className="w-4 h-4 text-success" />
                 <span className="truncate">{comp.location}</span>
               </div>
               <div className="flex items-center gap-2 text-muted-foreground">
                 <Users className="w-4 h-4 text-warning-foreground" />
                 <span>{comp.teamSize}</span>
               </div>
             </div>
 
             <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
               <div>
                 <span className="text-xs text-muted-foreground">Hadiah</span>
                 <p className="font-bold text-success">{comp.prize}</p>
               </div>
               <Button variant="pill" size="sm" asChild>
                 <a href={comp.link} target="_blank" rel="noopener noreferrer">
                   <ExternalLink className="w-4 h-4 mr-2" />
                   Daftar
                 </a>
               </Button>
             </div>
           </div>
         ))}
       </div>
     </div>
   );
 }