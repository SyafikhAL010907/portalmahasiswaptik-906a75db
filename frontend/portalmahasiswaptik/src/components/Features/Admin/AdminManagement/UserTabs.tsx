import { motion } from 'framer-motion';
import { Loader2, GraduationCap, Edit, Trash2, Shield, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserManagement, UserData } from '@/SharedLogic/hooks/useUserManagement';
import { AppRole } from '@/contexts/AuthContext';

interface UserTabsProps {
  um: ReturnType<typeof useUserManagement>;
}

const roleLabels: Record<AppRole, string> = {
  admin_dev: 'AdminDev',
  admin_kelas: 'Admin Kelas',
  admin_dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
};

const roleColors: Record<AppRole, string> = {
  admin_dev: 'bg-destructive text-destructive-foreground',
  admin_kelas: 'bg-indigo-500 text-white hover:bg-indigo-600',
  admin_dosen: 'bg-warning text-warning-foreground',
  mahasiswa: 'bg-success text-success-foreground',
};

const staggerBottom = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export function UserTabs({ um }: UserTabsProps) {
  const { state, actions } = um;
  const { filteredUsers, classes, isLoading } = state;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerBottom} layout={false}>
      <Tabs defaultValue="all" className="space-y-4">
        <div className="w-full overflow-x-auto scrollbar-hide">
          <TabsList className="bg-card/50 border border-border inline-flex w-auto min-w-full backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger value="all" className="whitespace-nowrap px-4 py-2 rounded-lg">Semua ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="admin_dev" className="whitespace-nowrap px-4 py-2 rounded-lg">Admin Dev</TabsTrigger>
            <TabsTrigger value="admin_kelas" className="whitespace-nowrap px-4 py-2 rounded-lg">Admin Kelas</TabsTrigger>
            <TabsTrigger value="admin_dosen" className="whitespace-nowrap px-4 py-2 rounded-lg">Dosen</TabsTrigger>
            <TabsTrigger value="mahasiswa" className="whitespace-nowrap px-4 py-2 rounded-lg">Mahasiswa</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-3">
          {filteredUsers.length === 0 ? (
            <Card className="border-dashed h-40 flex items-center justify-center">
              <div className="text-muted-foreground italic">Tidak ada pengguna ditemukan</div>
            </Card>
          ) : (
            filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} um={um} />
            ))
          )}
        </TabsContent>

        <TabsContent value="admin_dev" className="grid gap-4">
          {filteredUsers.filter(u => u.roles.includes('admin_dev')).map(user => (
            <UserCard key={user.id} user={user} um={um} showsRoleBadge />
          ))}
        </TabsContent>

        <TabsContent value="admin_kelas" className="grid gap-6">
          {classes.map(cls => {
            const adminsInClass = filteredUsers.filter(u => u.roles.includes('admin_kelas') && u.class_id === cls.id);
            if (adminsInClass.length === 0) return null;
            return (
              <div key={cls.id} className="space-y-3">
                <h3 className="font-bold text-lg border-l-4 border-indigo-500 pl-3">Admin Kelas {cls.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {adminsInClass.map(user => (
                    <UserCardSmall key={user.id} user={user} um={um} icon={Shield} colorClass="bg-indigo-500/10 text-indigo-600" />
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="admin_dosen" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.filter(u => u.roles.includes('admin_dosen')).map(user => (
            <UserCardSmall key={user.id} user={user} um={um} icon={BookOpen} colorClass="bg-amber-500/10 text-amber-600" />
          ))}
        </TabsContent>

        <TabsContent value="mahasiswa" className="grid gap-8">
          {classes.map((cls) => {
            const studentsInClass = filteredUsers.filter(u => u.class_id === cls.id && (u.roles.includes('mahasiswa') || u.roles.includes('admin_kelas')));
            if (studentsInClass.length === 0) return null;
            return (
              <div key={cls.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h3 className="font-black text-xl flex items-center gap-2">
                    Kelas {cls.name}
                    <Badge variant="secondary" className="font-bold bg-primary/10 text-primary border-none">
                      {studentsInClass.length} Orang
                    </Badge>
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {studentsInClass.map((user) => (
                    <UserCardMicro key={user.id} user={user} um={um} />
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function UserCard({ user, um, showsRoleBadge = true }: { user: UserData, um: ReturnType<typeof useUserManagement>, showsRoleBadge?: boolean }) {
  return (
    <Card className="hover:shadow-md transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm group overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate">{user.full_name}</p>
              <p className="text-sm text-muted-foreground font-semibold font-mono">{user.nim}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {user.roles.includes('mahasiswa') && user.class_name !== '-' && (
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider h-5 bg-background/50">Kelas {user.class_name}</Badge>
                )}
                {showsRoleBadge && user.roles.map((role) => (
                  <Badge key={role} className={`${roleColors[role]} text-[10px] font-bold uppercase tracking-wider h-5 border-none`}>
                    {role === 'admin_kelas' && user.class_name !== '-'
                      ? `Admin Kelas ${user.class_name}`
                      : roleLabels[role]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-border/30">
            <Button variant="outline" size="sm" onClick={() => um.actions.openEditDialog(user)} className="gap-2 h-9 rounded-xl border-border/50 hover:bg-primary/5 transition-colors">
              <Edit className="w-4 h-4 text-blue-500" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/50 hover:bg-destructive/5 text-destructive" onClick={() => um.actions.openDeleteModal(user.user_id)}>
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Hapus</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserCardSmall({ user, um, icon: Icon, colorClass }: any) {
  return (
    <Card className="p-4 border-border/50 bg-card/30 backdrop-blur-sm hover:shadow-md transition-all group rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center font-bold group-hover:scale-110 transition-transform`}>
            {Icon ? <Icon className="w-5 h-5" /> : user.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-sm truncate max-w-[120px]">{user.full_name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{user.nim}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5" onClick={() => um.actions.openEditDialog(user)}>
          <Edit className="w-4 h-4 text-blue-500" />
        </Button>
      </div>
    </Card>
  );
}

function UserCardMicro({ user, um }: { user: UserData, um: ReturnType<typeof useUserManagement> }) {
  return (
    <Card className="p-3 hover:shadow-md transition-all duration-300 border-border/50 bg-card/30 backdrop-blur-sm group rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary group-hover:rotate-6 transition-transform">
          {user.full_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{user.full_name}</p>
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-muted-foreground font-semibold font-mono uppercase">{user.nim}</p>
            {user.roles.includes('admin_kelas') && <Badge className="h-4 px-1 text-[8px] bg-indigo-500 border-none font-bold">ADMIN</Badge>}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => um.actions.openEditDialog(user)}>
          <Edit className="w-3.5 h-3.5 text-blue-500" />
        </Button>
      </div>
    </Card>
  );
}
