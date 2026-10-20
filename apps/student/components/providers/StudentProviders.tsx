"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth/authContext";
import SessionTimeoutModal from "@/components/SessionTimeoutModal";

export default function StudentProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <SessionTimeoutModal />
    </AuthProvider>
  );
}
