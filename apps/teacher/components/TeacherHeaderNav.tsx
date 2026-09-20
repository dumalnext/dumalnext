"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTeacherAuth } from "@/lib/auth/authContext";

export default function TeacherHeaderNav() {
  const { user, logout } = useTeacherAuth();
  const pathname = usePathname() || "";

  const isSchedule = pathname === "/schedule";
  const isRoster = pathname === "/roster";
  const isProfile = pathname === "/profile";
  const isOverview = pathname === "/" || pathname === "";

  return (
    <header className="deped-header border-b-4 border-[#002060] bg-white text-slate-900 shadow-sm font-sans">
      {/* Top DepEd Region I Strip */}
      <div className="bg-[#002060] text-white px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-blue-200 uppercase">
              DEPED REGION I &bull; SDO ILOCOS NORTE &bull; DUMALNEG NHS
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-blue-200">PORTAL 02:</span>
            <span className="bg-blue-900 border border-blue-400/40 px-2 py-0.5 font-bold uppercase tracking-wider">
              FACULTY &amp; TEACHER WORKSTATION
            </span>
          </div>
        </div>
      </div>

      {/* Main Title & Faculty Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Official Faculty Instruction &amp; Class Roster Management
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 uppercase">
            Dumalneg National High School &bull; Faculty Portal
          </h1>
        </div>

        {user && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">
                Active Faculty Session
              </span>
              <div className="font-bold text-[#002060] uppercase tracking-wide">
                {user.fullName}
              </div>
              <span className="text-[10px] font-mono text-slate-600 block">
                ID: {user.teacherId} &bull; Dept: {user.department}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              [ Sign Out ]
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links (Visible when logged in) */}
      {user && (
        <div className="bg-slate-100 border-t border-b border-slate-300 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-1 text-xs font-bold uppercase tracking-wider">
            <Link
              href="/"
              className={`py-3 px-4 border-b-2 transition-colors ${
                isOverview
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              [ Overview ]
            </Link>

            <Link
              href="/schedule"
              className={`py-3 px-4 border-b-2 transition-colors ${
                isSchedule
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              [ Teaching Load &amp; Schedule ]
            </Link>

            <Link
              href="/roster"
              className={`py-3 px-4 border-b-2 transition-colors ${
                isRoster
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              [ Section Class Roster ]
            </Link>

            <Link
              href="/profile"
              className={`py-3 px-4 border-b-2 transition-colors ${
                isProfile
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              [ Faculty Profile &amp; Credentials ]
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
