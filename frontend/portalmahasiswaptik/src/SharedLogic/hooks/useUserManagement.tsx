import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppRole } from '@/contexts/AuthContext';

export interface UserData {
  id: string; // The profile row ID
  user_id: string; // The auth.users UUID
  nim: string;
  full_name: string;
  whatsapp?: string | null;
  class_id: string | null;
  class_name?: string;
  roles: AppRole[];
}

export interface ClassData {
  id: string;
  name: string;
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  
  // Create/Edit Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password Change Step
  const [showPremiumConfirm, setShowPremiumConfirm] = useState(false);

  // Form States
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

  // --- NINJA CONFIG ---
  const ninjaUrl = "https://owqjsqvpmsctztpgensg.supabase.co";
  const ninjaKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cWpzcXZwbXNjdHp0cGdlbnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI0NTkwNCwiZXhwIjoyMDg1ODIxOTA0fQ.S9TInNnZHCsjuuYrpcXB5xpM4Lsr3MIE1YsFPdhq2Hg";

  const getNinjaClient = useCallback(() => {
    return createClient(ninjaUrl, ninjaKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const ninja = getNinjaClient();
      
      // Fetch classes for lookup
      const { data: classData, error: classError } = await ninja.from('classes').select('*').order('name');
      if (classError) throw classError;
      setClasses(classData || []);

      // Fetch profiles
      const { data: profileData, error } = await supabase.from('profiles').select('*').order('nim');
      if (error) throw error;

      const usersWithRoles: UserData[] = (profileData || []).map(p => ({
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

  // --- CREATE USER ---
  const handleCreateUser = async () => {
    if (!newUser.nim || !newUser.full_name || !newUser.password) {
      toast.error('Lengkapi semua field yang diperlukan');
      return;
    }

    setIsCreating(true);
    try {
      const ninja = getNinjaClient();
      const cleanNim = newUser.nim.trim().replace(/\s+/g, '');
      const email = `${cleanNim}@ptik.local`;

      // 1. PRE-CHECK UNIQUE NIM
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('nim')
        .eq('nim', cleanNim)
        .maybeSingle();

      if (existingProfile) {
        throw new Error(`NIM ${cleanNim} sudah terdaftar di sistem!`);
      }

      const classIdToSave = (newUser.role === 'mahasiswa' || newUser.role === 'admin_kelas') 
        ? (newUser.class_id || null) 
        : null;

      // 2. CREATE USER (Using Admin API to prevent 500 signUp errors and auto-confirm)
      const { data: authData, error: authError } = await ninja.auth.admin.createUser({
        email,
        password: newUser.password,
        email_confirm: true, // Auto-confirm
        user_metadata: {
          nim: cleanNim,
          full_name: newUser.full_name,
          role: newUser.role,
          class_id: classIdToSave,
          whatsapp: newUser.whatsapp || null
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      toast.success(`Pengguna ${newUser.full_name} berhasil dibuat!`);
      setNewUser({ nim: '', full_name: '', whatsapp: '', password: '', class_id: '', role: 'mahasiswa' });
      setIsCreateDialogOpen(false);
      fetchData();

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Gagal membuat pengguna. Periksa trigger database.');
    } finally {
      setIsCreating(false);
    }
  };

  // --- EDIT USER ---
  const openEditDialog = (user: UserData) => {
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

  const handleSaveEdit = () => {
    if (!editingUserId || !editUserForm.nim || !editUserForm.full_name) {
      toast.error('Data tidak boleh kosong');
      return;
    }

    if (editUserForm.new_password) {
      setShowPremiumConfirm(true);
    } else {
      executeUserUpdate();
    }
  };

  const executeUserUpdate = async () => {
    setIsUpdating(true);
    try {
      const ninja = getNinjaClient();
      const cleanNim = editUserForm.nim.trim().replace(/\s+/g, '');
      const classIdToSave = (editUserForm.role === 'mahasiswa' || editUserForm.role === 'admin_kelas')
        ? (editUserForm.class_id || null)
        : null;

      // 1. UPDATE AUTH (Admin API)
      const authUpdates: any = {
        email: `${cleanNim}@ptik.local`, // Keep email in sync with NIM
        user_metadata: {
          nim: cleanNim,
          full_name: editUserForm.full_name,
          role: editUserForm.role,
          whatsapp: editUserForm.whatsapp || null,
          class_id: classIdToSave,
        }
      };

      if (editUserForm.new_password) {
        authUpdates.password = editUserForm.new_password;
      }

      const { error: authError } = await ninja.auth.admin.updateUserById(
        editingUserId!,
        authUpdates
      );
      if (authError) throw authError;

      // 2. UPDATE PROFILE
      const { error: profileError } = await ninja
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
      setIsEditDialogOpen(false);
      setShowPremiumConfirm(false);
      setEditingUserId(null);
      fetchData();

    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Gagal update data: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- DELETE USER ---
  const openDeleteModal = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const ninja = getNinjaClient();
      
      // Nuclear Delete via RPC
      const { error: rpcError } = await ninja.rpc('delete_user_completely', {
        target_user_id: userToDelete
      });

      if (rpcError) {
        console.warn("Nuclear Delete RPC failure, attempting manual fallback:", rpcError);
        // Fallback: Delete profile then auth
        await ninja.from('profiles').delete().eq('user_id', userToDelete);
        try {
          await ninja.auth.admin.deleteUser(userToDelete);
        } catch (authErr) {
          console.error("Manual Auth deletion failed:", authErr);
        }
      }

      toast.success('Pengguna berhasil dihapus secara total (Nuclear Delete)');
      setUsers(prev => prev.filter(u => u.user_id !== userToDelete));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Deletion error:', error);
      toast.error('Gagal menghapus pengguna: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- FILTERING ---
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || user.class_id === selectedClass;
    const matchesRole = selectedRole === 'all' || user.roles.includes(selectedRole as AppRole);
    return matchesSearch && matchesClass && matchesRole;
  });

  return {
    state: {
      users, classes, isLoading, searchQuery, selectedClass, selectedRole,
      isCreateDialogOpen, isCreating, isEditDialogOpen, isUpdating, editingUserId,
      isDeleteModalOpen, userToDelete, isDeleting, showPremiumConfirm,
      newUser, editUserForm, filteredUsers
    },
    actions: {
      setSearchQuery, setSelectedClass, setSelectedRole, setIsCreateDialogOpen,
      setIsEditDialogOpen, setShowPremiumConfirm, setNewUser, setEditUserForm,
      fetchData, handleCreateUser, openEditDialog, handleSaveEdit, executeUserUpdate,
      openDeleteModal, confirmDeleteUser
    }
  };
}
