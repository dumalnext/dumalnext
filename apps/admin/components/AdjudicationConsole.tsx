"use client";

import React, { useState, useEffect, useRef } from "react";
import AdjudicationModal, { ApplicationDetail, SectionItem } from "@/components/AdjudicationModal";
import { createClient } from "@/lib/supabase/client";

export default function AdjudicationConsole() {
  const supabase = createClient();

  // Adjudication Console Data State
  const [applications, setApplications] = useState<ApplicationDetail[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [isFetchingApps, setIsFetchingApps] = useState<boolean>(true);
  const hasLoadedAppsOnce = useRef<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Pending" | "Approved" | "Needs Revision">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");

  // Academic Terms & Calendar Period State
  const [academicTerms, setAcademicTerms] = useState<any[]>([]);
  const [activeTerm, setActiveTerm] = useState<{ schoolYear: string; termName: string; termNumber: number } | null>(null);
  const [selectedSY, setSelectedSY] = useState<string>("ACTIVE");
  const [selectedTerm, setSelectedTerm] = useState<string>("ACTIVE");

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState<ApplicationDetail | null>(null);

  // Fetch Academic Terms from Supabase / API
  const fetchAcademicTerms = async () => {
    try {
      const { data: terms, error } = await supabase
        .from("academic_terms")
        .select("*")
        .order("schoolYear", { ascending: false })
        .order("termNumber", { ascending: true });

      if (!error && terms && terms.length > 0) {
        setAcademicTerms(terms);
        const active = terms.find((t: any) => t.isActive);
        if (active) {
          setActiveTerm({
            schoolYear: active.schoolYear,
            termName: active.termName || `Trimester ${active.termNumber}`,
            termNumber: active.termNumber,
          });
        }
        return;
      }

      // Fallback: API route
      const res = await fetch(`/api/it-support/terms?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.terms)) {
          setAcademicTerms(json.terms);
          const active = json.terms.find((t: any) => t.isActive);
          if (active) {
            setActiveTerm({
              schoolYear: active.schoolYear,
              termName: active.termName || `Trimester ${active.termNumber}`,
              termNumber: active.termNumber,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Notice fetching academic terms for adjudication:", err);
    }
  };

  // Fetch Applications and Sections from Supabase
  const fetchData = async (silent: boolean = false) => {
    if (!silent && !hasLoadedAppsOnce.current) {
      setIsFetchingApps(true);
    }

    try {
      // 1. Fetch Sections from API route (with fallback to Supabase + system_settings filtering)
      let activeSections: SectionItem[] = [];
      try {
        const secRes = await fetch(`/api/sections?_t=${Date.now()}`, { cache: "no-store" });
        if (secRes.ok) {
          const secJson = await secRes.json();
          if (secJson.success && Array.isArray(secJson.sections)) {
            activeSections = secJson.sections.map((s: any) => ({
              id: s.id,
              section_name: s.section_name,
              grade_level: Number(s.grade_level),
              strand: s.strand || undefined,
              room: s.room || undefined,
              adviser_name: s.adviser_name || undefined,
              capacity: Number(s.capacity) || 40,
              enrolledCount: Number(s.enrolledCount) || 0,
            }));
          }
        }
      } catch (secApiErr) {
        console.warn("Notice fetching sections via API:", secApiErr);
      }

      if (activeSections.length === 0) {
        const { data: secData } = await supabase
          .from("sections")
          .select("*")
          .order("grade_level", { ascending: true });

        let deletedIds: string[] = [];
        let customSections: any[] = [];
        try {
          const { data: sysData } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "sections_config")
            .maybeSingle();

          if (sysData?.value) {
            deletedIds = sysData.value.deletedIds || [];
            customSections = sysData.value.customSections || [];
          }
        } catch {}

        const secMap = new Map<string, any>();
        (secData || []).forEach((s: any) => {
          if (!deletedIds.includes(s.id)) {
            secMap.set(s.id, s);
          }
        });

        customSections.forEach((cs: any) => {
          if (cs.id && !deletedIds.includes(cs.id)) {
            secMap.set(cs.id, { ...(secMap.get(cs.id) || {}), ...cs });
          }
        });

        activeSections = Array.from(secMap.values()).map((s: any) => ({
          id: s.id,
          section_name: s.section_name,
          grade_level: Number(s.grade_level),
          strand: s.strand || undefined,
          room: s.room || undefined,
          adviser_name: s.adviser_name || undefined,
          capacity: Number(s.capacity) || 40,
          enrolledCount: s.enrolled_count || 0,
        }));
      }

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
          admin_feedback,
          submitted_documents,
          selected_electives,
          submission_date,
          created_at,
          updated_at,
          student:students (
            id,
            user_id,
            student_id,
            first_name,
            middle_name,
            last_name,
            gender,
            date_of_birth,
            contact_number,
            barangay,
            grade_level,
            strand,
            current_section_id
          )
        `)
        .order("created_at", { ascending: false });

      if (appErr) {
        console.warn("Supabase fetch notice (applications):", appErr.message);
      }

      // Fetch user account emails for cross-referencing
      const { data: usersData } = await supabase
        .from("users")
        .select("id, email, user_id");

      const userMap = new Map<string, { email: string; userId: string }>();
      if (usersData) {
        usersData.forEach((u: any) => {
          userMap.set(u.id, { email: u.email, userId: u.user_id });
          userMap.set(u.user_id, { email: u.email, userId: u.user_id });
        });
      }

      // Compute section counts based on student.current_section_id
      const sectionCountMap = new Map<string, number>();
      if (appData) {
        appData.forEach((app: any) => {
          const secId = app.student?.current_section_id;
          if (secId) {
            sectionCountMap.set(secId, (sectionCountMap.get(secId) || 0) + 1);
          }
        });
      }

      const enrichedSections: SectionItem[] = activeSections.map((s: any) => ({
        ...s,
        enrolledCount: Math.max(s.enrolledCount || 0, sectionCountMap.get(s.id) || 0),
      }));

      const enrichedApps: ApplicationDetail[] = (appData || []).map((app: any) => {
        const rawStudent = app.student;
        const linkedUser = rawStudent?.user_id
          ? userMap.get(rawStudent.user_id)
          : rawStudent?.student_id
          ? userMap.get(rawStudent.student_id)
          : undefined;

        // Extract any extended form data saved in selected_electives
        const fd = Array.isArray(app.selected_electives) && app.selected_electives.length > 0
          ? app.selected_electives[0]
          : {};

        const student = rawStudent ? {
          ...rawStudent,
          psa_birth_cert_no: fd.psaBirthCertificateNo || fd.psa_birth_cert_no,
          place_of_birth: fd.placeOfBirth || fd.place_of_birth,
          religion: fd.religion,
          mother_tongue: fd.motherTongue || fd.mother_tongue,
          is_ip_community: fd.isIpCommunity ?? fd.is_ip_community,
          ip_community_name: fd.ipCommunityName || fd.ip_community_name,
          is_4ps_beneficiary: fd.is4psBeneficiary ?? fd.is_4ps_beneficiary,
          household_id_4ps: fd.household4psId || fd.household_id_4ps,
          father_last_name: fd.fatherLastName || fd.father_last_name,
          father_first_name: fd.fatherFirstName || fd.father_first_name,
          father_middle_name: fd.fatherMiddleName || fd.father_middle_name,
          father_contact_number: fd.fatherContactNumber || fd.father_contact_number,
          mother_maiden_last_name: fd.motherMaidenLastName || fd.mother_maiden_last_name,
          mother_first_name: fd.motherFirstName || fd.mother_first_name,
          mother_middle_name: fd.motherMiddleName || fd.mother_middle_name,
          mother_contact_number: fd.motherContactNumber || fd.mother_contact_number,
          guardian_last_name: fd.guardianLastName || fd.guardian_last_name,
          guardian_first_name: fd.guardianFirstName || fd.guardian_first_name,
          guardian_middle_name: fd.guardianMiddleName || fd.guardian_middle_name,
          guardian_contact_number: fd.guardianContactNumber || fd.guardian_contact_number,
          guardian_relationship: fd.guardianRelationship || fd.guardian_relationship,
          primary_contact_person: fd.primaryContactPerson || fd.primary_contact_person,
          last_grade_completed: fd.lastGradeCompleted || fd.step1?.lastGradeCompleted || fd.last_grade_completed,
          last_school_year_completed: fd.lastSchoolYearCompleted || fd.step1?.lastSchoolYearCompleted || fd.last_school_year_completed,
          last_school_attended: fd.lastSchoolAttended || fd.step1?.lastSchoolAttended || fd.last_school_attended,
          last_school_id: fd.lastSchoolId || fd.step1?.lastSchoolId || fd.last_school_id,
          preferred_modalities: fd.preferredModalities || fd.preferred_modalities,
          jhs_program: fd.jhsProgram || fd.step1?.jhsProgram || fd.jhs_program,
          sps_sport: fd.spsSport || fd.sps_sport,
        } : undefined;

        const rawTerm = (
          fd.semester ||
          fd.targetSemester ||
          fd.step1?.targetSemester ||
          fd.term ||
          app.semester ||
          "Trimester 1"
        ).trim();

        const cleanSchoolYear = (app.school_year || fd.schoolYear || "2026-2027").replace("–", "-").trim();

        return {
          ...app,
          school_year: cleanSchoolYear,
          semester: rawTerm,
          term_name: rawTerm,
          student,
          userAccount: linkedUser,
        };
      });

      setApplications(enrichedApps);
      setSections(enrichedSections);
      hasLoadedAppsOnce.current = true;
    } catch (err) {
      console.warn("Notice reading enrollment database:", err);
    } finally {
      setIsFetchingApps(false);
    }
  };

  useEffect(() => {
    // 1. Initial silent/active load
    fetchAcademicTerms();
    fetchData();

    // 2. Realtime subscription to enrollment_applications, academic_terms, sections, and system_settings
    const appChannel = supabase
      .channel("admin-realtime-adjudication-apps")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => {
          fetchData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_terms" },
        () => {
          fetchAcademicTerms();
          fetchData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sections" },
        () => {
          fetchData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => {
          fetchData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings" },
        () => {
          fetchData(true);
        }
      )
      .subscribe();

    // 3. Fallback Heartbeat Polling (every 12 seconds)
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 12000);

    // 4. Tab focus auto-sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 5. Custom Cross-tab / In-App Event
    const handleCustomChange = () => {
      fetchData(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("dumalnext:data-changed", handleCustomChange);
      window.addEventListener("dumalnext:admin-data-changed", handleCustomChange);
    }

    return () => {
      supabase.removeChannel(appChannel);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (typeof window !== "undefined") {
        window.removeEventListener("dumalnext:data-changed", handleCustomChange);
        window.removeEventListener("dumalnext:admin-data-changed", handleCustomChange);
      }
    };
  }, []);

  // Helper to test if application term matches target term
  const matchesTerm = (appTermName: string, targetTermName: string): boolean => {
    if (targetTermName === "ALL") return true;
    if (!appTermName) return false;

    const a = appTermName.trim().toLowerCase();
    const t = targetTermName.trim().toLowerCase();
    if (a === t) return true;

    const extractNum = (str: string) => {
      if (str.includes("1") || str.includes("first")) return 1;
      if (str.includes("2") || str.includes("second")) return 2;
      if (str.includes("3") || str.includes("third")) return 3;
      return 0;
    };

    const numA = extractNum(a);
    const numT = extractNum(t);

    if (numA !== 0 && numT !== 0) {
      return numA === numT;
    }

    return false;
  };

  // Determine effective School Year and Term/Trimester
  const effectiveSY = selectedSY === "ACTIVE" ? (activeTerm?.schoolYear || "2026-2027") : selectedSY;
  const effectiveTerm = selectedTerm === "ACTIVE" ? (activeTerm?.termName || "Trimester 1") : selectedTerm;

  // Available School Years list
  const availableSchoolYears = Array.from(
    new Set([
      ...(activeTerm?.schoolYear ? [activeTerm.schoolYear] : []),
      ...academicTerms.map((t) => t.schoolYear).filter(Boolean),
      ...applications.map((a) => (a.school_year || "").replace("–", "-").trim()).filter(Boolean),
      "2026-2027",
    ])
  ).sort().reverse();

  // 1. Filter Applications by Academic Period (School Year & Term/Trimester)
  // By default, this filters strictly to the Active School Year and Term set by IT Support!
  const termScopedApplications = applications.filter((app) => {
    const appSY = (app.school_year || "").replace("–", "-").trim();
    const appTerm = app.term_name || app.semester || "Trimester 1";

    if (effectiveSY !== "ALL") {
      const cleanTargetSY = effectiveSY.replace("–", "-").trim();
      if (appSY !== cleanTargetSY) {
        return false;
      }
    }

    if (effectiveTerm !== "ALL") {
      if (!matchesTerm(appTerm, effectiveTerm)) {
        return false;
      }
    }

    return true;
  });

  // 2. Filter by Grade Level
  const gradeScopedApplications = termScopedApplications.filter((app) => {
    if (gradeFilter === "ALL") return true;
    return String(app.target_grade_level) === String(gradeFilter);
  });

  const totalCount = gradeScopedApplications.length;
  const pendingCount = gradeScopedApplications.filter((a) => a.status === "Pending").length;
  const approvedCount = gradeScopedApplications.filter((a) => a.status === "Approved").length;
  const revisionCount = gradeScopedApplications.filter((a) => a.status === "Needs Revision").length;

  const filteredApplications = gradeScopedApplications.filter((app) => {
    // Status Filter
    if (statusFilter !== "ALL" && app.status !== statusFilter) {
      return false;
    }

    // Search Query (LRN, Refcode, Name, Email)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const refMatch = (app.application_id || "").toLowerCase().includes(q);
      const lrnMatch = (app.student?.student_id || "").toLowerCase().includes(q);
      const firstNameMatch = (app.student?.first_name || "").toLowerCase().includes(q);
      const lastNameMatch = (app.student?.last_name || "").toLowerCase().includes(q);
      const fullNameMatch = `${app.student?.first_name || ""} ${app.student?.last_name || ""}`.toLowerCase().includes(q);
      const emailMatch = (app.userAccount?.email || "").toLowerCase().includes(q);

      return refMatch || lrnMatch || firstNameMatch || lastNameMatch || fullNameMatch || emailMatch;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Real-Time Sync Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            [ ENROLLMENT ADJUDICATION &bull; REGISTRAR QUEUE ]
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

      {/* Active Academic Period Context Banner */}
      <div className="p-3.5 bg-white border-2 border-[#002060] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-mono font-bold text-[#002060] text-xs uppercase tracking-wider">
            [ ACTIVE ACADEMIC PERIOD QUEUE &bull; S.Y. {activeTerm?.schoolYear || "2026-2027"} &bull; {activeTerm?.termName || "Trimester 1"} ]
          </span>
          <span className="text-xs text-slate-600">
            {selectedSY === "ACTIVE" && selectedTerm === "ACTIVE" ? (
              <span>Queue is automatically organized to display <strong>enrollees for this active term only</strong>.</span>
            ) : (
              <span>Custom filter applied: <strong>S.Y. {effectiveSY} &bull; {effectiveTerm}</strong>.</span>
            )}
          </span>
        </div>

        {(selectedSY !== "ACTIVE" || selectedTerm !== "ACTIVE") && (
          <button
            type="button"
            onClick={() => {
              setSelectedSY("ACTIVE");
              setSelectedTerm("ACTIVE");
            }}
            className="px-3 py-1.5 bg-[#002060] hover:bg-blue-900 text-white font-mono font-bold text-[11px] uppercase transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            [ Reset to Active Term ]
          </button>
        )}
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
            {effectiveSY === "ALL" && effectiveTerm === "ALL"
              ? (gradeFilter === "ALL" ? "All Terms • All Grades" : `All Terms • Grade ${gradeFilter}`)
              : (gradeFilter === "ALL" ? `S.Y. ${effectiveSY} • ${effectiveTerm}` : `S.Y. ${effectiveSY} • ${effectiveTerm} • Gr. ${gradeFilter}`)}
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
            {effectiveSY === "ALL" && effectiveTerm === "ALL"
              ? (gradeFilter === "ALL" ? "All Terms • Awaiting decision" : `Grade ${gradeFilter} • Awaiting decision`)
              : (gradeFilter === "ALL" ? `S.Y. ${effectiveSY} • ${effectiveTerm}` : `S.Y. ${effectiveSY} • ${effectiveTerm} • Gr. ${gradeFilter}`)}
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
            {effectiveSY === "ALL" && effectiveTerm === "ALL"
              ? (gradeFilter === "ALL" ? "All Terms • Official enrollees" : `Grade ${gradeFilter} • Official enrollees`)
              : (gradeFilter === "ALL" ? `S.Y. ${effectiveSY} • ${effectiveTerm}` : `S.Y. ${effectiveSY} • ${effectiveTerm} • Gr. ${gradeFilter}`)}
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
            {effectiveSY === "ALL" && effectiveTerm === "ALL"
              ? (gradeFilter === "ALL" ? "All Terms • Action required" : `Grade ${gradeFilter} • Action required`)
              : (gradeFilter === "ALL" ? `S.Y. ${effectiveSY} • ${effectiveTerm}` : `S.Y. ${effectiveSY} • ${effectiveTerm} • Gr. ${gradeFilter}`)}
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

          {/* Academic Period, Grade & Search Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* School Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2 py-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">SY:</span>
              <select
                value={selectedSY}
                onChange={(e) => setSelectedSY(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#002060] outline-none cursor-pointer"
              >
                <option value="ACTIVE">
                  Active ({activeTerm?.schoolYear || "2026-2027"})
                </option>
                {availableSchoolYears
                  .filter((sy) => sy !== (activeTerm?.schoolYear || "2026-2027"))
                  .map((sy) => (
                    <option key={sy} value={sy}>
                      S.Y. {sy}
                    </option>
                  ))}
                <option value="ALL">All School Years</option>
              </select>
            </div>

            {/* Term / Trimester Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2 py-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">Term:</span>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#002060] outline-none cursor-pointer"
              >
                <option value="ACTIVE">
                  Active ({activeTerm?.termName || "Trimester 1"})
                </option>
                <option value="Trimester 1">Trimester 1</option>
                <option value="Trimester 2">Trimester 2</option>
                <option value="Trimester 3">Trimester 3</option>
                <option value="ALL">All Terms</option>
              </select>
            </div>

            {/* Grade Selector */}
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

            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] sm:w-64">
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
          </div>
        </div>

        {/* Live Search Result Indicator */}
        {searchQuery.trim() && (
          <div className="p-3 bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#002060] uppercase">
                [ SEARCH ACTIVE: &ldquo;{searchQuery.trim()}&rdquo; ]
              </span>
              <span className="text-slate-600">
                Found <strong>{filteredApplications.length}</strong> matching applicant{filteredApplications.length === 1 ? "" : "s"}.
              </span>
            </div>
            {filteredApplications.length > 0 && (
              <span className="text-[11px] font-mono text-[#002060] font-bold">
                Click [ Review Dossier ] below to inspect full credentials.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Applications Table */}
      <div className="bg-white border-2 border-slate-300 shadow-xs overflow-x-auto">
        {isFetchingApps && !hasLoadedAppsOnce.current ? (
          <div className="p-8 text-center">
            <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
              [ NO APPLICATIONS FOUND FOR S.Y. {effectiveSY} &bull; {effectiveTerm} ]
            </span>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              {selectedSY === "ACTIVE" && selectedTerm === "ACTIVE"
                ? `No student enrollment applications have been submitted yet for the current active period (S.Y. ${effectiveSY} • ${effectiveTerm}). As students enroll online, they will appear in this queue automatically.`
                : `No enrollment applications match the selected academic period (S.Y. ${effectiveSY} • ${effectiveTerm}), grade level, or search query.`}
            </p>
            {(selectedSY !== "ALL" || selectedTerm !== "ALL") && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSY("ALL");
                    setSelectedTerm("ALL");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  [ View Applications Across All Terms ]
                </button>
              </div>
            )}
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
                      <span className="text-[10px] font-mono font-bold text-[#002060] bg-blue-50 px-1.5 py-0.5 border border-blue-200 inline-block mt-1">
                        S.Y. {app.school_year || "2026-2027"} &bull; {app.term_name || app.semester || "Trimester 1"}
                      </span>
                      {st?.current_section_id && (
                        <span className="text-[10px] font-mono font-bold text-emerald-900 bg-emerald-100 px-1.5 py-0.5 border border-emerald-300 inline-block mt-1 ml-1">
                          {sections.find((s) => s.id === st.current_section_id)?.section_name || "Section Assigned"}
                        </span>
                      )}
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
