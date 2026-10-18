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

      const cached = getSessionCookie();
      if (cached && cached.email?.toLowerCase() === AUTHORIZED_IT_EMAIL.toLowerCase() && cached.userRole === "it_support") {
        setUser(cached);
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const sEmail = (session.user.email || "").toLowerCase().trim();
        const { data: itUsers } = await supabase
          .from("users")
          .select("id, user_id, email, user_role")
          .eq("email", sEmail)
          .maybeSingle();

        if (itUsers && itUsers.user_role === "it_support") {
          const verifiedUser: ITSupportUser = {
            id: session.user.id,
            userId: itUsers.user_id || "DNHS-IT-001",
            email: sEmail,
            fullName: "DNHS IT Operations & Systems Desk",
            systemRole: "System Administrator",
            userRole: "it_support",
          };
          setUser(verifiedUser);
          setSessionCookie(verifiedUser);
          setIsLoading(false);
          return;
        } else {
          await supabase.auth.signOut();
          clearSessionCookie();
          setUser(null);
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
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId) {
      return { success: false, error: "Please enter your authorized IT Support email or username." };
    }
    if (!cleanPass) {
      return { success: false, error: "Please enter your account password." };
    }

    // Check if entered email belongs to another stakeholder role
    if (cleanId.includes("@")) {
      const { data: matchedRoleUsers } = await supabase
        .from("users")
        .select("id, user_id, email, user_role")
        .eq("email", cleanId)
        .limit(1);

      if (matchedRoleUsers && matchedRoleUsers.length > 0) {
        const uRole = (matchedRoleUsers[0].user_role || "").toLowerCase();
        if (uRole && uRole !== "it_support") {
          let roleTitle = "School User";
          let portalUrl = "https://dumalnext.vercel.app";
          if (uRole === "student") {
            roleTitle = "Student Learner";
            portalUrl = "https://dumalnext.vercel.app";
          } else if (uRole === "teacher") {
            roleTitle = "Faculty Teacher";
            portalUrl = "https://dumalnext-teacher.vercel.app";
          } else if (uRole === "admin") {
            roleTitle = "School Administrator";
            portalUrl = "https://dumalnext-admin.vercel.app";
          }
          return {
            success: false,
            error: `Access Denied: This account is officially registered as a ${roleTitle}. Please sign in through the designated portal (${portalUrl}).`,
          };
        }
      }
    }

    const isMasterIT = cleanId === AUTHORIZED_IT_EMAIL.toLowerCase() || cleanId === "dnhs-it-001";
    if (!isMasterIT) {
      const { data: itStaffUser } = await supabase
        .from("users")
        .select("id, user_id, email, user_role")
        .eq("email", cleanId)
        .eq("user_role", "it_support")
        .maybeSingle();

      if (!itStaffUser) {
        return {
          success: false,
          error: "Access Denied: Only authorized IT Support personnel of Dumalneg NHS are permitted to access this workstation.",
        };
      }

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password: cleanPass,
      });

      if (authErr) {
        return {
          success: false,
          error: "Invalid IT Support password. Please check your credentials or reset your password.",
        };
      }

      if (authData.user) {
        const sessionUser: ITSupportUser = {
          id: authData.user.id,
          userId: itStaffUser.user_id || "DNHS-IT-STAFF",
          email: cleanId,
          fullName: "DNHS IT Operations & Systems Desk",
          systemRole: "System Administrator",
          userRole: "it_support",
        };
        setUser(sessionUser);
        setSessionCookie(sessionUser);
        return { success: true };
      }
    }

    if (cleanPass !== AUTHORIZED_IT_PASS) {
      return {
        success: false,
        error: "Invalid security password. Please enter the authorized password for dumalnext@gmail.com.",
      };
    }

    try {
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
