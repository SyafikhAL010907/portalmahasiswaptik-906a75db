import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, UserPlus, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useUserManagement } from '@/SharedLogic/hooks/useUserManagement';
import { AppRole } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

interface UserModalsProps {
  um: ReturnType<typeof useUserManagement>;
}

const roleLabels: Record<AppRole, string> = {
  admin_dev: 'AdminDev',
  admin_kelas: 'Admin Kelas',
  admin_dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
};

export function UserModals({ um }: UserModalsProps) {
  const { state, actions } = um;
  const { isAdminDev } = useAuth();

  return (
    <>
      {/* 1. DELETE MODAL */}
      <ConfirmationModal
        isOpen={state.isDeleteModalOpen}
        onClose={() => actions.openDeleteModal('')}
        onConfirm={actions.confirmDeleteUser}
        title="Hapus Pengguna?"
        description="Apakah Anda yakin ingin menghapus pengguna ini secara permanen? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Permanen"
        variant="danger"
        isLoading={state.isDeleting}
      />

      {/* 2. PREMIUM CONFIRM MODAL (Password Reset) */}
      <PremiumConfirmModal
        isOpen={state.showPremiumConfirm}
        onClose={() => actions.setShowPremiumConfirm(false)}
        name={state.editUserForm.full_name}
        onConfirm={actions.executeUserUpdate}
        isLoading={state.isUpdating}
      />

      {/* 3. CREATE DIALOG */}
      <Dialog open={state.isCreateDialogOpen} onOpenChange={actions.setIsCreateDialogOpen}>
        <DialogContent className="w-[95%] max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-white/20 shadow-2xl p-6">
          <DialogHeader className="bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-3xl mb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-600" /> Buat Pengguna
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 font-medium">Tambahkan akun baru ke sistem</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nim" className="text-sm font-bold text-slate-700 dark:text-slate-300">NIM / ID</Label>
              <Input
                id="nim"
                placeholder="Contoh: 1512625001"
                value={state.newUser.nim}
                onChange={(e) => actions.setNewUser({ ...state.newUser, nim: e.target.value })}
                className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="create-name" className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</Label>
              <Input
                id="create-name"
                value={state.newUser.full_name}
                onChange={(e) => actions.setNewUser({ ...state.newUser, full_name: e.target.value })}
                placeholder="Nama Lengkap..."
                className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-whatsapp" className="text-sm font-bold text-slate-700 dark:text-slate-300">Nomor WhatsApp</Label>
              <Input
                id="create-whatsapp"
                value={state.newUser.whatsapp}
                onChange={(e) => actions.setNewUser({ ...state.newUser, whatsapp: e.target.value })}
                placeholder="Contoh: 08123456789"
                className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-bold text-slate-700 dark:text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={state.newUser.password}
                onChange={(e) => actions.setNewUser({ ...state.newUser, password: e.target.value })}
                className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-sm font-bold text-slate-700 dark:text-slate-300">Role</Label>
              <Select value={state.newUser.role} onValueChange={(value) => actions.setNewUser({ ...state.newUser, role: value as AppRole })}>
                <SelectTrigger className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(state.newUser.role === 'mahasiswa' || state.newUser.role === 'admin_kelas') && (
              <div className="space-y-1.5">
                <Label htmlFor="class" className="text-sm font-bold text-blue-500 dark:text-slate-300 italic">Pilih Kelas (Wajib)</Label>
                <Select value={state.newUser.class_id} onValueChange={(value) => actions.setNewUser({ ...state.newUser, class_id: value })}>
                  <SelectTrigger className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 focus:ring-purple-400">
                    <SelectValue placeholder="Pilih kelas..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {state.classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>Kelas {cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={() => actions.setIsCreateDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
            <Button
              onClick={actions.handleCreateUser}
              disabled={state.isCreating}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30 font-bold"
            >
              {state.isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {state.isCreating ? 'Membuat...' : 'Buat Pengguna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. EDIT DIALOG */}
      <Dialog open={state.isEditDialogOpen} onOpenChange={actions.setIsEditDialogOpen}>
        <DialogContent className="w-[95%] max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-white/20 shadow-2xl p-6">
          <DialogHeader className="bg-gradient-to-r from-indigo-400/20 via-blue-400/20 to-cyan-400/20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-3xl mb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Edit Pengguna</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 font-medium">Perbarui informasi pengguna ini secara instan</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIM / ID</Label>
              <Input
                value={state.editUserForm.nim}
                onChange={(e) => actions.setEditUserForm({ ...state.editUserForm, nim: e.target.value })}
                className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</Label>
              <Input
                value={state.editUserForm.full_name}
                onChange={(e) => actions.setEditUserForm({ ...state.editUserForm, full_name: e.target.value })}
                className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">WhatsApp</Label>
              <Input
                value={state.editUserForm.whatsapp}
                onChange={(e) => actions.setEditUserForm({ ...state.editUserForm, whatsapp: e.target.value })}
                className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Role</Label>
              <Select value={state.editUserForm.role} onValueChange={(value) => actions.setEditUserForm({ ...state.editUserForm, role: value as AppRole })}>
                <SelectTrigger className="rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-slate-300/50 shadow-inner">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(state.editUserForm.role === 'mahasiswa' || state.editUserForm.role === 'admin_kelas') && (
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-indigo-500 italic">Kelas</Label>
                <Select value={state.editUserForm.class_id} onValueChange={(value) => actions.setEditUserForm({ ...state.editUserForm, class_id: value })}>
                  <SelectTrigger className="rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50">
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {state.classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>Kelas {cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAdminDev && (
              <div className="space-y-2 pt-4 border-t border-rose-200/50 dark:border-rose-900/50 mt-4">
                <Label className="text-sm font-black text-rose-600 dark:text-rose-400">Password Baru (Force Reset)</Label>
                <Input
                  type="password"
                  placeholder="Isi untuk ganti password..."
                  value={state.editUserForm.new_password}
                  onChange={(e) => actions.setEditUserForm({ ...state.editUserForm, new_password: e.target.value })}
                  className="rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 font-bold placeholder:font-normal"
                />
                <p className="text-[10px] text-muted-foreground italic">Admin-Dev: Gunakan ini jika user lupa password.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={() => actions.setIsEditDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
            <Button
              onClick={actions.handleSaveEdit}
              disabled={state.isUpdating}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/30 font-bold"
            >
              {state.isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const PremiumConfirmModal = ({ isOpen, onClose, onConfirm, name, isLoading }: any) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-white/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl p-8 text-center"
          >
            <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Ganti Password?</h3>
            <p className="text-slate-300 mb-8 text-sm leading-relaxed px-2">
              Anda akan memperbarui sandi untuk <span className="font-black text-amber-400">{name}</span>. Pastikan password baru sudah dicatat.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" onClick={onClose} className="rounded-2xl border border-white/10 text-white hover:bg-white/5 transition-all">Batal</Button>
              <Button
                disabled={isLoading}
                onClick={onConfirm}
                className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-amber-600/30 border-0 h-11"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Ganti'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
