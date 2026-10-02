import React, { createContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Fetch or create user profile from the profiles table
  const fetchProfile = async (userId, userEmail, userMeta) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch notice:', error.message);
      }

      if (data) {
        setProfile(data);
      } else {
        // Fallback: create default profile row if trigger hasn't fired yet
        const defaultProfile = {
          id: userId,
          full_name: userMeta?.full_name || userMeta?.name || userEmail?.split('@')[0] || 'User',
          email: userEmail,
        };
        const { data: created } = await supabase
          .from('profiles')
          .upsert(defaultProfile)
          .select()
          .single();
        if (created) setProfile(created);
      }
    } catch (err) {
      console.warn('Profile initialization error:', err.message);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Initial session restoration
    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          if (mounted) setLoading(false);
          return;
        }

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            await fetchProfile(
              initialSession.user.id,
              initialSession.user.email,
              initialSession.user.user_metadata
            );
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err.message);
        if (mounted) setAuthError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Listen to active auth state changes (sign in, sign out, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession?.user) {
          await fetchProfile(
            newSession.user.id,
            newSession.user.email,
            newSession.user.user_metadata
          );
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Email & Password Signup
  const signUp = async ({ email, password, fullName }) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    if (data?.user && data?.session) {
      setUser(data.user);
      setSession(data.session);
      await fetchProfile(data.user.id, data.user.email, { full_name: fullName });
    }

    return data;
  };

  // Email & Password Login
  const signIn = async ({ email, password }) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    setUser(data.user);
    setSession(data.session);
    if (data.user) {
      await fetchProfile(data.user.id, data.user.email, data.user.user_metadata);
    }

    return data;
  };

  // Google OAuth Login
  const signInWithGoogle = async () => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
      );
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}app/dashboard`,
      },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    return data;
  };

  // Password reset request
  const resetPassword = async (email) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}login`,
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    return data;
  };

  // Logout
  const signOut = async () => {
    setAuthError(null);
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Sign out error:', error.message);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Helper to attach JWT Bearer token to API requests
  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email, user.user_metadata);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    authError,
    isSupabaseConfigured,
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
    signOut,
    getAuthHeaders,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { useAuth } from '../hooks/useAuth';
