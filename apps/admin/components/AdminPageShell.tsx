"use client";

import React from "react";
import AdminHeaderNav from "@/components/AdminHeaderNav";
import AdminLoginForm from "@/components/AdminLoginForm";
import { useAdminAuth } from "@/lib/auth/authContext";

interface AdminPageShellProps {
  children: React.ReactNode;
  activeSection?: "adjudication" | "sections" | "scheduling" | "subjects" | "curriculum" | "control";
}

export default function AdminPageShell({
  children,
  activeSection,
}: AdminPageShellProps) {
  const { user, isLoading } = useAdminAuth();

  // Loading Screen for Initial Auth Check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <AdminHeaderNav activeSection={activeSection} />
        <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] text-center space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-full border-2 border-[#002060] border-t-amber-400 animate-spin mx-auto" />
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            Verifying Registrar Session
          </span>
          <p className="text-xs text-slate-600">
            Checking administrative clearance with Dumalneg NHS Registry...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated View
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-16">
        <AdminHeaderNav activeSection={activeSection} />
        <AdminLoginForm />
      </div>
    );
  }

  // Authenticated Console View
  return (
    <div className="min-h-screen bg-slate-50 space-y-6 font-sans pb-16">
      <AdminHeaderNav activeSection={activeSection} />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
