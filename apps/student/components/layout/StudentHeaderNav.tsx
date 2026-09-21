"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import { isApplicationInTerm } from "@/lib/utils/academicTerm";

export default function StudentHeaderNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { schoolYear, semester, termNumber } = useEnrollmentControl();
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [appRef, setAppRef] = useState<string | null>(null);
  const [assignedSection, setAssignedSection] = useState<{
    name: string;
    gradeLevel?: number | string;
    strand?: string | null;
  } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Real-Time Smart Live Status & Section Tracker: Auto-syncs with Supabase without manual refresh
  useEffect(() => {
    if (!user) {
      setAppStatus(null);
      setAppRef(null);
      setAssignedSection(null);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    const fetchStatus = async () => {
      try {
        const { data: stData } = await supabase
          .from("students")
          .select("id, current_section_id, grade_level, strand")
          .or(`student_id.eq.${user.lrn || user.userId},user_id.eq.${user.id}`)
          .limit(1);

        if (stData && stData.length > 0) {
          const studentRec = stData[0];

          // Fetch Section if current_section_id is assigned
          if (studentRec.current_section_id) {
            const { data: secData } = await supabase
              .from("sections")
              .select("id, section_name, grade_level, strand")
              .eq("id", studentRec.current_section_id)
              .limit(1);

            if (isMounted) {
              if (secData && secData.length > 0) {
                setAssignedSection({
                  name: secData[0].section_name,
                  gradeLevel: secData[0].grade_level,
                  strand: secData[0].strand,
                });
              } else {
                setAssignedSection(null);
              }
            }
          } else {
            if (isMounted) {
              setAssignedSection(null);
            }
          }

          const { data: appData } = await supabase
            .from("enrollment_applications")
            .select("id, application_id, status, school_year, selected_electives, created_at")
            .eq("student_id", studentRec.id)
            .order("created_at", { ascending: false });

          if (isMounted && appData) {
            const activeApp = appData.find((a: any) =>
              isApplicationInTerm(a, schoolYear, termNumber || semester)
            );

            if (activeApp) {
              setAppStatus(activeApp.status);
              setAppRef(activeApp.application_id);
              return;
            }
          }
        } else {
          if (isMounted) {
            setAssignedSection(null);
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
          setAssignedSection(null);
        }
      }
    };

    // 1. Initial fetch
    fetchStatus();

    // 2. Window Focus & Visibility auto-sync
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchStatus();
      }
    };
    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 3. Custom Application/Auth Event listener
    const onDataChanged = () => {
      fetchStatus();
    };
    window.addEventListener("dumalnext:data-changed", onDataChanged);

    // 4. 10-Second Silent Heartbeat Polling
    const heartbeat = setInterval(fetchStatus, 10000);

    // 5. Supabase Realtime Channels: Instant live push on enrollment applications AND student section changes
    const appChannel = supabase
      .channel("nav-realtime-applications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => {
          fetchStatus();
        }
      )
      .subscribe();

    const studentChannel = supabase
      .channel("nav-realtime-students")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("dumalnext:data-changed", onDataChanged);
      clearInterval(heartbeat);
      supabase.removeChannel(appChannel);
      supabase.removeChannel(studentChannel);
    };
  }, [user?.id, user?.lrn, schoolYear, semester, termNumber]);

  // Close menu on Escape key press or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent background scrolling while modal menu is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // Auto-close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const trackHref = user
    ? appRef
      ? `/track?ref=${appRef}`
      : "/track"
    : "/?tab=signin&reason=auth_required";

  const enrollHref = user ? "/enroll" : "/?tab=signin&reason=auth_required";
  const sectionHref = user ? "/section" : "/?tab=signin&reason=auth_required";

  return (
    <div className="flex items-center gap-3">
      {/* Quick Status Tag on Header for Instant Visibility */}
      {user ? (
        <Link
          href={appStatus ? trackHref : "/enroll"}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-400/40 text-white font-mono text-xs transition-colors"
          title={appStatus ? "Click to track your enrollment application status" : "Click to start enrollment for the active academic term"}
        >
          <span className="font-bold uppercase tracking-tight truncate max-w-[140px] md:max-w-[180px]">
            [ {user.firstName} {user.lastName} ]
          </span>
          {appStatus === "Approved" ? (
            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 font-sans font-bold uppercase tracking-wider">
              APPROVED
            </span>
          ) : appStatus === "Needs Revision" ? (
            <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 font-sans font-bold uppercase tracking-wider">
              REVISION
            </span>
          ) : appStatus === "Pending" ? (
            <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 font-sans font-bold uppercase tracking-wider">
              PENDING
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 font-sans font-bold uppercase tracking-wider animate-pulse">
              ENROLL NOW
            </span>
          )}
        </Link>
      ) : (
        <Link
          href="/?tab=signin"
          className="hidden sm:inline-block bg-white text-[#002060] font-bold uppercase tracking-wider py-1.5 px-3.5 hover:bg-slate-100 transition-colors shadow-xs text-xs"
        >
          Login
        </Link>
      )}

      {/* 3-Line Hamburger Menu Button */}
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className="flex items-center gap-2.5 px-3 py-2 bg-blue-950/90 hover:bg-blue-900 border-2 border-blue-400/60 hover:border-white text-white font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
        aria-label="Toggle Portal Navigation Menu"
        aria-expanded={isMenuOpen}
      >
        {/* 3 Horizontal Lines (Hamburger Icon) */}
        <div className="w-5 h-3.5 flex flex-col justify-between items-center py-0.5" aria-hidden="true">
          <span
            className={`w-full h-0.5 bg-white transition-all duration-200 origin-center ${
              isMenuOpen ? "rotate-45 translate-y-[5px]" : ""
            }`}
          />
          <span
            className={`w-full h-0.5 bg-white transition-all duration-200 ${
              isMenuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`w-full h-0.5 bg-white transition-all duration-200 origin-center ${
              isMenuOpen ? "-rotate-45 -translate-y-[5px]" : ""
            }`}
          />
        </div>
        <span>{isMenuOpen ? "[ Close ]" : "[ Menu ]"}</span>
      </button>

      {/* Slide-over Drawer / Collapsible Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div
            ref={menuRef}
            className="w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl border-l-4 border-[#002060] flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
          >
            {/* Drawer Top Header */}
            <div>
              <div className="bg-[#002060] p-4 text-white flex items-center justify-between border-b-2 border-blue-900">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/dumalneg-logo.png"
                    alt="Dumalneg National High School"
                    className="w-9 h-9 object-contain shrink-0"
                  />
                  <div>
                    <span className="text-[10px] font-mono text-blue-200 uppercase tracking-wider block">
                      [ DUMALNEG NHS &bull; PORTAL MENU ]
                    </span>
                    <h3 className="text-sm font-bold uppercase tracking-tight mt-0.5">
                      Navigation &amp; Services
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-2.5 py-1 bg-blue-900 hover:bg-red-900 text-white border border-blue-400/50 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  [ X Close ]
                </button>
              </div>

              {/* Student Identity Section (If Authenticated) */}
              {user ? (
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                      [ ACTIVE LEARNER SESSION ]
                    </span>
                    {appStatus === "Approved" ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-emerald-400 font-mono font-bold uppercase">
                        APPROVED
                      </span>
                    ) : appStatus === "Needs Revision" ? (
                      <span className="text-[10px] bg-red-100 text-red-900 px-2 py-0.5 border border-red-400 font-mono font-bold uppercase">
                        REVISION NEEDED
                      </span>
                    ) : appStatus === "Pending" ? (
                      <span className="text-[10px] bg-amber-100 text-amber-950 px-2 py-0.5 border border-amber-400 font-mono font-bold uppercase">
                        PENDING EVALUATION
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-100 text-blue-950 px-2 py-0.5 border border-blue-400 font-mono font-bold uppercase">
                        NEW APPLICANT
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <h4 className="text-base font-bold text-slate-900 uppercase">
                      {user.firstName} {user.lastName}
                    </h4>
                    <p className="text-xs font-mono text-slate-600">
                      LRN: <strong>{user.lrn || user.userId || "To be assigned"}</strong>
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Section Assignment Indicator (Clickable Shortcut to /section) */}
                  {assignedSection ? (
                    <Link
                      href={sectionHref}
                      onClick={() => setIsMenuOpen(false)}
                      className="mt-2.5 p-2.5 bg-emerald-50 hover:bg-emerald-100/70 border-2 border-emerald-500 text-xs space-y-1 block transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-emerald-800 uppercase tracking-widest block">
                          [ SECTION ASSIGNED ]
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-200/70 text-emerald-950 font-mono text-[9px] font-bold uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                          Official Roster &rarr;
                        </span>
                      </div>
                      <div className="text-xs font-bold text-emerald-950 uppercase">
                        Assigned in Section: <span className="underline font-black">{assignedSection.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-800">
                        Grade {assignedSection.gradeLevel} {assignedSection.strand ? `• ${assignedSection.strand}` : ""}
                      </div>
                    </Link>
                  ) : (
                    <Link
                      href={sectionHref}
                      onClick={() => setIsMenuOpen(false)}
                      className="mt-2.5 p-2.5 bg-amber-50 hover:bg-amber-100/70 border-2 border-amber-400 text-xs space-y-1 block transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-amber-800 uppercase tracking-widest block">
                          [ SECTION STATUS ]
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-200/70 text-amber-950 font-mono text-[9px] font-bold uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                          Pending Placement &rarr;
                        </span>
                      </div>
                      <div className="text-xs font-bold text-amber-950">
                        You&apos;re not yet assigned to a section
                      </div>
                      <p className="text-[10px] text-amber-800 leading-tight">
                        Awaiting official section placement from the school administrator.
                      </p>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-blue-50/70 border-b border-blue-200">
                  <span className="text-[10px] font-mono font-bold text-[#002060] uppercase block">
                    [ GUEST VISITOR ]
                  </span>
                  <p className="text-xs text-slate-700 mt-1">
                    Sign in with your verified email to access online basic education enrollment or track your application status.
                  </p>
                </div>
              )}

              {/* Menu Navigation Links */}
              <div className="p-4 space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block px-1">
                  [ PORTAL MODULES ]
                </span>

                {/* 1. Home Link */}
                <Link
                  href="/"
                  onClick={() => setIsMenuOpen(false)}
                  className={`block p-3 border-2 transition-all ${
                    pathname === "/"
                      ? "bg-blue-50/80 border-[#002060] text-[#002060]"
                      : "bg-white border-slate-200 hover:border-[#002060] text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      [ 01 ] Home Dashboard
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">&rarr;</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                    Return to student landing page, view school calendar advisories, and quick notices.
                  </p>
                </Link>

                {/* 2. Enrollment Link */}
                <Link
                  href={enrollHref}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block p-3 border-2 transition-all ${
                    pathname === "/enroll"
                      ? "bg-blue-50/80 border-[#002060] text-[#002060]"
                      : "bg-white border-slate-200 hover:border-[#002060] text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      [ 02 ] Basic Education Enrollment
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">&rarr;</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                    Complete the 5-step official DepEd enrollment stepper for Junior and Senior High School.
                  </p>
                </Link>

                {/* 3. Track Status Link */}
                <Link
                  href={trackHref}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block p-3 border-2 transition-all ${
                    pathname === "/track"
                      ? "bg-blue-50/80 border-[#002060] text-[#002060]"
                      : "bg-white border-slate-200 hover:border-[#002060] text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      [ 03 ] Track Application Status
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">&rarr;</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                    Real-time status tracking, registrar review remarks, and Certificate of Enrollment.
                  </p>
                </Link>

                {/* 4. Section Placement & Advisory Link */}
                <Link
                  href={sectionHref}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block p-3 border-2 transition-all ${
                    pathname === "/section"
                      ? "bg-blue-50/80 border-[#002060] text-[#002060]"
                      : "bg-white border-slate-200 hover:border-[#002060] text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      [ 04 ] Class Section &amp; Advisory
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">&rarr;</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                    {assignedSection
                      ? `Assigned in Section: ${assignedSection.name}`
                      : "You're not yet assigned to a section. Check official class placement."}
                  </p>
                </Link>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t-2 border-slate-200 bg-slate-50 space-y-3">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-900 border-2 border-red-300 hover:border-red-500 font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center block"
                >
                  [ Sign Out Account ]
                </button>
              ) : (
                <Link
                  href="/?tab=signin"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors text-center block shadow-xs"
                >
                  [ Sign In / Register Account ]
                </Link>
              )}

              <div className="text-center text-[10px] font-mono text-slate-500">
                Dumalneg National High School &bull; School ID: 300017
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
