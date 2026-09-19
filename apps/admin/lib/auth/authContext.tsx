"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AdminUser {
  id: string;
  userId: string; // e.g. DNHS-ADM-001
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  department: string;
  userRole: "admin";
  isEmailVerified?: boolean;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; unconfirmedEmail?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_SESSION_COOKIE_NAME = "dumalnext_admin_session";

function setSessionCookie(user: AdminUser) {
  if (typeof document !== "undefined") {
    const serialized = encodeURIComponent(JSON.stringify(user));
    document.cookie = `${ADMIN_SESSION_COOKIE_NAME}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function getSessionCookie(): AdminUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ADMIN_SESSION_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function clearSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${ADMIN_SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const supabase = createClient();

  const refreshSession = async () => {
    try {
      if (typeof window === "undefined") return;

      // 1. Check Supabase Auth session first
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const authUser = session.user;
        const { data: suUsers } = await supabase
          .from("users")
          .select("id, user_id, email, user_role")
          .eq("email", authUser.email || "")
          .limit(1);

        const suUser = suUsers?.[0];
        if (suUser && suUser.user_role === "admin") {
          const { data: profiles } = await supabase
            .from("school_administrators")
            .select("*")
            .eq("user_id", suUser.id)
            .limit(1);

          const profile = profiles?.[0];
          const firstName = profile?.first_name || "OFFICE OF THE";
          const lastName = profile?.last_name || "REGISTRAR";
          const department = profile?.department || "Office of the Principal & Registrar";

          const verifiedAdmin: AdminUser = {
            id: suUser.id,
            userId: suUser.user_id,
            email: suUser.email,
            fullName: `${firstName} ${lastName}`.trim(),
            firstName,
            lastName,
            department,
            userRole: "admin",
            isEmailVerified: !!authUser.email_confirmed_at,
          };

          setUser(verifiedAdmin);
          setSessionCookie(verifiedAdmin);
          return;
        }
      }

      // 2. Fallback to cached session cookie
      const cachedUser = getSessionCookie();
      if (!cachedUser) {
        setUser(null);
        return;
      }

      const { data: verified } = await supabase
        .from("users")
        .select("id, user_id, email, user_role")
        .eq("id", cachedUser.id)
        .eq("user_role", "admin")
        .limit(1);

      if (verified && verified.length > 0) {
        setUser(cachedUser);
      } else {
        clearSessionCookie();
        setUser(null);
      }
    } catch (e) {
      console.warn("Admin session verification notice:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();

    // Listen to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        await refreshSession();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        clearSessionCookie();
      }
    });

    const handleVisibilitySync = () => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    };
    window.addEventListener("focus", handleVisibilitySync);
    document.addEventListener("visibilitychange", handleVisibilitySync);

    const heartbeatTimer = setInterval(() => {
      refreshSession();
    }, 15000);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", handleVisibilitySync);
      document.removeEventListener("visibilitychange", handleVisibilitySync);
      clearInterval(heartbeatTimer);
    };
  }, []);

  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string; unconfirmedEmail?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: "Please enter your Administrator ID or Email and password." };
    }

    try {
      // 1. If email, attempt Supabase Auth with Gmail verification check
      if (cleanId.includes("@")) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanId,
          password: cleanPass,
        });

        if (authErr) {
          const errMsg = authErr.message.toLowerCase();
          if (errMsg.includes("email not confirmed") || errMsg.includes("unconfirmed")) {
            return {
              success: false,
              error: "Your administrator Gmail is not yet verified. Please check your inbox (and Spam folder) for the verification link.",
              unconfirmedEmail: cleanId,
            };
          }
        } else if (authData.user) {
          await refreshSession();
          return { success: true };
        }
      }

      // 2. Check if user exists in Supabase 'users' table
      let { data: suUsers } = await supabase
        .from("users")
        .select("*")
        .or(`email.eq.${cleanId},user_id.eq.${cleanId.toUpperCase()}`)
        .limit(1);

      // Self-provisioning: If standard admin credential used and no record exists, provision it in Supabase
      const isDefaultAdminCred =
        (cleanId === "admin@dumalneg.deped.gov.ph" ||
          cleanId === "admin@gmail.com" ||
          cleanId === "dnhs-adm-001" ||
          cleanId === "admin") &&
        cleanPass === "admin123";

      if ((!suUsers || suUsers.length === 0) && isDefaultAdminCred) {
        const newAdminPayload: any = {
          user_id: "DNHS-ADM-001",
          email: cleanId.includes("@") ? cleanId : "admin@dumalneg.deped.gov.ph",
          user_role: "admin",
          password: "admin123",
        };

        let insertRes = await supabase.from("users").insert(newAdminPayload).select().single();
        if (insertRes.error && insertRes.error.message?.toLowerCase().includes("password")) {
          delete newAdminPayload.password;
          insertRes = await supabase.from("users").insert(newAdminPayload).select().single();
        }

        if (insertRes.data) {
          suUsers = [insertRes.data];
          await supabase.from("school_administrators").insert({
            user_id: insertRes.data.id,
            first_name: "OFFICE OF THE",
            last_name: "REGISTRAR",
            department: "Academic Admissions",
          });
        }
      }

      if (!suUsers || suUsers.length === 0) {
        return {
          success: false,
          error: "No administrator account found matching those credentials. Please check your Employee ID or Email.",
        };
      }

      const adminUserRecord = suUsers[0];

      if (adminUserRecord.user_role !== "admin") {
        return {
          success: false,
          error: `Access denied. Account role is [ ${adminUserRecord.user_role} ]. Administrator credentials are required.`,
        };
      }

      if (adminUserRecord.password && adminUserRecord.password !== cleanPass) {
        return {
          success: false,
          error: "Incorrect administrator password entered. Please try again.",
        };
      }

      const { data: profiles } = await supabase
        .from("school_administrators")
        .select("*")
        .eq("user_id", adminUserRecord.id)
        .limit(1);

      const profile = profiles?.[0];
      const firstName = profile?.first_name || "OFFICE OF THE";
      const lastName = profile?.last_name || "REGISTRAR";
      const department = profile?.department || "Office of the Principal & Registrar";
      const fullName = `${firstName} ${lastName}`.trim();

      const sessionUser: AdminUser = {
        id: adminUserRecord.id,
        userId: adminUserRecord.user_id,
        email: adminUserRecord.email,
        fullName,
        firstName,
        lastName,
        department,
        userRole: "admin",
      };

      setUser(sessionUser);
      setSessionCookie(sessionUser);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }

      return { success: true };
    } catch (e: any) {
      console.error("Administrator login error:", e);
      return { success: false, error: e?.message || "An unexpected error occurred during administrative login." };
    }
  };

  const resendVerification = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/adjudication`
        : "https://dumalnext-admin.vercel.app/auth/callback?next=/adjudication";

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || "Failed to resend verification email." };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    clearSessionCookie();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
    }
  };

  return (
    <AdminAuthContext.Provider value={{ user, isLoading, login, resendVerification, logout, refreshSession }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
