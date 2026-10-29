"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface TeacherUser {
  id: string;
  teacherDbId?: string; // Supabase teachers table UUID primary key
  teacherId: string; // e.g. DNHS-TCH-001
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  department: string; // 'JHS' | 'SHS' | 'CROSS_LEVEL'
  userRole: "teacher";
  isEmailVerified?: boolean;
  photoUrl?: string;
}

interface TeacherAuthContextType {
  user: TeacherUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; unconfirmedEmail?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  updateUserName: (firstName: string, middleName: string | undefined, lastName: string) => void;
  updateUserEmail: (newEmail: string) => void;
  updateUserPhoto: (photoUrl: string | null) => void;
}

const TeacherAuthContext = createContext<TeacherAuthContextType | undefined>(undefined);

const TEACHER_SESSION_COOKIE_NAME = "dumalnext_teacher_session";

function setSessionCookie(user: TeacherUser) {
  if (typeof document !== "undefined") {
    const serialized = encodeURIComponent(JSON.stringify(user));
    document.cookie = `${TEACHER_SESSION_COOKIE_NAME}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function getSessionCookie(): TeacherUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TEACHER_SESSION_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function clearSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${TEACHER_SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function TeacherAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TeacherUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const supabase = createClient();

  const refreshSession = async () => {
    try {
      if (typeof window === "undefined") return;

      // 1. Check Supabase Auth session first
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const authUser = session.user;
        const cleanEmail = (authUser.email || "").trim().toLowerCase();

        // Query user record
        const { data: suUsers } = await supabase
          .from("users")
          .select("id, user_id, email, user_role")
          .eq("email", cleanEmail)
          .limit(1);

        const suUser = suUsers?.[0];

        // Strict Role Gate: If session belongs to student, admin, or it_support, deny teacher access
        if (suUser && suUser.user_role && suUser.user_role !== "teacher") {
          await supabase.auth.signOut();
          clearSessionCookie();
          setUser(null);
          return;
        }

        // Query teacher profile
        const { data: teachers } = await supabase
          .from("teachers")
          .select("*")
          .or(`email.eq.${cleanEmail},user_id.eq.${authUser.id}`)
          .limit(1);

        const teacherRecord = teachers?.[0];
        if (!teacherRecord && suUser?.user_role !== "teacher") {
          await supabase.auth.signOut();
          clearSessionCookie();
          setUser(null);
          return;
        }

        const firstName = teacherRecord?.first_name || "Faculty";
        const lastName = teacherRecord?.last_name || "Member";
        const department = teacherRecord?.department || "CROSS_LEVEL";
        const teacherId = teacherRecord?.teacher_id || suUser?.user_id || "DNHS-TCH-001";
        const fullName = `${firstName} ${lastName}`.trim();

        // Load 2x2 Photo from system_settings or localStorage
        let photoUrl: string | undefined = undefined;
        try {
          const { data: photoSetting } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "teacher_profile_photos")
            .maybeSingle();
          if (photoSetting?.value && typeof photoSetting.value === "object") {
            photoUrl = (photoSetting.value as any)[teacherId] || (photoSetting.value as any)[cleanEmail];
          }
        } catch {}

        if (!photoUrl && typeof window !== "undefined") {
          photoUrl =
            localStorage.getItem(`dumalnext_teacher_photo_${teacherId}`) ||
            localStorage.getItem(`dumalnext_teacher_photo_${cleanEmail}`) ||
            undefined;
        }

        const activeUser: TeacherUser = {
          id: authUser.id,
          teacherDbId: teacherRecord?.id,
          teacherId,
          email: cleanEmail,
          fullName,
          firstName,
          lastName,
          department,
          userRole: "teacher",
          isEmailVerified: !!authUser.email_confirmed_at,
          photoUrl,
        };

        setUser(activeUser);
        setSessionCookie(activeUser);
        return;
      }

      // 2. Fallback to session cookie
      const cookieUser = getSessionCookie();
      if (cookieUser && cookieUser.userRole === "teacher") {
        const { data: verified } = await supabase
          .from("users")
          .select("id, user_role")
          .eq("id", cookieUser.id)
          .eq("user_role", "teacher")
          .limit(1);

        if (verified && verified.length > 0) {
          setUser(cookieUser);
        } else {
          clearSessionCookie();
          setUser(null);
        }
      } else {
        clearSessionCookie();
        setUser(null);
      }
    } catch (err) {
      console.warn("Notice reading teacher session:", err);
      clearSessionCookie();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await refreshSession();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        clearSessionCookie();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string; unconfirmedEmail?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId) {
      return { success: false, error: "Please enter your authorized Faculty Email or Employee ID." };
    }
    if (!cleanPass) {
      return { success: false, error: "Please enter your account password." };
    }

    try {
      // 1. Resolve email if Employee ID was entered (e.g. DNHS-TCH-001)
      let targetEmail = cleanId;
      if (!cleanId.includes("@")) {
        const { data: matchedTeachers } = await supabase
          .from("teachers")
          .select("email, teacher_id")
          .eq("teacher_id", cleanId.toUpperCase())
          .limit(1);

        if (matchedTeachers && matchedTeachers[0]?.email) {
          targetEmail = matchedTeachers[0].email;
        } else {
          const { data: matchedUsers } = await supabase
            .from("users")
            .select("email, user_id")
            .eq("user_id", cleanId.toUpperCase())
            .limit(1);

          if (matchedUsers && matchedUsers[0]?.email) {
            targetEmail = matchedUsers[0].email;
          }
        }
      }

      // 2. Pre-check role in public.users table to prevent cross-role login
      const { data: preUsers } = await supabase
        .from("users")
        .select("id, user_id, email, user_role")
        .eq("email", targetEmail)
        .limit(1);

      if (preUsers && preUsers.length > 0) {
        const uRole = (preUsers[0].user_role || "").toLowerCase();
        if (uRole && uRole !== "teacher") {
          let roleTitle = "School User";
          let portalUrl = "https://dumalnext.vercel.app";
          if (uRole === "student") {
            roleTitle = "Student Learner";
            portalUrl = "https://dumalnext.vercel.app";
          } else if (uRole === "admin") {
            roleTitle = "School Administrator";
            portalUrl = "https://dumalnext-admin.vercel.app";
          } else if (uRole === "it_support") {
            roleTitle = "IT Support";
            portalUrl = "https://dumalnext-it-support.vercel.app";
          }
          return {
            success: false,
            error: `Access Denied: This account is registered as a ${roleTitle}. Please sign in through the designated portal (${portalUrl}).`,
          };
        }
      }

      // 3. Sign in with Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: cleanPass,
      });

      if (authErr) {
        if (
          authErr.message.toLowerCase().includes("email not confirmed") ||
          authErr.message.toLowerCase().includes("unconfirmed")
        ) {
          return {
            success: false,
            error: "Email confirmation required: A verification link has been sent to your Gmail inbox. Please confirm your email before signing in.",
            unconfirmedEmail: targetEmail,
          };
        }

        // Check if the user exists in teachers table
        const { data: tchCheck } = await supabase
          .from("teachers")
          .select("*")
          .or(`email.eq.${targetEmail},teacher_id.eq.${cleanId.toUpperCase()}`)
          .limit(1);

        if (!tchCheck || tchCheck.length === 0) {
          return {
            success: false,
            error: "No faculty account found matching those credentials. Only authorized teachers of Dumalneg NHS may access this workstation.",
          };
        }

        return {
          success: false,
          error: "Invalid password entered. Please check your credentials or click Resend Verification.",
        };
      }

      const authUser = authData?.user;
      if (!authUser) {
        return { success: false, error: "Authentication failed. Please try again." };
      }

      // 4. Fetch teacher record & verify teacher role
      const { data: teacherRecords } = await supabase
        .from("teachers")
        .select("*")
        .or(`email.eq.${targetEmail},user_id.eq.${authUser.id}`)
        .limit(1);

      const tch = teacherRecords?.[0];
      const { data: verifyRole } = await supabase
        .from("users")
        .select("user_role")
        .eq("email", targetEmail)
        .limit(1);

      const dbRole = verifyRole?.[0]?.user_role;
      if (dbRole && dbRole !== "teacher") {
        await supabase.auth.signOut();
        clearSessionCookie();
        setUser(null);
        return {
          success: false,
          error: `Access Denied: This account has role "${dbRole}". Only authorized teachers may access the Faculty Workstation.`,
        };
      }

      if (!tch && dbRole !== "teacher") {
        await supabase.auth.signOut();
        clearSessionCookie();
        setUser(null);
        return {
          success: false,
          error: "Access Denied: No active faculty profile found for this email address.",
        };
      }

      const firstName = tch?.first_name || "Faculty";
      const lastName = tch?.last_name || "Member";
      const department = tch?.department || "CROSS_LEVEL";
      const teacherId = tch?.teacher_id || "DNHS-TCH-001";
      const fullName = `${firstName} ${lastName}`.trim();

      const sessionUser: TeacherUser = {
        id: authUser.id,
        teacherDbId: tch?.id,
        teacherId,
        email: targetEmail,
        fullName,
        firstName,
        lastName,
        department,
        userRole: "teacher",
        isEmailVerified: !!authUser.email_confirmed_at,
      };

      setUser(sessionUser);
      setSessionCookie(sessionUser);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:teacher-data-changed"));
      }

      return { success: true };
    } catch (e: any) {
      console.error("Faculty login error:", e);
      return { success: false, error: e?.message || "An unexpected error occurred during faculty login." };
    }
  };

  const resendVerification = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/`
        : "https://dumalnext-teacher.vercel.app/auth/callback?next=/";

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
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to resend confirmation email." };
    }
  };

  const updateUserName = (firstName: string, middleName: string | undefined, lastName: string) => {
    if (!user) return;
    const cleanFirst = firstName.trim();
    const cleanMiddle = middleName ? middleName.trim() : "";
    const cleanLast = lastName.trim();
    const fullName = `${cleanFirst} ${cleanMiddle ? cleanMiddle + " " : ""}${cleanLast}`.trim();
    const updatedUser: TeacherUser = {
      ...user,
      firstName: cleanFirst,
      lastName: cleanLast,
      fullName,
    };
    setUser(updatedUser);
    setSessionCookie(updatedUser);
  };

  const updateUserEmail = (newEmail: string) => {
    if (!user) return;
    const cleanEmail = newEmail.trim().toLowerCase();
    const updatedUser: TeacherUser = {
      ...user,
      email: cleanEmail,
    };
    setUser(updatedUser);
    setSessionCookie(updatedUser);
  };

  const updateUserPhoto = (photoUrl: string | null) => {
    if (!user) return;
    const updatedUser: TeacherUser = {
      ...user,
      photoUrl: photoUrl || undefined,
    };
    setUser(updatedUser);
    setSessionCookie(updatedUser);
    if (typeof window !== "undefined") {
      if (photoUrl) {
        localStorage.setItem(`dumalnext_teacher_photo_${user.teacherId}`, photoUrl);
        localStorage.setItem(`dumalnext_teacher_photo_${user.email}`, photoUrl);
      } else {
        localStorage.removeItem(`dumalnext_teacher_photo_${user.teacherId}`);
        localStorage.removeItem(`dumalnext_teacher_photo_${user.email}`);
      }
      window.dispatchEvent(new CustomEvent("dumalnext:teacher-data-changed"));
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    clearSessionCookie();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dumalnext:teacher-data-changed"));
    }
  };

  return (
    <TeacherAuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        resendVerification,
        logout,
        refreshSession,
        updateUserName,
        updateUserEmail,
        updateUserPhoto,
      }}
    >
      {children}
    </TeacherAuthContext.Provider>
  );
}

export function useTeacherAuth() {
  const context = useContext(TeacherAuthContext);
  if (!context) {
    throw new Error("useTeacherAuth must be used within a TeacherAuthProvider");
  }
  return context;
}
