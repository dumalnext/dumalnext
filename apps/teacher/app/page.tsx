"use client";

import React from "react";
import Link from "next/link";
import { useTeacherAuth } from "@/lib/auth/authContext";
import TeacherLoginForm from "@/components/TeacherLoginForm";

export default function TeacherHomePage() {
  const { user, isLoading, logout } = useTeacherAuth();
  const [scheduleCount, setScheduleCount] = React.useState<number | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("dumalnext_teacher_schedule_count");
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed)) return parsed;
        }
      } catch {}
    }
    return null;
  });

  React.useEffect(() => {
    if (!user) return;

    const cacheKey = user.teacherId
      ? `dumalnext_teacher_schedule_count_${user.teacherId}`
      : "dumalnext_teacher_schedule_count";

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(cacheKey) || localStorage.getItem("dumalnext_teacher_schedule_count");
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed)) setScheduleCount(parsed);
        }
      } catch {}
    }

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
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(cacheKey, data.schedules.length.toString());
                localStorage.setItem("dumalnext_teacher_schedule_count", data.schedules.length.toString());
              } catch {}
            }
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
      <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading Faculty Dashboard">
        {/* Faculty Welcome Banner Skeleton */}
        <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white border-t-4 border-amber-400 p-5 sm:p-6 rounded-[4px] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-5 w-24 bg-white/20 rounded-[4px]" />
              <div className="h-5 w-28 bg-emerald-500/20 rounded-[4px]" />
              <div className="h-5 w-32 bg-white/10 rounded-[4px]" />
            </div>
            <div className="h-7 w-64 bg-white/30 rounded-[4px]" />
          </div>
          <div className="h-9 w-32 bg-amber-400/40 rounded-[4px]" />
        </div>

        {/* 3 Main Workstation Navigation Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="bg-white p-5 sm:p-6 border-2 border-slate-200 border-t-4 border-t-[#002060] rounded-[6px] shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[6px] bg-[#002060]/10 flex items-center justify-center shrink-0">
                    <div className="w-5 h-5 bg-[#002060]/20 rounded" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2.5 w-16 bg-slate-200 rounded" />
                    <div className="h-4.5 w-44 bg-slate-200 rounded" />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Status
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-400 text-[11px] font-bold border border-slate-200 rounded-[4px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="inline-block w-20 h-3 bg-slate-200 rounded" />
                  </span>
                </div>
              </div>

              <div className="w-full h-10 bg-[#002060]/20 rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <TeacherLoginForm />;
  }

  return (
    <div className="space-y-6">
      {/* Faculty Welcome & Overview Banner */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white border-t-4 border-amber-400 p-5 sm:p-6 rounded-[4px] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/schedule"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#002060] text-xs font-bold transition-colors rounded-[4px] shadow-xs flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>View Schedule</span>
          </Link>
        </div>
      </div>

      {/* 3 Main Workstation Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Schedule */}
        <div className="bg-white p-5 sm:p-6 border-2 border-slate-200 hover:border-[#002060] border-t-4 border-t-[#002060] rounded-[6px] shadow-xs flex flex-col justify-between space-y-4 transition-all group">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[6px] bg-[#002060] text-amber-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                    Timetable
                  </span>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#002060] transition-colors leading-tight">
                    Teaching Load &amp; Schedule
                  </h3>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                Status
              </span>
              {scheduleCount === null ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-400 text-[11px] font-bold border border-slate-200 rounded-[4px] animate-pulse select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span className="inline-block w-20 h-3 bg-slate-200 rounded" />
                </span>
              ) : scheduleCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-900 text-[11px] font-bold border border-emerald-300 rounded-[4px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  {scheduleCount} Active Periods
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-300 rounded-[4px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Pending Release
                </span>
              )}
            </div>
          </div>

          <Link
            href="/schedule"
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs rounded-[4px]"
          >
            <span>Open Teaching Schedule</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Card 2: Roster */}
        <div className="bg-white p-5 sm:p-6 border-2 border-slate-200 hover:border-[#002060] border-t-4 border-t-[#002060] rounded-[6px] shadow-xs flex flex-col justify-between space-y-4 transition-all group">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[6px] bg-[#002060] text-amber-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                    Class Advisory
                  </span>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#002060] transition-colors leading-tight">
                    Advisory Section Roster
                  </h3>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                Status
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-900 text-[11px] font-bold border border-emerald-300 rounded-[4px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Live Rosters
              </span>
            </div>
          </div>

          <Link
            href="/roster"
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs rounded-[4px]"
          >
            <span>View Advisory Section Roster</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Card 3: Profile */}
        <div className="bg-white p-5 sm:p-6 border-2 border-slate-200 hover:border-[#002060] border-t-4 border-t-[#002060] rounded-[6px] shadow-xs flex flex-col justify-between space-y-4 transition-all group">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[6px] bg-[#002060] text-amber-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                    Personnel
                  </span>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#002060] transition-colors leading-tight">
                    Faculty Profile &amp; Credentials
                  </h3>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                Status
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-[#002060] text-[11px] font-bold border border-blue-200 rounded-[4px]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                Verified
              </span>
            </div>
          </div>

          <Link
            href="/profile"
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs rounded-[4px]"
          >
            <span>View Faculty Profile</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
