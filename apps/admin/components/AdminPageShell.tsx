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
        <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] text-center space-y-4 shadow-sm animate-pulse">
          <div className="w-12 h-12 rounded-full bg-slate-200 mx-auto" />
          <div className="space-y-2">
            <div className="h-4 w-44 bg-slate-200 rounded mx-auto" />
            <div className="h-3 w-64 bg-slate-100 rounded mx-auto" />
          </div>
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
