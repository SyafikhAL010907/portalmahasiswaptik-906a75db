import { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Edit, Trash2, UserPlus, 
  Shield, GraduationCap, BookOpen, Loader2, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth, AppRole } from '@/contexts/AuthContext';

interface UserData {
  id: string;
  user_id: string;
  nim: string;
  full_name: string;
  class_id: string | null;
  class_name?: string;
  roles: AppRole[];
}

interface ClassData {
  id: string;
  name: string;
}

const roleLabels: Record<AppRole, string> = {
  admin_dev: 'Super Admin',
  admin_kelas: 'Admin Kelas',
  admin_dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
};

const roleColors: Record<AppRole, string> = {
  admin_dev: 'bg-destructive text-destructive-foreground',
  admin_kelas: 'bg-primary text-primary-foreground',
  admin_dosen: 'bg-warning text-warning-foreground',
  mahasiswa: 'bg-success text-success-foreground',
};

export default function UserManagement() {
  const { isAdminDev } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({
    nim: '',
    full_name: '',
    password: '',
    class_id: '',
    role: 'mahasiswa' as AppRole,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch classes
      const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      setClasses(classData || []);

      // Fetch profiles
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      // Fetch roles separately
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const rolesByUser = (rolesData || []).reduce((acc: Record<string, AppRole[]>, r) => {
        if (!acc[r.user_id]) acc[r.user_id] = [];
        acc[r.user_id].push(r.role as AppRole);
        return acc;
      }, {});

      const usersWithRoles = (profileData || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        nim: p.nim,
        full_name: p.full_name,
        class_id: p.class_id,
        class_name: classData?.find(c => c.id === p.class_id)?.name || '-',
        roles: rolesByUser[p.user_id] || [],
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data pengguna');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.nim || !newUser.full_name || !newUser.password) {
      toast.error('Lengkapi semua field yang diperlukan');
      return;
    }

    setIsCreating(true);
    try {
      // Create auth user
      const email = `${newUser.nim}@ptik.local`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: newUser.password,
        options: {
          data: {
            nim: newUser.nim,
            full_name: newUser.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          nim: newUser.nim,
          full_name: newUser.full_name,
          class_id: newUser.class_id || null,
        });

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: newUser.role,
        });

      if (roleError) throw roleError;

      toast.success('Pengguna berhasil dibuat');
      setIsCreateDialogOpen(false);
      setNewUser({ nim: '', full_name: '', password: '', class_id: '', role: 'mahasiswa' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Gagal membuat pengguna');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Yakin ingin menghapus pengguna ini?')) return;

    try {
      // Note: Deleting from auth.users will cascade to profiles and user_roles
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast.success('Pengguna berhasil dihapus');
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Gagal menghapus pengguna');
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = selectedClass === 'all' || user.class_id === selectedClass;
    const matchesRole = selectedRole === 'all' || user.roles.includes(selectedRole as AppRole);

    return matchesSearch && matchesClass && matchesRole;
  });

  // Group users by class for mahasiswa view
  const usersByClass = classes.map(cls => ({
    ...cls,
    users: filteredUsers.filter(u => u.class_id === cls.id && u.roles.includes('mahasiswa')),
  }));

  if (!isAdminDev()) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Akses Ditolak</h2>
          <p className="text-muted-foreground mt-2">
            Anda tidak memiliki izin untuk mengakses halaman ini
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Manajemen Pengguna
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola akun Admin Kelas, Dosen, dan Mahasiswa
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Buat Pengguna Baru</DialogTitle>
              <DialogDescription>
                Tambahkan akun baru untuk Admin, Dosen, atau Mahasiswa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nim">NIM / ID</Label>
                <Input
                  id="nim"
                  placeholder="Contoh: 1512625001"
                  value={newUser.nim}
                  onChange={(e) => setNewUser({ ...newUser, nim: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap</Label>
                <Input
                  id="full_name"
                  placeholder="Contoh: Ahmad Hidayat"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                    <SelectItem value="admin_kelas">Admin Kelas</SelectItem>
                    <SelectItem value="admin_dosen">Dosen</SelectItem>
                    <SelectItem value="admin_dev">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(newUser.role === 'mahasiswa' || newUser.role === 'admin_kelas') && (
                <div className="space-y-2">
                  <Label htmlFor="class">Kelas</Label>
                  <Select
                    value={newUser.class_id}
                    onValueChange={(value) => setNewUser({ ...newUser, class_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          Kelas {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleCreateUser} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  'Buat Pengguna'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari NIM atau nama..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    Kelas {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="admin_dev">Super Admin</SelectItem>
                <SelectItem value="admin_kelas">Admin Kelas</SelectItem>
                <SelectItem value="admin_dosen">Dosen</SelectItem>
                <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Semua ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="by-class">Per Kelas</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      Tidak ada pengguna ditemukan
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.nim}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {user.class_name !== '-' && (
                            <Badge variant="outline">Kelas {user.class_name}</Badge>
                          )}
                          {user.roles.map((role) => (
                            <Badge key={role} className={roleColors[role]}>
                              {roleLabels[role]}
                            </Badge>
                          ))}
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteUser(user.user_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-class">
            <div className="grid gap-4">
              {usersByClass.map((cls) => (
                <Card key={cls.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      Kelas {cls.name}
                      <Badge variant="secondary">{cls.users.length} Mahasiswa</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cls.users.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Belum ada mahasiswa di kelas ini
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {cls.users.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {user.full_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground">{user.nim}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
