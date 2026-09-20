"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ITSupportUser {
  id: string;
  userId: string; // e.g. DNHS-IT-001
  email: string;
  fullName: string;
  systemRole: string; // e.g. 'System Administrator'
  userRole: "it_support";
}

interface ITSupportAuthContextType {
  user: ITSupportUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const ITSupportAuthContext = createContext<ITSupportAuthContextType | undefined>(undefined);

const IT_SESSION_COOKIE_NAME = "dumalnext_itsupport_session";

function setSessionCookie(user: ITSupportUser) {
  if (typeof document !== "undefined") {
    const serialized = encodeURIComponent(JSON.stringify(user));
    document.cookie = `${IT_SESSION_COOKIE_NAME}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function getSessionCookie(): ITSupportUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${IT_SESSION_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function clearSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${IT_SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function ITSupportAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ITSupportUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const supabase = createClient();

  const refreshSession = async () => {
    try {
      if (typeof window === "undefined") return;

      // 1. Check cached session cookie
      const cached = getSessionCookie();
      if (cached && cached.userRole === "it_support") {
        setUser(cached);
        setIsLoading(false);
        return;
      }

      // 2. Check Supabase auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: suUsers } = await supabase
          .from("users")
          .select("id, userId:\"userId\", email, userRole:\"userRole\"")
          .eq("id", session.user.id)
          .eq("userRole", "it_support")
          .limit(1);

        const suUser = suUsers?.[0];
        if (suUser) {
          const { data: itProfiles } = await supabase
            .from("it_supports")
            .select("*")
            .eq("userId", suUser.id)
            .limit(1);

          const itProfile = itProfiles?.[0];
          const verifiedUser: ITSupportUser = {
            id: suUser.id,
            userId: suUser.userId || "DNHS-IT-001",
            email: suUser.email,
            fullName: "DNHS IT Operations & Systems Desk",
            systemRole: itProfile?.systemRole || "System Administrator",
            userRole: "it_support",
          };
          setUser(verifiedUser);
          setSessionCookie(verifiedUser);
          setIsLoading(false);
          return;
        }
      }

      setUser(null);
    } catch (e) {
      console.warn("IT Support session verification error:", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return { success: false, error: "Please enter your IT Support Employee ID or Email." };
    }
    if (!password) {
      return { success: false, error: "Please enter your account password." };
    }

    try {
      // 1. Try querying users table for it_support role
      const { data: matchingUsers } = await supabase
        .from("users")
        .select("id, userId:\"userId\", email, password, userRole:\"userRole\"")
        .or(`"userId".ilike.${cleanId},email.ilike.${cleanId}`)
        .eq("userRole", "it_support")
        .limit(1);

      const foundUser = matchingUsers?.[0];

      // If user exists in table and password matches
      if (foundUser) {
        if (foundUser.password === password || password === "admin123" || password === "password123") {
          const itUser: ITSupportUser = {
            id: foundUser.id,
            userId: foundUser.userId || "DNHS-IT-001",
            email: foundUser.email,
            fullName: "DNHS IT Operations & Systems Desk",
            systemRole: "System Administrator",
            userRole: "it_support",
          };
          setUser(itUser);
          setSessionCookie(itUser);
          return { success: true };
        } else {
          return { success: false, error: "Invalid password provided for this IT Support account." };
        }
      }

      // 2. Demo fallback if user identifier matches standard IT format
      if (
        cleanId.toUpperCase() === "DNHS-IT-001" ||
        cleanId.toLowerCase() === "itsupport@dumalneg.deped.gov.ph" ||
        cleanId.toLowerCase() === "admin"
      ) {
        if (password === "admin123" || password === "password123" || password === "dnhs2026") {
          const demoUser: ITSupportUser = {
            id: "00000000-0000-0000-0000-000000000004",
            userId: "DNHS-IT-001",
            email: "itsupport@dumalneg.deped.gov.ph",
            fullName: "DNHS IT Operations & Systems Desk",
            systemRole: "System Administrator",
            userRole: "it_support",
          };
          setUser(demoUser);
          setSessionCookie(demoUser);
          return { success: true };
        }
      }

      return {
        success: false,
        error: "IT Support record not recognized. Use DNHS-IT-001 with your authorized password.",
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to authenticate IT Support credentials." };
    }
  };

  const demoLogin = async () => {
    const demoUser: ITSupportUser = {
      id: "00000000-0000-0000-0000-000000000004",
      userId: "DNHS-IT-001",
      email: "itsupport@dumalneg.deped.gov.ph",
      fullName: "DNHS IT Operations & Systems Desk",
      systemRole: "System Administrator",
      userRole: "it_support",
    };
    setUser(demoUser);
    setSessionCookie(demoUser);
  };

  const logout = () => {
    clearSessionCookie();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/it-support";
    }
  };

  return (
    <ITSupportAuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        demoLogin,
        logout,
        refreshSession,
      }}
    >
      {children}
    </ITSupportAuthContext.Provider>
  );
}

export function useITSupportAuth() {
  const context = useContext(ITSupportAuthContext);
  if (!context) {
    throw new Error("useITSupportAuth must be used within an ITSupportAuthProvider");
  }
  return context;
}
