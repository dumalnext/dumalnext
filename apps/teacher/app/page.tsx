"use client";

import React from "react";
import Link from "next/link";
import { useTeacherAuth } from "@/lib/auth/authContext";
import TeacherLoginForm from "@/components/TeacherLoginForm";

export default function TeacherHomePage() {
  const { user, isLoading, logout } = useTeacherAuth();

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
              <span className="px-2 py-0.5 bg-amber-100 text-amber-950 font-mono text-[10px] font-bold uppercase border border-amber-300">
                PENDING RELEASE
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 uppercase">
              Teaching Load &amp; Schedule
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              View your official weekly instructional timetable, assigned subject periods, and designated classrooms.
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
              Class Section Rosters
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Access certified masterlists of enrolled students across class sections, with real-time student LRN search.
            </p>
          </div>

          <Link
            href="/roster"
            className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider text-center block transition-colors shadow-2xs"
          >
            [ View Class Rosters ]
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
