"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import { isApplicationInTerm, extractTermNumber } from "@/lib/utils/academicTerm";

interface SectionRecord {
  id: string;
  section_name: string;
  grade_level: number;
  strand?: string | null;
  room?: string | null;
  adviser_name?: string | null;
  capacity?: number;
  school_year?: string;
}

interface ClassmateRecord {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  gender?: string | null;
  baseSectionName?: string;
}

interface ElectiveInfoRecord {
  code: string;
  name: string;
  sectionName: string;
  room?: string;
  adviser_name?: string;
}

const SHS_ELECTIVES_MAP: Record<string, string> = {
  "ACAD-BIO1": "Biology 1 (General Biology)",
  "ACAD-CHEM1": "Chemistry 1",
  "ACAD-PHYS1": "Physics 1",
  "ACAD-ESS1": "Earth and Space Science 1",
  "ACAD-ARTS1": "Arts 1 (Visual, Literary, Media)",
  "ACAD-ARTS2": "Arts 2 (Music, Dance, and Theater)",
  "ACAD-CITIZEN": "Citizenship and Civic Engagement",
  "ACAD-CONLIT1": "Contemporary Literature 1",
  "ACAD-FIL1": "Filipino 1 (Wika at Komunikasyon)",
  "ACAD-PHILOS": "Introduction to Philosophy",
  "ACAD-MALIKPAG": "Malikhaing Pagsulat",
  "ACAD-GOV": "Philippine Governance (Politics and Governance)",
  "ACAD-SOCSCI": "Social Sciences (Theory and Practice)",
  "ACAD-BACC1": "Business 1 (Basic Accounting)",
  "ACAD-ORGMGT": "Organization and Management",
  "ACAD-MKTG": "Contemporary Marketing",
  "ACAD-HMOV1": "Human Movement 1 (Basic Anatomy)",
  "ACAD-HMOV2": "Human Movement 2 (Motor Skills)",
  "ACAD-EMPTECH": "Empowerment Technologies",
  "TECH-CROPS": "Agricultural Crops Production",
  "TECH-ORGANIC": "Organic Agriculture Production",
  "ACAD-PRECAL1": "Pre-calculus 1 & Engineering Principles",
  "ACAD-ADVMATH1": "Advanced Mathematics 1 / Calculus",
  "ACAD-DATA": "Fundamentals in Data Analytics",
  "ACAD-DBMGT": "Database Management",
  "ACAD-BIO2": "Biology 2",
  "ACAD-CHEM2": "Chemistry 2",
  "ACAD-PHYS2": "Physics 2",
  "ACAD-ESS2": "Earth and Space Science 2",
  "ACAD-BFIN2": "Business 2 (Business Finance & Taxation)",
  "ACAD-BECON3": "Business 3 (Business Economics)",
  "ACAD-ENTREP": "Entrepreneurship",
  "ACAD-FIRSTAID": "Safety and First Aid",
  "ACAD-RESMETH": "Research Methods",
  "ACAD-DESINNOV": "Design and Innovation",
  "ACAD-FIELDEXP": "Field Exposure (Professional Immersion)",
};

type SectionStateMode =
  | "ASSIGNED"
  | "NOT_ASSIGNED"
  | "NOT_ASSIGNED_TRANSFEREE"
  | "ENROLLMENT_REQUIRED";

