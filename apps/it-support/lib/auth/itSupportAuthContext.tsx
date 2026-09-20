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
const AUTHORIZED_IT_EMAIL = "dumalnext@gmail.com";
const AUTHORIZED_IT_PASS = "dumalNext26.";

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
      if (cached && cached.email?.toLowerCase() === AUTHORIZED_IT_EMAIL.toLowerCase() && cached.userRole === "it_support") {
        setUser(cached);
        setIsLoading(false);
        return;
      }

      // 2. Check Supabase auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && session.user.email?.toLowerCase() === AUTHORIZED_IT_EMAIL.toLowerCase()) {
        const verifiedUser: ITSupportUser = {
          id: session.user.id,
          userId: "DNHS-IT-001",
          email: AUTHORIZED_IT_EMAIL,
          fullName: "DNHS IT Operations & Systems Desk",
          systemRole: "System Administrator",
          userRole: "it_support",
        };
        setUser(verifiedUser);
        setSessionCookie(verifiedUser);
        setIsLoading(false);
        return;
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
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId) {
      return { success: false, error: "Please enter your authorized IT Support email (dumalnext@gmail.com)." };
    }
    if (!cleanPass) {
      return { success: false, error: "Please enter your account password." };
    }

    // STRICT CHECK: Only dumalnext@gmail.com or DNHS-IT-001 allowed
    if (cleanId !== AUTHORIZED_IT_EMAIL.toLowerCase() && cleanId !== "dnhs-it-001") {
      return {
        success: false,
        error: "Access Denied: Only the authorized administrator email (dumalnext@gmail.com) is permitted to access the IT Support portal.",
      };
    }

    // PASSWORD CHECK
    if (cleanPass !== AUTHORIZED_IT_PASS) {
      return {
        success: false,
        error: "Invalid security password. Please enter the authorized password for dumalnext@gmail.com.",
      };
    }

    try {
      // Ensure user record exists in Supabase PostgreSQL
      const { data: suUsers } = await supabase
        .from("users")
        .select("id, userId:\"userId\", email")
        .eq("email", AUTHORIZED_IT_EMAIL)
        .limit(1);

      let userId = "00000000-0000-0000-0000-000000000004";
      if (suUsers && suUsers.length > 0) {
        userId = suUsers[0].id;
        await supabase
          .from("users")
          .update({ password: AUTHORIZED_IT_PASS, userRole: "it_support" })
          .eq("id", userId);
      } else {
        const { data: newUser } = await supabase.from("users").insert({
          userId: "DNHS-IT-001",
          email: AUTHORIZED_IT_EMAIL,
          password: AUTHORIZED_IT_PASS,
          userRole: "it_support",
        }).select().single();
        if (newUser) userId = newUser.id;
      }

      // Upsert into it_supports profile
      await supabase.from("it_supports").upsert({
        userId: userId,
        itsupportID: "DNHS-IT-001",
        systemRole: "System Administrator",
      }, { onConflict: "itsupportID" });

      const itUser: ITSupportUser = {
        id: userId,
        userId: "DNHS-IT-001",
        email: AUTHORIZED_IT_EMAIL,
        fullName: "DNHS IT Operations & Systems Desk",
        systemRole: "System Administrator",
        userRole: "it_support",
      };

      setUser(itUser);
      setSessionCookie(itUser);
      return { success: true };
    } catch (err: any) {
      // Even if offline or network lag, session is authenticated via strict credential match
      const fallbackUser: ITSupportUser = {
        id: "00000000-0000-0000-0000-000000000004",
        userId: "DNHS-IT-001",
        email: AUTHORIZED_IT_EMAIL,
        fullName: "DNHS IT Operations & Systems Desk",
        systemRole: "System Administrator",
        userRole: "it_support",
      };
      setUser(fallbackUser);
      setSessionCookie(fallbackUser);
      return { success: true };
    }
  };

  const demoLogin = async () => {
    await login(AUTHORIZED_IT_EMAIL, AUTHORIZED_IT_PASS);
  };

  const logout = () => {
    clearSessionCookie();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
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
