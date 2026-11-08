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
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-400 shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src="/dumalneg-logo.png"
              alt="Dumalneg National High School Official Seal"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Dumalneg National High School
            </h1>
            <span className="text-xs text-amber-300 font-semibold block">
              Faculty Portal
            </span>
          </div>
        </div>

        {user && (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/profile"
              className="border border-white/20 bg-white/10 hover:bg-white/15 backdrop-blur-xs px-3.5 py-2 text-xs rounded-[4px] flex items-center gap-3 transition-colors cursor-pointer"
              title="View Faculty Profile & Credentials"
            >
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.fullName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-xs bg-white shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-400/20 border-2 border-amber-300 text-amber-200 font-black text-sm flex items-center justify-center shrink-0">
                  {user.firstName?.charAt(0) || "T"}{user.lastName?.charAt(0) || "C"}
                </div>
              )}
              <div>
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
            </Link>

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
        <div className="bg-slate-100 border-t border-slate-300 px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth gap-1.5 pt-2 text-xs font-bold whitespace-nowrap" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <Link
              href="/"
              className={`py-2 px-3 sm:px-4 border-t-2 border-x-2 transition-colors rounded-t-[4px] flex items-center gap-1.5 shrink-0 ${
                isOverview
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard Overview</span>
            </Link>

            <Link
              href="/schedule"
              className={`py-2 px-3 sm:px-4 border-t-2 border-x-2 transition-colors rounded-t-[4px] flex items-center gap-1.5 shrink-0 ${
                isSchedule
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Teaching Load &amp; Schedule</span>
            </Link>

            <Link
              href="/roster"
              className={`py-2 px-3 sm:px-4 border-t-2 border-x-2 transition-colors rounded-t-[4px] flex items-center gap-1.5 shrink-0 ${
                isRoster
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Advisory Section Roster</span>
            </Link>

            <Link
              href="/profile"
              className={`py-2 px-3 sm:px-4 border-t-2 border-x-2 transition-colors rounded-t-[4px] flex items-center gap-1.5 shrink-0 ${
                isProfile
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Faculty Profile &amp; Credentials</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
