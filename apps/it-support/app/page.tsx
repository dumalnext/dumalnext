"use client";

import React, { useState } from "react";
import { ITSupportAuthProvider, useITSupportAuth } from "@/lib/auth/itSupportAuthContext";
import ITSupportHeaderNav, { ITSupportActiveTab } from "@/components/ITSupportHeaderNav";
import ITSupportLoginForm from "@/components/ITSupportLoginForm";
import AcademicCalendarManager from "@/components/AcademicCalendarManager";
import ClassroomFacilityManager from "@/components/ClassroomFacilityManager";
import UserRoleAuditor from "@/components/UserRoleAuditor";
import SystemDiagnosticsMonitor from "@/components/SystemDiagnosticsMonitor";
import StaffInvitationManager from "@/components/StaffInvitationManager";
import StudentConcernsManager from "@/components/StudentConcernsManager";
import SessionTimeoutModal from "@/components/SessionTimeoutModal";

function ITSupportPortalContent() {
  const { user, isLoading } = useITSupportAuth();
  const [activeTab, setActiveTab] = useState<ITSupportActiveTab>("calendar");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <ITSupportHeaderNav activeTab={activeTab} onSelectTab={setActiveTab} />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6 animate-pulse" aria-busy="true" aria-label="Loading IT Support Portal">
          {/* Top Banner Skeleton */}
          <div className="bg-slate-200 border-t-4 border-amber-400 p-6 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-6 w-64 bg-slate-300 rounded" />
              <div className="h-4 w-96 bg-slate-300 rounded" />
            </div>
            <div className="h-10 w-44 bg-slate-300 rounded-lg" />
          </div>

          {/* 4 KPI Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="h-5 w-28 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Main Table / Console Skeleton */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-8 w-32 bg-slate-200 rounded" />
            </div>
            <div className="divide-y divide-slate-100 p-2 space-y-2">
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <div key={row} className="h-12 bg-slate-50 rounded w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-16">
        <ITSupportHeaderNav activeTab={activeTab} onSelectTab={setActiveTab} />
        <ITSupportLoginForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <ITSupportHeaderNav activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {activeTab === "calendar" && <AcademicCalendarManager />}
        {activeTab === "classrooms" && <ClassroomFacilityManager />}
        {activeTab === "users" && <UserRoleAuditor />}
        {activeTab === "diagnostics" && <SystemDiagnosticsMonitor />}
        {activeTab === "invitations" && <StaffInvitationManager />}
        {activeTab === "concerns" && <StudentConcernsManager />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        Dumalneg National High School &bull; IT Support &amp; System Administration Desk &bull; DepEd Three-Term Academic Model
      </footer>
    </div>
  );
}

export default function ITSupportHomePage() {
  return (
    <ITSupportAuthProvider>
      <ITSupportPortalContent />
      <SessionTimeoutModal />
    </ITSupportAuthProvider>
  );
}
