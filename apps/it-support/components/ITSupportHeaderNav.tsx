"use client";

import React from "react";
import { useITSupportAuth } from "@/lib/auth/itSupportAuthContext";

export type ITSupportActiveTab = "calendar" | "classrooms" | "users" | "diagnostics";

interface ITSupportHeaderNavProps {
  activeTab: ITSupportActiveTab;
  onSelectTab: (tab: ITSupportActiveTab) => void;
}

export default function ITSupportHeaderNav({
  activeTab,
  onSelectTab,
}: ITSupportHeaderNavProps) {
  const { user, logout } = useITSupportAuth();

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
            <span className="text-blue-200">PORTAL 04:</span>
            <span className="bg-blue-900 border border-blue-400/40 px-2 py-0.5 font-bold uppercase tracking-wider text-amber-300">
              IT SUPPORT &amp; SYSTEM ADMINISTRATION
            </span>
          </div>
        </div>
      </div>

      {/* Main Title & Nav Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Official System Infrastructure, Dynamic Calendar &amp; Role Security Console
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 uppercase">
            Dumalneg National High School &bull; IT Support Desk
          </h1>
        </div>

        {/* Authenticated IT Support Account Badge & Sign Out */}
        {user && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">
                Active IT Support Session
              </span>
              <div className="font-bold text-[#002060] uppercase tracking-wide">
                {user.fullName}
              </div>
              <span className="text-[10px] font-mono text-slate-600 block">
                ID: {user.userId} &bull; {user.systemRole}
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
            <button
              type="button"
              onClick={() => onSelectTab("calendar")}
              className={`px-4 py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === "calendar"
                  ? "border-[#002060] bg-white text-[#002060] font-black shadow-xs"
                  : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200"
              }`}
            >
              [ 1. Dynamic Trisem Calendar ]
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("classrooms")}
              className={`px-4 py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === "classrooms"
                  ? "border-[#002060] bg-white text-[#002060] font-black shadow-xs"
                  : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200"
              }`}
            >
              [ 2. Classrooms &amp; Facilities ]
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("users")}
              className={`px-4 py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === "users"
                  ? "border-[#002060] bg-white text-[#002060] font-black shadow-xs"
                  : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200"
              }`}
            >
              [ 3. User Accounts &amp; Roles ]
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("diagnostics")}
              className={`px-4 py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === "diagnostics"
                  ? "border-[#002060] bg-white text-[#002060] font-black shadow-xs"
                  : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200"
              }`}
            >
              [ 4. System Diagnostics &amp; Privacy ]
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
