"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth/authContext";
import SessionTimeoutModal from "@/components/SessionTimeoutModal";
import VirtualWaitingRoom from "@/components/VirtualWaitingRoom";
import { ToastProvider } from "@/components/ui/PortalUI";
import { LanguageProvider } from "@/lib/context/LanguageContext";

export default function StudentProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
          <SessionTimeoutModal />
          <VirtualWaitingRoom />
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
