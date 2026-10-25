"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import { isApplicationInTerm, extractTermNumber } from "@/lib/utils/academicTerm";
import { PwaInstallHeaderButton, PwaInstallDrawerCard } from "@/components/ui/PwaInstallPrompt";
import { PushNotificationHeaderButton, PushNotificationDrawerCard } from "@/components/ui/PushNotificationButton";

interface StudentHeaderNavProps {
  children?: React.ReactNode;
}

export default function StudentHeaderNav({ children }: StudentHeaderNavProps = {}) {
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
  const [sectionMode, setSectionMode] = useState<
    "ASSIGNED" | "NOT_ASSIGNED" | "NOT_ASSIGNED_TRANSFEREE" | "ENROLLMENT_REQUIRED"
  >("NOT_ASSIGNED");
  const [activeTermNum, setActiveTermNum] = useState<number>(termNumber || 1);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Real-Time Smart Live Status & Section Tracker: Auto-syncs with Supabase without manual refresh
  useEffect(() => {
    if (!user) {
      setAppStatus(null);
      setAppRef(null);
      setAssignedSection(null);
      setSectionMode("NOT_ASSIGNED");
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    const fetchStatus = async () => {
      try {
        // 0. Resolve active term
        const { data: termsData } = await supabase
          .from("academic_terms")
          .select("schoolYear, termNumber, isActive")
          .order("schoolYear", { ascending: false });

        const activeTerm = (termsData || []).find((t: any) => t.isActive);
        const resolvedTermNum = Number(activeTerm?.termNumber) || Number(termNumber) || extractTermNumber(semester) || 1;
        const resolvedSY = (activeTerm?.schoolYear || schoolYear || "2026-2027").replace(/[–—]/g, "-").trim();

        if (isMounted) {
          setActiveTermNum(resolvedTermNum);
        }

        // 1. Fetch Student Profile with Comprehensive Fallback Matching
        let stQuery = supabase
          .from("students")
          .select("id, user_id, student_id, first_name, last_name, middle_name, current_section_id, grade_level, strand");

        const orFilters: string[] = [];
        if (user.id && user.id.length === 36) orFilters.push(`user_id.eq.${user.id}`);
        if (user.lrn && /^\d{12}$/.test(user.lrn)) orFilters.push(`student_id.eq.${user.lrn}`);
        if (user.userId && user.userId !== user.id) orFilters.push(`student_id.eq.${user.userId}`);
        if (orFilters.length > 0) stQuery = stQuery.or(orFilters.join(","));

        const { data: stData } = await stQuery.limit(1);
        let studentRec = stData && stData.length > 0 ? stData[0] : null;

        // Fallback: Check applications if not found directly
        if (!studentRec) {
          const { data: allApps } = await supabase
            .from("enrollment_applications")
            .select("id, student_id, selected_electives, submitted_documents")
            .order("created_at", { ascending: false })
            .limit(20);

          if (allApps && allApps.length > 0) {
            for (const a of allApps) {
              const fd = Array.isArray(a.selected_electives) && a.selected_electives.length > 0
                ? a.selected_electives[0]
                : (typeof a.selected_electives === "object" && a.selected_electives !== null ? a.selected_electives : {});

              const emailInForm = fd.email || fd.learnerEmail;
              const lrnInForm = fd.lrn || fd.learnerLrn;

              if (
                (emailInForm && emailInForm.toLowerCase() === user.email.toLowerCase()) ||
                (lrnInForm && user.lrn && lrnInForm === user.lrn)
              ) {
                if (a.student_id) {
                  const { data: stById } = await supabase
                    .from("students")
                    .select("id, user_id, student_id, first_name, last_name, middle_name, current_section_id, grade_level, strand")
                    .eq("id", a.student_id)
                    .limit(1);

                  if (stById && stById.length > 0) {
                    studentRec = stById[0];
                    if (!studentRec.user_id && user.id) {
                      await supabase.from("students").update({ user_id: user.id }).eq("id", studentRec.id);
                    }
                    break;
                  }
                }
              }
            }
          }
        }

        if (studentRec) {
          const { data: appData } = await supabase
            .from("enrollment_applications")
            .select("id, application_id, applicant_type, status, school_year, selected_electives, submitted_documents, created_at")
            .eq("student_id", studentRec.id)
            .order("created_at", { ascending: false });

          const userApps = appData || [];
          const activeApp = userApps.find((a: any) =>
            isApplicationInTerm(a, resolvedSY, resolvedTermNum)
          );

          const isEnrolledInActiveTerm = !!activeApp;

          // Extract 2x2 Photo from submitted_documents
          let candidatePhoto: string | null = null;
          const appWithDocs = userApps.find((a: any) => a.submitted_documents && a.submitted_documents.length > 0) || activeApp;
          if (appWithDocs?.submitted_documents && Array.isArray(appWithDocs.submitted_documents)) {
            const doc = appWithDocs.submitted_documents.find((d: any) =>
              (d.docType || d.type || "").toLowerCase().includes("id") ||
              (d.docType || d.type || "").toLowerCase().includes("picture") ||
              (d.docType || d.type || "").toLowerCase().includes("photo") ||
              (d.docType || d.type || "").toLowerCase().includes("2x2")
            );
            if (doc?.fileUrl || doc?.fileData) {
              candidatePhoto = doc.fileUrl || doc.fileData;
            }
          }

          if (!candidatePhoto) {
            for (const a of userApps) {
              const fd = Array.isArray(a.selected_electives) ? a.selected_electives[0] : a.selected_electives;
              const subDocs = fd?.submittedDocuments || [];
              const doc = subDocs.find((d: any) =>
                (d.docType || d.type || "").toLowerCase().includes("id") ||
                (d.docType || d.type || "").toLowerCase().includes("picture") ||
                (d.docType || d.type || "").toLowerCase().includes("photo") ||
                (d.docType || d.type || "").toLowerCase().includes("2x2")
              );
              if (doc?.fileUrl || doc?.fileData) {
                candidatePhoto = doc.fileUrl || doc.fileData;
                break;
              }
            }
          }

          if (isMounted) {
            setPhotoUrl(candidatePhoto);
            if (activeApp) {
              setAppStatus(activeApp.status);
              setAppRef(activeApp.application_id);
            } else {
              setAppStatus(null);
              setAppRef(null);
            }
          }

          const isTransferee =
            (activeApp && (activeApp.applicant_type === "Transferee" || activeApp.selected_electives?.[0]?.applicantType === "Transferee")) ||
            userApps.some((a: any) => a.applicant_type === "Transferee" || a.selected_electives?.[0]?.applicantType === "Transferee");

          // Resolve Section
          let targetSecId = studentRec.current_section_id;
          if (resolvedTermNum >= 2 && !isTransferee && isEnrolledInActiveTerm) {
            if (!targetSecId) {
              const priorApp: any = userApps.find((a: any) => a.status === "Approved" && (a.section_id || a.assigned_section_id));
              if (priorApp) {
                targetSecId = priorApp.section_id || priorApp.assigned_section_id;
                await supabase.from("students").update({ current_section_id: targetSecId }).eq("id", studentRec.id);
              }
            }
          }

          let secObj = null;
          if (targetSecId) {
            const { data: secData } = await supabase
              .from("sections")
              .select("id, section_name, grade_level, strand")
              .eq("id", targetSecId)
              .limit(1);

            if (secData && secData.length > 0) {
              secObj = {
                name: secData[0].section_name,
                gradeLevel: secData[0].grade_level,
                strand: secData[0].strand,
              };
              if (isMounted) setAssignedSection(secObj);
            } else {
              if (isMounted) setAssignedSection(null);
            }
          } else {
            if (isMounted) setAssignedSection(null);
          }

          // Determine Section Mode
          if (resolvedTermNum === 1) {
            if (isMounted) setSectionMode(secObj ? "ASSIGNED" : "NOT_ASSIGNED");
          } else {
            if (isTransferee) {
              if (isMounted) setSectionMode(secObj ? "ASSIGNED" : "NOT_ASSIGNED_TRANSFEREE");
            } else {
              if (!isEnrolledInActiveTerm) {
                if (isMounted) setSectionMode("ENROLLMENT_REQUIRED");
              } else {
                if (isMounted) setSectionMode(secObj ? "ASSIGNED" : "NOT_ASSIGNED");
              }
            }
          }
        } else {
          if (isMounted) {
            setAssignedSection(null);
            setAppStatus(null);
            setAppRef(null);
            setSectionMode("NOT_ASSIGNED");
          }
        }
      } catch {
        if (isMounted) {
          setAppStatus(null);
          setAppRef(null);
          setAssignedSection(null);
          setSectionMode("NOT_ASSIGNED");
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

    // 4. Fallback Heartbeat Polling (every 2 minutes, active tab only)
    const heartbeat = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchStatus();
      }
    }, 120000);

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
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
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

  const profileHref = user ? "/profile" : "/?tab=signin&reason=auth_required";
  const enrollHref = user ? "/enroll" : "/?tab=signin&reason=auth_required";
  const sectionHref = user ? "/section" : "/?tab=signin&reason=auth_required";

  return (
    <div className="relative max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4 w-full">
      {/* Upper-Left: Mobile Hamburger Button (Logged-in Mobile/Tablet Only) + School Branding */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {user && (
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="lg:hidden relative z-10 flex items-center gap-2 px-2.5 py-2 bg-blue-950/90 hover:bg-blue-900 border border-blue-400/50 hover:border-white text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm rounded-[4px] active:scale-95 shrink-0"
            aria-label="Toggle Portal Navigation Menu"
            aria-expanded={isMenuOpen}
          >
            <div className="w-4 h-3.5 flex flex-col justify-between items-center py-0.5" aria-hidden="true">
              <span
                className={`w-full h-0.5 bg-white transition-all duration-300 origin-center ${
                  isMenuOpen ? "rotate-45 translate-y-[5px]" : ""
                }`}
              />
              <span
                className={`w-full h-0.5 bg-white transition-all duration-300 ${
                  isMenuOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"
                }`}
              />
              <span
                className={`w-full h-0.5 bg-white transition-all duration-300 origin-center ${
                  isMenuOpen ? "-rotate-45 -translate-y-[5px]" : ""
                }`}
              />
            </div>
            <span className="hidden sm:inline">{isMenuOpen ? "Close" : "Menu"}</span>
          </button>
        )}

        {children}
      </div>

      {/* Upper-Right: Clean Context-Aware Navigation */}
      <div className="flex items-center gap-2 lg:gap-2.5 shrink-0 relative z-10">
        {user ? (
          <>
            {/* Desktop Horizontal Tabs (Replaces Burger Menu on Desktop) */}
            <nav aria-label="Primary Portal Navigation" className="hidden lg:flex items-center gap-1 mr-1">
              <Link
                href="/"
                className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-colors ${
                  pathname === "/"
                    ? "bg-white text-[#002060] shadow-xs"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href={enrollHref}
                className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-colors ${
                  pathname === "/enroll"
                    ? "bg-white text-[#002060] shadow-xs"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                Enrollment
              </Link>
              <Link
                href={trackHref}
                className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-colors ${
                  pathname === "/track"
                    ? "bg-white text-[#002060] shadow-xs"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                Track Status
              </Link>
              <Link
                href={sectionHref}
                className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-colors ${
                  pathname === "/section"
                    ? "bg-white text-[#002060] shadow-xs"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                My Section
              </Link>
              <Link
                href={profileHref}
                className={`px-3 py-1.5 text-xs font-bold rounded-[4px] transition-colors ${
                  pathname === "/profile"
                    ? "bg-white text-[#002060] shadow-xs"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                My Profile
              </Link>
            </nav>

            <PushNotificationHeaderButton />
            <PwaInstallHeaderButton />

            {/* Student Identity & Status Pill */}
            <Link
              href={profileHref}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-950/90 hover:bg-blue-900 border border-blue-400/40 hover:border-blue-300 text-white text-xs transition-colors rounded-[4px] shadow-xs"
              title="View your learner profile and account settings"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="2x2"
                  className="w-5 h-5 rounded-full object-cover border border-white/40 bg-white shrink-0"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                  {user.firstName?.[0] || "S"}
                </span>
              )}
              <span className="font-bold tracking-tight truncate max-w-[95px] sm:max-w-[140px]">
                {user.firstName}
              </span>
              {appStatus === "Approved" ? (
                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-[3px] whitespace-nowrap">
                  APPROVED
                </span>
              ) : appStatus === "Needs Revision" ? (
                <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-[3px] whitespace-nowrap">
                  REVISION
                </span>
              ) : appStatus === "Pending" ? (
                <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-[3px] whitespace-nowrap">
                  PENDING
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-[3px] whitespace-nowrap">
                  ACTIVE
                </span>
              )}
            </Link>

            {/* Desktop Direct Sign Out Button */}
            <button
              type="button"
              onClick={logout}
              className="hidden lg:inline-flex items-center px-2.5 py-1.5 bg-red-600/90 hover:bg-red-700 text-white border border-red-400/40 text-xs font-bold rounded-[4px] transition-colors cursor-pointer shadow-xs"
              title="Sign Out of Student Portal"
            >
              Sign Out
            </button>
          </>
        ) : (
          /* Logged-Out Visitor Right Header: Clean Academic Year Badge Only */
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-950/80 border border-blue-400/30 rounded-[4px] text-[11px] font-bold text-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>S.Y. {schoolYear || "2026-2027"}</span>
              <span className="hidden sm:inline text-blue-300">&bull; {semester || "Trimester 1"}</span>
            </div>
            <PushNotificationHeaderButton />
            <PwaInstallHeaderButton />
            {pathname !== "/" && (
              <Link
                href="/"
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-[4px] transition-colors shadow-xs"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Slide-over Drawer / Collapsible Menu Overlay (Left Side Drawer) */}
      <div
        className={`fixed inset-0 w-full z-50 flex justify-start overflow-hidden transition-opacity duration-300 ease-in-out ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: "100dvh",
          maxHeight: "100dvh",
        }}
        aria-hidden={!isMenuOpen}
      >
        {/* Semi-transparent Backdrop overlay (Click to dismiss) */}
        <div
          className="fixed inset-0 bg-slate-950/70 transition-opacity"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Sliding Drawer Container with Strict Dynamic Viewport Height */}
        <div
          ref={menuRef}
          className={`relative z-10 w-full max-w-sm sm:max-w-md bg-white shadow-2xl border-r-4 border-[#002060] rounded-r-[4px] flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden transform transition-transform duration-300 ease-in-out will-change-transform ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            height: "100dvh",
            maxHeight: "100dvh",
            minHeight: 0,
          }}
        >
          {/* Drawer Top Header (Pinned at Top) */}
          <div className="shrink-0 bg-[#002060] p-4 text-white flex items-center justify-between border-b-2 border-blue-900 z-10">
            <div className="flex items-center gap-2.5">
              <img
                src="/dumalneg-logo.png"
                alt="Dumalneg National High School"
                className="w-9 h-9 object-contain shrink-0"
              />
              <div>
                <span className="text-[10px] text-blue-200 uppercase tracking-wider block">
                  DUMALNEG NHS &bull; PORTAL MENU
                </span>
                <h3 className="text-sm font-bold tracking-tight mt-0.5">
                  Navigation &amp; Services
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="px-2.5 py-1 bg-blue-900 hover:bg-red-900 text-white border border-blue-400/50 text-xs font-bold uppercase tracking-wider transition-all duration-200 ease-in-out cursor-pointer rounded-[4px] active:scale-95"
            >
              Close
            </button>
          </div>

          {/* Drawer Scrollable Body (Middle) - Mobile Touch Momentum Enabled */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain min-h-0 touch-pan-y"
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {/* Student Identity Section (If Authenticated) */}
            {user ? (
              <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    ACTIVE LEARNER SESSION
                  </span>
                  {appStatus === "Approved" ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-emerald-400 font-bold uppercase rounded-[4px] whitespace-nowrap shrink-0">
                      APPROVED
                    </span>
                  ) : appStatus === "Needs Revision" ? (
                    <span className="text-[10px] bg-red-100 text-red-900 px-2 py-0.5 border border-red-400 font-bold uppercase rounded-[4px] whitespace-nowrap shrink-0">
                      REVISION NEEDED
                    </span>
                  ) : appStatus === "Pending" ? (
                    <span className="text-[10px] bg-amber-100 text-amber-950 px-2 py-0.5 border border-amber-400 font-bold uppercase rounded-[4px] whitespace-nowrap shrink-0">
                      PENDING EVALUATION
                    </span>
                  ) : (
                    <span className="text-[10px] bg-blue-100 text-blue-950 px-2 py-0.5 border border-blue-400 font-bold uppercase rounded-[4px] whitespace-nowrap shrink-0">
                      NEW APPLICANT
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  {photoUrl ? (
                    <div className="shrink-0 mt-0.5">
                      <img
                        src={photoUrl}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-12 h-12 rounded-full object-cover border border-slate-300 shadow-xs bg-white"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#002060] text-amber-300 border border-blue-400/50 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-slate-900 truncate min-w-0">
                        {user.firstName} {user.lastName}
                      </h4>
                    {/* Mobile Only (Android & iOS): Sign Out button on the right side of user's name */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        logout();
                      }}
                      className="md:hidden px-2.5 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border border-red-700 font-bold uppercase text-[10px] tracking-wider rounded-[4px] cursor-pointer shrink-0 transition-colors active:scale-95 shadow-xs touch-manipulation"
                      title="Sign Out of Session"
                    >
                      Sign Out
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    LRN: <strong>{user.lrn || user.userId || "To be assigned"}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {user.email}
                  </p>
                  <Link
                    href={profileHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-2.5 inline-flex items-center justify-between w-full px-2.5 py-1.5 bg-blue-100/80 hover:bg-blue-200/90 text-[#002060] text-xs font-bold rounded-[4px] border border-blue-300 transition-colors cursor-pointer"
                  >
                    <span>View Full Profile</span>
                  </Link>
                </div>
              </div>

                {/* Section Assignment Indicator (Clickable Shortcut to /section) */}
                {sectionMode === "ASSIGNED" && assignedSection ? (
                  <Link
                    href={sectionHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-2.5 p-2.5 bg-emerald-50 hover:bg-emerald-100/70 border-2 border-emerald-500 text-xs space-y-1 block transition-colors cursor-pointer rounded-[4px] shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest block">
                        SECTION ASSIGNED
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-200/70 text-emerald-950 text-[9px] font-bold uppercase whitespace-nowrap shrink-0 rounded-[4px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                        Official Roster
                      </span>
                    </div>
                    <div className="text-xs font-bold text-emerald-950">
                      Assigned in Section: <span className="underline font-black">{assignedSection.name}</span>
                    </div>
                    <div className="text-[10px] text-emerald-800">
                      Grade {assignedSection.gradeLevel} {assignedSection.strand ? `• ${assignedSection.strand}` : ""}
                    </div>
                  </Link>
                ) : sectionMode === "ENROLLMENT_REQUIRED" ? (
                  <Link
                    href="/enroll"
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-2.5 p-2.5 bg-blue-50 hover:bg-blue-100/70 border-2 border-[#002060] text-xs space-y-1 block transition-colors cursor-pointer rounded-[4px] shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-[#002060] uppercase tracking-widest block">
                        ENROLLMENT REQUIRED
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-200 text-[#002060] text-[9px] font-bold uppercase whitespace-nowrap shrink-0 rounded-[4px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#002060] animate-pulse" />
                        Action Needed
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      Please enroll to see your section
                    </div>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      Enroll in Trimester {activeTermNum} to unlock your continuing section placement.
                    </p>
                  </Link>
                ) : sectionMode === "NOT_ASSIGNED_TRANSFEREE" ? (
                  <Link
                    href={sectionHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-2.5 p-2.5 bg-amber-50 hover:bg-amber-100/70 border-2 border-amber-500 text-xs space-y-1 block transition-colors cursor-pointer rounded-[4px] shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-amber-900 uppercase tracking-widest block">
                        SECTION STATUS &bull; TRANSFEREE
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-200 text-amber-950 text-[9px] font-bold uppercase whitespace-nowrap shrink-0 rounded-[4px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-700 animate-pulse" />
                        Pending Placement
                      </span>
                    </div>
                    <div className="text-xs font-bold text-amber-950">
                      You&apos;re not yet assigned to a section
                    </div>
                    <p className="text-[10px] text-amber-900 leading-tight">
                      Transferee evaluation in progress by the school administrator.
                    </p>
                  </Link>
                ) : (
                  <Link
                    href={sectionHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-2.5 p-2.5 bg-amber-50 hover:bg-amber-100/70 border-2 border-amber-400 text-xs space-y-1 block transition-colors cursor-pointer rounded-[4px] shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-amber-800 uppercase tracking-widest block">
                        SECTION STATUS
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-200/70 text-amber-950 text-[9px] font-bold uppercase whitespace-nowrap shrink-0 rounded-[4px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                        Pending Placement
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
                <span className="text-[10px] font-bold text-[#002060] uppercase block">
                  GUEST VISITOR
                </span>
                <p className="text-xs text-slate-700 mt-1">
                  Sign in with your verified email to access online basic education enrollment or track your application status.
                </p>
              </div>
            )}

            {/* Menu Navigation Links */}
            <div className="p-4 space-y-2">
              <PwaInstallDrawerCard />
              <PushNotificationDrawerCard />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                PORTAL MODULES
              </span>
              {/* Student Profile Module */}
              <Link
                href={profileHref}
                onClick={() => setIsMenuOpen(false)}
                className={`block p-3 border-2 transition-all rounded-[4px] shadow-xs ${
                  pathname === "/profile"
                    ? "bg-blue-50/80 border-[#002060] text-[#002060]"
                    : "bg-white border-slate-200 hover:border-[#002060] text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Student Profile
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  View complete student records, DepEd LRN, demographic details, parent information, and section assignments.
                </p>
              </Link>

              {/* 1. Home Link */}
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className={`block p-3 border-2 transition-all rounded-[4px] shadow-xs ${
                  pathname === "/"
                    ? "bg-blue-50/80 border-[#002060] text-[#002060]"
                    : "bg-white border-slate-200 hover:border-[#002060] text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Home Dashboard
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  Return to student landing page, view school calendar advisories, and quick notices.
                </p>
              </Link>

              {/* 2. Enrollment Link */}
              <Link
                href={enrollHref}
                onClick={() => setIsMenuOpen(false)}
                className={`block p-3 border-2 transition-all rounded-[4px] shadow-xs ${
                  pathname === "/enroll"
                    ? "bg-blue-50/80 border-[#002060] text-[#002060]"
                    : "bg-white border-slate-200 hover:border-[#002060] text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Basic Education Enrollment
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  Complete the 5-step official DepEd enrollment stepper for Junior and Senior High School.
                </p>
              </Link>

              {/* 3. Track Status Link */}
              <Link
                href={trackHref}
                onClick={() => setIsMenuOpen(false)}
                className={`block p-3 border-2 transition-all rounded-[4px] shadow-xs ${
                  pathname === "/track"
                    ? "bg-blue-50/80 border-[#002060] text-[#002060]"
                    : "bg-white border-slate-200 hover:border-[#002060] text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Track Application Status
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  Real-time status tracking, school administrator review remarks, and Certificate of Enrollment.
                </p>
              </Link>

              {/* 4. Section Placement & Advisory Link */}
              <Link
                href={sectionHref}
                onClick={() => setIsMenuOpen(false)}
                className={`block p-3 border-2 transition-all rounded-[4px] shadow-xs ${
                  pathname === "/section"
                    ? "bg-blue-50/80 border-[#002060] text-[#002060]"
                    : "bg-white border-slate-200 hover:border-[#002060] text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Class Section &amp; Advisory
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  {sectionMode === "ASSIGNED" && assignedSection
                    ? `Assigned in Section: ${assignedSection.name}`
                    : sectionMode === "ENROLLMENT_REQUIRED"
                    ? `Please enroll for Trimester ${activeTermNum} to see your section assignment.`
                    : sectionMode === "NOT_ASSIGNED_TRANSFEREE"
                    ? "You're not yet assigned to a section. Transferee evaluation in progress."
                    : "You're not yet assigned to a section. Check official class placement."}
                </p>
              </Link>
            </div>
          </div>

          {/* Drawer Bottom Actions: Hidden on mobile (Android/iOS) for logged-in students; visible on laptop/PC */}
          <div
            className={`${
              user ? "hidden md:block" : "block"
            } shrink-0 w-full p-4 border-t-2 border-slate-200 bg-slate-50 space-y-2.5 z-10`}
            style={{
              paddingBottom: "max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))",
            }}
          >
            {user ? (
              /* Laptop/PC Only: Original bottom Sign Out button */
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                }}
                className="w-full py-2.5 sm:py-3 bg-red-50/70 hover:bg-red-100 text-red-900 hover:text-red-950 border-2 border-red-500 hover:border-red-600 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer text-center rounded-[4px] active:scale-[0.99] shadow-xs touch-manipulation"
                style={{ touchAction: "manipulation" }}
              >
                SIGN OUT ACCOUNT
              </button>
            ) : (
              <Link
                href="/?tab=signin"
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-2.5 sm:py-3 bg-[#002060] hover:bg-blue-950 text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors text-center block shadow-xs rounded-[4px] active:scale-[0.99] touch-manipulation"
                style={{ touchAction: "manipulation" }}
              >
                Sign In / Register Account
              </Link>
            )}

            {/* Laptop/PC Only: School ID Footer */}
            <div className="hidden md:block text-center text-[10px] sm:text-xs text-slate-500 font-medium">
              Dumalneg National High School &bull; School ID: 300017
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
