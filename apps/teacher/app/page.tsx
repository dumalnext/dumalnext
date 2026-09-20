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

  return (
    <div className="space-y-6 font-sans">
      {/* Faculty Welcome & Overview Card */}
      <div className="bg-white p-6 border-2 border-[#002060] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-900 text-white font-mono text-xs font-bold uppercase">
              {user.teacherId}
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-950 font-mono text-xs font-bold uppercase border border-emerald-300">
              [ ACTIVE FACULTY ]
            </span>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-mono text-xs font-bold uppercase border border-slate-300">
              Dept: {user.department}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight">
            Welcome, {user.fullName || user.email}
          </h2>
          <p className="text-xs font-mono text-slate-600">
            Dumalneg National High School &bull; Faculty Workstation &bull; {user.email}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-900 border border-slate-300 hover:border-red-400 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            [ Sign Out ]
          </button>
        </div>
      </div>

      {/* 3 Main Workstation Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Schedule */}
        <div className="bg-white p-6 border-2 border-slate-300 hover:border-[#002060] shadow-xs flex flex-col justify-between space-y-4 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase">
                [ MODULE 01 ]
              </span>
              {scheduleCount !== null && scheduleCount > 0 ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 font-mono text-[10px] font-bold uppercase border border-emerald-400">
                  [ {scheduleCount} ACTIVE PERIODS ]
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-950 font-mono text-[10px] font-bold uppercase border border-amber-300">
                  [ PENDING RELEASE ]
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 uppercase">
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
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider text-center block transition-colors shadow-2xs"
          >
            [ Open Teaching Schedule ]
          </Link>
        </div>

        {/* Card 2: Roster */}
        <div className="bg-white p-6 border-2 border-slate-300 hover:border-[#002060] shadow-xs flex flex-col justify-between space-y-4 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase">
                [ MODULE 02 ]
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 font-mono text-[10px] font-bold uppercase border border-emerald-300">
                LIVE ROSTERS
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 uppercase">
              Advisory Section Roster
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Access certified masterlists of officially enrolled learners in your designated advisory class section, with real-time student LRN search.
            </p>
          </div>

          <Link
            href="/roster"
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider text-center block transition-colors shadow-2xs"
          >
            [ View Advisory Section Roster ]
          </Link>
        </div>

        {/* Card 3: Profile */}
        <div className="bg-white p-6 border-2 border-slate-300 hover:border-[#002060] shadow-xs flex flex-col justify-between space-y-4 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase">
                [ MODULE 03 ]
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-950 font-mono text-[10px] font-bold uppercase border border-blue-300">
                VERIFIED
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 uppercase">
              Faculty Profile &amp; Credentials
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inspect your official DepEd personnel information, department specialization, and teaching load compliance limits.
            </p>
          </div>

          <Link
            href="/profile"
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider text-center block transition-colors shadow-2xs"
          >
            [ View Faculty Profile ]
          </Link>
        </div>
      </div>
    </div>
  );
}