function SectionPageContent() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { schoolYear, semester, termNumber } = useEnrollmentControl();

  const [studentRec, setStudentRec] = useState<any | null>(null);
  const [assignedSection, setAssignedSection] = useState<SectionRecord | null>(null);
  const [sectionMode, setSectionMode] = useState<SectionStateMode>("NOT_ASSIGNED");
  const [activeTermNumber, setActiveTermNumber] = useState<number>(termNumber || 1);
  const [classmates, setClassmates] = useState<ClassmateRecord[]>([]);
  const [electiveInfo, setElectiveInfo] = useState<ElectiveInfoRecord | null>(null);
  const [electiveClassmates, setElectiveClassmates] = useState<ClassmateRecord[]>([]);
  const [classmatesViewType, setClassmatesViewType] = useState<"track" | "elective">("track");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetableSchedules, setTimetableSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"overview" | "classmates" | "schedule">("overview");

  // Authentication Guard: Redirect guests to signin
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/?tab=signin&reason=auth_required");
    }
  }, [user, isAuthLoading, router]);

  // Main Data Fetcher with Realtime Auto-sync and Three-Tier Error Trapping Automation
  useEffect(() => {
    if (!user) {
      setStudentRec(null);
      setAssignedSection(null);
      setSectionMode("NOT_ASSIGNED");
      setClassmates([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    const fetchSectionData = async () => {
      try {
        // 0. Resolve active academic term from database (or fall back to hook)
        const { data: termsData } = await supabase
          .from("academic_terms")
          .select("schoolYear, termNumber, termName, isActive")
          .order("schoolYear", { ascending: false });

        const activeTerm = (termsData || []).find((t: any) => t.isActive);
        const resolvedTermNum = Number(activeTerm?.termNumber) || Number(termNumber) || extractTermNumber(semester) || 1;
        const resolvedSY = (activeTerm?.schoolYear || schoolYear || "2026-2027").replace(/[–—]/g, "-").trim();

        if (isMounted) {
          setActiveTermNumber(resolvedTermNum);
        }

        // 1. Fetch Student Profile with Comprehensive Fallback Matching
        let stQuery = supabase
          .from("students")
          .select("id, user_id, student_id, first_name, last_name, middle_name, current_section_id, grade_level, strand, gender");

        const orFilters: string[] = [];
        if (user.id && user.id.length === 36) {
          orFilters.push(`user_id.eq.${user.id}`);
        }
        if (user.lrn && /^\d{12}$/.test(user.lrn)) {
          orFilters.push(`student_id.eq.${user.lrn}`);
        }
        if (user.userId && user.userId !== user.id) {
          orFilters.push(`student_id.eq.${user.userId}`);
        }

        if (orFilters.length > 0) {
          stQuery = stQuery.or(orFilters.join(","));
        }

        const { data: stData } = await stQuery.limit(1);
        let student = stData && stData.length > 0 ? stData[0] : null;

        // Fallback: If not found directly, check enrollment_applications to locate student_id
        if (!student) {
          const { data: allApps } = await supabase
            .from("enrollment_applications")
            .select("id, student_id, selected_electives")
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
                    .select("id, user_id, student_id, first_name, last_name, middle_name, current_section_id, grade_level, strand, gender")
                    .eq("id", a.student_id)
                    .limit(1);

                  if (stById && stById.length > 0) {
                    student = stById[0];
                    // Auto-heal missing user_id link in students table
                    if (!student.user_id && user.id) {
                      await supabase.from("students").update({ user_id: user.id }).eq("id", student.id);
                    }
                    break;
                  }
                }
              }
            }
          }
        }

        if (!student) {
          if (isMounted) {
            setStudentRec(null);
            setAssignedSection(null);
            setSectionMode("NOT_ASSIGNED");
            setClassmates([]);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setStudentRec(student);
        }

        // 2. Query Student's Enrollment Applications
        const { data: appsData } = await supabase
          .from("enrollment_applications")
          .select("id, application_id, student_id, applicant_type, school_year, status, selected_electives, created_at")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false });

        const userApps = appsData || [];

        // Check if student has enrolled for the CURRENT ACTIVE term
        const activeApp = userApps.find((a: any) =>
          isApplicationInTerm(a, resolvedSY, resolvedTermNum)
        );

        const isEnrolledInActiveTerm = !!activeApp;

        // Check if student is a Transferee
        const isTransferee =
          (activeApp && (activeApp.applicant_type === "Transferee" || activeApp.selected_electives?.[0]?.applicantType === "Transferee")) ||
          userApps.some((a: any) => a.applicant_type === "Transferee" || a.selected_electives?.[0]?.applicantType === "Transferee");

        // 3. Resolve Section Placement
        let targetSectionId = student.current_section_id;

        // Fallback: If not on student row, check approved applications
        if (!targetSectionId) {
          const appWithSection: any = userApps.find(
            (a: any) => a.status === "Approved" && (a.section_id || a.assigned_section_id)
          );
          if (appWithSection) {
            targetSectionId = appWithSection.section_id || appWithSection.assigned_section_id;
            await supabase.from("students").update({ current_section_id: targetSectionId }).eq("id", student.id);
          }
        }

        // AUTOMATION FOR SEM 2 OR 3: Continuing students keep their section automatically!
        if (resolvedTermNum >= 2 && !isTransferee && isEnrolledInActiveTerm) {
          if (!targetSectionId) {
            // Check past approved applications for a section reference
            const priorApp: any = userApps.find((a: any) => a.status === "Approved" && (a.section_id || a.assigned_section_id));
            if (priorApp) {
              targetSectionId = priorApp.section_id || priorApp.assigned_section_id;
              // Auto-persist back to students table
              await supabase.from("students").update({ current_section_id: targetSectionId }).eq("id", student.id);
            }
          }
        }

        let sectionRecord: SectionRecord | null = null;
        if (targetSectionId) {
          const { data: secData, error: secErr } = await supabase
            .from("sections")
            .select("id, section_name, grade_level, strand, capacity, school_year")
            .eq("id", targetSectionId)
            .limit(1);

          if (secData && secData.length > 0) {
            const rawSec = secData[0];
            let baseSec: SectionRecord = {
              id: rawSec.id,
              section_name: rawSec.section_name,
              grade_level: rawSec.grade_level,
              strand: rawSec.strand || null,
              capacity: rawSec.capacity || 40,
              school_year: rawSec.school_year || resolvedSY,
              room: null,
              adviser_name: null,
            };

            // Read adviser and room from sections_config in system_settings if present
            try {
              const { data: sysData } = await supabase
                .from("system_settings")
                .select("value")
                .eq("key", "sections_config")
                .maybeSingle();

              if (sysData?.value?.customSections && Array.isArray(sysData.value.customSections)) {
                const match = sysData.value.customSections.find((c: any) => c.id === targetSectionId);
                if (match) {
                  if (match.room) baseSec.room = match.room;
                  if (match.adviser_name) baseSec.adviser_name = match.adviser_name;
                  if (match.capacity) baseSec.capacity = match.capacity;
                }
              }
            } catch (cfgErr) {
              console.warn("Notice reading section config:", cfgErr);
            }

            sectionRecord = baseSec;
            if (isMounted) {
              setAssignedSection(sectionRecord);
            }

            // Fetch Classmates in the same section
            const { data: cmData } = await supabase
              .from("students")
              .select("id, student_id, first_name, last_name, middle_name, gender")
              .eq("current_section_id", targetSectionId)
              .order("last_name", { ascending: true });

            if (isMounted && cmData) {
              setClassmates(cmData);
            }

            // SHS Dual Sectioning: Resolve Specialized Elective & Elective Classmates
            const effectiveGrade = sectionRecord.grade_level || student.grade_level || 7;
            if (effectiveGrade >= 11) {
              const targetApp = activeApp || userApps[0];
              let chosenElectiveRaw = "";
              let fd: any = {};
              if (targetApp && targetApp.selected_electives) {
                fd = Array.isArray(targetApp.selected_electives) && targetApp.selected_electives.length > 0
                  ? targetApp.selected_electives[0]
                  : typeof targetApp.selected_electives === "object" && targetApp.selected_electives !== null
                  ? targetApp.selected_electives
                  : {};

                if (Array.isArray(fd.selectedElectives) && fd.selectedElectives.length > 0) {
                  chosenElectiveRaw = fd.selectedElectives[0];
                } else if (Array.isArray(targetApp.selected_electives) && targetApp.selected_electives.length > 0) {
                  const first = targetApp.selected_electives[0];
                  if (typeof first === "string") chosenElectiveRaw = first;
                  else if (first?.code) chosenElectiveRaw = first.code;
                  else if (first?.name) chosenElectiveRaw = first.name;
                }
                if (!chosenElectiveRaw) {
                  chosenElectiveRaw =
                    fd.assigned_elective_name ||
                    fd.assigned_elective_code ||
                    fd.elective ||
                    fd.firstElective ||
                    fd.secondElective ||
                    fd.electiveSubject ||
                    "";
                }
              }

              if (chosenElectiveRaw) {
                let resolvedName = "";

                // 1. Try matching with configured subjects from system_settings or course_subjects
                try {
                  const { data: sysSubj } = await supabase
                    .from("system_settings")
                    .select("value")
                    .eq("key", "subjects_config")
                    .maybeSingle();
                  const configured: any[] = sysSubj?.value?.subjects || [];
                  const foundSubj = configured.find((s: any) => {
                    const c = (s.subject_code || s.subjectCode || "").trim().toUpperCase();
                    const n = (s.subject_name || s.subjectName || "").trim().toUpperCase();
                    const raw = chosenElectiveRaw.trim().toUpperCase();
                    return c === raw || n === raw || n.includes(raw) || raw.includes(n);
                  });
                  if (foundSubj) {
                    resolvedName = foundSubj.subject_name || foundSubj.subjectName;
                  }
                } catch {}

                if (!resolvedName) {
                  try {
                    const { data: dbSubjs } = await supabase
                      .from("course_subjects")
                      .select("subject_code, subject_name");
                    const foundSubj = (dbSubjs || []).find((s: any) => {
                      const c = (s.subject_code || "").trim().toUpperCase();
                      const n = (s.subject_name || "").trim().toUpperCase();
                      const raw = chosenElectiveRaw.trim().toUpperCase();
                      return c === raw || n === raw || n.includes(raw) || raw.includes(n);
                    });
                    if (foundSubj) {
                      resolvedName = foundSubj.subject_name;
                    }
                  } catch {}
                }

                // 2. Fallback to static catalog and raw code
                if (!resolvedName) {
                  resolvedName = SHS_ELECTIVES_MAP[chosenElectiveRaw.toUpperCase()];
                }
                if (!resolvedName) {
                  for (const [code, name] of Object.entries(SHS_ELECTIVES_MAP)) {
                    if (
                      code.toLowerCase() === chosenElectiveRaw.toLowerCase() ||
                      name.toLowerCase().includes(chosenElectiveRaw.toLowerCase()) ||
                      chosenElectiveRaw.toLowerCase().includes(name.toLowerCase())
                    ) {
                      resolvedName = name;
                      break;
                    }
                  }
                }
                if (!resolvedName) resolvedName = chosenElectiveRaw;

                const electiveSecName =
                  fd.assigned_elective_section_name ||
                  `Grade ${effectiveGrade} Elective - ${resolvedName}`;

                if (isMounted) {
                  setElectiveInfo({
                    code: chosenElectiveRaw,
                    name: resolvedName,
                    sectionName: electiveSecName,
                  });
                }

                // Query approved applications in this grade level taking the same elective
                try {
                  const { data: allPeerApps } = await supabase
                    .from("enrollment_applications")
                    .select("student_id, selected_electives, target_grade_level")
                    .eq("status", "Approved");

                  const { data: allSecs } = await supabase.from("sections").select("id, section_name");
                  const secNameMap = new Map<string, string>();
                  (allSecs || []).forEach((s: any) => secNameMap.set(s.id, s.section_name));

                  const matchedStudentIds: string[] = [];
                  (allPeerApps || []).forEach((app: any) => {
                    if (app.student_id) {
                      const rawVal = JSON.stringify(app.selected_electives || "").toLowerCase();
                      const cleanSearch = chosenElectiveRaw.toLowerCase();
                      if (rawVal.includes(cleanSearch) || (resolvedName && rawVal.includes(resolvedName.toLowerCase()))) {
                        matchedStudentIds.push(app.student_id);
                      }
                    }
                  });

                  if (student.id && !matchedStudentIds.includes(student.id)) {
                    matchedStudentIds.push(student.id);
                  }

                  if (matchedStudentIds.length > 0) {
                    const { data: peerStudents } = await supabase
                      .from("students")
                      .select("id, student_id, first_name, last_name, middle_name, gender, current_section_id")
                      .in("id", matchedStudentIds)
                      .order("last_name", { ascending: true });

                    if (isMounted && peerStudents) {
                      const mapped = peerStudents.map((st: any) => ({
                        id: st.id,
                        student_id: st.student_id,
                        first_name: st.first_name,
                        last_name: st.last_name,
                        middle_name: st.middle_name,
                        gender: st.gender,
                        baseSectionName: st.current_section_id ? secNameMap.get(st.current_section_id) || "Academic" : "Academic",
                      }));
                      setElectiveClassmates(mapped);
                    }
                  }
                } catch (peerErr) {
                  console.warn("Notice querying elective peers:", peerErr);
                }
              } else {
                if (isMounted) {
                  setElectiveInfo(null);
                  setElectiveClassmates([]);
                }
              }
            } else {
              if (isMounted) {
                setElectiveInfo(null);
                setElectiveClassmates([]);
              }
            }

            // Fetch Subjects & Schedules
            const gradeParam = sectionRecord.grade_level || student.grade_level || 7;
            const strandParam = sectionRecord.strand || student.strand || "Regular";

            try {
              const subjRes = await fetch(
                `/api/subjects?gradeLevel=${gradeParam}&strand=${encodeURIComponent(strandParam)}`
              ).then((r) => r.json()).catch(() => null);

              if (isMounted && subjRes?.success && Array.isArray(subjRes.subjects)) {
                setSubjects(subjRes.subjects);
              }

              const schedRes = await fetch(
                `/api/schedules?sectionId=${sectionRecord.id}&gradeLevel=${gradeParam}`
              ).then((r) => r.json()).catch(() => null);

              if (isMounted && schedRes?.success && Array.isArray(schedRes.schedules)) {
                setTimetableSchedules(schedRes.schedules);
              }
            } catch (err) {
              console.error("Notice reading subjects/schedules:", err);
            }
          } else {
            if (isMounted) {
              setAssignedSection(null);
              setClassmates([]);
            }
          }
        } else {
          if (isMounted) {
            setAssignedSection(null);
            setClassmates([]);
          }
        }

        // 4. THREE-TIER ERROR TRAPPING & BUSINESS LOGIC
        if (resolvedTermNum === 1) {
          // RULE 1: Start of school year / 1st Sem -> If not yet assigned by admin, show "You're not yet assigned"
          if (sectionRecord) {
            if (isMounted) setSectionMode("ASSIGNED");
          } else {
            if (isMounted) setSectionMode("NOT_ASSIGNED");
          }
        } else {
          // RULE 2 & 3: Semester 2 or 3
          if (isTransferee) {
            // RULE 3: Transferee in Sem 2 or 3 -> Shows "You're not yet assigned" until admin manually slots them
            if (sectionRecord) {
              if (isMounted) setSectionMode("ASSIGNED");
            } else {
              if (isMounted) setSectionMode("NOT_ASSIGNED_TRANSFEREE");
            }
          } else {
            // RULE 2: Continuing / Regular Student in Sem 2 or 3
            if (!isEnrolledInActiveTerm) {
              // Not yet enrolled for the active semester
              if (isMounted) setSectionMode("ENROLLMENT_REQUIRED");
            } else {
              // Enrolled -> Automatic section placement carries over!
              if (sectionRecord) {
                if (isMounted) setSectionMode("ASSIGNED");
              } else {
                if (isMounted) setSectionMode("NOT_ASSIGNED");
              }
            }
          }
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error fetching section details:", err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSectionData();

    // Event listener for tab focus
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSectionData();
      }
    };
    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 10-Second Heartbeat Polling
    const heartbeat = setInterval(fetchSectionData, 10000);

    // Supabase Realtime Channels: Instant updates on students and sections changes
    const studentChannel = supabase
      .channel("student-section-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchSectionData();
        }
      )
      .subscribe();

    const sectionChannel = supabase
      .channel("sections-table-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sections" },
        () => {
          fetchSectionData();
        }
      )
      .subscribe();

    const appChannel = supabase
      .channel("apps-table-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => {
          fetchSectionData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(heartbeat);
      supabase.removeChannel(studentChannel);
      supabase.removeChannel(sectionChannel);
      supabase.removeChannel(appChannel);
    };
  }, [user?.id, user?.lrn, schoolYear, semester, termNumber]);

  if (isAuthLoading || (isLoading && !studentRec)) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-6 font-sans">
        <div className="bg-white border-2 border-slate-300 p-8 text-center space-y-3 rounded-lg shadow-sm">
          <div className="w-8 h-8 border-4 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono font-bold text-slate-700 uppercase tracking-widest">
            Synchronizing Official Class Section Records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6 font-sans">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-mono text-slate-500 pb-2 border-b border-slate-200">
        <Link href="/" className="hover:text-[#002060] hover:underline uppercase">
          Home Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-400 uppercase">Portal Modules</span>
        <span>/</span>
        <span className="font-bold text-[#002060] uppercase">
          [ 04 ] Class Section &amp; Advisory
        </span>
      </nav>

      {/* Institutional Top Banner */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-xs border border-slate-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#002060] uppercase block mb-1">
              [ DepEd Region I &bull; SDO Ilocos Norte &bull; Dumalneg NHS ]
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Class Section &amp; Advisory Placement
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Official section roster, classroom advisory assignment, and prescribed schedule console (S.Y. {schoolYear} &bull; Trimester {activeTermNumber}).
            </p>
          </div>
          {user && (
            <div className="text-left sm:text-right bg-slate-50 border border-slate-200 p-2.5 font-mono text-xs rounded-md">
              <span className="text-[10px] text-slate-500 uppercase block">Active Learner</span>
              <strong className="text-slate-900 uppercase block">{user.firstName} {user.lastName}</strong>
              <span className="text-[10px] text-[#002060]">LRN: {user.lrn || user.userId}</span>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          STATE 1: ASSIGNED IN SECTION (CONFIRMED)
          ========================================================================= */}
      {sectionMode === "ASSIGNED" && assignedSection ? (
        <div className="space-y-6">
          {/* Main Hero Placement Banner */}
          <div className="p-5 sm:p-6 bg-emerald-50 border-2 border-emerald-500 shadow-xs space-y-4 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-emerald-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-widest">
                    [ SECTION ASSIGNED ]
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-200/90 text-emerald-950 font-mono text-[10px] font-bold uppercase border border-emerald-400 rounded-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                    {activeTermNumber >= 2 ? "Automatic Continuing Roster" : "Official Roster Enrolled"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-emerald-950 uppercase tracking-tight">
                  Assigned in Section: <span className="underline decoration-emerald-500">{assignedSection.section_name}</span>
                </h2>
                <p className="text-xs font-mono text-emerald-800">
                  Grade {assignedSection.grade_level} &bull; {assignedSection.strand ? `Strand: ${assignedSection.strand}` : "Junior High School"} &bull; S.Y. {assignedSection.school_year || schoolYear || "2026-2027"} &bull; Trimester {activeTermNumber}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] font-mono text-emerald-800 uppercase block">Class Advisory Status</span>
                <span className="inline-block px-3 py-1 bg-white border border-emerald-300 font-mono text-xs font-bold text-emerald-900 shadow-xs uppercase rounded">
                  Confirmed Placement
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="bg-white p-3 border border-emerald-200 rounded-md shadow-2xs">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Grade &amp; Curriculum</span>
                <strong className="text-slate-900 text-xs sm:text-sm">
                  Grade {assignedSection.grade_level}
                </strong>
                <span className="text-[10px] text-slate-500 block truncate">
                  {assignedSection.strand || "General / Regular"}
                </span>
              </div>
              <div className="bg-white p-3 border border-emerald-200 rounded-md shadow-2xs">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Classroom / Wing</span>
                <strong className="text-slate-900 text-xs sm:text-sm">
                  {assignedSection.room || "Room 101 - Main Wing"}
                </strong>
                <span className="text-[10px] text-slate-500 block">Dumalneg NHS Campus</span>
              </div>
              <div className="bg-white p-3 border border-emerald-200 rounded-md shadow-2xs">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Class Adviser</span>
                <strong className="text-slate-900 text-xs sm:text-sm truncate block">
                  {assignedSection.adviser_name || "Faculty Adviser Assigned"}
                </strong>
                <span className="text-[10px] text-slate-500 block">Homeroom Teacher</span>
              </div>
              <div className="bg-white p-3 border border-emerald-200 rounded-md shadow-2xs">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Enrolled Learners</span>
                <strong className="text-emerald-900 text-xs sm:text-sm font-mono">
                  {classmates.length} {assignedSection.capacity ? `/ ${assignedSection.capacity} max` : "Learners"}
                </strong>
                <span className="text-[10px] text-emerald-700 block">Active Section Roster</span>
              </div>
            </div>

            {/* SHS Dual-Section Placement Card */}
            {assignedSection.grade_level >= 11 && (
              <div className="p-4 bg-white border-2 border-blue-900/30 shadow-xs space-y-3 rounded-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-200 pb-2">
                  <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
                    [ SHS Dual Cohort Sectioning &bull; DepEd MATATAG ]
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-[#002060] px-2 py-0.5 border border-blue-300 self-start sm:self-auto uppercase rounded-xs">
                    Dual Active Section Assignments
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  In Senior High School, you are assigned to <strong>2 distinct class cohorts</strong>: your Track Section with peers taking core/common subjects, and your Specialized Elective Section with peers who selected the same elective.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-blue-50/70 border border-blue-300 space-y-1 rounded-md">
                    <span className="text-[10px] font-mono font-bold text-blue-950 uppercase block">
                      1. Primary Track Section (Core / Common Subjects)
                    </span>
                    <strong className="text-sm font-bold text-[#002060] block">
                      {assignedSection.section_name}
                    </strong>
                    <span className="text-[11px] text-slate-600 block">
                      Track: <strong>{assignedSection.strand?.toUpperCase().includes("TECH") || assignedSection.strand?.toUpperCase().includes("TVL") ? "TechPro Track" : "Academic Track"}</strong> &bull; {classmates.length} Classmates
                    </span>
                  </div>

                  <div className="p-3 bg-purple-50/70 border border-purple-300 space-y-1 rounded-md">
                    <span className="text-[10px] font-mono font-bold text-purple-950 uppercase block">
                      2. Specialized Elective Section (Elective Period)
                    </span>
                    <strong className="text-sm font-bold text-purple-950 block">
                      {electiveInfo ? electiveInfo.sectionName : `Grade ${assignedSection.grade_level} Elective Class`}
                    </strong>
                    <span className="text-[11px] text-purple-900 block">
                      Elective: <strong>{electiveInfo?.name || "General Elective"}</strong> &bull; {electiveClassmates.length} Classmates
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b-2 border-slate-300 gap-1 text-xs font-mono font-bold uppercase">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`py-2.5 px-4 border-t-2 border-x-2 rounded-t-md transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-white border-[#002060] text-[#002060] -mb-[2px] bg-white border-b-2 border-b-white z-10"
                  : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"
              }`}
            >
              [ 01 ] Section Overview &amp; Advisory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("classmates")}
              className={`py-2.5 px-4 border-t-2 border-x-2 rounded-t-md transition-all cursor-pointer ${
                activeTab === "classmates"
                  ? "bg-white border-[#002060] text-[#002060] -mb-[2px] bg-white border-b-2 border-b-white z-10"
                  : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"
              }`}
            >
              [ 02 ] Section Classmates ({assignedSection.grade_level >= 11 && electiveInfo ? `${classmates.length} Track / ${electiveClassmates.length} Elective` : `${classmates.length}`})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              className={`py-2.5 px-4 border-t-2 border-x-2 rounded-t-md transition-all cursor-pointer ${
                activeTab === "schedule"
                  ? "bg-white border-[#002060] text-[#002060] -mb-[2px] bg-white border-b-2 border-b-white z-10"
                  : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"
              }`}
            >
              [ 03 ] Prescribed Schedule &amp; Subjects
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="bg-white border-2 border-slate-300 p-6 space-y-6 rounded-lg shadow-sm">
              <div>
                <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
                  [ Official Advisory Information ]
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Class Profile &bull; {assignedSection.section_name}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  You are officially designated to this class section for the academic school year. Keep in touch with your assigned Homeroom Adviser for announcements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 space-y-3 rounded-md">
                  <h4 className="font-bold text-slate-800 uppercase font-mono text-[11px] border-b border-slate-200 pb-1">
                    Class Advisory Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Official Section Name:</span>
                      <strong className="text-slate-900 font-mono">{assignedSection.section_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Grade Level:</span>
                      <strong className="text-slate-900">Grade {assignedSection.grade_level}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Curriculum / Strand:</span>
                      <strong className="text-slate-900">{assignedSection.strand || "Regular / JHS Core"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Academic Year:</span>
                      <strong className="text-slate-900 font-mono">{assignedSection.school_year || schoolYear || "2026-2027"}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 space-y-3 rounded-md">
                  <h4 className="font-bold text-slate-800 uppercase font-mono text-[11px] border-b border-slate-200 pb-1">
                    Faculty &amp; Facility Assignment
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Homeroom Adviser:</span>
                      <strong className="text-slate-900 font-semibold">{assignedSection.adviser_name || "Faculty Member Designated"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Classroom:</span>
                      <strong className="text-slate-900">{assignedSection.room || "Room 101 - Main Campus"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Section Slot Cap:</span>
                      <span className="font-mono text-slate-900 font-bold">{assignedSection.capacity || 40} Maximum Students</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Placement Confirmation:</span>
                      <span className="font-mono text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-xs">Verified on DepEd System</span>
                    </div>
                  </div>
                </div>

                {assignedSection.grade_level >= 11 && electiveInfo && (
                  <div className="p-4 bg-purple-50/70 border border-purple-200 space-y-3 md:col-span-2 rounded-md">
                    <h4 className="font-bold text-purple-950 uppercase font-mono text-[11px] border-b border-purple-200 pb-1 flex items-center justify-between">
                      <span>Specialized Elective Section Details</span>
                      <span className="text-[10px] bg-purple-200/80 px-2 py-0.5 font-bold rounded-xs">[ Elective Cohort ]</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Elective Section Name:</span>
                          <strong className="text-purple-950 font-mono">{electiveInfo.sectionName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Selected Elective:</span>
                          <strong className="text-purple-950">{electiveInfo.name}</strong>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Enrollees in Elective:</span>
                          <strong className="font-mono text-purple-950">{electiveClassmates.length} Learners</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Grouping Mechanism:</span>
                          <span className="text-purple-900 font-semibold">Shared period across all Grade {assignedSection.grade_level} sections</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("classmates")}
                  className="btn-primary text-xs uppercase font-bold py-2.5 px-4 cursor-pointer rounded-md"
                >
                  View Section Classmates List &rarr;
                </button>
                <Link
                  href="/track"
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-block rounded-md"
                >
                  [ 03 ] Track Full Application
                </Link>
                <Link
                  href="/"
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-block rounded-md"
                >
                  [ 01 ] Return to Home Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: CLASSMATES ROSTER */}
          {activeTab === "classmates" && (
            <div className="bg-white border-2 border-slate-300 p-6 space-y-5 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
                    [ Official Classmates Directory ]
                  </span>
                  <h3 className="text-base font-bold text-slate-900 uppercase">
                    {assignedSection.grade_level >= 11 && electiveInfo
                      ? classmatesViewType === "track"
                        ? `Track Classmates • ${assignedSection.section_name}`
                        : `Elective Classmates • ${electiveInfo.sectionName}`
                      : `Classmates in ${assignedSection.section_name}`}
                  </h3>
                </div>
                <div className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1 border border-slate-200 rounded-md">
                  Total Enrolled:{" "}
                  <strong className="text-slate-900">
                    {classmatesViewType === "track" ? classmates.length : electiveClassmates.length} Learners
                  </strong>
                </div>
              </div>

              {/* SHS Dual Cohort Toggle Switcher */}
              {assignedSection.grade_level >= 11 && electiveInfo && (
                <div className="p-3 bg-slate-50 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold text-slate-600 uppercase block">
                      Select Cohort Directory:
                    </span>
                    <p className="text-xs text-slate-700">
                      {classmatesViewType === "track"
                        ? `Viewing students in your primary Track Section (${assignedSection.section_name}) for core/common subjects.`
                        : `Viewing students in your Elective Class (${electiveInfo.name}) during elective periods.`}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setClassmatesViewType("track")}
                      className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-colors cursor-pointer border rounded-md ${
                        classmatesViewType === "track"
                          ? "bg-[#002060] text-white border-[#002060] shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      [ Track Cohort ({classmates.length}) ]
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassmatesViewType("elective")}
                      className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-colors cursor-pointer border rounded-md ${
                        classmatesViewType === "elective"
                          ? "bg-purple-900 text-white border-purple-900 shadow-xs"
                          : "bg-white text-purple-950 border-purple-300 hover:bg-purple-50"
                      }`}
                    >
                      [ Elective Cohort ({electiveClassmates.length}) ]
                    </button>
                  </div>
                </div>
              )}

              {/* Table rendering */}
              {classmatesViewType === "track" ? (
                classmates.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-md">
                    <p className="text-xs text-slate-600 font-mono">
                      No other learners currently slotted in this section yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-mono uppercase text-slate-700">
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Learner Name</th>
                          <th className="py-2.5 px-3 font-mono">Learner Reference No.</th>
                          <th className="py-2.5 px-3">Gender</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-sans">
                        {classmates.map((cm, idx) => {
                          const isCurrentLearner =
                            (user && (cm.student_id === user.lrn || cm.student_id === user.userId)) ||
                            (studentRec && cm.id === studentRec.id);

                          return (
                            <tr
                              key={cm.id}
                              className={`hover:bg-blue-50/50 transition-colors ${
                                isCurrentLearner ? "bg-emerald-50/80 font-bold" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3 font-mono text-center text-slate-500">
                                {String(idx + 1).padStart(2, "0")}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-slate-900 uppercase">
                                  {cm.last_name}, {cm.first_name} {cm.middle_name || ""}
                                </span>
                                {isCurrentLearner && (
                                  <span className="ml-2 inline-block px-1.5 py-0.2 bg-emerald-200 text-emerald-950 font-mono text-[9px] uppercase font-bold border border-emerald-400 rounded-xs">
                                    You
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {cm.student_id ? cm.student_id : "LIS Pending"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 capitalize">
                                {cm.gender || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-900 font-mono text-[10px] uppercase font-bold rounded-xs">
                                  Enrolled
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                electiveClassmates.length === 0 ? (
                  <div className="p-8 text-center bg-purple-50/40 border border-purple-200 rounded-md">
                    <p className="text-xs text-purple-900 font-mono">
                      No other learners currently enrolled in this elective class yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-purple-200 rounded-md">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-purple-100/60 border-b border-purple-300 text-[10px] font-mono uppercase text-purple-950">
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Learner Name</th>
                          <th className="py-2.5 px-3 font-mono">Learner Reference No.</th>
                          <th className="py-2.5 px-3">Base / Academic Section</th>
                          <th className="py-2.5 px-3">Gender</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100 font-sans">
                        {electiveClassmates.map((cm, idx) => {
                          const isCurrentLearner =
                            (user && (cm.student_id === user.lrn || cm.student_id === user.userId)) ||
                            (studentRec && cm.id === studentRec.id);

                          return (
                            <tr
                              key={cm.id}
                              className={`hover:bg-purple-50/60 transition-colors ${
                                isCurrentLearner ? "bg-purple-50 font-bold" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3 font-mono text-center text-purple-800">
                                {String(idx + 1).padStart(2, "0")}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-slate-900 uppercase">
                                  {cm.last_name}, {cm.first_name} {cm.middle_name || ""}
                                </span>
                                {isCurrentLearner && (
                                  <span className="ml-2 inline-block px-1.5 py-0.2 bg-purple-200 text-purple-950 font-mono text-[9px] uppercase font-bold border border-purple-400 rounded-xs">
                                    You
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {cm.student_id ? cm.student_id : "LIS Pending"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-[#002060] border border-blue-200 font-mono font-bold text-[11px] rounded-xs">
                                  {cm.baseSectionName || "Academic Track"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 capitalize">
                                {cm.gender || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-900 font-mono text-[10px] uppercase font-bold rounded-xs">
                                  Elective Enrolled
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: PRESCRIBED SCHEDULE & SUBJECTS */}
          {activeTab === "schedule" && (
            <div className="bg-white border-2 border-slate-300 p-6 space-y-6 rounded-lg shadow-sm">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
                  [ Prescribed Class Curriculum ]
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Subjects &amp; Timetable &bull; Grade {assignedSection.grade_level}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Official subjects aligned with DepEd Order standards for Grade {assignedSection.grade_level}.
                </p>
              </div>

              {/* Prescribed Subjects Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase">
                  Prescribed Curriculum Subjects
                </h4>
                {subjects.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-mono uppercase text-slate-700">
                          <th className="py-2 px-3">Subject Code</th>
                          <th className="py-2 px-3">Subject Description</th>
                          <th className="py-2 px-3">Classification</th>
                          <th className="py-2 px-3 text-right">Credit Units</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {subjects.map((subj: any, i: number) => (
                          <tr key={subj.id || i} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-[#002060]">
                              {subj.subject_code || `SUBJ-0${i + 1}`}
                            </td>
                            <td className="py-2 px-3 text-slate-800">
                              {subj.subject_name || subj.name}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px] uppercase font-mono rounded-xs">
                                {subj.subject_type || "Core"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                              {subj.units || 1.0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono rounded-md">
                    Official curriculum subjects will be synchronized by the registrar prior to school opening.
                  </div>
                )}
              </div>

              {/* Timetable Schedules if present */}
              {timetableSchedules.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-mono font-bold text-slate-700 uppercase">
                    Weekly Class Timetable
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-mono uppercase text-slate-700">
                          <th className="py-2 px-3">Day</th>
                          <th className="py-2 px-3">Time Window</th>
                          <th className="py-2 px-3">Subject</th>
                          <th className="py-2 px-3">Assigned Faculty</th>
                          <th className="py-2 px-3">Room</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {timetableSchedules.map((sch: any, idx: number) => (
                          <tr key={sch.id || idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800 uppercase">
                              {sch.day_of_week || "Mon-Fri"}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-700">
                              {sch.start_time} - {sch.end_time}
                            </td>
                            <td className="py-2 px-3 text-slate-900 font-semibold">
                              {sch.subject_name || sch.subjectCode}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {sch.teacher_name || "Faculty Assigned"}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {sch.room || assignedSection.room || "Room 101"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : sectionMode === "ENROLLMENT_REQUIRED" ? (
        /* =========================================================================
           STATE 2: ENROLLMENT REQUIRED (SEMESTER 2 OR 3 NOT YET ENROLLED)
           Rule 2: "kung ang sem na ay 2 or 3 po... kung hindi pa naka enroll ang
           magpapakita sa section niya ay 'please enroll to see your section'"
           ========================================================================= */
        <div className="space-y-6">
          <div className="p-6 bg-blue-50 border-2 border-[#002060] shadow-xs space-y-4 rounded-lg">
            <div className="flex items-center justify-between border-b border-blue-200 pb-3">
              <span className="text-[10px] font-mono font-bold text-[#002060] uppercase tracking-widest block">
                [ ENROLLMENT REQUIRED ]
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-200 text-[#002060] font-mono text-xs font-bold uppercase border border-blue-400 rounded-xs">
                <span className="w-2 h-2 rounded-full bg-[#002060] animate-pulse" />
                Enrollment Needed
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                Please enroll to see your section assignment
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Enrollment for <strong>Trimester {activeTermNumber} (S.Y. {schoolYear})</strong> is currently in progress. 
                Please submit your continuing enrollment application to confirm and view your official class section, advisory teacher, and room placement.
              </p>
            </div>

            {/* Explanatory Policy Box */}
            <div className="p-4 bg-white border border-blue-300 text-xs space-y-2 rounded-md">
              <span className="font-mono font-bold text-[#002060] uppercase block text-[11px]">
                [ DepEd Dumalneg NHS Continuing Enrollment Policy ]
              </span>
              <p className="text-slate-700 leading-relaxed">
                As a continuing learner of Dumalneg National High School, your previously assigned class section will be 
                <strong> automatically retained and unlocked</strong> as soon as your continuing enrollment form is submitted for this semester.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/enroll"
                className="btn-primary text-xs uppercase font-bold py-2.5 px-5 inline-flex items-center gap-2 rounded-md"
              >
                [ 02 ] Complete Continuing Enrollment Now &rarr;
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-block rounded-md"
              >
                [ 01 ] Return to Home Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : sectionMode === "NOT_ASSIGNED_TRANSFEREE" ? (
        /* =========================================================================
           STATE 3: TRANSFEREE IN SEMESTER 2 OR 3 (AWAITING ADMIN ADJUDICATION)
           Rule 3: "kung ang isang student ay transferee, tapos nag enroll siya 2 or 3
           sem ang magpapakita sakanya ay 'You're not yet assigned to a section'
           kasi nga transferee pa po siya."
           ========================================================================= */
        <div className="space-y-6">
          <div className="p-6 bg-amber-50 border-2 border-amber-500 shadow-xs space-y-4 rounded-lg">
            <div className="flex items-center justify-between border-b border-amber-300 pb-3">
              <span className="text-[10px] font-mono font-bold text-amber-900 uppercase tracking-widest block">
                [ SECTION STATUS &bull; TRANSFEREE ]
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-200 text-amber-950 font-mono text-xs font-bold uppercase border border-amber-400 rounded-xs">
                <span className="w-2 h-2 rounded-full bg-amber-700 animate-pulse" />
                Transferee Evaluation
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-amber-950 uppercase tracking-tight">
                You&apos;re not yet assigned to a section
              </h2>
              <p className="text-xs text-amber-950 leading-relaxed font-medium">
                As a <strong>transferee learner</strong> enrolling in Trimester {activeTermNumber}, your academic credentials, 
                SF10 / Form 137, and curriculum credits are currently being verified by the School Administrator and Registrar.
              </p>
            </div>

            {/* Explanatory Callout */}
            <div className="p-4 bg-white border border-amber-300 text-xs space-y-2 rounded-md">
              <span className="font-mono font-bold text-amber-900 uppercase block text-[11px]">
                [ Official Transferee Placement Protocol ]
              </span>
              <p className="text-slate-800 leading-relaxed">
                Unlike continuing students, incoming transferee learners require manual evaluation of subject prerequisites 
                and class advisory slotting by the administration. Your designated section will appear here automatically as soon 
                as the School Administrator finalizes your class placement.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/track"
                className="btn-primary text-xs uppercase font-bold py-2.5 px-4 inline-block rounded-md"
              >
                [ 03 ] Track Transferee Application Status &rarr;
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-block rounded-md"
              >
                [ 01 ] Return to Home Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
           STATE 4: GENERAL NOT YET ASSIGNED (START OF SCHOOL YEAR / SEMESTER 1)
           Rule 1: "kung start ng school year tapos 1 sem palang ang magpapakita
           sa student talaga ay you're not yet assigned po."
           ========================================================================= */
        <div className="space-y-6">
          <div className="p-6 bg-amber-50 border-2 border-amber-400 shadow-xs space-y-4 rounded-lg">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <span className="text-[10px] font-mono font-bold text-amber-900 uppercase tracking-widest block">
                [ SECTION STATUS ]
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-200 text-amber-950 font-mono text-xs font-bold uppercase border border-amber-400 rounded-xs">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                Pending Placement
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-amber-950 uppercase tracking-tight">
                You&apos;re not yet assigned to a section
              </h2>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Your student profile is currently awaiting official section placement from the school administrator and registrar.
              </p>
            </div>

            {/* Explanatory Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white p-3.5 border border-amber-300 space-y-1 rounded-md">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Step 01</span>
                <strong className="text-slate-900 block">Enrollment Submission</strong>
                <p className="text-[11px] text-slate-600">
                  Ensure your DepEd enrollment form and documents have been submitted.
                </p>
              </div>
              <div className="bg-white p-3.5 border border-amber-300 space-y-1 rounded-md">
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase block">Step 02 &bull; Active</span>
                <strong className="text-amber-950 block">Registrar Evaluation</strong>
                <p className="text-[11px] text-amber-900">
                  School administrators verify academic eligibility and curriculum tracks.
                </p>
              </div>
              <div className="bg-white p-3.5 border border-amber-300 space-y-1 rounded-md">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Step 03 &bull; Next</span>
                <strong className="text-slate-900 block">Class Section Slotting</strong>
                <p className="text-[11px] text-slate-600">
                  Official class section, room, and adviser will appear here automatically.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-100/70 border border-amber-300 text-xs text-amber-950 rounded-md">
              <strong>Notice for Learners:</strong> Once the school administrator confirms your class slotting in the Section Quota Console, this page will instantly update to show your designated section, homeroom adviser, and classmates.
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/track"
                className="btn-primary text-xs uppercase font-bold py-2.5 px-4 inline-block rounded-md"
              >
                [ 03 ] Track Application Status
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-block rounded-md"
              >
                [ 01 ] Return to Home Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SectionPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-12 px-4 text-center">
          <div className="w-8 h-8 border-4 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">
            Loading Class Section Module...
          </span>
        </div>
      }
    >
      <SectionPageContent />
    </Suspense>
  );
}
