"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/authContext";

export default function StudentHeaderNav() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
      <Link
        href="/"
        className="text-slate-200 hover:text-white font-bold uppercase tracking-wider py-1 px-2.5 hover:bg-blue-900/60 transition-colors"
      >
        Home
      </Link>
      <Link
        href="/enroll"
        className="text-slate-200 hover:text-white font-bold uppercase tracking-wider py-1 px-2.5 hover:bg-blue-900/60 transition-colors"
      >
        Enrollment
      </Link>
      <Link
        href="/track"
        className="text-slate-200 hover:text-white font-bold uppercase tracking-wider py-1 px-2.5 hover:bg-blue-900/60 transition-colors"
      >
        Track Status
      </Link>

      {user ? (
        <div className="flex items-center gap-2 pl-2 border-l border-blue-400/40">
          <span className="text-[11px] font-mono text-blue-200 bg-blue-950/80 px-2.5 py-1 border border-blue-400/30 font-bold uppercase">
            [ {user.firstName} {user.lastName} ]
          </span>
          <button
            type="button"
            onClick={logout}
            className="text-[11px] font-bold text-red-300 hover:text-white uppercase tracking-wider hover:underline py-1 px-1.5"
          >
            [ Sign Out ]
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 pl-2 border-l border-blue-400/40">
          <Link
            href="/?tab=signin"
            className="text-slate-200 hover:text-white font-bold uppercase tracking-wider py-1 px-2.5 hover:bg-blue-900/60 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/?tab=register"
            className="bg-white text-[#002060] font-bold uppercase tracking-wider py-1 px-3 hover:bg-slate-100 transition-colors shadow-xs"
          >
            Register
          </Link>
        </div>
      )}
    </nav>
  );
}
