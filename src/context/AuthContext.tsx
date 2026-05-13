import { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { supabase, Profile } from '../lib/supabase';

type AuthContextType = {
  user: { id: string; email: string | undefined } | null;
  session: null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, user: clerkUser, isLoaded } = useUser();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const mappedUser = useMemo(() => isSignedIn && clerkUser
    ? { id: clerkUser.id, email: clerkUser.primaryEmailAddress?.emailAddress }
    : null, [isSignedIn, clerkUser]);

  const fetchOrCreateProfile = useCallback(async (userId: string) => {
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
    }

    if (existing) {
      setProfile(existing);
      return;
    }

    const name = clerkUser?.fullName || clerkUser?.firstName || 'User';
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId, full_name: name, role: 'user' })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating profile:', insertError);
    } else if (inserted) {
      setProfile(inserted);
    }
  }, [clerkUser]);

  useEffect(() => {
    async function init() {
      if (!isLoaded) {
        setLoading(true);
        return;
      }
      if (mappedUser) {
        const token = await getToken();
        if (token) {
          const { error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: '',
          });
          if (error) console.error('Error setting Supabase session:', error);
        }
        await fetchOrCreateProfile(mappedUser.id);
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    }
    init();
  }, [isLoaded, mappedUser, fetchOrCreateProfile, getToken]);

  async function refreshProfile() {
    if (mappedUser) {
      await fetchOrCreateProfile(mappedUser.id);
    }
  }

  async function signOut() {
    await clerkSignOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user: mappedUser, session: null, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
