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
import SessionTimeoutModal from "@/components/SessionTimeoutModal";

function ITSupportPortalContent() {
  const { user, isLoading } = useITSupportAuth();
  const [activeTab, setActiveTab] = useState<ITSupportActiveTab>("calendar");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <ITSupportHeaderNav activeTab={activeTab} onSelectTab={setActiveTab} />
        <div className="max-w-md w-full mx-auto my-20 bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] p-8 text-center space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-full border-2 border-[#002060] border-t-amber-400 animate-spin mx-auto" />
          <span className="text-xs uppercase font-bold text-[#002060] tracking-wider block">
            Verifying IT Support Session
          </span>
          <p className="text-xs text-slate-500">Checking credentials with Dumalneg NHS system registry...</p>
        </div>
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
