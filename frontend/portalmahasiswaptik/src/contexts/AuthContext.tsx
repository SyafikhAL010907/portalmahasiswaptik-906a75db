import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { webauthnService } from '../SharedLogic/services/webauthnService';

export type AppRole = 'admin_dev' | 'admin_kelas' | 'admin_dosen' | 'mahasiswa';

interface Profile {
  id: string;
  user_id: string;
  nim: string;
  full_name: string;
  whatsapp?: string | null;
  class_id: string | null;
  avatar_url: string | null;
  user_class?: string;
  last_language?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isUnlocked: boolean;
  isBiometricRegistered: boolean | null;
  signIn: (nim: string, password: string, rememberMe?: boolean) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
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
  const [isUnlocked, setIsUnlocked] = useState(false); // Default to false for better security
  const [isBiometricRegistered, setIsBiometricRegistered] = useState<boolean | null>(null);
  const isAuthenticating = React.useRef(false);

  // Helper to set persistent cookie for backend middleware
  const setAuthCookie = (token: string | null, days: number = 30) => {
    if (token) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = "; expires=" + date.toUTCString();
      // Using SameSite=Lax and Secure for better compatibility and security
      document.cookie = `sb-auth-token=${token}${expires}; path=/; SameSite=Lax; Secure`;
      console.log("🍪 Syncing persistent auth cookie...");
      
      // Mark session as active in memory (survives refreshes only)
      sessionStorage.setItem('portal_auth_session_active', 'true');
    } else {
      document.cookie = "sb-auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      console.log("🍪 Clearing auth cookie...");
      sessionStorage.removeItem('portal_auth_session_active');
    }
  };

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
          whatsapp: (data as any).whatsapp || null,
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
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }
      return (data as any)?.role ? [(data as any).role as AppRole] : [];
    } catch (err) {
      console.error('Error in fetchRoles:', err);
      return [];
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing profile for user:', user.id);
      const [profileData, rolesData] = await Promise.all([
        fetchProfile(user.id),
        fetchRoles(user.id)
      ]);
      setProfile(profileData);
      setRoles(rolesData);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Reset lock state on sign out
        if (event === 'SIGNED_OUT') {
          setIsUnlocked(false);
          setIsBiometricRegistered(null);
        }

        // When a user JUST signs in with password, we unlock them automatically
        // because they just verified their identity.
        if (event === 'SIGNED_IN') {
          setIsUnlocked(true);
          // Check biometric status in background
          webauthnService.getStatus().then(status => {
            setIsBiometricRegistered(status.is_registered);
          }).catch(() => {
            setIsBiometricRegistered(false);
          });
        }

        // Sync token to cookie whenever auth state changes (login or refresh)
        if (currentSession?.access_token) {
          setAuthCookie(currentSession.access_token);
        } else if (event === 'SIGNED_OUT') {
          setAuthCookie(null);
        }

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

    // THEN check initial session (RE-ENTRY LOGIC)
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);

      if (initialSession?.access_token) {
        setAuthCookie(initialSession.access_token);
      }

      if (currentUser) {
        // ENFORCEMENT POLICY: Re-entry check for biometrics
        console.log("🔐 Checking biometric status for persistent session...");
        try {
          const status = await webauthnService.getStatus();
          setIsBiometricRegistered(status.is_registered);

          if (status.is_registered) {
            // User has biometrics -> Go to LockScreen
            console.log("🔒 Biometric Enforcement: LockScreen Required");
            setIsUnlocked(false);
          } else {
            // User does NOT have biometrics
            // Check if this is a fresh session or refresh
            const isFromRefresh = sessionStorage.getItem('portal_auth_session_active') === 'true';
            
            if (!isFromRefresh) {
              console.warn("🛡️ Security Policy: Persistence requires Biometrics.");
              await signOut(); 
              return;
            }
            
            console.log("✅ User has no biometrics, but this is a Refresh. Allowing session.");
            setIsUnlocked(true);
          }

          const [profileData, rolesData] = await Promise.all([
            fetchProfile(currentUser.id),
            fetchRoles(currentUser.id)
          ]);
          setProfile(profileData);
          setRoles(rolesData);
        } catch (err) {
          console.error("Critical Re-entry Error:", err);
          setIsUnlocked(false);
        }
      } else {
        // No user, definitely unlocked (at Login/Landing)
        setIsUnlocked(true);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (nim: string, password: string, rememberMe: boolean = true): Promise<{ error: string | null }> => {
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

      // If sign in is successful, the onAuthStateChange listener will handle the cookie
      return { error: null };
    } catch (err) {
      return { error: 'Terjadi kesalahan saat login' };
    }
  };

  const signOut = async () => {
    try {
      // Attempt to sign out locally to avoid 403 Forbidden errors if token is expired
      // We already do a thorough manual cleanup below for maximum security.
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn("🛡️ AuthContext: SignOut failed, proceeding with local cleanup.", err);
    }

    // Force local cleanup regardless of API status
    setAuthCookie(null);
    
    // Reset Lock States
    setIsUnlocked(false);
    setIsBiometricRegistered(null);

    // Clear all storage to prevent session leaking and stale data
    localStorage.clear();
    sessionStorage.clear();

    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const unlock = async () => {
    if (isAuthenticating.current) {
      console.log("🛡️ AuthContext: Auth already in progress, ignoring duplicate call.");
      return false;
    }
    
    try {
      isAuthenticating.current = true;
      console.log("🔓 Attempting biometric unlock for NIM:", profile?.nim);
      const result = await webauthnService.authenticate(profile?.nim || undefined);
      if (result.success) {
        setIsUnlocked(true);
        console.log("🔓 Unlock successful!");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Unlock failed:", err);
      return false;
    } finally {
      isAuthenticating.current = false;
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = () => hasRole('admin_dev') || hasRole('admin_kelas');
  const isAdminDev = () => hasRole('admin_dev');
  const isAdminKelas = () => hasRole('admin_kelas');
  const isAdminDosen = () => hasRole('admin_dosen');
  const isMahasiswa = () => hasRole('mahasiswa');


  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isUnlocked,
        isBiometricRegistered,
        signIn,
        signOut,
        unlock,
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
