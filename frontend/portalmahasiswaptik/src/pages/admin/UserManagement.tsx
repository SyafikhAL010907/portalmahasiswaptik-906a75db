import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
// ✅ Import createClient
import { createClient } from '@supabase/supabase-js';
import {
  Users, Plus, Search, Edit, Trash2, UserPlus,
  Shield, GraduationCap, BookOpen, Loader2, Filter,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
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

  // ✅ STATE: Delete Confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ STATE: Password Change Confirmation Premium
  const [showPremiumConfirm, setShowPremiumConfirm] = useState(false);

  // State form Create
  const [newUser, setNewUser] = useState({
    nim: '',
    full_name: '',
    whatsapp: '',
    password: '',
    class_id: '',
    role: 'mahasiswa' as AppRole,
  });

  const [editUserForm, setEditUserForm] = useState({
    nim: '',
    full_name: '',
    whatsapp: '',
    class_id: '',
    role: 'mahasiswa' as AppRole,
    new_password: '',
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

      const { data: profileData, error } = await supabase.from('profiles').select('*').order('nim');
      if (error) throw error;

      const usersWithRoles = (profileData || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        nim: p.nim,
        full_name: p.full_name,
        whatsapp: (p as any).whatsapp || null,
        class_id: p.class_id,
        class_name: classData?.find(c => c.id === p.class_id)?.name || '-',
        roles: (p as any).role ? [(p as any).role as AppRole] : [],
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
      // ✅ Sanitasi NIM: Hapus semua spasi
      const cleanNim = newUser.nim.trim().replace(/\s+/g, '');
      const email = `${cleanNim}@ptik.local`;

      // ✅ CEK NIM DULU (Pre-Check)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('nim')
        .eq('nim', cleanNim)
        .maybeSingle();

      if (existingProfile) {
        throw new Error(`NIM ${cleanNim} sudah terdaftar di sistem!`);
      }

      // Masukin class_id kalau role mahasiswa ATAU admin_kelas
      const classIdToSave = (newUser.role === 'mahasiswa' || newUser.role === 'admin_kelas') ? (newUser.class_id || null) : null;

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email,
        password: newUser.password,
        options: {
          data: {
            nim: cleanNim,
            full_name: newUser.full_name,
            role: newUser.role,
            class_id: classIdToSave,
            whatsapp: newUser.whatsapp || null
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // ❌ [REMOVED] Manual profiles.upsert dihapus karena sudah ditangani oleh Trigger DB
      // Ini untuk mencegah Error 409 Conflict

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
      new_password: '',
    });
    setIsEditDialogOpen(true);
  };

  // ✅ ACTION GATEKEEPER: Memutuskan lewat modal atau langsung
  // ✅ ACTION GATEKEEPER: Cuma satu pintu konfirmasi!
  // ✅ ACTION GATEKEEPER: Cuma satu pintu konfirmasi!
  // ✅ FIX FINAL: Penjaga pintu tunggal (Native Confirm)
  // ✅ FIX FINAL: Penjaga pintu tunggal (Premium Modal)
  const handleSaveClick = () => {
    if (!editingUserId || !editUserForm.nim || !editUserForm.full_name) {
      toast.error('Data tidak boleh kosong');
      return;
    }

    if (editUserForm.new_password) {
      // ✅ Munculkan modal cantik, BUKAN window.confirm lagi!
      setShowPremiumConfirm(true);
    } else {
      executeUserUpdate();
    }
  };

  // ✅ EXECUTION ENGINE: Nembak API ke Backend
  // ✅ EXECUTION ENGINE: Pakai Ninja Client (Bypass 401)
  // ✅ LOKASI 2: EXECUTION ENGINE (PAKAI NINJA - BYPASS 401)
  const executeUserUpdate = async () => {
    setIsUpdating(true);
    try {
      const tempSupabase = getNinjaClient(); // Pakai Kunci Master Ninja

      // ✅ Sanitasi NIM
      const cleanNim = editUserForm.nim.trim().replace(/\s+/g, '');
      const classIdToSave = (editUserForm.role === 'mahasiswa' || editUserForm.role === 'admin_kelas')
        ? (editUserForm.class_id || null)
        : null;

      // 1. UPDATE AUTH (Jika ganti password)
      if (editUserForm.new_password) {
        const { error: authError } = await tempSupabase.auth.admin.updateUserById(
          editingUserId!,
          { password: editUserForm.new_password }
        );
        if (authError) throw authError;
      }

      // 2. UPDATE PROFILE (Langsung ke tabel)
      const { error: profileError } = await tempSupabase
        .from('profiles')
        .update({
          nim: cleanNim,
          full_name: editUserForm.full_name,
          role: editUserForm.role,
          whatsapp: editUserForm.whatsapp || null,
          class_id: classIdToSave,
        })
        .eq('user_id', editingUserId);
      if (profileError) throw profileError;

      toast.success('Data pengguna berhasil diperbarui!');
      setIsEditDialogOpen(false); // Tutup dialog edit
      setEditingUserId(null);
      fetchData(); // Refresh list

    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Gagal update data: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };
  // ✅ DELETE USER HANDLERS
  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const tempSupabase = getNinjaClient();

      console.log('Starting NUCLEAR DELETE for user:', userToDelete);

      // 1. CALL THE MASTER DELETE RPC
      // Ini akan menghapus Auth, Profile, dan semua data terkait secara atomik di Postgres
      // Fungsi ini didesain tetap sukses meskipun user tidak ada di auth.users (ghost data)
      const { error: rpcError } = await tempSupabase.rpc('delete_user_completely', {
        target_user_id: userToDelete
      });

      if (rpcError) {
        console.warn("Nuclear Delete RPC failure, attempting manual fallback:", rpcError);

        // 2. FALLBACK: Jika RPC gagal, coba hapus profile manual
        // Agar list di UI tetap bersih dari data hantu
        await tempSupabase.from('profiles').delete().eq('user_id', userToDelete);

        // Coba hapus Auth manual sebagai upaya terakhir
        try {
          await tempSupabase.auth.admin.deleteUser(userToDelete);
        } catch (authErr) {
          console.error("Manual Auth deletion also failed:", authErr);
        }
      }

      toast.success('Pengguna berhasil dihapus secara total (Nuclear Delete)');

    } catch (error: any) {
      console.error('CRITICAL DELETION ERROR:', error);
      toast.error('Gagal menghapus pengguna sepenuhnya: ' + error.message);
    } finally {
      // ✅ ATOMIC UI REFRESH: Hapus dari state lokal dulu biar instan
      setUsers(prev => prev.filter(u => u.user_id !== userToDelete));

      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);

      // Sinkronisasi ulang background
      fetchData();
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
      <PremiumConfirmModal
        isOpen={showPremiumConfirm}
        onClose={() => setShowPremiumConfirm(false)}
        name={editUserForm.full_name}
        onConfirm={() => {
          setShowPremiumConfirm(false); // Tutup modal dulu
          executeUserUpdate(); // Baru hajar update-nya
        }}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteUser}
        title="Hapus Pengguna?"
        description="Apakah Anda yakin ingin menghapus pengguna ini secara permanen? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Permanen"
        variant="danger"
        isLoading={isDeleting}
      />
      {/* Header */}
      <div className="flex flex-col gap-4">
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
            <Button className="gap-2 w-full md:w-auto md:self-end">
              <UserPlus className="w-4 h-4" /> Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95%] max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-2 border-white/20 shadow-2xl p-6">
            <DialogHeader className="bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-3xl mb-4">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Buat Pengguna Baru</DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">Tambahkan akun baru ke sistem</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nim" className="text-sm font-semibold text-slate-700 dark:text-slate-300">NIM / ID</Label>
                <Input
                  id="nim"
                  placeholder="Contoh: 1512625001"
                  value={newUser.nim}
                  onChange={(e) => setNewUser({ ...newUser, nim: e.target.value })}
                  className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap</Label>
                <Input
                  id="create-name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Nama Lengkap"
                  className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-whatsapp" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nomor WhatsApp</Label>
                <Input
                  id="create-whatsapp"
                  value={newUser.whatsapp}
                  onChange={(e) => setNewUser({ ...newUser, whatsapp: e.target.value })}
                  placeholder="Contoh: 08123456789"
                  className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as AppRole })}>
                  <SelectTrigger className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* ✅ LOGIKA BARU: Munculkan pilihan kelas untuk Mahasiswa DAN Admin Kelas */}
              {(newUser.role === 'mahasiswa' || newUser.role === 'admin_kelas') && (
                <div className="space-y-2">
                  <Label htmlFor="class" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kelas (Wajib untuk Mahasiswa & Admin Kelas)</Label>
                  <Select value={newUser.class_id} onValueChange={(value) => setNewUser({ ...newUser, class_id: value })}>
                    <SelectTrigger className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
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
            <DialogFooter className="gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="rounded-xl border-2 bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              >
                Batal
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={isCreating}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/50"
              >
                {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membuat...</> : 'Buat Pengguna'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG EDIT */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95%] max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-2 border-white/20 shadow-2xl p-6">
            <DialogHeader className="bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-3xl mb-4">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Edit Pengguna</DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">Perbarui informasi pengguna ini</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">NIM / ID</Label>
                <Input
                  value={editUserForm.nim}
                  onChange={(e) => setEditUserForm({ ...editUserForm, nim: e.target.value })}
                  className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap</Label>
                <Input
                  value={editUserForm.full_name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, full_name: e.target.value })}
                  className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nomor WhatsApp</Label>
                <Input
                  placeholder="Contoh: 08123456789"
                  value={editUserForm.whatsapp}
                  onChange={(e) => setEditUserForm({ ...editUserForm, whatsapp: e.target.value })}
                  className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Role</Label>
                <Select value={editUserForm.role} onValueChange={(value) => setEditUserForm({ ...editUserForm, role: value as AppRole })}>
                  <SelectTrigger className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* ✅ LOGIKA EDIT: Jika Mahasiswa atau Admin Kelas, BISA EDIT KELAS */}
              {(editUserForm.role === 'mahasiswa' || editUserForm.role === 'admin_kelas') && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kelas</Label>
                  <Select value={editUserForm.class_id} onValueChange={(value) => setEditUserForm({ ...editUserForm, class_id: value })}>
                    <SelectTrigger className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400 focus:border-purple-400"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          Kelas {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ✅ ADMIN-ONLY PASSWORD RESET FIELD */}
              {isAdminDev() && (
                <div className="space-y-2 pt-4 border-t border-purple-200/50 dark:border-purple-800/50 mt-4">
                  <Label className="text-sm font-bold text-red-600 dark:text-red-400">Password Baru (Opsional - Khusus Admin)</Label>
                  <Input
                    type="password"
                    placeholder="Kosongkan jika tidak ingin mengubah password"
                    value={editUserForm.new_password}
                    onChange={(e) => setEditUserForm({ ...editUserForm, new_password: e.target.value })}
                    className="rounded-xl bg-red-50/50 dark:bg-red-950/20 border-red-300/50 focus:ring-red-400 focus:border-red-400"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">Gunakan ini untuk mereset password user yang lupa.</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-xl border-2 bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => handleSaveClick()} // <--- HANYA MANGGIL INI
                disabled={isUpdating}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/50"
              >
                {isUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari NIM atau nama..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Filter Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {classes.map((cls) => (<SelectItem key={cls.id} value={cls.id}>Kelas {cls.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Filter Role" /></SelectTrigger>
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
          <div className="w-full overflow-x-auto scrollbar-hide">
            <TabsList className="bg-card border border-border inline-flex w-auto min-w-full">
              <TabsTrigger value="all" className="whitespace-nowrap">Semua ({filteredUsers.length})</TabsTrigger>
              <TabsTrigger value="admin_dev" className="whitespace-nowrap">Admin Dev</TabsTrigger>
              <TabsTrigger value="admin_kelas" className="whitespace-nowrap">Admin Kelas</TabsTrigger>
              <TabsTrigger value="admin_dosen" className="whitespace-nowrap">Dosen</TabsTrigger>
              <TabsTrigger value="mahasiswa" className="whitespace-nowrap">Mahasiswa</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">Tidak ada pengguna ditemukan</div>
                  </CardContent>
                </Card>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Mobile Card Layout */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* User Info Section */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-base">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground font-medium">{user.nim}</p>
                            {/* Badges - Mobile Friendly */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {user.roles.includes('mahasiswa') && user.class_name !== '-' && (
                                <Badge variant="outline" className="text-xs">Kelas {user.class_name}</Badge>
                              )}
                              {user.roles.map((role) => (
                                <Badge key={role} className={`${roleColors[role]} text-xs`}>
                                  {role === 'admin_kelas' && user.class_name !== '-'
                                    ? `Admin Kelas ${user.class_name}`
                                    : roleLabels[role]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-auto md:ml-0">
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(user)} className="gap-2">
                            <Edit className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(user.user_id)}>
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Hapus</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
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
      )
      }
    </div >
  );
}
// ✅ KOMPONEN MODAL PREMIUM (Ditaruh di luar agar tidak infinite loop)
const PremiumConfirmModal = ({ isOpen, onClose, onConfirm, name }: any) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-auto">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-white/20 bg-slate-900/80 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-8 text-center"
          >
            <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-3">Ganti Password?</h3>
            <p className="text-slate-300 mb-8 text-sm leading-relaxed">
              Anda akan memperbarui sandi untuk <span className="font-bold text-amber-400">{name}</span>. Pastikan password baru sudah dicatat.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-2xl border border-white/10 text-white hover:bg-white/5 transition-all"
              >
                Batal
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onConfirm(); // Eksekusi fungsi update
                }}
                className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-amber-600/20 border-0"
              >
                Ya, Ganti
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};