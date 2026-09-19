"use client";

import React from "react";
import { useTeacherAuth } from "@/lib/auth/authContext";
import TeacherLoginForm from "@/components/TeacherLoginForm";
import TeacherDashboard from "@/components/TeacherDashboard";

export default function TeacherHomePage() {
  const { user, isLoading } = useTeacherAuth();

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] shadow-sm text-center space-y-3">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
          [ DUMALNEG NATIONAL HIGH SCHOOL ]
        </span>
        <h2 className="text-base font-bold text-slate-900 uppercase">
          Verifying Faculty Session Credentials...
        </h2>
        <p className="text-xs font-mono text-slate-500">
          Connecting to DepEd Faculty Database &bull; Please wait.
        </p>
      </div>
    );
  }

  if (!user) {
    return <TeacherLoginForm />;
  }

  return <TeacherDashboard />;
}
