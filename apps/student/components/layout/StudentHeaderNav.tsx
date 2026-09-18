"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";

export default function StudentHeaderNav() {
  const { user, logout } = useAuth();
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [appRef, setAppRef] = useState<string | null>(null);

  // Smart Live Status Tracker: Check submitted application state directly from Supabase
  useEffect(() => {
    if (user) {
      let isMounted = true;
      (async () => {
        try {
          const supabase = createClient();
          const { data: stData } = await supabase
            .from("students")
            .select("id")
            .or(`student_id.eq.${user.lrn || user.userId},user_id.eq.${user.id}`)
            .limit(1);

          if (stData && stData.length > 0) {
            const { data: appData } = await supabase
              .from("enrollment_applications")
              .select("application_id, status")
              .eq("student_id", stData[0].id)
              .order("created_at", { ascending: false })
              .limit(1);

            if (isMounted && appData && appData.length > 0) {
              setAppStatus(appData[0].status);
              setAppRef(appData[0].application_id);
              return;
            }
          }
          if (isMounted) {
            setAppStatus(null);
            setAppRef(null);
          }
        } catch {
          if (isMounted) {
            setAppStatus(null);
            setAppRef(null);
          }
        }
      })();
      return () => {
        isMounted = false;
      };
    } else {
      setAppStatus(null);
      setAppRef(null);
    }
  }, [user]);

  return (
    <nav className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
      <Link
        href="/"
        className="text-slate-200 hover:text-white font-bold uppercase tracking-wider py-1 px-2 hover:bg-blue-900/60 transition-colors"
      >
        Home
      </Link>
      <Link
        href={user ? "/enroll" : "/?tab=signin&reason=auth_required"}
        className="text-slate-200 hover:text-white font-bold uppercase tracking-wider py-1 px-2 hover:bg-blue-900/60 transition-colors"
      >
        Enrollment
      </Link>
      <Link
        href={user ? (appRef ? `/track?ref=${appRef}` : "/track") : "/?tab=signin&reason=auth_required"}
        className="text-slate-200 hover:text-white font-bold uppercase tracking-wider py-1 px-2 hover:bg-blue-900/60 transition-colors"
      >
        Track Status
      </Link>

      {/* SMART AUTHENTICATION & AUTOMATION TRACKER */}
      {user ? (
        <div className="flex items-center gap-2 pl-2 border-l border-blue-400/40">
          {/* Smart Automation Status Badge */}
          <Link
            href={appRef ? `/track?ref=${appRef}` : "/enroll"}
            className="flex items-center gap-1.5 text-[11px] font-mono text-white bg-blue-950/90 px-2.5 py-1 border border-blue-400/40 hover:border-white transition-colors"
            title="Click to view live application tracking status"
          >
            <span className="font-bold uppercase tracking-tight">
              [ {user.firstName} {user.lastName} ]
            </span>
            {appStatus === "Approved" ? (
              <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 font-sans font-bold uppercase tracking-wider">
                APPROVED
              </span>
            ) : appStatus === "Needs Revision" ? (
              <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 font-sans font-bold uppercase tracking-wider">
                REVISION
              </span>
            ) : appStatus === "Pending" ? (
              <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.5 font-sans font-bold uppercase tracking-wider">
                PENDING
              </span>
            ) : (
              <span className="text-[9px] text-blue-300 font-sans uppercase">
                NEW
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={logout}
            className="text-[11px] font-bold text-red-300 hover:text-white uppercase tracking-wider hover:underline py-1 px-1.5"
          >
            [ Sign Out ]
          </button>
        </div>
      ) : (
        /* SINGLE UNIFIED LOGIN BUTTON (INSTEAD OF SEPARATE SIGN IN / REGISTER) */
        <div className="flex items-center pl-2 border-l border-blue-400/40">
          <Link
            href="/?tab=signin"
            className="bg-white text-[#002060] font-bold uppercase tracking-wider py-1 px-3 sm:px-4 hover:bg-slate-100 transition-colors shadow-xs text-xs"
          >
            Login
          </Link>
        </div>
      )}
    </nav>
  );
}

