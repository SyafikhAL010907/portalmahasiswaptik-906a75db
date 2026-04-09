import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserManagement } from '@/SharedLogic/hooks/useUserManagement';

interface UserFiltersProps {
  um: ReturnType<typeof useUserManagement>;
}

const staggerTop = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

const roleLabels: any = {
  admin_dev: 'AdminDev',
  admin_kelas: 'Admin Kelas',
  admin_dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
};

export function UserFilters({ um }: UserFiltersProps) {
  const { state, actions } = um;

  return (
    <motion.div variants={staggerTop} layout={false}>
      <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Cari NIM atau nama..." 
                className="pl-10 rounded-xl bg-background/50 border-border/50 focus:ring-primary/20" 
                value={state.searchQuery} 
                onChange={(e) => actions.setSearchQuery(e.target.value)} 
              />
            </div>
            
            <Select value={state.selectedClass} onValueChange={actions.setSelectedClass}>
              <SelectTrigger className="w-full rounded-xl bg-background/50 border-border/50 h-9 sm:h-10">
                <SelectValue placeholder="Filter Kelas" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Semua Kelas</SelectItem>
                {state.classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>Kelas {cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
 
            <Select value={state.selectedRole} onValueChange={actions.setSelectedRole}>
              <SelectTrigger className="w-full rounded-xl bg-background/50 border-border/50 h-9 sm:h-10">
                <SelectValue placeholder="Filter Role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Semua Role</SelectItem>
                {Object.entries(roleLabels).map(([key, label]: [any, any]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
