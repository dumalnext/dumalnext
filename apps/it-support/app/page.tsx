"use client";

import React, { useState } from "react";
import { ITSupportAuthProvider, useITSupportAuth } from "@/lib/auth/itSupportAuthContext";
import ITSupportHeaderNav, { ITSupportActiveTab } from "@/components/ITSupportHeaderNav";
import ITSupportLoginForm from "@/components/ITSupportLoginForm";
import AcademicCalendarManager from "@/components/AcademicCalendarManager";
import ClassroomFacilityManager from "@/components/ClassroomFacilityManager";
import UserRoleAuditor from "@/components/UserRoleAuditor";
import SystemDiagnosticsMonitor from "@/components/SystemDiagnosticsMonitor";

function ITSupportPortalContent() {
  const { user, isLoading } = useITSupportAuth();
  const [activeTab, setActiveTab] = useState<ITSupportActiveTab>("calendar");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white border-2 border-slate-300 p-8 text-center space-y-2 font-mono text-xs uppercase font-bold text-[#002060]">
          [ Verifying IT Support Authentication Credentials... ]
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <ITSupportLoginForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans">
      <ITSupportHeaderNav activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {activeTab === "calendar" && <AcademicCalendarManager />}
        {activeTab === "classrooms" && <ClassroomFacilityManager />}
        {activeTab === "users" && <UserRoleAuditor />}
        {activeTab === "diagnostics" && <SystemDiagnosticsMonitor />}
      </main>

      <footer className="bg-white border-t-2 border-slate-300 py-4 px-6 text-center text-[10px] font-mono uppercase text-slate-500">
        Dumalneg National High School &bull; IT Support &amp; System Administration Desk &bull; Aligned with DepEd Three-Term Academic Model &bull; Zero Hardcoded Dates
      </footer>
    </div>
  );
}

export default function ITSupportHomePage() {
  return (
    <ITSupportAuthProvider>
      <ITSupportPortalContent />
    </ITSupportAuthProvider>
  );
}
