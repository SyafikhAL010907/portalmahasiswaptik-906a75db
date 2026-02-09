import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export type AppRole = 'admin_dev' | 'admin_kelas' | 'admin_dosen' | 'mahasiswa';

interface Profile {
  id: string;
  user_id: string;
  nim: string;
  full_name: string;
  class_id: string | null;
  avatar_url: string | null;
  user_class?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  signIn: (nim: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: () => boolean;
  isAdminDev: () => boolean;
  isAdminKelas: () => boolean;
  isAdminDosen: () => boolean;
  isMahasiswa: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      // 1. Fetch Profile first (safe)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (data) {
        let className = undefined;

        // 2. Fetch Class Name locally if class_id exists (safe fallback)
        if (data.class_id) {
          const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', data.class_id)
            .single();

          if (classData) {
            className = classData.name;
          }
        }

        return {
          ...data,
          user_class: className
        } as Profile;
      }

      return null;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }
      return (data?.map(r => r.role as AppRole) || []);
    } catch (err) {
      console.error('Error in fetchRoles:', err);
      return [];
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Defer fetching to avoid blocking
          setTimeout(async () => {
            const [profileData, rolesData] = await Promise.all([
              fetchProfile(currentSession.user.id),
              fetchRoles(currentSession.user.id)
            ]);
            setProfile(profileData);
            setRoles(rolesData);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
        }
      }
    );

    // THEN check initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const [profileData, rolesData] = await Promise.all([
          fetchProfile(initialSession.user.id),
          fetchRoles(initialSession.user.id)
        ]);
        setProfile(profileData);
        setRoles(rolesData);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (nim: string, password: string): Promise<{ error: string | null }> => {
    try {
      // NIM is used as email format: nim@ptik.local
      const email = `${nim}@ptik.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      return { error: 'Terjadi kesalahan saat login' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = () => hasRole('admin_dev') || hasRole('admin_kelas');
  const isAdminDev = () => hasRole('admin_dev');
  const isAdminKelas = () => hasRole('admin_kelas');
  const isAdminDosen = () => hasRole('admin_dosen');
  const isMahasiswa = () => hasRole('mahasiswa');

  const refreshProfile = async () => {
    if (user) {
      const [profileData, rolesData] = await Promise.all([
        fetchProfile(user.id),
        fetchRoles(user.id)
      ]);
      setProfile(profileData);
      setRoles(rolesData);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
        hasRole,
        isAdmin,
        isAdminDev,
        isAdminKelas,
        isAdminDosen,
        isMahasiswa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
