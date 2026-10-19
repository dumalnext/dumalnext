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
    <header className="deped-header border-t-4 border-t-amber-400 border-b-2 border-b-[#001744] bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white shadow-md">
      {/* Top DepEd Region I Strip */}
      <div className="bg-[#001540]/60 border-b border-blue-800/60 text-white px-4 sm:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-wide text-blue-100">
              Republic of the Philippines &bull; Department of Education &bull; Region I &bull; SDO Ilocos Norte
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-200 border border-amber-300/40 px-2.5 py-0.5 font-bold rounded-[4px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Faculty &amp; Teacher Portal
            </span>
          </div>
        </div>
      </div>

      {/* Main Title & Faculty Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white p-1 border-2 border-amber-400 shadow-sm shrink-0 flex items-center justify-center">
            <img
              src="/dumalneg-logo.png"
              alt="Dumalneg National High School Official Seal"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-300 tracking-wide block">
              Official Faculty Instruction &amp; Class Roster System
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Dumalneg National High School
            </h1>
            <p className="text-xs text-blue-100 mt-0.5">
              Faculty Workstation &amp; Class Advisory Portal
            </p>
          </div>
        </div>

        {user && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="border border-white/20 bg-white/10 backdrop-blur-xs px-3.5 py-2 text-xs rounded-[4px]">
              <span className="text-[10px] text-amber-300 font-semibold block">
                Active Faculty Account
              </span>
              <div className="font-bold text-white tracking-wide">
                {user.fullName}
              </div>
              <span className="text-[11px] text-blue-100 block">
                ID: {user.teacherId} &bull; {user.department}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 bg-red-700 hover:bg-red-800 border border-red-500 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer rounded-[4px]"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links (Visible when logged in) */}
      {user && (
        <div className="bg-slate-100 border-t border-slate-300 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-1.5 pt-2 text-xs font-bold">
            <Link
              href="/"
              className={`py-2.5 px-4 border-t-2 border-x-2 transition-colors rounded-t-[4px] ${
                isOverview
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              Dashboard Overview
            </Link>

            <Link
              href="/schedule"
              className={`py-2.5 px-4 border-t-2 border-x-2 transition-colors rounded-t-[4px] ${
                isSchedule
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              Teaching Load &amp; Schedule
            </Link>

            <Link
              href="/roster"
              className={`py-2.5 px-4 border-t-2 border-x-2 transition-colors rounded-t-[4px] ${
                isRoster
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              Advisory Section Roster
            </Link>

            <Link
              href="/profile"
              className={`py-2.5 px-4 border-t-2 border-x-2 transition-colors rounded-t-[4px] ${
                isProfile
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              Faculty Profile &amp; Credentials
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
