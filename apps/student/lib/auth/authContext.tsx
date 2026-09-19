"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface StudentUser {
  id: string;
  userId: string; // e.g. DNHS-STU-10001
  email: string;
  fullName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  lrn?: string;
  userRole: "student";
  isEmailVerified?: boolean;
}

interface AuthContextType {
  user: StudentUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; unconfirmedEmail?: string }>;
  register: (
    data: {
      firstName: string;
      middleName?: string;
      lastName: string;
      lrn?: string;
      email: string;
      password: string;
    },
    autoLogin?: boolean
  ) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean; email?: string; unconfirmedEmail?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session Cookie Management (100% Standard Web Cookies, Zero localStorage)
const SESSION_COOKIE_NAME = "dumalnext_student_session";

function setSessionCookie(user: StudentUser) {
  if (typeof document !== "undefined") {
    const serialized = encodeURIComponent(JSON.stringify(user));
    document.cookie = `${SESSION_COOKIE_NAME}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function getSessionCookie(): StudentUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function clearSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const supabase = createClient();

  const refreshSession = async () => {
    try {
      if (typeof window === "undefined") return;

      // 1. Check official Supabase Auth session first
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const authUser = session.user;
        const { data: suUserData } = await supabase
          .from("users")
          .select("id, user_id, email, user_role")
          .eq("email", authUser.email || "")
          .limit(1);

        const suUser = suUserData?.[0];
        const userDbId = suUser?.id || authUser.id;
        const userDisplayId = suUser?.user_id || `DNHS-STU-${authUser.id.slice(0, 5).toUpperCase()}`;

        // Fetch student profile
        const { data: stProfiles } = await supabase
          .from("students")
          .select("*")
          .or(`user_id.eq.${userDbId},student_id.eq.${authUser.email}`)
          .limit(1);

        const profile = stProfiles?.[0];
        const metadata = authUser.user_metadata || {};
        const firstName = profile?.first_name || metadata.firstName || "STUDENT";
        const lastName = profile?.last_name || metadata.lastName || "LEARNER";
        const middleName = profile?.middle_name || metadata.middleName || "";
        const fullName = middleName
          ? `${lastName}, ${firstName} ${middleName}`
          : `${lastName}, ${firstName}`;

        const verifiedUser: StudentUser = {
          id: userDbId,
          userId: userDisplayId,
          email: authUser.email || "",
          fullName,
          firstName,
          middleName,
          lastName,
          lrn: profile?.student_id && /^\d{12}$/.test(profile.student_id) ? profile.student_id : (metadata.lrn || undefined),
          userRole: "student",
          isEmailVerified: !!authUser.email_confirmed_at,
        };

        setUser(verifiedUser);
        setSessionCookie(verifiedUser);
        return;
      }

      // 2. Fallback to cached cookie session
      const cachedUser = getSessionCookie();
      if (!cachedUser) {
        setUser(null);
        return;
      }

      const { data: verified, error } = await supabase
        .from("users")
        .select("id, user_id, email, user_role")
        .eq("id", cachedUser.id)
        .limit(1);

      if (verified && verified.length > 0) {
        setUser(cachedUser);
      } else {
        clearSessionCookie();
        setUser(null);
      }
    } catch (e) {
      console.warn("Session verification notice:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();

    // Listen to Supabase Auth state changes (e.g. Email confirmation link clicked)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        await refreshSession();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
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

  // Dual Login via Email (Supabase Auth with Verification) OR 12-Digit LRN
  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string; unconfirmedEmail?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: "Please enter your Email Address or 12-Digit LRN and password." };
    }

    try {
      // 1. If identifier is an Email, authenticate via Supabase Auth
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
              error: "Your Gmail account is not yet verified. Please check your inbox (and Spam folder) for the verification link sent by Dumalneg NHS.",
              unconfirmedEmail: cleanId,
            };
          }
          if (errMsg.includes("invalid login credentials")) {
            return {
              success: false,
              error: "Invalid email or password entered. Please check your credentials.",
            };
          }
          return { success: false, error: authErr.message };
        }

        if (authData.user) {
          await refreshSession();
          return { success: true };
        }
      }

      // 2. Query Supabase 'users' table directly (for LRN or legacy users)
      const { data: suUsers, error: suErr } = await supabase
        .from("users")
        .select("id, user_id, email, user_role, password")
        .or(`email.eq.${cleanId},user_id.eq.${cleanId.toUpperCase()}`)
        .limit(1);

      let suUser = suUsers?.[0];

      // If user not found by email or user_id, check students table by student_id (LRN)
      if (!suUser) {
        const { data: stFound } = await supabase
          .from("students")
          .select("user_id")
          .eq("student_id", cleanId.toUpperCase())
          .limit(1);

        if (stFound && stFound[0]?.user_id) {
          const { data: userById } = await supabase
            .from("users")
            .select("id, user_id, email, user_role, password")
            .eq("id", stFound[0].user_id)
            .limit(1);
          suUser = userById?.[0];
        }
      }

      if (!suUser) {
        return {
          success: false,
          error: "No student account found in Supabase for that email or LRN. Please check your credentials or register a new account.",
        };
      }

      // Query student profile
      const { data: stProfiles } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", suUser.id)
        .limit(1);

      const profile = stProfiles?.[0];
      const firstName = profile?.first_name || "STUDENT";
      const lastName = profile?.last_name || "LEARNER";
      const middleName = profile?.middle_name || "";
      const fullName = middleName
        ? `${lastName}, ${firstName} ${middleName}`
        : `${lastName}, ${firstName}`;

      const sessionUser: StudentUser = {
        id: suUser.id,
        userId: suUser.user_id,
        email: suUser.email,
        fullName,
        firstName,
        middleName,
        lastName,
        lrn: profile?.student_id && /^\d{12}$/.test(profile.student_id) ? profile.student_id : undefined,
        userRole: "student",
      };

      setUser(sessionUser);
      setSessionCookie(sessionUser);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
      }
      return { success: true };
    } catch (e: any) {
      console.error("Supabase authentication error:", e);
      return { success: false, error: e?.message || "An unexpected authentication error occurred." };
    }
  };

  // Student Account Registration with Real Gmail Confirmation Link
  const register = async (
    data: {
      firstName: string;
      middleName?: string;
      lastName: string;
      lrn?: string;
      email: string;
      password: string;
    },
    autoLogin: boolean = false
  ): Promise<{ success: boolean; error?: string; requiresVerification?: boolean; email?: string; unconfirmedEmail?: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanFirst = data.firstName.trim().toUpperCase();
    const cleanLast = data.lastName.trim().toUpperCase();
    const cleanMiddle = data.middleName ? data.middleName.trim().toUpperCase() : "";
    const cleanLrn = data.lrn ? data.lrn.replace(/\D/g, "").slice(0, 12) : "";

    if (!cleanFirst || !cleanLast) {
      return { success: false, error: "First Name and Last Name are required." };
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "A valid Gmail address is required." };
    }

    if (!data.password || data.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters in length." };
    }

    try {
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/enroll`
        : "https://dumalnext.vercel.app/auth/callback?next=/enroll";

      // 1. Sign up with Supabase Auth (Triggers official Gmail verification link!)
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            firstName: cleanFirst,
            middleName: cleanMiddle,
            lastName: cleanLast,
            lrn: cleanLrn,
          },
        },
      });

      if (authErr) {
        return {
          success: false,
          error: "Supabase Auth error: " + authErr.message,
        };
      }

      // Check if user already exists (identities empty in Supabase Auth means duplicate email)
      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        return {
          success: false,
          error: "An account with this Gmail address already exists. Please sign in or click Resend Verification.",
          unconfirmedEmail: cleanEmail,
        };
      }

      // Generate Official Dumalneg Student User ID (e.g. DNHS-STU-XXXXX)
      const newUserId = `DNHS-STU-${Math.floor(10000 + Math.random() * 90000)}`;
      const authUserId = authData.user?.id;

      // 2. Direct Cloud Insert/Upsert to Supabase 'users' table
      const userPayload: Record<string, any> = {
        id: authUserId,
        user_id: newUserId,
        email: cleanEmail,
        user_role: "student",
      };

      try {
        await supabase.from("users").upsert(userPayload, { onConflict: "email" });
      } catch (uErr) {
        console.warn("Public users sync notice:", uErr);
      }

      // 3. Direct Cloud Insert to Supabase 'students' profile table
      const validLrn = cleanLrn && /^\d{12}$/.test(cleanLrn) ? cleanLrn : null;
      const assignedNumericLrn = validLrn || `100050${Math.floor(100000 + Math.random() * 900000)}`;

      try {
        await supabase.from("students").insert({
          user_id: authUserId,
          student_id: assignedNumericLrn,
          first_name: cleanFirst,
          middle_name: cleanMiddle || null,
          last_name: cleanLast,
          barangay: "Cabaritan",
          grade_level: 7,
        });
      } catch (sErr) {
        console.warn("Public students profile sync notice:", sErr);
      }

      // Check if email confirmation is required by Supabase
      const requiresVerification = !authData.session;

      return {
        success: true,
        requiresVerification,
        email: cleanEmail,
      };
    } catch (e: any) {
      console.error("Supabase registration error:", e);
      return { success: false, error: e?.message || "An unexpected error occurred during registration." };
    }
  };

  // Resend Verification Email to Gmail
  const resendVerification = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Please provide a valid Gmail address to resend the verification link." };
    }

    try {
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/enroll`
        : "https://dumalnext.vercel.app/auth/callback?next=/enroll";

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

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
      window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, resendVerification, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
