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
}

interface AuthContextType {
  user: StudentUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
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

  // Load session from HTTP Cookie and verify live with Supabase Database
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (typeof window !== "undefined") {
          const cachedUser = getSessionCookie();
          if (cachedUser) {
            // Live verification with Supabase: Check if this user still exists in public.users
            const { data: verified, error } = await supabase
              .from("users")
              .select("id")
              .eq("id", cachedUser.id)
              .limit(1);

            if (isMounted) {
              if (verified && verified.length > 0) {
                setUser(cachedUser);
              } else {
                // Account was deleted in Supabase! Immediately invalidate stale browser cookie
                clearSessionCookie();
                setUser(null);
              }
            }
            return;
          }
        }
      } catch (e) {
        console.warn("Session verification notice:", e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Dual Login via Email OR 12-Digit LRN (100% Supabase PostgreSQL Database)
  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: "Please enter your Email Address or 12-Digit LRN and password." };
    }

    try {
      // 1. Query Supabase 'users' table directly
      let suUser: any = null;
      let hasPasswordCol = true;

      const { data: usersWithPass, error: passErr } = await supabase
        .from("users")
        .select("id, user_id, email, user_role, password")
        .or(`email.eq.${cleanId},user_id.eq.${cleanId.toUpperCase()}`)
        .limit(1);

      if (passErr && passErr.message.includes("password")) {
        hasPasswordCol = false;
        const { data: usersBasic, error: basicErr } = await supabase
          .from("users")
          .select("id, user_id, email, user_role")
          .or(`email.eq.${cleanId},user_id.eq.${cleanId.toUpperCase()}`)
          .limit(1);

        if (basicErr) {
          return { success: false, error: "Database query error: " + basicErr.message };
        }
        suUser = usersBasic?.[0];
      } else {
        suUser = usersWithPass?.[0];
      }

      // If user not found by email or user_id, check students table by student_id
      if (!suUser) {
        const { data: stFound } = await supabase
          .from("students")
          .select("user_id")
          .eq("student_id", cleanId.toUpperCase())
          .limit(1);

        if (stFound && stFound[0]?.user_id) {
          const { data: userById } = await supabase
            .from("users")
            .select("id, user_id, email, user_role")
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

      // Verify password if password column exists in Supabase table
      if (hasPasswordCol && suUser.password && suUser.password !== cleanPass) {
        return {
          success: false,
          error: "Incorrect password entered. Please try again.",
        };
      }

      // 2. Query student profile from Supabase 'students' table
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
        lrn: profile?.student_id || undefined,
        userRole: "student",
      };

      setUser(sessionUser);
      setSessionCookie(sessionUser);
      return { success: true };
    } catch (e: any) {
      console.error("Supabase authentication error:", e);
      return { success: false, error: e?.message || "An unexpected authentication error occurred." };
    }
  };

  // Student Account Registration (100% Supabase PostgreSQL Database)
  const register = async (
    data: {
      firstName: string;
      middleName?: string;
      lastName: string;
      lrn?: string;
      email: string;
      password: string;
    },
    autoLogin: boolean = true
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanFirst = data.firstName.trim().toUpperCase();
    const cleanLast = data.lastName.trim().toUpperCase();
    const cleanMiddle = data.middleName ? data.middleName.trim().toUpperCase() : "";
    const cleanLrn = data.lrn ? data.lrn.replace(/\D/g, "").slice(0, 12) : "";

    if (!cleanFirst || !cleanLast) {
      return { success: false, error: "First Name and Last Name are required." };
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "A valid email address is required." };
    }

    if (!data.password || data.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters in length." };
    }

    try {
      // 1. Check if email already registered in Supabase
      const { data: existingUsers, error: checkErr } = await supabase
        .from("users")
        .select("id")
        .eq("email", cleanEmail)
        .limit(1);

      if (checkErr) {
        console.warn("Supabase user check warning:", checkErr.message);
      } else if (existingUsers && existingUsers.length > 0) {
        return {
          success: false,
          error: "An account with this email address already exists in the Dumalneg NHS Supabase database. Please sign in.",
        };
      }

      // Generate Official Dumalneg Student User ID (e.g. DNHS-STU-XXXXX)
      const newUserId = `DNHS-STU-${Math.floor(10000 + Math.random() * 90000)}`;
      const fullName = cleanMiddle
        ? `${cleanLast}, ${cleanFirst} ${cleanMiddle}`
        : `${cleanLast}, ${cleanFirst}`;

      // 2. Direct Cloud Insert to Supabase 'users' table
      let userPayload: Record<string, any> = {
        user_id: newUserId,
        email: cleanEmail,
        user_role: "student",
        password: data.password,
      };

      let suUser: any = null;
      let suInsertRes = await supabase.from("users").insert(userPayload).select().single();

      // If password column does not exist yet in Supabase schema, gracefully retry without it
      if (suInsertRes.error && (suInsertRes.error.message?.toLowerCase().includes("password") || suInsertRes.error.code === "PGRST204")) {
        delete userPayload.password;
        suInsertRes = await supabase.from("users").insert(userPayload).select().single();
      }

      if (suInsertRes.error) {
        return {
          success: false,
          error: "Database error creating user account: " + suInsertRes.error.message,
        };
      }

      suUser = suInsertRes.data;

      // 3. Direct Cloud Insert to Supabase 'students' profile table
      const { error: studentErr } = await supabase.from("students").insert({
        user_id: suUser.id,
        student_id: cleanLrn || newUserId,
        first_name: cleanFirst,
        middle_name: cleanMiddle || null,
        last_name: cleanLast,
        barangay: "Cabaritan",
        grade_level: 7,
      });

      if (studentErr) {
        console.warn("Supabase student profile insert warning:", studentErr.message);
      }

      const sessionUser: StudentUser = {
        id: suUser.id,
        userId: newUserId,
        email: cleanEmail,
        fullName,
        firstName: cleanFirst,
        middleName: cleanMiddle,
        lastName: cleanLast,
        lrn: cleanLrn || undefined,
        userRole: "student",
      };

      if (autoLogin) {
        setUser(sessionUser);
        setSessionCookie(sessionUser);
      }

      return { success: true };
    } catch (e: any) {
      console.error("Supabase registration error:", e);
      return { success: false, error: e?.message || "An unexpected error occurred during registration." };
    }
  };

  const logout = () => {
    setUser(null);
    clearSessionCookie();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
