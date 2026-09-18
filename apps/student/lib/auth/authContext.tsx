"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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

// Clean initial user state (Requires authentic student registration)
const INITIAL_DEMO_USERS: (StudentUser & { passwordHash: string })[] = [];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load session from localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        // Initialize demo users in storage if not existing
        const storedUsers = localStorage.getItem("dumalnext_student_users");
        if (!storedUsers) {
          localStorage.setItem("dumalnext_student_users", JSON.stringify(INITIAL_DEMO_USERS));
        }

        const activeSession = localStorage.getItem("dumalnext_student_session");
        if (activeSession) {
          setUser(JSON.parse(activeSession));
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Dual Login via Email OR 12-Digit LRN
  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: "Please enter your email or LRN and password." };
    }

    try {
      if (typeof window !== "undefined") {
        const storedUsers = JSON.parse(
          localStorage.getItem("dumalnext_student_users") || JSON.stringify(INITIAL_DEMO_USERS)
        );

        const foundUser = storedUsers.find((u: StudentUser & { passwordHash: string }) => {
          const matchEmail = u.email.toLowerCase() === cleanId;
          const matchLrn = u.lrn && u.lrn.trim() === cleanId;
          const matchUserId = u.userId.toLowerCase() === cleanId;
          return (matchEmail || matchLrn || matchUserId) && u.passwordHash === cleanPass;
        });

        if (foundUser) {
          const sessionUser: StudentUser = {
            id: foundUser.id,
            userId: foundUser.userId,
            email: foundUser.email,
            fullName: foundUser.fullName,
            firstName: foundUser.firstName,
            middleName: foundUser.middleName,
            lastName: foundUser.lastName,
            lrn: foundUser.lrn,
            userRole: "student",
          };

          setUser(sessionUser);
          localStorage.setItem("dumalnext_student_session", JSON.stringify(sessionUser));
          return { success: true };
        }
      }

      return {
        success: false,
        error: "Invalid credentials. Please verify your Email Address or 12-Digit LRN and password.",
      };
    } catch {
      return { success: false, error: "An unexpected authentication error occurred." };
    }
  };

  // Student Account Registration (Aligned with Class Diagram: Name, LRN, Email, Password - No mobile)
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
      if (typeof window !== "undefined") {
        const storedUsers = JSON.parse(
          localStorage.getItem("dumalnext_student_users") || JSON.stringify(INITIAL_DEMO_USERS)
        );

        // Check if email already registered
        const emailExists = storedUsers.some(
          (u: StudentUser) => u.email.toLowerCase() === cleanEmail
        );
        if (emailExists) {
          return {
            success: false,
            error: "An account with this email address already exists. Please sign in instead.",
          };
        }

        // Check if LRN already registered
        if (cleanLrn) {
          const lrnExists = storedUsers.some(
            (u: StudentUser) => u.lrn && u.lrn === cleanLrn
          );
          if (lrnExists) {
            return {
              success: false,
              error: "An account with this 12-Digit LRN already exists. Please sign in.",
            };
          }
        }

        const newId = `stu-${Date.now()}`;
        const newUserId = `DNHS-STU-${Math.floor(10000 + Math.random() * 90000)}`;
        const fullName = cleanMiddle
          ? `${cleanLast}, ${cleanFirst} ${cleanMiddle}`
          : `${cleanLast}, ${cleanFirst}`;

        const newUserRecord = {
          id: newId,
          userId: newUserId,
          email: cleanEmail,
          fullName,
          firstName: cleanFirst,
          middleName: cleanMiddle,
          lastName: cleanLast,
          lrn: cleanLrn || undefined,
          userRole: "student" as const,
          passwordHash: data.password,
        };

        storedUsers.push(newUserRecord);
        localStorage.setItem("dumalnext_student_users", JSON.stringify(storedUsers));

        if (autoLogin) {
          const sessionUser: StudentUser = {
            id: newUserRecord.id,
            userId: newUserRecord.userId,
            email: newUserRecord.email,
            fullName: newUserRecord.fullName,
            firstName: newUserRecord.firstName,
            middleName: newUserRecord.middleName,
            lastName: newUserRecord.lastName,
            lrn: newUserRecord.lrn,
            userRole: "student",
          };

          setUser(sessionUser);
          localStorage.setItem("dumalnext_student_session", JSON.stringify(sessionUser));
        }

        return { success: true };
      }

      return { success: false, error: "Registration failed." };
    } catch {
      return { success: false, error: "An unexpected error occurred during registration." };
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("dumalnext_student_session");
    }
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
