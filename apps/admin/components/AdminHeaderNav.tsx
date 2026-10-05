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
    <header className="deped-header border-b-4 border-[#002060] bg-white text-slate-900 shadow-sm font-sans">
      {/* Top DepEd Region I Institutional Strip */}
      <div className="bg-[#002060] text-white px-3 sm:px-8 py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-blue-200 uppercase text-[10px] sm:text-xs">
              DEPED REGION I &bull; DIVISION OF ILOCOS NORTE &bull; DUMALNEG NHS
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-[10px] sm:text-[11px]">
            <span className="text-blue-200 shrink-0">PORTAL 03:</span>
            <span className="bg-blue-900 border border-blue-400/40 px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-xs text-[9px] sm:text-[10px]">
              SCHOOL ADMINISTRATOR &amp; REGISTRAR
            </span>
            <Link
              href="/it-support"
              className="text-white hover:text-amber-200 underline font-mono text-[10px] shrink-0"
            >
              Switch to IT Support Portal &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Title & Nav Strip */}
      <div className="max-w-7xl mx-auto px-3 sm:px-8 py-3 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block truncate">
            Official Academic Evaluation &amp; Resource Management Console
          </span>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-950 uppercase leading-tight mt-0.5">
            Dumalneg National High School &bull; Administration
          </h1>
        </div>

        {/* Authenticated Admin Account Badge & Sign Out */}
        {user && (
          <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
            <div className="border border-slate-300 bg-slate-50 px-2.5 sm:px-3 py-1.5 text-xs rounded-md min-w-0 flex-1 md:flex-initial">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono block uppercase truncate">
                Active Administrator Session
              </span>
              <div className="font-bold text-[#002060] uppercase tracking-wide truncate text-xs sm:text-sm">
                {user.fullName}
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-600 block truncate">
                ID: {user.userId} &bull; {user.department}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-2 min-h-[40px] shrink-0 bg-red-800 hover:bg-red-900 active:bg-red-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs rounded cursor-pointer flex items-center justify-center text-center"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      {user && (
        <div className="bg-slate-100 border-t border-b border-slate-300 px-2 sm:px-8">
          <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap gap-1 text-xs font-bold uppercase tracking-wider py-1 sm:py-0 touch-pan-x">
            <Link
              href="/adjudication"
              onClick={() => onSelectSection?.("adjudication")}
              className={`py-2.5 sm:py-3 px-3 sm:px-4 shrink-0 border-b-2 transition-colors rounded-t ${
                isAdjudication
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Enrollment Adjudication
            </Link>
            <Link
              href="/sections"
              onClick={() => onSelectSection?.("sections")}
              className={`py-2.5 sm:py-3 px-3 sm:px-4 shrink-0 border-b-2 transition-colors rounded-t ${
                isSections
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Section Quota &amp; Capacity
            </Link>
            <Link
              href="/scheduling"
              onClick={() => onSelectSection?.("scheduling")}
              className={`py-2.5 sm:py-3 px-3 sm:px-4 shrink-0 border-b-2 transition-colors rounded-t ${
                isScheduling
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Schedule Deconfliction
            </Link>
            <Link
              href="/subjects"
              onClick={() => onSelectSection?.("subjects")}
              className={`py-2.5 sm:py-3 px-3 sm:px-4 shrink-0 border-b-2 transition-colors rounded-t ${
                isSubjects
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Subjects
            </Link>
            <Link
              href="/control-room"
              onClick={() => onSelectSection?.("control")}
              className={`py-2.5 sm:py-3 px-3 sm:px-4 shrink-0 border-b-2 transition-colors rounded-t ${
                isControl
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Enrollment Control Room
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
