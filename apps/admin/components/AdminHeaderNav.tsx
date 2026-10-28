"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/lib/auth/authContext";

interface AdminHeaderNavProps {
  activeSection?: "adjudication" | "sections" | "scheduling" | "subjects" | "curriculum" | "control";
  onSelectSection?: (section: "adjudication" | "sections" | "scheduling" | "subjects" | "curriculum" | "control") => void;
}

export default function AdminHeaderNav({
  activeSection,
  onSelectSection,
}: AdminHeaderNavProps) {
  const { user, logout } = useAdminAuth();
  const pathname = usePathname() || "";

  // Determine active tab from URL path or prop fallback
  const isAdjudication =
    activeSection === "adjudication" ||
    pathname === "/adjudication" ||
    pathname === "/";

  const isSections =
    activeSection === "sections" ||
    pathname.startsWith("/sections");

  const isScheduling =
    activeSection === "scheduling" ||
    pathname.startsWith("/scheduling");

  const isSubjects =
    activeSection === "subjects" ||
    activeSection === "curriculum" ||
    pathname.startsWith("/subjects") ||
    pathname.startsWith("/curriculum");

  const isControl =
    activeSection === "control" ||
    pathname.startsWith("/control-room");

  return (
    <header className="border-t-4 border-t-amber-400 border-b border-[#001744] bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white shadow-md font-sans">
      {/* Top DepEd Region I Institutional Strip */}
      <div className="bg-[#001540]/60 border-b border-white/10 text-white px-4 sm:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="font-semibold tracking-wider text-blue-100 uppercase text-[10px] sm:text-xs">
              Republic of the Philippines &bull; Department of Education &bull; Region I
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
            <span className="text-blue-200 font-medium shrink-0">Schools Division of Ilocos Norte</span>
            <span className="bg-amber-400/20 border border-amber-300/40 text-amber-200 px-2.5 py-0.5 font-bold uppercase tracking-wider rounded-full text-[10px]">
              Registrar &amp; Administration Portal
            </span>
          </div>
        </div>
      </div>

      {/* Main Title & Nav Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3.5 min-w-0 flex-1 group">
          <img
            src="/dumalneg-logo.png"
            alt="Dumalneg National High School Seal"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-md border-2 border-amber-400 shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-widest block truncate">
              Official Enrollment Adjudication &amp; Registrar System
            </span>
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white leading-tight mt-0.5 truncate">
              Dumalneg National High School
            </h1>
            <p className="text-xs text-blue-100/85 hidden sm:block mt-0.5">
              Dumalneg, Ilocos Norte &bull; Office of the School Registrar &amp; Admissions
            </p>
          </div>
        </Link>

        {/* Authenticated Admin Account Badge & Sign Out */}
        {user && (
          <div className="flex items-center justify-between gap-3 w-full md:w-auto shrink-0">
            <div className="border border-white/20 bg-white/10 backdrop-blur-xs px-3.5 py-2 text-xs rounded-lg min-w-0 flex-1 md:flex-initial">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider truncate">
                  Active Registrar Session
                </span>
              </div>
              <div className="font-bold text-white tracking-wide truncate text-xs sm:text-sm mt-0.5">
                {user.fullName}
              </div>
              <span className="text-[10px] text-blue-200 block truncate">
                {user.userId} &bull; {user.department}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 min-h-[40px] shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold tracking-wide transition-colors shadow-sm rounded-lg cursor-pointer flex items-center justify-center"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      {user && (
        <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-8 text-slate-800">
          <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap gap-1.5 text-xs font-bold tracking-wide py-1.5 sm:py-0 touch-pan-x">
            <Link
              href="/adjudication"
              onClick={() => onSelectSection?.("adjudication")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all rounded-t-md flex items-center gap-2 ${
                isAdjudication
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Enrollment Adjudication</span>
            </Link>
            <Link
              href="/sections"
              onClick={() => onSelectSection?.("sections")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all rounded-t-md flex items-center gap-2 ${
                isSections
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Section Quotas &amp; Capacity</span>
            </Link>
            <Link
              href="/scheduling"
              onClick={() => onSelectSection?.("scheduling")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all rounded-t-md flex items-center gap-2 ${
                isScheduling
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Schedule Deconfliction</span>
            </Link>
            <Link
              href="/subjects"
              onClick={() => onSelectSection?.("subjects")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all rounded-t-md flex items-center gap-2 ${
                isSubjects
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Curriculum &amp; Subjects</span>
            </Link>
            <Link
              href="/control-room"
              onClick={() => onSelectSection?.("control")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all rounded-t-md flex items-center gap-2 ${
                isControl
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Enrollment Control Room</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
