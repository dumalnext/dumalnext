"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth/authContext";
import SessionTimeoutModal from "@/components/SessionTimeoutModal";
import { ToastProvider } from "@/components/ui/PortalUI";

export default function StudentProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <SessionTimeoutModal />
      </ToastProvider>
    </AuthProvider>
  );
}
