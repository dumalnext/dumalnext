"use client";

import React from "react";
import Link from "next/link";
import { useTeacherAuth } from "@/lib/auth/authContext";
import TeacherLoginForm from "@/components/TeacherLoginForm";

export default function TeacherHomePage() {
  const { user, isLoading, logout } = useTeacherAuth();
  const [scheduleCount, setScheduleCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!user) return;

    const fetchLoad = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (user.teacherDbId) queryParams.set("teacherDbId", user.teacherDbId);
        if (user.teacherId) queryParams.set("teacherId", user.teacherId);
        if (user.id) queryParams.set("userId", user.id);
        if (user.email) queryParams.set("email", user.email);
        if (user.fullName) queryParams.set("name", user.fullName);

        const res = await fetch(`/api/schedules?${queryParams.toString()}&_t=${Date.now()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.schedules)) {
            setScheduleCount(data.schedules.length);
            return;
          }
        }
        setScheduleCount(0);
      } catch {
        setScheduleCount(0);
      }
    };

    fetchLoad();

    const handleSync = () => fetchLoad();
    if (typeof window !== "undefined") {
      window.addEventListener("dumalnext:teacher-data-changed", handleSync);
      window.addEventListener("dumalnext:admin-data-changed", handleSync);
      window.addEventListener("dumalnext:data-changed", handleSync);
      window.addEventListener("focus", handleSync);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dumalnext:teacher-data-changed", handleSync);
        window.removeEventListener("dumalnext:admin-data-changed", handleSync);
        window.removeEventListener("dumalnext:data-changed", handleSync);
        window.removeEventListener("focus", handleSync);
      }
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] text-center space-y-3">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
          DUMALNEG NATIONAL HIGH SCHOOL
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

  return (
    <div className="space-y-6">
      {/* Faculty Welcome & Overview Banner */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white border-t-4 border-amber-400 p-6 rounded-[4px] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-200 border border-amber-300/40 text-xs font-bold rounded-[4px]">
              {user.teacherId}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-100 border border-emerald-400/40 text-xs font-bold rounded-[4px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active Faculty
            </span>
            <span className="px-2.5 py-0.5 bg-white/10 text-blue-100 border border-white/20 text-xs font-semibold rounded-[4px]">
              Department: {user.department}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Welcome, {user.fullName || user.email}
          </h2>
          <p className="text-xs text-blue-100">
            Dumalneg National High School &bull; Faculty Workstation &bull; {user.email}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/schedule"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#002060] text-xs font-bold transition-colors rounded-[4px] shadow-xs"
          >
            View Schedule &rarr;
          </Link>
        </div>
      </div>

      {/* 3 Main Workstation Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Schedule */}
        <div className="bg-white p-6 border-2 border-slate-200 hover:border-[#002060] border-t-4 border-t-[#002060] rounded-[4px] shadow-xs flex flex-col justify-between space-y-4 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#002060]">
                Instructional Timetable
              </span>
              {scheduleCount !== null && scheduleCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-900 text-[11px] font-bold border border-emerald-300 rounded-[4px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  {scheduleCount} Active Periods
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-300 rounded-[4px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Pending Release
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Teaching Load &amp; Schedule
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {scheduleCount !== null && scheduleCount > 0
                ? `Official instructional timetable active with ${scheduleCount} assigned period(s). View your weekly schedule and classrooms.`
                : "View your official weekly instructional timetable, assigned subject periods, and designated classrooms."}
            </p>
          </div>

          <Link
            href="/schedule"
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold text-center block transition-colors shadow-xs rounded-[4px]"
          >
            Open Teaching Schedule &rarr;
          </Link>
        </div>

        {/* Card 2: Roster */}
        <div className="bg-white p-6 border-2 border-slate-200 hover:border-[#002060] border-t-4 border-t-[#002060] rounded-[4px] shadow-xs flex flex-col justify-between space-y-4 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#002060]">
                Class Advisory
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-900 text-[11px] font-bold border border-emerald-300 rounded-[4px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Live Rosters
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Advisory Section Roster
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Access certified masterlists of officially enrolled learners in your designated advisory class section, with real-time student LRN search.
            </p>
          </div>

          <Link
            href="/roster"
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold text-center block transition-colors shadow-xs rounded-[4px]"
          >
            View Advisory Section Roster &rarr;
          </Link>
        </div>

        {/* Card 3: Profile */}
        <div className="bg-white p-6 border-2 border-slate-200 hover:border-[#002060] border-t-4 border-t-[#002060] rounded-[4px] shadow-xs flex flex-col justify-between space-y-4 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#002060]">
                Personnel Record
              </span>
              <span className="px-2.5 py-0.5 bg-blue-50 text-[#002060] text-[11px] font-bold border border-blue-200 rounded-[4px]">
                Verified
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Faculty Profile &amp; Credentials
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inspect your official DepEd personnel information, department specialization, and teaching load compliance limits.
            </p>
          </div>

          <Link
            href="/profile"
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold text-center block transition-colors shadow-xs rounded-[4px]"
          >
            View Faculty Profile &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
