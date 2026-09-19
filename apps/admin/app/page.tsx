"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminHeaderNav from "@/components/AdminHeaderNav";
import AdjudicationModal, { ApplicationDetail, SectionItem } from "@/components/AdjudicationModal";
import EnrollmentControlRoom from "@/components/EnrollmentControlRoom";
import { useAdminAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";

export default function AdminHomePage() {
  const { user, isLoading: isAuthLoading, login } = useAdminAuth();
  const supabase = createClient();

  // Active Main Section: "adjudication" | "sections" | "scheduling" | "control"
  const [activeSection, setActiveSection] = useState<"adjudication" | "sections" | "scheduling" | "control">("adjudication");

  // Sign-In Form State
  const [adminId, setAdminId] = useState<string>("admin@dumalneg.deped.gov.ph");
  const [adminPassword, setAdminPassword] = useState<string>("admin123");
  const [loginError, setLoginError] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginProgress, setLoginProgress] = useState<number>(0);
  const [loginStatusText, setLoginStatusText] = useState<string>("");

  // Adjudication Console Data State
  const [applications, setApplications] = useState<ApplicationDetail[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [isFetchingApps, setIsFetchingApps] = useState<boolean>(true);
  const hasLoadedAppsOnce = useRef<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Pending" | "Approved" | "Needs Revision">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState<ApplicationDetail | null>(null);

  // Handle Admin Login with Institutional Verification Delay
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!adminId.trim() || !adminPassword) {
      setLoginError("Please enter your Administrator ID or Email and password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginProgress(20);
    setLoginStatusText("Connecting to Dumalneg NHS Security Realm...");

    try {
      await new Promise((res) => setTimeout(res, 400));
      setLoginProgress(55);
      setLoginStatusText("Verifying administrative role permissions with Supabase database...");

      const res = await login(adminId, adminPassword);
      if (!res.success) {
        setLoginError(res.error || "Invalid administrator credentials.");
        setIsLoggingIn(false);
        setLoginProgress(0);
        return;
      }

      setLoginProgress(90);
      setLoginStatusText("Access granted. Initializing School Administrator Console...");
      await new Promise((res) => setTimeout(res, 350));

      setLoginProgress(100);
      setLoginStatusText("Welcome, Administrator!");
      await new Promise((res) => setTimeout(res, 200));
    } finally {
      setIsLoggingIn(false);
      setLoginProgress(0);
      setLoginStatusText("");
    }
  };

  // Fetch Applications and Sections from Supabase
  const fetchData = async (silent: boolean = false) => {
    if (!silent && !hasLoadedAppsOnce.current) {
      setIsFetchingApps(true);
    }

    try {
      // 1. Fetch Sections
      const { data: secData } = await supabase
        .from("sections")
        .select("*")
        .order("grade_level", { ascending: true });

      // 2. Fetch Applications
      const { data: appData, error: appErr } = await supabase
        .from("enrollment_applications")
        .select(`
          id,
          application_id,
          student_id,
          applicant_type,
          school_year,
          target_grade_level,
          target_strand,
          status,
          submitted_documents,
          selected_electives,
          admin_feedback,
          submission_date,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (appErr) throw appErr;

      const detailedApps: ApplicationDetail[] = [];
      const sectionCounts: Record<string, number> = {};

      if (appData && appData.length > 0) {
        // Collect student IDs for high-speed batch fetching
        const studentIds = Array.from(new Set(appData.map((a: any) => a.student_id).filter(Boolean)));
        const stDataMap: Record<string, any> = {};
        const userIds: string[] = [];

        if (studentIds.length > 0) {
          const { data: stList } = await supabase
            .from("students")
            .select("*")
            .in("id", studentIds);

          if (stList) {
            for (const s of stList) {
              stDataMap[s.id] = s;
              if (s.user_id) userIds.push(s.user_id);
              if (s.current_section_id) {
                sectionCounts[s.current_section_id] =
                  (sectionCounts[s.current_section_id] || 0) + 1;
              }
            }
          }
        }

        const userDataMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: uList } = await supabase
            .from("users")
            .select("id, email, user_id")
            .in("id", Array.from(new Set(userIds)));

          if (uList) {
            for (const u of uList) {
              userDataMap[u.id] = u;
            }
          }
        }

        for (const app of appData) {
          const studentRecord = app.student_id ? stDataMap[app.student_id] || null : null;
          const userAccount = studentRecord?.user_id ? userDataMap[studentRecord.user_id] || null : null;

          detailedApps.push({
            ...app,
            student: studentRecord,
            userAccount,
          });
        }
      }

      setApplications(detailedApps);

      if (secData) {
        setSections(
          secData.map((s: any) => ({
            ...s,
            enrolledCount: sectionCounts[s.id] || 0,
          }))
        );
      }

      hasLoadedAppsOnce.current = true;
    } catch (e) {
      console.error("Error fetching administrative data:", e);
    } finally {
      setIsFetchingApps(false);
    }
  };

  // Real-Time Synchronization Engine
  useEffect(() => {
    if (!user) return;

    fetchData(false);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    };
    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onDataChanged = () => {
      fetchData(true);
    };
    window.addEventListener("dumalnext:admin-data-changed", onDataChanged);
    window.addEventListener("dumalnext:data-changed", onDataChanged);

    // 5-Second Silent Polling to ensure instant freshness
    const heartbeat = setInterval(() => {
      fetchData(true);
    }, 5000);

    // Real-Time Supabase Channel
    const channel = supabase
      .channel("admin-realtime-applications-and-students")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => {
          fetchData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("dumalnext:admin-data-changed", onDataChanged);
      window.removeEventListener("dumalnext:data-changed", onDataChanged);
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Dynamic Grade-Scoped Metrics (Real-time recalculation based on Grade Filter)
  const gradeScopedApplications = applications.filter((app) => {
    if (gradeFilter !== "ALL" && String(app.target_grade_level) !== gradeFilter) return false;
    return true;
  });

  const totalCount = gradeScopedApplications.length;
  const pendingCount = gradeScopedApplications.filter((a) => a.status === "Pending").length;
  const approvedCount = gradeScopedApplications.filter((a) => a.status === "Approved").length;
  const revisionCount = gradeScopedApplications.filter((a) => a.status === "Needs Revision").length;

  // Filtered Applications List for Display Table & Credentials Search
  const filteredApplications = applications.filter((app) => {
    // 1. Grade Filter
    if (gradeFilter !== "ALL" && String(app.target_grade_level) !== gradeFilter) return false;

    // 2. Status Filter
    if (statusFilter !== "ALL" && app.status !== statusFilter) return false;

    // 3. Robust Search Query (LRN, Refcode, Full Name, First/Last Name, Email)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/[^a-zA-Z0-9]/g, "");
      const numericQ = q.replace(/\D/g, "");

      const st = app.student;
      const firstName = (st?.first_name || "").toLowerCase();
      const middleName = (st?.middle_name || "").toLowerCase();
      const lastName = (st?.last_name || "").toLowerCase();
      const fullNameForward = `${firstName} ${middleName} ${lastName}`.trim();
      const fullNameReverse = `${lastName}, ${firstName} ${middleName}`.trim();

      const lrn = (st?.student_id || "").toLowerCase();
      const cleanLrn = lrn.replace(/\D/g, "");

      const appId = (app.application_id || "").toLowerCase();
      const cleanAppId = appId.replace(/[^a-zA-Z0-9]/g, "");

      const email = (app.userAccount?.email || "").toLowerCase();

      // Refcode Match (e.g., "DNHS-2025-78601", "78601", "2025")
      const refMatch = appId.includes(q) || (cleanQ.length >= 2 && cleanAppId.includes(cleanQ));

      // LRN Match (12-digit number or any partial digits matching learner's LRN)
      const lrnMatch = (numericQ.length >= 2 && cleanLrn.includes(numericQ)) || lrn.includes(q);

      // Name Match (supports first name, last name, full name "John Lozano", "Lozano, John")
      const nameMatch =
        fullNameForward.includes(q) ||
        fullNameReverse.includes(q) ||
        firstName.includes(q) ||
        lastName.includes(q) ||
        middleName.includes(q);

      // Email Match
      const emailMatch = email.includes(q);

      return refMatch || lrnMatch || nameMatch || emailMatch;
    }

    return true;
  });

  // Loading Screen for Initial Auth Check
  if (isAuthLoading) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border-2 border-slate-300 text-center font-sans">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
          [ AUTHENTICATING ADMINISTRATIVE CREDENTIALS ]
        </span>
        <p className="text-xs text-slate-600">Verifying session security clearance...</p>
      </div>
    );
  }

  // ===========================================================================
  // VIEW A: UNAUTHENTICATED ADMINISTRATOR SIGN-IN
  // ===========================================================================
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 font-sans">
        {/* Notice Banner */}
        <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
          <span className="text-xs font-bold tracking-widest text-[#002060] uppercase block mb-1">
            [ PORTAL 03 &bull; DUMALNEG NATIONAL HIGH SCHOOL &bull; ADMISSIONS ]
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 uppercase">
            School Administration &amp; Enrollment Adjudication Console
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
            Authorized management console for the School Principal, Registrar, and Admissions personnel. 
            Review learner enrollment credentials, inspect submitted PSA documents and report cards, 
            adjudicate application status, manage section quotas, and run schedule deconfliction algorithms.
          </p>
        </section>

        {/* Login Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 sm:p-8 border-2 border-[#002060] shadow-sm space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
                [ OFFICIAL ADMINISTRATOR AUTHENTICATION ]
              </span>
              <h3 className="text-base font-bold text-slate-900 uppercase">
                Administrative Personnel Sign-In
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your authorized Employee ID or official DepEd Email Address.
              </p>
            </div>

            {/* Progress Bar */}
            {isLoggingIn && (
              <div className="p-4 bg-blue-50 border-2 border-[#002060] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[#002060]">
                  <span>[ VERIFYING CREDENTIALS ]</span>
                  <span>{loginProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 border border-blue-900/30 overflow-hidden">
                  <div
                    className="bg-[#002060] h-full transition-all duration-300 ease-out"
                    style={{ width: `${loginProgress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-800 font-medium">
                  {loginStatusText || "Authenticating..."}
                </p>
              </div>
            )}

            {loginError && (
              <div className="p-3 bg-red-50 border-2 border-red-400 text-xs font-bold text-red-900 leading-normal">
                [ AUTHENTICATION ERROR ]: {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Administrator ID or Email <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="e.g. admin@gmail.com or DNHS-ADM-001"
                  className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none disabled:bg-slate-100"
                  disabled={isLoggingIn}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Security Password <span className="text-red-700">*</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full p-3 bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none disabled:bg-slate-100"
                  disabled={isLoggingIn}
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="btn-primary w-full text-xs uppercase tracking-wider font-bold py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? "[ AUTHENTICATING... PLEASE WAIT ]" : "Sign In to Administration Console"}
                </button>
              </div>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">
                Administrator Quick-Fill Presets:
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setAdminId("admin@gmail.com");
                    setAdminPassword("admin123");
                  }}
                  className="text-[#002060] font-bold uppercase underline hover:text-blue-950"
                >
                  [ admin@gmail.com ]
                </button>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={() => {
                    setAdminId("admin@dumalneg.deped.gov.ph");
                    setAdminPassword("admin123");
                  }}
                  className="text-[#002060] font-bold uppercase underline hover:text-blue-950"
                >
                  [ admin@dumalneg.deped.gov.ph ]
                </button>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={() => {
                    setAdminId("DNHS-ADM-001");
                    setAdminPassword("admin123");
                  }}
                  className="text-[#002060] font-bold uppercase underline hover:text-blue-950"
                >
                  [ DNHS-ADM-001 ]
                </button>
              </div>
            </div>
          </div>

          {/* Executive Security Clearance Notice */}
          <div className="bg-slate-100 p-6 border border-slate-300 flex flex-col justify-between space-y-4">
            <div className="space-y-3 text-xs">
              <span className="font-mono font-bold text-[#002060] uppercase block">
                [ DepEd Dumalneg NHS Security Clearance ]
              </span>
              <p className="text-slate-700 leading-relaxed">
                This portal is strictly restricted to authorized Dumalneg National High School personnel. 
                All admissions adjudication actions, document evaluations, and section assignments are digitally audited.
              </p>

              <div className="p-3 bg-white border border-slate-300 space-y-1">
                <strong className="text-slate-900 block font-bold uppercase">1. Enrollment Adjudication:</strong>
                <p className="text-slate-600 text-[11px]">
                  Real-time queue of basic education applications. Approve or request revision on submitted Form 138 report cards and PSA certificates.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-300 space-y-1">
                <strong className="text-slate-900 block font-bold uppercase">2. Section Quota Enforcement:</strong>
                <p className="text-slate-600 text-[11px]">
                  Enforces standard DepEd capacity (40 students per section) to eliminate classroom oversubscription.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-300 space-y-1">
                <strong className="text-slate-900 block font-bold uppercase">3. Conflict-Free Timetable Scheduling:</strong>
                <p className="text-slate-600 text-[11px]">
                  Evaluates 3D timetable collisions (Teacher loads, Classroom occupancies, and SHS 5-core limits).
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Dumalneg NHS &bull; CCIS Capstone Project
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // VIEW B: AUTHENTICATED ADMINISTRATOR CONSOLE
  // ===========================================================================
  return (
    <div className="space-y-6 font-sans">
      {/* Header Navigation */}
      <AdminHeaderNav activeSection={activeSection} onSelectSection={setActiveSection} />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        {/* =====================================================================
            MODULE 1: ENROLLMENT ADJUDICATION CONSOLE (PRIMARY FOCUS)
            ===================================================================== */}
        {activeSection === "adjudication" && (
          <div className="space-y-6">
            {/* Title & Real-Time Sync Indicator */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
                  [ MODULE 01: ENROLLMENT ADJUDICATION &bull; REGISTRAR QUEUE ]
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
                  Basic Education Enrollment Applications Queue
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Live Real-time Status Badge */}
                <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 border border-emerald-300 text-xs font-mono font-bold text-emerald-950">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="uppercase">Real-Time Live Sync</span>
                </div>
              </div>
            </div>

            {/* Executive KPI Metric Cards (Real-Time Dynamic Recalculation) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Total Applications */}
              <div className="p-4 bg-white border-2 border-slate-300 shadow-xs transition-all">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                  Total Applications
                </span>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-1">
                  {totalCount}
                </div>
                <span className="text-[10px] text-slate-500 block truncate">
                  {gradeFilter === "ALL" ? "All Grades • Submitted by learners" : `Grade ${gradeFilter} • Submitted by learners`}
                </span>
              </div>

              {/* Pending (Yellow) */}
              <div className="p-4 bg-amber-50/70 border-2 border-amber-400 shadow-xs transition-all">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-amber-950 uppercase block">
                    Pending Verification
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-950 mt-1">
                  {pendingCount}
                </div>
                <span className="text-[10px] text-amber-900 block truncate">
                  {gradeFilter === "ALL" ? "All Grades • Awaiting registrar decision" : `Grade ${gradeFilter} • Awaiting registrar decision`}
                </span>
              </div>

              {/* Approved (Green) */}
              <div className="p-4 bg-emerald-50/70 border-2 border-emerald-500 shadow-xs transition-all">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-emerald-950 uppercase block">
                    Approved &amp; Enrolled
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-950 mt-1">
                  {approvedCount}
                </div>
                <span className="text-[10px] text-emerald-900 block truncate">
                  {gradeFilter === "ALL" ? "All Grades • Official SY 2025–2026 enrollees" : `Grade ${gradeFilter} • Official enrollees`}
                </span>
              </div>

              {/* Needs Revision (Red) */}
              <div className="p-4 bg-red-50/70 border-2 border-red-500 shadow-xs transition-all">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-red-950 uppercase block">
                    Needs Revision
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-red-950 mt-1">
                  {revisionCount}
                </div>
                <span className="text-[10px] text-red-900 block truncate">
                  {gradeFilter === "ALL" ? "All Grades • Document action required" : `Grade ${gradeFilter} • Action required`}
                </span>
              </div>
            </div>

            {/* Filter Controls & Search Bar */}
            <div className="p-4 bg-white border-2 border-slate-300 space-y-3 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Status Tabs */}
                <div className="flex flex-wrap gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-3 py-1.5 border transition-colors ${
                      statusFilter === "ALL"
                        ? "bg-[#002060] text-white border-[#002060]"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
                    }`}
                  >
                    All ({totalCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("Pending")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border transition-colors ${
                      statusFilter === "Pending"
                        ? "bg-amber-500 text-slate-950 border-amber-600 font-bold"
                        : "bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                    Pending ({pendingCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("Approved")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border transition-colors ${
                      statusFilter === "Approved"
                        ? "bg-emerald-600 text-white border-emerald-700 font-bold"
                        : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-300"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    Approved ({approvedCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("Needs Revision")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border transition-colors ${
                      statusFilter === "Needs Revision"
                        ? "bg-red-600 text-white border-red-700 font-bold"
                        : "bg-red-50 text-red-900 hover:bg-red-100 border-red-300"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                    Needs Revision ({revisionCount})
                  </button>
                </div>

                {/* Search & Grade Filter Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2 py-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">Grade:</span>
                    <select
                      value={gradeFilter}
                      onChange={(e) => setGradeFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-[#002060] outline-none cursor-pointer"
                    >
                      <option value="ALL">All Grade Levels</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11 (SHS)</option>
                      <option value="12">Grade 12 (SHS)</option>
                    </select>
                  </div>

                  <div className="relative flex-1 sm:w-72">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && filteredApplications.length === 1) {
                          setSelectedApp(filteredApplications[0]);
                        }
                      }}
                      placeholder="Search LRN, Ref Code, or Name..."
                      className="w-full pl-3 pr-7 py-1.5 bg-white border border-slate-300 text-xs font-mono font-bold focus:border-[#002060] outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (filteredApplications.length === 1) {
                        setSelectedApp(filteredApplications[0]);
                      }
                    }}
                    className="px-4 py-1.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Search</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Matched Learner Credentials Quick Inspection Card */}
            {searchQuery.trim() && (
              <div className="p-4 bg-blue-50/80 border-2 border-[#002060] shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#002060] text-white text-[10px] font-mono font-bold uppercase">
                      CREDENTIALS SEARCH RESULT
                    </span>
                    <span className="text-xs font-bold text-[#002060]">
                      Found {filteredApplications.length} matching learner{filteredApplications.length === 1 ? "" : "s"} for &ldquo;{searchQuery}&rdquo;
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer"
                  >
                    [ Clear Search ]
                  </button>
                </div>

                {filteredApplications.length === 0 ? (
                  <div className="text-xs text-slate-600 p-2">
                    No learner found with LRN, Reference Code, or Name matching <strong>&ldquo;{searchQuery}&rdquo;</strong>.
                    Please verify if the 12-digit LRN, Reference code, or spelling is correct.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredApplications.slice(0, 3).map((match) => {
                      const mSt = match.student;
                      const mName = mSt
                        ? `${mSt.last_name}, ${mSt.first_name} ${mSt.middle_name || ""}`.trim()
                        : "Applicant Learner";
                      const mLrn = mSt?.student_id && /^\d{12}$/.test(mSt.student_id)
                        ? mSt.student_id
                        : "No LRN Yet (Pending LIS)";

                      return (
                        <div
                          key={match.id}
                          className="bg-white p-3.5 border border-blue-300 shadow-2xs space-y-2 hover:border-[#002060] transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-xs text-[#002060]">
                              {match.application_id}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${
                                match.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  : match.status === "Needs Revision"
                                  ? "bg-red-100 text-red-900 border border-red-300"
                                  : "bg-amber-100 text-amber-900 border border-amber-300"
                              }`}
                            >
                              {match.status}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Learner Name</span>
                            <p className="font-bold text-slate-900 text-xs uppercase truncate" title={mName}>
                              {mName}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-[9px] text-slate-500 font-bold uppercase block">12-Digit LRN</span>
                              <span className="font-mono font-bold text-slate-900">{mLrn}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-500 font-bold uppercase block">Target Level</span>
                              <span className="font-bold text-slate-900">
                                Grade {match.target_grade_level} {match.target_strand ? `(${match.target_strand})` : ""}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedApp(match)}
                            className="w-full py-1.5 bg-[#002060] hover:bg-blue-950 text-white text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 mt-1 cursor-pointer"
                          >
                            <span>Inspect &amp; Review Credentials &rarr;</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Applications Table */}
            <div className="bg-white border-2 border-slate-300 shadow-xs overflow-x-auto">
              {isFetchingApps && !hasLoadedAppsOnce.current ? (
                <div className="p-12 text-center space-y-2">
                  <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
                    [ RETRIEVING APPLICATION RECORDS FROM SUPABASE ]
                  </span>
                  <p className="text-xs text-slate-500">Querying live enrollment database...</p>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
                    [ NO APPLICATIONS FOUND MATCHING CURRENT FILTER ]
                  </span>
                  <p className="text-xs text-slate-600">
                    No enrollment applications match the selected status or search term.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="p-3">Reference No.</th>
                      <th className="p-3">Learner Full Name</th>
                      <th className="p-3">12-Digit LRN</th>
                      <th className="p-3">Grade &amp; Curriculum</th>
                      <th className="p-3">Date Submitted</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Adjudication Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredApplications.map((app) => {
                      const st = app.student;
                      const studentName = st
                        ? `${st.last_name}, ${st.first_name} ${st.middle_name || ""}`.trim()
                        : "APPLICANT LEARNER";

                      return (
                        <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-[#002060]">
                            {app.application_id}
                          </td>
                          <td className="p-3 font-bold text-slate-900 uppercase">
                            {studentName}
                            {app.userAccount?.email && (
                              <span className="text-[10px] text-slate-500 font-normal block lowercase">
                                {app.userAccount.email}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            {st?.student_id && /^\d{12}$/.test(st.student_id) ? (
                              <span className="font-bold text-slate-900">{st.student_id}</span>
                            ) : (
                              <span className="text-slate-400 italic font-sans text-[11px]">No LRN (Pending LIS)</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">
                              Grade {app.target_grade_level}
                            </span>
                            <span className="text-[10px] text-slate-600 block">
                              {app.target_strand
                                ? `SHS (${app.target_strand})`
                                : st?.jhs_program === "SPS"
                                ? `JHS (SPS - ${st?.sps_sport || "Sports"})`
                                : "JHS Regular"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {new Date(app.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {app.status === "Approved" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-950 border border-emerald-500">
                                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                                APPROVED
                              </span>
                            ) : app.status === "Needs Revision" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider bg-red-50 text-red-950 border border-red-500">
                                <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                                REVISION
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-50 text-amber-950 border border-amber-400">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedApp(app)}
                              className="px-3 py-1.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs"
                            >
                              [ Review Dossier ]
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 2: SECTION QUOTA & CAPACITY CONTROL (PREVIEW/SUMMARY)
            ===================================================================== */}
        {activeSection === "sections" && (
          <div className="space-y-6">
            <div className="border-b-2 border-slate-200 pb-3">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
                [ MODULE 02: SECTION QUOTA &amp; CLASSROOM CAPACITY CONTROL ]
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
                Class Sections &amp; Quota Limits (SY 2025–2026)
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Monitors classroom distribution to prevent oversubscription. Standard DepEd quota: 40 learners per section.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((sec) => {
                const count = sec.enrolledCount || 0;
                const pct = Math.min(100, Math.round((count / sec.capacity) * 100));
                const isFull = count >= sec.capacity;

                return (
                  <div key={sec.id} className="p-4 bg-white border-2 border-slate-300 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[#002060]">
                        {sec.section_name}
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 border border-slate-300">
                        Grade {sec.grade_level} {sec.strand ? `(${sec.strand})` : ""}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Enrolled Capacity:</span>
                        <strong className="font-mono text-slate-900">
                          {count} / {sec.capacity} students
                        </strong>
                      </div>
                      <div className="w-full bg-slate-200 h-2 overflow-hidden border border-slate-300">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFull ? "bg-red-600" : pct > 75 ? "bg-amber-500" : "bg-[#002060]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Available Slots:</span>
                      <span className={`font-bold font-mono ${isFull ? "text-red-700" : "text-emerald-800"}`}>
                        {Math.max(0, sec.capacity - count)} slots remaining
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 3: AUTOMATED SCHEDULE DECONFLICTION (PREVIEW)
            ===================================================================== */}
        {activeSection === "scheduling" && (
          <div className="space-y-6">
            <div className="border-b-2 border-slate-200 pb-3">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
                [ MODULE 03: AUTOMATED SCHEDULE DECONFLICTION ENGINE ]
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
                Timetable Conflict-Free Evaluation Hub
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Real-time algorithm verifying 3-dimensional scheduling collisions across teacher loads, classroom bookings, and SHS 5-core limits.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-white border-2 border-slate-300 space-y-2">
                <span className="text-xs font-bold text-[#002060] uppercase block">
                  1. Teacher Load Conflicts
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Evaluates cross-level assignments (JHS + SHS). Prevents assigning a teacher to two simultaneous class periods.
                </p>
              </div>

              <div className="p-5 bg-white border-2 border-slate-300 space-y-2">
                <span className="text-xs font-bold text-[#002060] uppercase block">
                  2. Physical Room Collisions
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Scans classrooms, science laboratories, and TVL computer rooms to ensure zero double-booking.
                </p>
              </div>

              <div className="p-5 bg-white border-2 border-slate-300 space-y-2">
                <span className="text-xs font-bold text-[#002060] uppercase block">
                  3. Student Core Subject Limits
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enforces DepEd Order rules: exactly 5 Core Subjects for Senior High per trisem, preventing timetable overload.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 4: ENROLLMENT CONTROL ROOM & MASTER SYSTEM OPERATIONS
            ===================================================================== */}
        {activeSection === "control" && <EnrollmentControlRoom />}
      </main>

      {/* Adjudication Inspection Modal */}
      {selectedApp && (
        <AdjudicationModal
          application={selectedApp}
          sections={sections}
          onClose={() => setSelectedApp(null)}
          onAdjudicationSuccess={() => fetchData(true)}
        />
      )}
    </div>
  );
}
