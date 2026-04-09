import { motion } from 'framer-motion';
import { Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSchedule } from '@/SharedLogic/hooks/useSchedule';

const staggerTop = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface ScheduleHeaderProps {
  schedule: ReturnType<typeof useSchedule>;
}

export function ScheduleHeader({ schedule }: ScheduleHeaderProps) {
  const { selectedClass, classList, canManage } = schedule.state;
  const { setSelectedClass, handleOpenAdd } = schedule.actions;

  return (
    <motion.div variants={staggerTop as any} layout={false} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Jadwal Kuliah</h1>
        <p className="text-muted-foreground mt-1">
          {selectedClass ? `Kelas ${classList.find(c => c.id === selectedClass)?.name}` : 'Pilih Kelas'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedClass || ''} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[140px] glass-card">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Pilih Kelas" />
          </SelectTrigger>
          <SelectContent>
            {classList.map(c => (
              <SelectItem key={c.id} value={c.id}>Kelas {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage && (
          <Button onClick={handleOpenAdd} className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Tambah
          </Button>
        )}
      </div>
    </motion.div>
  );
}
