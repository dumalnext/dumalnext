"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/lib/auth/authContext";

interface AdminHeaderNavProps {
  activeSection?: "adjudication" | "sections" | "scheduling" | "control";
  onSelectSection?: (section: "adjudication" | "sections" | "scheduling" | "control") => void;
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

  const isControl =
    activeSection === "control" ||
    pathname.startsWith("/control-room");

  return (
    <header className="deped-header border-b-4 border-[#002060] bg-white text-slate-900 shadow-sm font-sans">
      {/* Top DepEd Region I Institutional Strip */}
      <div className="bg-[#002060] text-white px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-blue-200 uppercase">
              DEPED REGION I &bull; DIVISION OF ILOCOS NORTE &bull; DUMALNEG NHS
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-blue-200">PORTAL 03:</span>
            <span className="bg-blue-900 border border-blue-400/40 px-2 py-0.5 font-bold uppercase tracking-wider">
              SCHOOL ADMINISTRATOR &amp; REGISTRAR
            </span>
          </div>
        </div>
      </div>

      {/* Main Title & Nav Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Official Academic Evaluation &amp; Resource Management Console
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 uppercase">
            Dumalneg National High School &bull; Administration
          </h1>
        </div>

        {/* Authenticated Admin Account Badge & Sign Out */}
        {user && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">
                Active Administrator Session
              </span>
              <div className="font-bold text-[#002060] uppercase tracking-wide">
                {user.fullName}
              </div>
              <span className="text-[10px] font-mono text-slate-600 block">
                ID: {user.userId} &bull; {user.department}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              [ Sign Out ]
            </button>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      {user && (
        <div className="bg-slate-100 border-t border-b border-slate-300 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-1 text-xs font-bold uppercase tracking-wider">
            <Link
              href="/adjudication"
              onClick={() => onSelectSection?.("adjudication")}
              className={`py-3 px-4 border-b-2 transition-colors ${
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
              className={`py-3 px-4 border-b-2 transition-colors ${
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
              className={`py-3 px-4 border-b-2 transition-colors ${
                isScheduling
                  ? "border-[#002060] bg-white text-[#002060]"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Schedule Deconfliction
            </Link>
            <Link
              href="/control-room"
              onClick={() => onSelectSection?.("control")}
              className={`py-3 px-4 border-b-2 transition-colors ${
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
