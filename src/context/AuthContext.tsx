
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { API_BASE_URL } from "../constants/config";
import {
  getProfileCache,
  saveProfileCache,
  clearUserCache,
} from "../lib/appCache";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  currency: string;
  timezone: string;
};

type ProfileUpdates = {
  full_name?: string;
  currency?: string;
  timezone?: string;
};

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function syncProfile(
    accessToken: string,
    authUserId: string
  ): Promise<Profile> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/profile/me`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.detail || "Could not set up your Monetra profile"
        );
      }

      const data: Profile = await response.json();

      setProfile(data);
      await saveProfileCache(authUserId, data);

      return data;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error("Backend connection timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function establishSession(currentSession: Session) {
    setSession(currentSession);

    const cachedProfile = await getProfileCache(
      currentSession.user.id
    );

    if (cachedProfile) {
      setProfile(cachedProfile);
      setLoading(false);

      // Refresh profile without blocking the app.
      syncProfile(
        currentSession.access_token,
        currentSession.user.id
      ).catch((error) => {
        console.error("Background profile sync failed:", error);
      });

      return;
    }

    // First login: create or retrieve the backend profile.
    await syncProfile(
      currentSession.access_token,
      currentSession.user.id
    );
  }

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);

        if (!currentSession) {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    async function initialize() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;
        if (error) throw error;

        if (!currentSession) {
          setSession(null);
          setProfile(null);
          return;
        }

        const cachedProfile = await getProfileCache(
          currentSession.user.id
        );

        if (!mounted) return;

        setSession(currentSession);

        if (cachedProfile) {
          setProfile(cachedProfile);
          setLoading(false);

          syncProfile(
            currentSession.access_token,
            currentSession.user.id
          ).catch((error) => {
            console.error("Background profile sync failed:", error);
          });
        } else {
          await syncProfile(
            currentSession.access_token,
            currentSession.user.id
          );
        }
      } catch (error) {
        console.error("Profile setup failed:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signUp(
    email: string,
    password: string,
    fullName: string
  ) {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) throw error;

      if (data.session) {
        await establishSession(data.session);
      }
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        await establishSession(data.session);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(updates: ProfileUpdates) {
    if (!session) {
      throw new Error("Please sign in again.");
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/profile/me`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Could not update your profile");
    }

    const updatedProfile: Profile = await response.json();

    setProfile(updatedProfile);
    await saveProfileCache(session.user.id, updatedProfile);
  }

  async function signOut() {
    const authUserId = session?.user.id;

    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    if (authUserId) {
      await clearUserCache(authUserId);
    }

    setProfile(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
