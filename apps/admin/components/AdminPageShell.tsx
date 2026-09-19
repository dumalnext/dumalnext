"use client";

import React from "react";
import AdminHeaderNav from "@/components/AdminHeaderNav";
import AdminLoginForm from "@/components/AdminLoginForm";
import { useAdminAuth } from "@/lib/auth/authContext";

interface AdminPageShellProps {
  children: React.ReactNode;
  activeSection?: "adjudication" | "sections" | "scheduling" | "control";
}

export default function AdminPageShell({
  children,
  activeSection,
}: AdminPageShellProps) {
  const { user, isLoading } = useAdminAuth();

  // Loading Screen for Initial Auth Check
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border-2 border-slate-300 text-center font-sans space-y-2 shadow-xs">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
          [ AUTHENTICATING ADMINISTRATIVE CREDENTIALS ]
        </span>
        <p className="text-xs text-slate-600">Verifying session security clearance with DepEd Realm...</p>
      </div>
    );
  }

  // Unauthenticated View
  if (!user) {
    return <AdminLoginForm />;
  }

  // Authenticated Console View
  return (
    <div className="space-y-6 font-sans">
      <AdminHeaderNav activeSection={activeSection} />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
