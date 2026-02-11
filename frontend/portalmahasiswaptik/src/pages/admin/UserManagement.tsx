import { useState, useEffect } from 'react';
// ✅ Import createClient
import { createClient } from '@supabase/supabase-js';
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
  whatsapp?: string | null;
  class_id: string | null;
  class_name?: string;
  roles: AppRole[];
}

interface ClassData {
  id: string;
  name: string;
}

const roleLabels: Record<AppRole, string> = {
  admin_dev: 'AdminDev',
  admin_kelas: 'Admin Kelas',
  admin_dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
};

const roleColors: Record<AppRole, string> = {
  admin_dev: 'bg-destructive text-destructive-foreground',
  admin_kelas: 'bg-indigo-500 text-white hover:bg-indigo-600', // Ganti warna biar beda dikit
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

  // ✅ STATE: Untuk fitur Edit
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // State form Create
  const [newUser, setNewUser] = useState({
    nim: '',
    full_name: '',
    whatsapp: '',
    password: '',
    class_id: '',
    role: 'mahasiswa' as AppRole,
  });

  // State form Edit
  const [editUserForm, setEditUserForm] = useState({
    nim: '',
    full_name: '',
    whatsapp: '',
    class_id: '',
    role: 'mahasiswa' as AppRole,
  });

  // 👇👇👇 DATA KONEKSI NINJA 👇👇👇
  const ninjaUrl = "https://owqjsqvpmsctztpgensg.supabase.co";
  const ninjaKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cWpzcXZwbXNjdHp0cGdlbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI0NTkwNCwiZXhwIjoyMDg1ODIxOTA0fQ.S9TInNnZHCsjuuYrpcXB5xpM4Lsr3MIE1YsFPdhq2Hg";

  // Helper function buat bikin client ninja
  const getNinjaClient = () => {
    return createClient(ninjaUrl, ninjaKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // ✅ Menggunakan client ninja untuk bypass RLS pada tabel classes jika perlu
      const tempSupabase = getNinjaClient();
      const { data: classData, error: classError } = await tempSupabase.from('classes').select('*').order('name');
      if (classError) throw classError;
      setClasses(classData || []);

      const { data: profileData, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;

      const { data: rolesData } = await supabase.from('user_roles').select('user_id, role');

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
        whatsapp: (p as any).whatsapp || null,
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

  useEffect(() => {
    fetchData();
  }, []);
  // ✅ CREATE USER
  const handleCreateUser = async () => {
    if (!newUser.nim || !newUser.full_name || !newUser.password) {
      toast.error('Lengkapi semua field yang diperlukan');
      return;
    }

    setIsCreating(true);
    try {
      const tempSupabase = getNinjaClient();
      const email = `${newUser.nim}@ptik.local`;

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email,
        password: newUser.password,
        options: {
          data: { nim: newUser.nim, full_name: newUser.full_name },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Masukin class_id kalau role mahasiswa ATAU admin_kelas
      const classIdToSave = (newUser.role === 'mahasiswa' || newUser.role === 'admin_kelas') ? (newUser.class_id || null) : null;

      const { error: profileError } = await (supabase.from('profiles') as any).upsert({
        user_id: authData.user.id,
        nim: newUser.nim,
        full_name: newUser.full_name,
        whatsapp: newUser.whatsapp || null,
        class_id: classIdToSave,
      });
      if (profileError) throw profileError;

      const { error: roleError } = await supabase.from('user_roles').upsert({
        user_id: authData.user.id,
        role: newUser.role,
      });
      if (roleError) throw roleError;

      toast.success(`Pengguna ${newUser.full_name} berhasil dibuat!`);
      setNewUser({ nim: '', full_name: '', whatsapp: '', password: '', class_id: '', role: 'mahasiswa' });
      fetchData();

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Gagal membuat pengguna');
    } finally {
      setIsCreating(false);
    }
  };

  // ✅ HANDLER BUKA EDIT
  const handleEditClick = (user: UserData) => {
    setEditingUserId(user.user_id);
    setEditUserForm({
      nim: user.nim,
      full_name: user.full_name,
      whatsapp: user.whatsapp || '',
      class_id: user.class_id || '',
      role: user.roles[0] || 'mahasiswa',
    });
    setIsEditDialogOpen(true);
  };

  // ✅ UPDATE USER
  const handleUpdateUser = async () => {
    if (!editingUserId || !editUserForm.nim || !editUserForm.full_name) {
      toast.error('Data tidak boleh kosong');
      return;
    }

    setIsUpdating(true);
    try {
      const tempSupabase = getNinjaClient();

      // Pastikan class_id disimpan jika role adalah admin_kelas
      const classIdToSave = (editUserForm.role === 'mahasiswa' || editUserForm.role === 'admin_kelas')
        ? (editUserForm.class_id || null)
        : null;

      const { error: profileError } = await tempSupabase
        .from('profiles')
        .update({
          nim: editUserForm.nim,
          full_name: editUserForm.full_name,
          whatsapp: editUserForm.whatsapp || null,
          class_id: classIdToSave
        })
        .eq('user_id', editingUserId);

      if (profileError) throw profileError;

      // Update Role (Hapus dulu, baru insert)
      const { error: deleteError } = await tempSupabase
        .from('user_roles')
        .delete()
        .eq('user_id', editingUserId);

      if (deleteError) throw deleteError;

      const { error: roleError } = await tempSupabase
        .from('user_roles')
        .insert({
          user_id: editingUserId,
          role: editUserForm.role
        });

      if (roleError) throw roleError;

      toast.success('Data pengguna berhasil diperbarui!');
      setIsEditDialogOpen(false);
      setEditingUserId(null);
      fetchData();

    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Gagal update data: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ DELETE USER
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Yakin ingin menghapus pengguna ini SECARA PERMANEN?')) return;

    try {
      const tempSupabase = getNinjaClient();
      const { error } = await tempSupabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast.success('Pengguna berhasil dihapus permanen');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Gagal menghapus pengguna: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || user.class_id === selectedClass;
    const matchesRole = selectedRole === 'all' || user.roles.includes(selectedRole as AppRole);
    return matchesSearch && matchesClass && matchesRole;
  });

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
          <p className="text-muted-foreground mt-2">Anda tidak memiliki izin.</p>
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
          <p className="text-muted-foreground mt-1">Kelola akun Admin Kelas, Dosen, dan Mahasiswa</p>
        </div>

        {/* DIALOG CREATE */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" /> Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Buat Pengguna Baru</DialogTitle>
              <DialogDescription>Tambahkan akun baru</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nim">NIM / ID</Label>
                <Input id="nim" placeholder="Contoh: 1512625001" value={newUser.nim} onChange={(e) => setNewUser({ ...newUser, nim: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">Nama Lengkap</Label>
                <Input id="create-name" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Nama Lengkap" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-whatsapp">Nomor WhatsApp</Label>
                <Input
                  id="create-whatsapp"
                  value={newUser.whatsapp}
                  onChange={(e) => setNewUser({ ...newUser, whatsapp: e.target.value })}
                  placeholder="Contoh: 08123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Minimal 6 karakter" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as AppRole })}>
                  <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* ✅ LOGIKA BARU: Munculkan pilihan kelas untuk Mahasiswa DAN Admin Kelas */}
              {(newUser.role === 'mahasiswa' || newUser.role === 'admin_kelas') && (
                <div className="space-y-2">
                  <Label htmlFor="class">Kelas (Wajib untuk Mahasiswa & Admin Kelas)</Label>
                  <Select value={newUser.class_id} onValueChange={(value) => setNewUser({ ...newUser, class_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
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
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Batal</Button>
              <Button onClick={handleCreateUser} disabled={isCreating}>
                {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membuat...</> : 'Buat Pengguna'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG EDIT */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Pengguna</DialogTitle>
              <DialogDescription>Perbarui informasi pengguna ini.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>NIM / ID</Label>
                <Input value={editUserForm.nim} onChange={(e) => setEditUserForm({ ...editUserForm, nim: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={editUserForm.full_name} onChange={(e) => setEditUserForm({ ...editUserForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nomor WhatsApp</Label>
                <Input
                  placeholder="Contoh: 08123456789"
                  value={editUserForm.whatsapp}
                  onChange={(e) => setEditUserForm({ ...editUserForm, whatsapp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editUserForm.role} onValueChange={(value) => setEditUserForm({ ...editUserForm, role: value as AppRole })}>
                  <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* ✅ LOGIKA EDIT: Jika Mahasiswa atau Admin Kelas, BISA EDIT KELAS */}
              {(editUserForm.role === 'mahasiswa' || editUserForm.role === 'admin_kelas') && (
                <div className="space-y-2">
                  <Label>Kelas</Label>
                  <Select value={editUserForm.class_id} onValueChange={(value) => setEditUserForm({ ...editUserForm, class_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
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
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
              <Button onClick={handleUpdateUser} disabled={isUpdating}>
                {isUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}
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
              <Input placeholder="Cari NIM atau nama..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Filter Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {classes.map((cls) => (<SelectItem key={cls.id} value={cls.id}>Kelas {cls.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Filter Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {Object.entries(roleLabels).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="all">Semua ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="admin_dev">Admin Dev</TabsTrigger>
            <TabsTrigger value="admin_kelas">Admin Kelas</TabsTrigger>
            <TabsTrigger value="admin_dosen">Dosen</TabsTrigger>
            <TabsTrigger value="mahasiswa">Mahasiswa</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">Tidak ada pengguna ditemukan</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
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
                          {user.roles.includes('mahasiswa') && user.class_name !== '-' && (
                            <Badge variant="outline">Kelas {user.class_name}</Badge>
                          )}
                          {user.roles.map((role) => (
                            <Badge key={role} className={roleColors[role]}>
                              {role === 'admin_kelas' && user.class_name !== '-'
                                ? `Admin Kelas ${user.class_name}`
                                : roleLabels[role]}
                            </Badge>
                          ))}
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteUser(user.user_id)}>
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

          <TabsContent value="admin_dev">
            <div className="grid gap-4">
              {filteredUsers.filter(u => u.roles.includes('admin_dev')).map(user => (
                <Card key={user.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><Shield className="w-5 h-5 text-destructive" /></div>
                    <div>
                      <p className="font-bold">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.nim}</p>
                    </div>
                  </div>
                  <Badge className={roleColors['admin_dev']}>Admin Dev</Badge>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="admin_kelas">
            <div className="grid gap-6">
              {classes.map(cls => {
                const adminsInClass = filteredUsers.filter(u => u.roles.includes('admin_kelas') && u.class_id === cls.id);
                return (
                  <div key={cls.id} className="space-y-3">
                    <h3 className="font-bold text-lg border-l-4 border-indigo-500 pl-3">Admin Kelas {cls.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {adminsInClass.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Belum ada admin di kelas ini</p>
                      ) : (
                        adminsInClass.map(user => (
                          <Card key={user.id} className="p-4 border-indigo-500/20 bg-indigo-500/5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-600">{user.full_name.charAt(0)}</div>
                                <div>
                                  <p className="font-bold text-sm">{user.full_name}</p>
                                  <p className="text-[10px] text-muted-foreground">{user.nim}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(user)}><Edit className="w-3 h-3" /></Button>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="admin_dosen">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.filter(u => u.roles.includes('admin_dosen')).map(user => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600"><BookOpen className="w-5 h-5" /></div>
                      <div>
                        <p className="font-bold">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.nim}</p>
                      </div>
                    </div>
                    <Badge className={roleColors['admin_dosen']}>Dosen</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mahasiswa">
            <div className="grid gap-8">
              {classes.map((cls) => (
                <div key={cls.id} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="font-black text-xl flex items-center gap-2">
                      Kelas {cls.name}
                      <Badge variant="secondary" className="font-bold">{filteredUsers.filter(u => u.class_id === cls.id && (u.roles.includes('mahasiswa') || u.roles.includes('admin_kelas'))).length} Orang</Badge>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {filteredUsers.filter(u => u.class_id === cls.id && (u.roles.includes('mahasiswa') || u.roles.includes('admin_kelas'))).map((user) => (
                      <Card key={user.id} className="p-3 hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary transition-transform group-hover:scale-110">
                            {user.full_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{user.full_name}</p>
                            <div className="flex items-center gap-1">
                              <p className="text-[10px] text-muted-foreground font-medium">{user.nim}</p>
                              {user.roles.includes('admin_kelas') && <Badge className="h-4 px-1 text-[8px] bg-indigo-500">Admin</Badge>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEditClick(user)}><Edit className="w-3 h-3" /></Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}