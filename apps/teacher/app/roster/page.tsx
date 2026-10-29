"use client";

import React, { useState, useEffect, useRef } from "react";
import CustomSelect from "@/components/CustomSelect";
import { useTeacherAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import TeacherLoginForm from "@/components/TeacherLoginForm";
import { isApplicationInTerm, extractTermNumber } from "@/lib/utils/academicTerm";

interface SectionSummary {
  id: string;
  section_name: string;
  grade_level: number;
  strand?: string;
  room?: string;
  capacity: number;
  adviser_name?: string;
  school_year?: string;
  isElective?: boolean;
  electiveCode?: string;
}

interface StudentItem {
  id: string;
  student_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  barangay?: string;
  contact_number?: string;
  grade_level?: number;
  isEnrolledInActiveTerm?: boolean;
}

export default function ClassSectionRosterPage() {
  const { user, isLoading: isAuthLoading } = useTeacherAuth();
  const supabase = createClient();

  const [advisorySections, setAdvisorySections] = useState<SectionSummary[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [rosterStudents, setRosterStudents] = useState<StudentItem[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState<boolean>(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [rosterSearch, setRosterSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const STUDENTS_PER_PAGE = 10;
  const hasLoadedOnceRef = useRef<boolean>(false);
  const [activeTermNumber, setActiveTermNumber] = useState<number>(1);
  const [activeTermName, setActiveTermName] = useState<string>("Trimester 1");
  const [activeSchoolYear, setActiveSchoolYear] = useState<string>("2026-2027");
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState<boolean>(true);
  const [enrollingStudentId, setEnrollingStudentId] = useState<string | null>(null);
  const [isEnrollingAll, setIsEnrollingAll] = useState<boolean>(false);
  const [enrollNotification, setEnrollNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch sections and filter specifically by the logged-in teacher's advisory assignment
  const fetchAdvisorySections = async (silent: boolean = false) => {
    if (!user) return;
    if (!silent && !hasLoadedOnceRef.current) {
      setIsLoadingSections(true);
    }

    try {
      // 0. Fetch active academic term and enrollment control
      try {
        const [termRes, ctrlRes] = await Promise.all([
          supabase.from("academic_terms").select("schoolYear, termNumber, termName, isActive").eq("isActive", true).maybeSingle(),
          supabase.from("system_settings").select("value").eq("key", "enrollment_controls").maybeSingle(),
        ]);

        if (termRes.data) {
          const tNum = Number(termRes.data.termNumber) || 1;
          setActiveTermNumber(tNum);
          setActiveTermName(termRes.data.termName || `Trimester ${tNum}`);
          if (termRes.data.schoolYear) {
            setActiveSchoolYear(termRes.data.schoolYear);
          }
        }

        if (ctrlRes.data?.value) {
          if (typeof ctrlRes.data.value.isEnrollmentOpen === "boolean") {
            setIsEnrollmentOpen(ctrlRes.data.value.isEnrollmentOpen);
          }
          if (!termRes.data && ctrlRes.data.value.schoolYear) {
            setActiveSchoolYear(ctrlRes.data.value.schoolYear);
          }
        }
      } catch (tErr) {
        console.warn("Notice loading active term:", tErr);
      }

      // 1. Fetch live teacher profile from teachers table for accurate name matching
      const cleanEmail = (user.email || "").trim().toLowerCase();
      const { data: teacherRecords } = await supabase
        .from("teachers")
        .select("id, teacher_id, first_name, middle_name, last_name, email")
        .or(`email.eq.${cleanEmail},user_id.eq.${user.id}`)
        .limit(1);

      const teacherProfile = teacherRecords?.[0];
      const tFirst = (teacherProfile?.first_name || user.firstName || "").trim();
      const tMiddle = (teacherProfile?.middle_name || "").trim();
      const tLast = (teacherProfile?.last_name || user.lastName || "").trim();

      const fullNameWithMiddle = `${tFirst}${tMiddle ? " " + tMiddle : ""} ${tLast}`.trim();
      const fullNameNoMiddle = `${tFirst} ${tLast}`.trim();
      const userFullName = (user.fullName || "").trim();

      // 2. Fetch base sections from sections table
      const { data: secData, error: secErr } = await supabase
        .from("sections")
        .select("*")
        .order("grade_level", { ascending: true })
        .order("section_name", { ascending: true });

      if (secErr) {
        console.warn("Notice querying sections:", secErr.message);
      }

      // 3. Fetch overrides from system_settings config (where admin saves adviser_name and room)
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

      // Fetch classroom capacities from classrooms_config (synced with IT Support updates)
      const roomCapacityMap = new Map<string, number>();
      try {
        const { data: sysRooms } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "classrooms_config")
          .maybeSingle();

        if (sysRooms?.value?.classrooms && Array.isArray(sysRooms.value.classrooms)) {
          sysRooms.value.classrooms.forEach((r: any) => {
            if (r.roomNumber) {
              roomCapacityMap.set(r.roomNumber.trim().toLowerCase(), Number(r.capacity) || 40);
            }
          });
        }
      } catch {}

      // Merge base DB sections + system_settings custom overrides
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

      const allMergedSections: SectionSummary[] = Array.from(secMap.values()).map((s: any) => {
        let capacity = Number(s.capacity) || 40;
        if (s.room) {
          const cleanRoom = s.room.trim().toLowerCase();
          for (const [key, cap] of roomCapacityMap.entries()) {
            if (cleanRoom === key || cleanRoom.includes(key) || key.includes(cleanRoom)) {
              capacity = cap;
              break;
            }
          }
        }

        const isElective = Boolean(
          s.strand === "Elective" ||
          s.isElective ||
          String(s.id).startsWith("elec-")
        );
        const electiveCode =
          s.electiveCode ||
          (isElective && String(s.id).startsWith("elec-")
            ? String(s.id).split("-").slice(2).join("-")
            : undefined);

        return {
          id: s.id,
          section_name: s.section_name,
          grade_level: Number(s.grade_level),
          strand: s.strand || undefined,
          room: s.room || undefined,
          capacity,
          adviser_name: s.adviser_name || undefined,
          school_year: s.school_year || "2025-2026",
          isElective,
          electiveCode,
        };
      });

      // 4. Filter sections where the logged-in teacher is specifically assigned as Class Adviser
      const mySections = allMergedSections.filter((s) => {
        if (!s.adviser_name) return false;
        const adv = s.adviser_name.trim().toLowerCase();

        if (fullNameWithMiddle && adv === fullNameWithMiddle.toLowerCase()) return true;
        if (fullNameNoMiddle && adv === fullNameNoMiddle.toLowerCase()) return true;
        if (userFullName && adv === userFullName.toLowerCase()) return true;
        if (cleanEmail && (adv === cleanEmail || adv.includes(cleanEmail))) return true;

        if (tFirst && tLast && adv.includes(tFirst.toLowerCase()) && adv.includes(tLast.toLowerCase())) {
          return true;
        }

        return false;
      });

      setAdvisorySections(mySections);
      hasLoadedOnceRef.current = true;

      // Ensure a valid advisory section is selected
      setSelectedSectionId((prev) => {
        if (mySections.length === 0) return "";
        if (prev && mySections.some((s) => s.id === prev)) return prev;
        return mySections[0].id;
      });
    } catch (err) {
      console.error("Error fetching advisory sections:", err);
    } finally {
      setIsLoadingSections(false);
    }
  };

  // Initial fetch and real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchAdvisorySections(false);

    // Supabase Realtime Channel: Listen for section, teacher, student, or settings changes
    const channel = supabase
      .channel("teacher-advisory-roster-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sections" },
        () => fetchAdvisorySections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings" },
        () => fetchAdvisorySections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchAdvisorySections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchAdvisorySections(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => fetchAdvisorySections(true)
      )
      .subscribe();

    const handleCustomEvent = () => fetchAdvisorySections(true);
    window.addEventListener("dumalnext:data-changed", handleCustomEvent);
    window.addEventListener("dumalnext:teacher-data-changed", handleCustomEvent);
    window.addEventListener("dumalnext:admin-data-changed", handleCustomEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("dumalnext:data-changed", handleCustomEvent);
      window.removeEventListener("dumalnext:teacher-data-changed", handleCustomEvent);
      window.removeEventListener("dumalnext:admin-data-changed", handleCustomEvent);
    };
  }, [user?.id, user?.email, user?.fullName]);

  // Fetch enrolled students for the currently selected advisory section
  useEffect(() => {
    if (!selectedSectionId) {
      setRosterStudents([]);
      return;
    }

    let isMounted = true;
    const fetchRoster = async () => {
      setIsLoadingRoster(true);
      try {
        const currentSec = advisorySections.find((s) => s.id === selectedSectionId);
        const isElective = Boolean(
          selectedSectionId.startsWith("elec-") ||
          currentSec?.isElective ||
          currentSec?.strand === "Elective"
        );
        const electiveCode =
          currentSec?.electiveCode ||
          (selectedSectionId.startsWith("elec-") ? selectedSectionId.split("-").slice(2).join("-") : "");
        const gradeLevel = currentSec?.grade_level;

        const studentMap = new Map<string, StudentItem>();

        // 1. Direct query from students table (regular track sections)
        const { data: directStudents } = await supabase
          .from("students")
          .select("id, student_id, first_name, middle_name, last_name, gender, barangay, contact_number, grade_level")
          .eq("current_section_id", selectedSectionId)
          .order("last_name", { ascending: true });

        if (directStudents) {
          directStudents.forEach((st: any) => studentMap.set(st.id, st));
        }

        // 2. For elective sections (or as comprehensive fallback for any section), query enrollment_applications
        if (isElective || studentMap.size === 0) {
          const { data: appsData } = await supabase
            .from("enrollment_applications")
            .select("id, student_id, selected_electives, status, target_grade_level")
            .in("status", ["Approved", "approved"]);

          const matchedStudentIds = new Set<string>();
          const matchedLrns = new Set<string>();

          (appsData || []).forEach((app: any) => {
            if (gradeLevel && app.target_grade_level && Number(app.target_grade_level) !== Number(gradeLevel)) {
              return;
            }

            const raw = app.selected_electives;
            if (!raw) return;

            let isMatch = false;
            const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw);

            if (rawStr.includes(selectedSectionId)) {
              isMatch = true;
            } else if (isElective && electiveCode && rawStr.toUpperCase().includes(electiveCode.toUpperCase())) {
              isMatch = true;
            }

            if (!isMatch && isElective) {
              const fd = Array.isArray(raw) && raw.length > 0 ? raw[0] : (typeof raw === "object" ? raw : {});
              if (fd.assigned_elective_section_id === selectedSectionId) {
                isMatch = true;
              } else if (electiveCode && (
                fd.assigned_elective_code?.toUpperCase() === electiveCode.toUpperCase() ||
                (Array.isArray(fd.selectedElectives) && fd.selectedElectives.some((e: any) => String(e).toUpperCase() === electiveCode.toUpperCase()))
              )) {
                isMatch = true;
              }
            }

            if (isMatch) {
              if (app.student_id) matchedStudentIds.add(app.student_id);
              const fd = Array.isArray(raw) && raw.length > 0 ? raw[0] : (typeof raw === "object" ? raw : {});
              if (fd?.lrn) matchedLrns.add(String(fd.lrn));
            }
          });

          // Fetch student records from students table for matched IDs
          if (matchedStudentIds.size > 0) {
            const { data: appStudents } = await supabase
              .from("students")
              .select("id, student_id, first_name, middle_name, last_name, gender, barangay, contact_number, grade_level")
              .in("id", Array.from(matchedStudentIds));

            if (appStudents) {
              appStudents.forEach((st: any) => studentMap.set(st.id, st));
            }
          }

          // Fetch any remaining students by LRN if not matched by ID
          if (matchedLrns.size > 0 && studentMap.size < matchedStudentIds.size) {
            const { data: lrnStudents } = await supabase
              .from("students")
              .select("id, student_id, first_name, middle_name, last_name, gender, barangay, contact_number, grade_level")
              .in("student_id", Array.from(matchedLrns));

            if (lrnStudents) {
              lrnStudents.forEach((st: any) => studentMap.set(st.id, st));
            }
          }
        }

        // 3. Mark enrollment status for active academic term
        const cleanSY = (activeSchoolYear || "2026-2027").replace(/[–—]/g, "-");
        const { data: termApps } = await supabase
          .from("enrollment_applications")
          .select("id, student_id, status, school_year, selected_electives")
          .in("status", ["Approved", "approved"]);

        const enrolledIds = new Set<string>();
        const enrolledLrns = new Set<string>();

        (termApps || []).forEach((app: any) => {
          if (isApplicationInTerm(app, cleanSY, activeTermNumber)) {
            if (app.student_id) enrolledIds.add(app.student_id);
            const fd = Array.isArray(app.selected_electives) && app.selected_electives.length > 0
              ? app.selected_electives[0]
              : (typeof app.selected_electives === "object" ? app.selected_electives : {});
            if (fd?.lrn) enrolledLrns.add(String(fd.lrn));
          }
        });

        const sortedStudents = Array.from(studentMap.values()).map((st) => {
          const isEnrolled = activeTermNumber <= 1 || enrolledIds.has(st.id) || (st.student_id && enrolledLrns.has(st.student_id));
          return {
            ...st,
            isEnrolledInActiveTerm: Boolean(isEnrolled),
          };
        }).sort((a, b) => {
          const lComp = (a.last_name || "").localeCompare(b.last_name || "");
          if (lComp !== 0) return lComp;
          return (a.first_name || "").localeCompare(b.first_name || "");
        });

        if (isMounted) {
          setRosterStudents(sortedStudents);
        }
      } catch (err) {
        console.warn("Notice loading section roster:", err);
        if (isMounted) setRosterStudents([]);
      } finally {
        if (isMounted) setIsLoadingRoster(false);
      }
    };

    fetchRoster();

    // Listen to changes in students and enrollment_applications tables
    const studentChannel = supabase
      .channel(`advisory-students-${selectedSectionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchRoster()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => fetchRoster()
      )
      .subscribe();

    const handleDataChanged = () => fetchRoster();
    window.addEventListener("dumalnext:data-changed", handleDataChanged);
    window.addEventListener("dumalnext:teacher-data-changed", handleDataChanged);
    window.addEventListener("dumalnext:admin-data-changed", handleDataChanged);

    return () => {
      isMounted = false;
      supabase.removeChannel(studentChannel);
      window.removeEventListener("dumalnext:data-changed", handleDataChanged);
      window.removeEventListener("dumalnext:teacher-data-changed", handleDataChanged);
      window.removeEventListener("dumalnext:admin-data-changed", handleDataChanged);
    };
  }, [selectedSectionId, advisorySections]);

  // Reset pagination to page 1 when section or search filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSectionId, rosterSearch]);

  if (isAuthLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] text-center space-y-2">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
          DUMALNEG NATIONAL HIGH SCHOOL
        </span>
        <p className="text-xs font-mono text-slate-600">
          Verifying Faculty Session...
        </p>
      </div>
    );
  }

  if (!user) {
    return <TeacherLoginForm />;
  }

  // 1-Click Continuing Enrollment Handlers for Trimester 2 & 3
  const handleOneClickEnroll = async (student: StudentItem) => {
    if (!currentSection || !user) return;
    setEnrollingStudentId(student.id);
    setEnrollNotification(null);

    try {
      const cleanSY = (activeSchoolYear || "2026-2027").replace(/[–—]/g, "-");
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const generatedRef = `DNHS-${cleanSY.split("-")[0] || "2026"}-${randomSuffix}`;

      // Fetch prior application to inherit any submitted documents (PSA, SF9, etc.)
      const { data: priorApps } = await supabase
        .from("enrollment_applications")
        .select("id, application_id, submitted_documents, selected_electives")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const priorDocs = priorApps?.[0]?.submitted_documents || [];
      const pastFd = Array.isArray(priorApps?.[0]?.selected_electives) && priorApps?.[0]?.selected_electives?.length > 0
        ? priorApps?.[0]?.selected_electives[0]
        : (typeof priorApps?.[0]?.selected_electives === "object" ? priorApps?.[0]?.selected_electives : {});

      const submissionPayload = {
        ...pastFd,
        semester: activeTermName,
        term: activeTermName,
        targetSemester: activeTermName,
        term_name: activeTermName,
        termNumber: activeTermNumber,
        schoolYear: cleanSY,
        assigned_track_section_id: currentSection.id,
        assigned_track_section_name: currentSection.section_name,
        applicantType: "Continuing",
        lrn: student.student_id,
        firstName: student.first_name,
        lastName: student.last_name,
        targetGradeLevel: currentSection.grade_level,
        targetStrand: currentSection.strand || null,
      };

      // Check if there is already an application for this student in this term
      const { data: userApps } = await supabase
        .from("enrollment_applications")
        .select("id, school_year, selected_electives")
        .eq("student_id", student.id);

      const existingTermApp = (userApps || []).find((a: any) =>
        isApplicationInTerm(a, cleanSY, activeTermNumber)
      );

      if (existingTermApp) {
        const { error: upErr } = await supabase
          .from("enrollment_applications")
          .update({
            status: "Approved",
            target_grade_level: currentSection.grade_level,
            target_strand: currentSection.strand || null,
            admin_feedback: `Officially Enrolled for ${activeTermName} (S.Y. ${cleanSY}) via 1-Click Continuing Advisory Enrollment by ${user.fullName || "Class Adviser"}.`,
            selected_electives: [submissionPayload],
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTermApp.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from("enrollment_applications")
          .insert({
            application_id: generatedRef,
            student_id: student.id,
            applicant_type: "Continuing",
            school_year: cleanSY,
            target_grade_level: currentSection.grade_level,
            target_strand: currentSection.strand || null,
            status: "Approved",
            admin_feedback: `Officially Enrolled for ${activeTermName} (S.Y. ${cleanSY}) via 1-Click Continuing Advisory Enrollment by ${user.fullName || "Class Adviser"}.`,
            selected_electives: [submissionPayload],
            submitted_documents: priorDocs,
          });
        if (insErr) throw insErr;
      }

      // Update students table to ensure section and grade level are locked in
      await supabase
        .from("students")
        .update({
          current_section_id: currentSection.id,
          grade_level: currentSection.grade_level,
          updated_at: new Date().toISOString(),
        })
        .eq("id", student.id);

      // System-wide broadcast so Admin & Student portals reflect this instantly
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:teacher-data-changed"));
      }

      setEnrollNotification({
        type: "success",
        message: `Successfully enrolled ${student.last_name}, ${student.first_name} for ${activeTermName}! Status is now ENROLLED across Admin, Teacher, and Student portals.`,
      });

      // Update local roster list immediately without waiting
      setRosterStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, isEnrolledInActiveTerm: true } : s))
      );
    } catch (err: any) {
      console.error("1-Click Enroll error:", err);
      setEnrollNotification({
        type: "error",
        message: err.message || "Failed to 1-click enroll student.",
      });
    } finally {
      setEnrollingStudentId(null);
    }
  };

  const handleOneClickEnrollAll = async () => {
    const unenrolled = rosterStudents.filter((st) => !st.isEnrolledInActiveTerm);
    if (unenrolled.length === 0 || !currentSection) return;
    setIsEnrollingAll(true);
    setEnrollNotification(null);

    let count = 0;
    for (const st of unenrolled) {
      try {
        await handleOneClickEnroll(st);
        count++;
      } catch (err) {
        console.warn("Failed enrolling student:", st.id, err);
      }
    }

    setEnrollNotification({
      type: "success",
      message: `Successfully 1-click enrolled ${count} learner(s) for ${activeTermName}! All learners are now officially ENROLLED in Admin, Teacher, and Student portals.`,
    });
    setIsEnrollingAll(false);
  };

  const currentSection = advisorySections.find((s) => s.id === selectedSectionId);

  const filteredStudents = rosterStudents.filter((st) => {
    if (!rosterSearch.trim()) return true;
    const q = rosterSearch.toLowerCase();
    const fullName = `${st.last_name}, ${st.first_name} ${st.middle_name || ""}`.toLowerCase();
    const lrn = (st.student_id || "").toLowerCase();
    return fullName.includes(q) || lrn.includes(q);
  });

  const totalStudents = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / STUDENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * STUDENTS_PER_PAGE;
  const endIndex = Math.min(startIndex + STUDENTS_PER_PAGE, totalStudents);
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 font-sans">
      {/* Title Bar */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white border-t-4 border-amber-400 p-5 sm:p-6 rounded-[4px] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print print:hidden">
        <div>
          <span className="text-xs font-bold text-amber-300 tracking-wide block">
            Official Advisory Class Masterlist &bull; Dumalneg NHS
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            Advisory Section Roster
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            Official advisory class masterlist for designated Class Adviser:{" "}
            <strong className="text-white">
              {user.fullName || user.email}
            </strong>
          </p>
        </div>

        {/* Action Controls & Section Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentSection && (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#002060] text-xs font-bold cursor-pointer transition-colors rounded-[4px] shadow-xs shrink-0"
              title="Print official advisory class roster"
            >
              Print Class Roster
            </button>
          )}

          {advisorySections.length > 1 && (
            <div className="flex items-center gap-2 bg-white text-slate-900 px-2 py-1 rounded-[4px]">
              <CustomSelect
                label="Advisory:"
                value={selectedSectionId}
                onChange={(val) => {
                  setSelectedSectionId(val);
                  setCurrentPage(1);
                }}
                options={advisorySections.map((sec) => ({
                  value: sec.id,
                  label: `${sec.section_name} (Grade ${sec.grade_level})`,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      {isLoadingSections ? (
        <div className="p-8 bg-white border-2 border-slate-200 text-center">
          <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : advisorySections.length === 0 ? (
        /* SCENARIO: NO ADVISORY SECTION CURRENTLY DESIGNATED BY ADMIN */
        <div className="bg-white p-8 border-2 border-slate-300 text-center space-y-3 shadow-xs">
          <span className="text-xs font-mono font-bold text-amber-800 uppercase block">
            NO ADVISORY CLASS SECTION CURRENTLY ASSIGNED
          </span>
          <h3 className="text-lg font-bold text-slate-900 uppercase">
            No Designated Advisory Class Found
          </h3>
          <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
            You are currently signed in as <strong className="text-slate-900">{user.fullName}</strong> ({user.email}). 
            The school administration has not yet designated you as a Class Adviser for any section in S.Y. {activeSchoolYear} • {activeTermName}.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 max-w-lg mx-auto text-left text-xs text-slate-600 space-y-1">
            <span className="font-bold text-[#002060] block uppercase">
              How Advisory Class Assignment Works:
            </span>
            <p>
              1. The School Principal or Registrar assigns you as Class Adviser in the Admin Portal under Section Quota &amp; Capacity Management.
            </p>
            <p>
              2. Once assigned, your section and all officially enrolled learners will appear here in real time automatically.
            </p>
          </div>
        </div>
      ) : (
        /* SCENARIO: TEACHER HAS AN ASSIGNED ADVISORY CLASS */
        <>
          {/* Section Details Summary Bar */}
          {currentSection && (
            <div className="p-4 bg-white border-2 border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-mono no-print print:hidden">
              <div className="space-y-0.5">
                <div>
                  Advisory Class: <strong className="text-[#002060] text-sm uppercase">{currentSection.section_name}</strong> &bull; Grade: <strong>Grade {currentSection.grade_level}</strong>
                  {currentSection.strand && <> &bull; Strand: <strong>{currentSection.strand}</strong></>}
                  {currentSection.room && <> &bull; Room: <strong>{currentSection.room}</strong></>}
                </div>
                <div className="text-slate-600">
                  Designated Class Adviser: <strong className="text-emerald-800 uppercase">{currentSection.adviser_name}</strong>
                  <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-emerald-300 font-bold uppercase">
                    Official Adviser
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-800 font-bold block">
                  Enrolled Learners: {rosterStudents.length} / {currentSection.capacity} Maximum Capacity
                </span>
                <span className="text-[10px] text-slate-500 block">
                  School Year 2025–2026
                </span>
              </div>
            </div>
          )}

          {/* Search & Student Masterlist */}
          <div className="bg-white p-5 border-2 border-slate-300 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none">
            {/* DepEd Official Letterhead for Printout */}
            {currentSection && (
              <div className="hidden print:block p-6 text-center border-b-2 border-slate-900 text-slate-900 mb-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
                  Republic of the Philippines • Department of Education
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Region I • Schools Division of Ilocos Norte
                </div>
                <h1 className="text-lg font-bold uppercase tracking-tight text-[#002060] mt-1">
                  DUMALNEG NATIONAL HIGH SCHOOL
                </h1>
                <div className="text-[10px] font-mono text-slate-600">
                  Dumalneg, Ilocos Norte • School ID: 300017
                </div>
                <div className="mt-4 pt-2 border-t border-slate-400 flex items-center justify-between text-xs font-mono">
                  <div>
                    <strong>OFFICIAL ADVISORY CLASS ROSTER</strong> • SY 2025–2026
                  </div>
                  <div>
                    Section: <strong>{currentSection.section_name}</strong> (Grade {currentSection.grade_level}{currentSection.strand ? ` • ${currentSection.strand}` : ""})
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <div>Room: <strong>{currentSection.room || "Main Building"}</strong></div>
                  <div>Class Adviser: <strong>{currentSection.adviser_name || user.fullName || "Designated Faculty"}</strong></div>
                  <div>Total Enrolled: <strong>{rosterStudents.length} / {currentSection.capacity}</strong></div>
                </div>
              </div>
            )}

            {/* Real-time Notification Banner */}
            {enrollNotification && (
              <div
                className={`p-3.5 rounded border flex items-center justify-between gap-2 text-xs font-mono shadow-xs no-print print:hidden ${
                  enrollNotification.type === "success"
                    ? "bg-emerald-50 text-emerald-950 border-emerald-400"
                    : "bg-red-50 text-red-950 border-red-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${enrollNotification.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>{enrollNotification.type === "success" ? "Success" : "Notice"}</span>
                  <span>{enrollNotification.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnrollNotification(null)}
                  className="px-2 py-0.5 text-xs font-bold hover:opacity-75 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            {/* 1-Click Continuing Enrollment Banner for Trimester 2 and 3 */}
            {activeTermNumber >= 2 && currentSection && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-500 rounded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 no-print print:hidden">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-700 text-white shadow-xs">
                      Active: {activeTermName}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                      1-Click Continuing Advisory Enrollment
                    </span>
                    <span className="text-[11px] text-emerald-800 font-mono">
                      &bull; S.Y. {activeSchoolYear}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    As Class Adviser of <strong>{currentSection.section_name}</strong>, you can 1-click enroll your students for <strong>{activeTermName}</strong>. Once enrolled, their status becomes <strong>ENROLLED</strong> across Admin, Teacher, and Student portals.
                  </p>
                </div>

                {rosterStudents.filter((st) => !st.isEnrolledInActiveTerm).length > 0 ? (
                  <button
                    type="button"
                    onClick={handleOneClickEnrollAll}
                    disabled={isEnrollingAll || Boolean(enrollingStudentId)}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 font-sans"
                  >
                    {isEnrollingAll ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enrolling All Learners...</span>
                      </>
                    ) : (
                      <>
                        <span>1-Click Enroll All ({rosterStudents.filter((st) => !st.isEnrolledInActiveTerm).length} Unenrolled)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="px-3.5 py-2 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded text-xs font-bold shrink-0 flex items-center gap-1.5 font-sans">
                    <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider bg-emerald-200 px-1.5 py-0.5 rounded">Enrolled</span>
                    <span>All Learners Enrolled for {activeTermName}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 no-print print:hidden">
              <div className="flex items-center gap-2 w-full sm:max-w-md">
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => {
                    setRosterSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search student by Full Name or 12-digit LRN..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-[#002060]"
                />
                {rosterSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setRosterSearch("");
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
              <span className="text-xs font-mono text-slate-600">
                {totalStudents > 0 ? (
                  <>
                    Showing <strong>{startIndex + 1}&ndash;{endIndex}</strong> of <strong>{totalStudents}</strong> learner(s)
                  </>
                ) : (
                  <>
                    Displaying: <strong>0</strong> learner(s)
                  </>
                )}
              </span>
            </div>

            {isLoadingRoster ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200 text-center text-xs font-mono text-slate-600 space-y-1">
                <p className="font-bold">
                  {rosterSearch ? "No students matching search query." : "No students currently enrolled in this advisory section."}
                </p>
                {!rosterSearch && (
                  <p className="text-[11px] text-slate-500">
                    Once the Registrar approves applicants and assigns them to {currentSection?.section_name}, they will automatically be listed here.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto border border-slate-200 print:border-none">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[11px] text-slate-700">
                        <th className="p-2.5 w-12 text-center font-mono">#</th>
                        <th className="p-2.5 font-mono">Learner Reference Number (LRN)</th>
                        <th className="p-2.5">Student Full Name</th>
                        <th className="p-2.5">Gender</th>
                        <th className="p-2.5">Barangay</th>
                        <th className="p-2.5">Emergency Contact</th>
                        <th className="p-2.5 text-center">Enrollment Status</th>
                        <th className="p-2.5 text-center no-print print:hidden">Action</th>
                      </tr>
                    </thead>
                    {/* Paginated Screen View (Max 10 learners per page) */}
                    <tbody className="divide-y divide-slate-200 print:hidden">
                      {paginatedStudents.map((st, idx) => (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-center font-mono text-slate-500">
                            {startIndex + idx + 1}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-[#002060]">
                            {st.student_id || "PENDING LIS"}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 uppercase">
                            {st.last_name}, {st.first_name} {st.middle_name || ""}
                          </td>
                          <td className="p-2.5 font-mono">{st.gender || "—"}</td>
                          <td className="p-2.5 text-slate-700">{st.barangay || "—"}</td>
                          <td className="p-2.5 font-mono text-slate-600">{st.contact_number || "—"}</td>
                          <td className="p-2.5 text-center">
                            {st.isEnrolledInActiveTerm ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                                Enrolled ({activeTermName})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-amber-50 text-amber-950 border border-amber-300 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                Not Enrolled ({activeTermName})
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center no-print print:hidden">
                            {st.isEnrolledInActiveTerm ? (
                              <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                                Enrolled
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOneClickEnroll(st)}
                                disabled={enrollingStudentId === st.id || isEnrollingAll}
                                className="px-3 py-1.5 bg-[#002060] hover:bg-[#002b80] text-white rounded text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                              >
                                {enrollingStudentId === st.id ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Enrolling...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>1-Click Enroll</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Full Roster Printout View */}
                    <tbody className="hidden print:table-row-group divide-y divide-slate-200">
                      {filteredStudents.map((st, idx) => (
                        <tr key={`print-${st.id}`}>
                          <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-[#002060]">
                            {st.student_id || "PENDING LIS"}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 uppercase">
                            {st.last_name}, {st.first_name} {st.middle_name || ""}
                          </td>
                          <td className="p-2.5 font-mono">{st.gender || "—"}</td>
                          <td className="p-2.5 text-slate-700">{st.barangay || "—"}</td>
                          <td className="p-2.5 font-mono text-slate-600">{st.contact_number || "—"}</td>
                          <td className="p-2.5 text-center font-mono">
                            {st.isEnrolledInActiveTerm ? `Enrolled (${activeTermName})` : `Not Enrolled (${activeTermName})`}
                          </td>
                          <td className="p-2.5 text-center font-mono">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar (10 Students Per Page) */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs font-mono no-print print:hidden"
                  role="navigation"
                  aria-label="Student roster pagination"
                >
                  <div className="text-slate-600">
                    Page <strong className="text-[#002060]">{safeCurrentPage}</strong> of{" "}
                    <strong className="text-[#002060]">{totalPages}</strong> &bull; Showing{" "}
                    <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of{" "}
                    <strong>{totalStudents}</strong> learner(s) (10 per page)
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, Math.min(prev, totalPages) - 1))}
                      disabled={safeCurrentPage <= 1}
                      className={`px-3 py-1.5 border text-xs font-bold uppercase rounded-[4px] transition-colors ${
                        safeCurrentPage <= 1
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-white hover:bg-slate-100 border-slate-300 text-[#002060] cursor-pointer"
                      }`}
                    >
Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const isActive = pageNum === safeCurrentPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          aria-current={isActive ? "page" : undefined}
                          className={`min-w-[32px] px-2.5 py-1.5 border text-xs font-bold rounded-[4px] transition-colors cursor-pointer ${
                            isActive
                              ? "bg-[#002060] border-[#002060] text-white"
                              : "bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, Math.min(prev, totalPages) + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className={`px-3 py-1.5 border text-xs font-bold uppercase rounded-[4px] transition-colors ${
                        safeCurrentPage >= totalPages
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-white hover:bg-slate-100 border-slate-300 text-[#002060] cursor-pointer"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DepEd Official Signatory Block for Printout */}
            {currentSection && (
              <div className="hidden print:flex justify-between items-end pt-12 mt-6 text-xs font-sans text-slate-900 pb-4 px-2">
                <div className="text-center w-56">
                  <div className="border-b border-slate-900 pb-1 font-bold uppercase">
                    {currentSection.adviser_name || user.fullName || "Class Adviser"}
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 uppercase mt-1">
                    Class Adviser
                  </div>
                </div>
                <div className="text-center w-56">
                  <div className="border-b border-slate-900 pb-1 font-bold uppercase">
                    OFFICE OF THE REGISTRAR
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 uppercase mt-1">
                    Certified Correct • DepEd DNHS
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
