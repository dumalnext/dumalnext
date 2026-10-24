"use client";

import React from "react";
import Link from "next/link";
import { useITSupportAuth } from "@/lib/auth/itSupportAuthContext";

export type ITSupportActiveTab = "calendar" | "classrooms" | "users" | "diagnostics" | "invitations" | "concerns";

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
              IT Support &amp; System Administration
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
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover bg-white p-0.5 shadow-md border-2 border-amber-400 shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-widest block truncate">
              System Infrastructure, Academic Calendar &amp; Identity Governance
            </span>
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white leading-tight mt-0.5 truncate">
              Dumalneg National High School
            </h1>
            <p className="text-xs text-blue-100/85 hidden sm:block mt-0.5">
              Dumalneg, Ilocos Norte &bull; IT Support &amp; System Administration Desk
            </p>
          </div>
        </Link>

        {/* Authenticated IT Support Account Badge & Sign Out */}
        {user && (
          <div className="flex items-center justify-between gap-3 w-full md:w-auto shrink-0">
            <div className="border border-white/20 bg-white/10 backdrop-blur-xs px-3.5 py-2 text-xs rounded-lg min-w-0 flex-1 md:flex-initial">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider truncate">
                  Active IT Support Session
                </span>
              </div>
              <div className="font-bold text-white tracking-wide truncate text-xs sm:text-sm mt-0.5">
                {user.fullName}
              </div>
              <span className="text-[10px] text-blue-200 block truncate">
                {user.userId} &bull; {user.systemRole}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 min-h-[40px] shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold tracking-wide transition-colors shadow-sm rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      {user && (
        <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-8 text-slate-800">
          <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap gap-1.5 text-xs font-bold tracking-wide py-1.5 sm:py-0 touch-pan-x">
            <button
              type="button"
              onClick={() => onSelectTab("calendar")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all cursor-pointer rounded-t-md flex items-center gap-2 ${
                activeTab === "calendar"
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Dynamic Trisem Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("classrooms")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all cursor-pointer rounded-t-md flex items-center gap-2 ${
                activeTab === "classrooms"
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Classrooms &amp; Facilities</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("users")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all cursor-pointer rounded-t-md flex items-center gap-2 ${
                activeTab === "users"
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>User Accounts &amp; Roles</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("diagnostics")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all cursor-pointer rounded-t-md flex items-center gap-2 ${
                activeTab === "diagnostics"
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>System Diagnostics &amp; Privacy</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("invitations")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all cursor-pointer rounded-t-md flex items-center gap-2 ${
                activeTab === "invitations"
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Staff Invitations &amp; Onboarding</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("concerns")}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-b-2 transition-all cursor-pointer rounded-t-md flex items-center gap-2 ${
                activeTab === "concerns"
                  ? "border-[#002060] bg-white text-[#002060] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>Concerns</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
