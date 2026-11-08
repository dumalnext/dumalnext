"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import { isApplicationInTerm, extractTermNumber } from "@/lib/utils/academicTerm";
import { PwaInstallHeaderButton, PwaInstallDrawerCard } from "@/components/ui/PwaInstallPrompt";
import { useLanguage } from "@/lib/context/LanguageContext";
import { PushNotificationHeaderButton, PushNotificationDrawerCard } from "@/components/ui/PushNotificationButton";

interface StudentHeaderNavProps {
  children?: React.ReactNode;
}

export default function StudentHeaderNav({ children }: StudentHeaderNavProps = {}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { schoolYear, semester, termNumber } = useEnrollmentControl();
  const { t } = useLanguage();
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
    <header className="deped-header border-t-4 border-t-amber-400 border-b border-[#001744] bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white shadow-md font-sans">
      {/* 1. Top DepEd Region I Institutional Strip (Desktop & Tablet only - Hidden on mobile phones to maximize vertical space) */}
      <div className="hidden sm:block bg-[#001540]/60 border-b border-white/10 text-white px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2">
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
              Student &amp; Learner Portal
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Title & Nav Strip (Compact single-line on Mobile, Full Institutional on Desktop) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3.5 lg:py-4.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Hamburger Drawer Button + School Seal & Institution Title */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          {user && (
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="lg:hidden flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white rounded-lg cursor-pointer shrink-0 transition-colors shadow-xs"
              aria-label="Toggle Portal Navigation Menu"
              aria-expanded={isMenuOpen}
            >
              <div className="w-4 h-3.5 flex flex-col justify-between items-center py-0.5" aria-hidden="true">
                <span className={`w-full h-0.5 bg-white transition-all duration-300 origin-center ${isMenuOpen ? "rotate-45 translate-y-[5px]" : ""}`} />
                <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"}`} />
                <span className={`w-full h-0.5 bg-white transition-all duration-300 origin-center ${isMenuOpen ? "-rotate-45 -translate-y-[5px]" : ""}`} />
              </div>
            </button>
          )}

          <Link href="/" className="flex items-center gap-2 sm:gap-3.5 min-w-0 group" title="Dumalneg National High School Portal Home">
            <div className="w-8 h-8 sm:w-11 sm:h-11 lg:w-14 lg:h-14 rounded-full border-2 border-amber-400 shadow-md shrink-0 flex items-center justify-center overflow-hidden bg-white/10 group-hover:scale-105 transition-transform">
              <img
                src="/dumalneg-logo.png"
                alt="Dumalneg National High School Seal"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-semibold text-amber-300 uppercase tracking-widest hidden sm:block truncate">
                Official Basic Education Learner Portal
              </span>
              <h1 className="text-xs sm:text-base lg:text-2xl font-extrabold tracking-tight text-white leading-tight truncate">
                Dumalneg National High School
              </h1>
              <span className="text-[10px] text-amber-300 font-semibold block sm:hidden truncate">
                Student Portal
              </span>
              <p className="text-xs text-blue-100/85 hidden sm:block mt-0.5 truncate">
                Dumalneg, Ilocos Norte &bull; Student Online Enrollment &amp; Academic Records
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Authenticated Student Account Badges & Navigation */}
        {user ? (
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
            {/* Quick Action Alerts Button */}
            <PushNotificationHeaderButton />

            {/* Desktop Only: PWA Install Button */}
            <PwaInstallHeaderButton />

            {/* Mobile-Only Compact User Avatar Circle (1-tap to Profile) */}
            <Link
              href={profileHref}
              className="lg:hidden relative shrink-0 flex items-center justify-center rounded-full border-2 border-amber-400/90 p-0.5 active:scale-95 transition-transform shadow-xs"
              title="View Learner Profile & Credentials"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={user.fullName || user.firstName}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover bg-white"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400/25 text-amber-200 font-black text-[11px] sm:text-xs flex items-center justify-center">
                  {user.firstName?.charAt(0) || "S"}{user.lastName?.charAt(0) || "T"}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#002060] ${
                  appStatus === "Approved"
                    ? "bg-emerald-400"
                    : appStatus === "Pending"
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
              />
            </Link>

            {/* Desktop-Only Full Active Learner Session Pill */}
            <Link
              href={profileHref}
              className="hidden lg:flex border border-white/20 bg-white/10 hover:bg-white/15 backdrop-blur-xs px-3.5 py-1.5 text-xs rounded-lg min-w-0 transition-colors items-center gap-3 group"
              title="View Student Profile & Credentials"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={user.fullName || user.firstName}
                  className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 shadow-xs bg-white shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-400/20 border-2 border-amber-300 text-amber-200 font-black text-xs flex items-center justify-center shrink-0">
                  {user.firstName?.charAt(0) || "S"}{user.lastName?.charAt(0) || "T"}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider truncate">
                    Active Learner Session
                  </span>
                </div>
                <div className="font-bold text-white tracking-wide truncate text-xs mt-0.5 group-hover:text-amber-200 transition-colors">
                  {user.fullName || `${user.firstName} ${user.lastName}`}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-blue-200 block truncate">
                    {user.lrn ? `LRN: ${user.lrn}` : user.userId}
                  </span>
                  {appStatus === "Approved" ? (
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 px-1.5 py-0.2 font-bold uppercase rounded-[3px]">
                      Approved
                    </span>
                  ) : appStatus === "Pending" ? (
                    <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-400/50 px-1.5 py-0.2 font-bold uppercase rounded-[3px]">
                      Pending
                    </span>
                  ) : (
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 px-1.5 py-0.2 font-bold uppercase rounded-[3px]">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* Desktop-Only Direct Sign Out Button */}
            <button
              type="button"
              onClick={logout}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 border border-red-500 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer rounded-lg shrink-0"
              title="Sign Out of Student Portal"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-blue-950/80 border border-blue-400/30 rounded-lg text-[10px] sm:text-[11px] font-bold text-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>S.Y. {schoolYear || "2026-2027"}</span>
              <span className="hidden sm:inline text-blue-300">&bull; {semester || "Trimester 1"}</span>
            </div>
            {pathname !== "/" && (
              <Link
                href="/"
                className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 3. Sub-Navigation Tabs Bar (Hidden on mobile/tablet - accessible via Hamburger Menu) */}
      {user && (
        <div className="hidden lg:block bg-slate-50 border-t border-slate-200 px-3 sm:px-6 lg:px-8 text-slate-800 shadow-2xs">
          <div className="max-w-7xl mx-auto flex items-center overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth whitespace-nowrap gap-1 sm:gap-1.5 text-xs font-bold tracking-wide pt-1.5 sm:pt-2 touch-pan-x" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <Link
              href="/"
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-t-2 border-x-2 transition-all rounded-t-md flex items-center gap-2 ${
                pathname === "/"
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
            </Link>

            <Link
              href={enrollHref}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-t-2 border-x-2 transition-all rounded-t-md flex items-center gap-2 ${
                pathname === "/enroll"
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Enrollment</span>
            </Link>

            <Link
              href={trackHref}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-t-2 border-x-2 transition-all rounded-t-md flex items-center gap-2 ${
                pathname === "/track"
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Track Status</span>
            </Link>

            <Link
              href={sectionHref}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-t-2 border-x-2 transition-all rounded-t-md flex items-center gap-2 ${
                pathname === "/section"
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>My Section</span>
            </Link>

            <Link
              href="/grades"
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-t-2 border-x-2 transition-all rounded-t-md flex items-center gap-2 ${
                pathname === "/grades"
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>My Grade</span>
            </Link>

            <Link
              href={profileHref}
              className={`py-2.5 sm:py-3 px-3.5 sm:px-4 shrink-0 border-t-2 border-x-2 transition-all rounded-t-md flex items-center gap-2 ${
                pathname === "/profile"
                  ? "border-[#002060] bg-white text-[#002060] -mb-[1px] shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-[#002060] hover:bg-slate-200/60"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>My Profile</span>
            </Link>
          </div>
        </div>
      )}

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
          {/* Unified Executive Drawer Header (Pinned at Top) */}
          <div className="shrink-0 bg-gradient-to-br from-[#002060] via-[#002670] to-[#0a1936] text-white border-b border-blue-900 z-10">
            {/* Top Bar: Branding & Close */}
            <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <img
                  src="/dumalneg-logo.png"
                  alt="Dumalneg National High School"
                  className="w-8 h-8 object-contain shrink-0"
                />
                <div>
                  <span className="text-[9px] text-amber-300 font-bold uppercase tracking-widest block">
                    DUMALNEG NHS &bull; PORTAL MENU
                  </span>
                  <h3 className="text-xs font-bold tracking-tight text-white">
                    Navigation &amp; Learner Services
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-red-600/90 text-white border border-white/20 hover:border-red-400 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-[4px] active:scale-95"
              >
                <span>Close</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Integrated Student Identity Card */}
            {user ? (
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex items-center gap-3">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-11 h-11 rounded-full object-cover border-2 border-amber-300/80 shadow-xs bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-blue-950 text-amber-300 border-2 border-amber-300/70 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-sm font-bold text-white truncate">
                        {user.firstName} {user.lastName}
                      </h4>
                      {appStatus === "Approved" ? (
                        <span className="text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 font-extrabold uppercase rounded-[3px] whitespace-nowrap shrink-0">
                          APPROVED
                        </span>
                      ) : appStatus === "Needs Revision" ? (
                        <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 font-extrabold uppercase rounded-[3px] whitespace-nowrap shrink-0">
                          REVISION
                        </span>
                      ) : appStatus === "Pending" ? (
                        <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.5 font-extrabold uppercase rounded-[3px] whitespace-nowrap shrink-0">
                          PENDING
                        </span>
                      ) : (
                        <span className="text-[9px] bg-blue-400/25 text-blue-100 border border-blue-300/40 px-1.5 py-0.5 font-bold uppercase rounded-[3px] whitespace-nowrap shrink-0">
                          NEW APPLICANT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-blue-200 font-mono truncate mt-0.5">
                      LRN: <strong className="text-white">{user.lrn || user.userId || "Pending"}</strong>
                    </p>
                    <p className="text-[10px] text-blue-300/80 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Quick Profile & Sign Out Actions */}
                <div className="flex items-center gap-2 pt-0.5">
                  <Link
                    href={profileHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 py-1.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold rounded-[4px] transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>View Profile</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                    }}
                    className="py-1.5 px-3 bg-red-600/90 hover:bg-red-600 active:bg-red-700 border border-red-400/40 text-white text-[11px] font-bold uppercase tracking-wider rounded-[4px] cursor-pointer shrink-0 transition-colors inline-flex items-center justify-center gap-1.5"
                    title="Sign Out of Session"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-blue-950/50">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                  GUEST VISITOR
                </span>
                <p className="text-[11px] text-blue-100 mt-0.5 leading-snug">
                  Sign in with your verified email to access online basic education enrollment.
                </p>
              </div>
            )}
          </div>

          {/* Slim Section / Enrollment Status Strip */}
          {user && (
            <div className="shrink-0">
              {sectionMode === "ASSIGNED" && assignedSection ? (
                <Link
                  href={sectionHref}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100/80 border-b border-emerald-200 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    <div className="truncate text-[11px] text-emerald-950">
                      <span className="font-semibold">Section:</span>{" "}
                      <strong className="font-extrabold underline">{assignedSection.name}</strong>{" "}
                      <span className="text-emerald-700 font-medium">
                        (Grade {assignedSection.gradeLevel}{assignedSection.strand ? ` • ${assignedSection.strand}` : ""})
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : sectionMode === "ENROLLMENT_REQUIRED" ? (
                <Link
                  href="/enroll"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100/80 border-b border-amber-300 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
                    <div className="truncate text-[11px] text-amber-950">
                      <strong className="font-extrabold uppercase tracking-wide">Action Needed:</strong>{" "}
                      <span>Enroll for Trimester {activeTermNum} to unlock section</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-amber-800 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <Link
                  href={sectionHref}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2 bg-amber-50/70 hover:bg-amber-100/60 border-b border-amber-200 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <div className="truncate text-[11px] text-amber-950">
                      <span className="font-bold">Section Status:</span>{" "}
                      <span>Pending administrator evaluation</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          )}

          {/* Drawer Scrollable Body (Middle) */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain min-h-0 touch-pan-y bg-slate-50/50 p-3.5 space-y-4"
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {/* 1. Primary Portal Navigation List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                PORTAL MODULES
              </span>

              <div className="bg-white border border-slate-200/90 rounded-[6px] divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {/* Home Dashboard */}
                <Link
                  href="/"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between gap-3 p-2.5 transition-colors ${
                    pathname === "/"
                      ? "bg-blue-50/80 border-l-4 border-l-[#002060] text-[#002060]"
                      : "hover:bg-slate-50 border-l-4 border-l-transparent text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center shrink-0 ${
                      pathname === "/" ? "bg-[#002060] text-amber-300 shadow-2xs" : "bg-slate-100 text-[#002060]"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Home Dashboard</span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        School calendar advisories &amp; overview
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Basic Education Enrollment */}
                <Link
                  href={enrollHref}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between gap-3 p-2.5 transition-colors ${
                    pathname === "/enroll"
                      ? "bg-blue-50/80 border-l-4 border-l-[#002060] text-[#002060]"
                      : "hover:bg-slate-50 border-l-4 border-l-transparent text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center shrink-0 ${
                      pathname === "/enroll" ? "bg-[#002060] text-amber-300 shadow-2xs" : "bg-slate-100 text-[#002060]"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Basic Education Enrollment</span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Official 5-step DepEd enrollment form
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Track Application Status */}
                <Link
                  href={trackHref}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between gap-3 p-2.5 transition-colors ${
                    pathname === "/track"
                      ? "bg-blue-50/80 border-l-4 border-l-[#002060] text-[#002060]"
                      : "hover:bg-slate-50 border-l-4 border-l-transparent text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center shrink-0 ${
                      pathname === "/track" ? "bg-[#002060] text-amber-300 shadow-2xs" : "bg-slate-100 text-[#002060]"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Track Application Status</span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Verification remarks &amp; enrollment certificate
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Class Section & Advisory */}
                <Link
                  href={sectionHref}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between gap-3 p-2.5 transition-colors ${
                    pathname === "/section"
                      ? "bg-blue-50/80 border-l-4 border-l-[#002060] text-[#002060]"
                      : "hover:bg-slate-50 border-l-4 border-l-transparent text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center shrink-0 ${
                      pathname === "/section" ? "bg-[#002060] text-amber-300 shadow-2xs" : "bg-slate-100 text-[#002060]"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Class Section &amp; Schedule</span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {sectionMode === "ASSIGNED" && assignedSection
                          ? `Section: ${assignedSection.name} • Room & Timetable`
                          : "Advisory placement & weekly class timetable"}
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* My Grade */}
                <Link
                  href="/grades"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between gap-3 p-2.5 transition-colors ${
                    pathname === "/grades"
                      ? "bg-blue-50/80 border-l-4 border-l-[#002060] text-[#002060]"
                      : "hover:bg-slate-50 border-l-4 border-l-transparent text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center shrink-0 ${
                      pathname === "/grades" ? "bg-[#002060] text-amber-300 shadow-2xs" : "bg-slate-100 text-[#002060]"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate">My Grade</span>
                        <span className="px-1.5 py-0.2 bg-blue-100 text-[#002060] text-[8px] font-bold uppercase rounded shrink-0">
                          Official
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Trimester grade snapshots &amp; academic ratings
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Student Profile */}
                <Link
                  href={profileHref}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between gap-3 p-2.5 transition-colors ${
                    pathname === "/profile"
                      ? "bg-blue-50/80 border-l-4 border-l-[#002060] text-[#002060]"
                      : "hover:bg-slate-50 border-l-4 border-l-transparent text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center shrink-0 ${
                      pathname === "/profile" ? "bg-[#002060] text-amber-300 shadow-2xs" : "bg-slate-100 text-[#002060]"
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">Student Profile</span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Complete learner dossier, LRN &amp; family info
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* 2. Device & Notification Utilities */}
            {user && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  DEVICE &amp; ALERTS
                </span>
                <div className="space-y-2">
                  <PwaInstallDrawerCard />
                  <PushNotificationDrawerCard />
                </div>
              </div>
            )}
          </div>

          {/* Drawer Pinned Footer */}
          <div
            className="shrink-0 w-full px-4 py-2.5 border-t border-slate-200 bg-white z-10"
            style={{
              paddingBottom: "max(0.625rem, calc(env(safe-area-inset-bottom, 0px) + 0.35rem))",
            }}
          >
            {!user && (
              <Link
                href="/?tab=signin"
                onClick={() => setIsMenuOpen(false)}
                className="w-full mb-2 py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors text-center block shadow-xs rounded-[4px] active:scale-[0.99]"
              >
                Sign In / Register Account
              </Link>
            )}
            <div className="text-center text-[10px] text-slate-500 font-medium">
              Dumalneg National High School &bull; School ID: 300017 &bull; Region I
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
