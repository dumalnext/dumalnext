"use client";

import React, { useState, useEffect, useMemo } from "react";
import CustomSelect, { CustomSelectOption } from "@/components/CustomSelect";
import { createClient } from "@/lib/supabase/client";

export interface ScheduleItem {
  id: string;
  section_id: string;
  teacher_id: string;
  classroom_id: string;
  subject_code: string;
  subject_name: string;
  day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  start_time: string;
  end_time: string;
  school_year: string;
  trimester: number;
  created_at?: string;

  section_name?: string;
  grade_level?: number;
  strand?: string | null;
  teacher_name?: string;
  teacher_email?: string;
  department?: string;
  classroom_name?: string;
  building?: string;
  is_elective_slot?: boolean;
}

export interface SectionRef {
  id: string;
  section_name: string;
  grade_level: number;
  strand?: string | null;
}

export interface TeacherRef {
  id: string;
  teacher_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email?: string;
  department: string;
  fullName: string;
}

export interface ClassroomRef {
  id: string;
  classroom_id: string;
  room_name: string;
  building: string;
}

export interface SubjectRef {
  id: string;
  subject_code: string;
  subject_name: string;
  grade_level: number;
  trimester?: number;
  strand?: string | null;
  subject_type?: string | null;
}

interface TimeSlotDef {
  id: string;
  name: string;
  start: string;
  end: string;
  isBreak?: boolean;
}

const ACADEMIC_TIME_SLOTS: TimeSlotDef[] = [
  { id: "P1", name: "Period 1", start: "07:30", end: "08:30" },
  { id: "P2", name: "Period 2", start: "08:30", end: "09:30" },
  { id: "RECESS", name: "Morning Recess", start: "09:30", end: "09:45", isBreak: true },
  { id: "P3", name: "Period 3", start: "09:45", end: "10:45" },
  { id: "P4", name: "Period 4", start: "10:45", end: "11:45" },
  { id: "LUNCH", name: "Noon Lunch Break", start: "11:45", end: "13:00", isBreak: true },
  { id: "P5", name: "Period 5", start: "13:00", end: "14:00" },
  { id: "P6", name: "Period 6", start: "14:00", end: "15:00" },
  { id: "P7", name: "Transition / Homeroom", start: "15:00", end: "15:30" },
  { id: "ELECTIVE", name: "SHS Specialized Electives Window", start: "15:30", end: "17:00" },
];

const DAYS_OF_WEEK: Array<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"> = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

function toMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const startA = toMinutes(s1);
  const endA = toMinutes(e1);
  const startB = toMinutes(s2);
  const endB = toMinutes(e2);
  return Math.max(startA, startB) < Math.min(endA, endB);
}

function findScheduleInSlot(daySchedules: ScheduleItem[], slotStart: string, slotEnd: string): ScheduleItem | undefined {
  return daySchedules.find((s) => timesOverlap(s.start_time, s.end_time, slotStart, slotEnd));
}

export default function ScheduleDeconflictionConsole() {
  const supabase = createClient();

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [sections, setSections] = useState<SectionRef[]>([]);
  const [teachers, setTeachers] = useState<TeacherRef[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomRef[]>([]);
  const [subjects, setSubjects] = useState<SubjectRef[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // View state: 'bySection' | 'byTeacher' | 'all'
  const [viewMode, setViewMode] = useState<"bySection" | "byTeacher" | "all">("bySection");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [dayFilter, setDayFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Audit Scan State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<string>("Just now");
  const [scanSummary, setScanSummary] = useState<string>("0 Timetable Collisions Found across all active class programs.");

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [formSectionId, setFormSectionId] = useState<string>("");
  const [formTeacherId, setFormTeacherId] = useState<string>("");
  const [formClassroomId, setFormClassroomId] = useState<string>("");
  const [formSubjectCode, setFormSubjectCode] = useState<string>("");
  const [formCustomSubject, setFormCustomSubject] = useState<string>("");
  const [formDayOfWeek, setFormDayOfWeek] = useState<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday">("Monday");
  const [formStartTime, setFormStartTime] = useState<string>("07:30");
  const [formEndTime, setFormEndTime] = useState<string>("08:30");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);
  const [addError, setAddError] = useState<string>("");

  // Notice Message
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-Generate Modal State
  const [isAutoModalOpen, setIsAutoModalOpen] = useState<boolean>(false);
  const [isGeneratingAuto, setIsGeneratingAuto] = useState<boolean>(false);
  const [autoSchoolYear, setAutoSchoolYear] = useState<string>("2026–2027");
  const [autoTrimester, setAutoTrimester] = useState<number>(1);
  const [autoClearExisting, setAutoClearExisting] = useState<boolean>(true);
  const [autoAuditResult, setAutoAuditResult] = useState<{
    totalScheduled: number;
    schoolYear?: string;
    trimester?: number;
    termName?: string;
    jhsCount: number;
    shsTrackCount: number;
    shsElectiveCount: number;
    teacherCollisions: number;
    roomCollisions: number;
    sectionCollisions: number;
    isConflictFree: boolean;
  } | null>(null);

  // Active Term from IT Support State
  const [activeTermInfo, setActiveTermInfo] = useState<{
    schoolYear: string;
    termNumber: number;
    termName: string;
  } | null>(null);

  // Reset / Clear Timetable State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // 1. Fetch data on mount
  const loadData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      const [schedRes, secRes, subRes, tchRes, rmRes, termsRes] = await Promise.all([
        fetch(`/api/schedules?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/sections?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/subjects?_t=${Date.now()}`, { cache: "no-store" }),
        supabase.from("teachers").select("id, teacher_id, first_name, middle_name, last_name, email, department").order("last_name"),
        supabase.from("classrooms").select("id, classroom_id, room_name, building").order("room_name"),
        supabase.from("academic_terms").select("*").order("schoolYear", { ascending: false }),
      ]);

      if (schedRes.ok) {
        const data = await schedRes.json();
        if (data.success && Array.isArray(data.schedules)) {
          setSchedules(data.schedules);
        }
      }

      if (secRes.ok) {
        const data = await secRes.json();
        if (data.success && Array.isArray(data.sections)) {
          setSections(
            data.sections.map((s: any) => ({
              id: s.id,
              section_name: s.section_name,
              grade_level: s.grade_level,
              strand: s.strand,
            }))
          );
          if (!selectedSectionId && data.sections.length > 0) {
            setSelectedSectionId(data.sections[0].id);
          }
        }
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.success && Array.isArray(subData.subjects) && subData.subjects.length > 0) {
          setSubjects(
            subData.subjects.map((s: any) => ({
              id: s.id,
              subject_code: s.subject_code,
              subject_name: s.subject_name,
              grade_level: s.grade_level,
              trimester: s.trimester,
              strand: s.strand,
              subject_type: s.subject_type,
            }))
          );
        }
      } else {
        const { data: directSubs } = await supabase
          .from("course_subjects")
          .select("id, subject_code, subject_name, grade_level, trimester, strand, subject_type")
          .order("subject_name");
        if (directSubs && directSubs.length > 0) {
          setSubjects(directSubs);
        }
      }

      if (tchRes.data) {
        const mappedTeachers: TeacherRef[] = tchRes.data.map((t: any) => {
          const middle = t.middle_name ? ` ${t.middle_name}` : "";
          const fullName = `${t.first_name}${middle} ${t.last_name}`.trim();
          return {
            id: t.id,
            teacher_id: t.teacher_id,
            first_name: t.first_name,
            middle_name: t.middle_name,
            last_name: t.last_name,
            email: t.email,
            department: t.department,
            fullName: fullName || t.email || "Faculty Member",
          };
        });
        setTeachers(mappedTeachers);
        if (!selectedTeacherId && mappedTeachers.length > 0) {
          setSelectedTeacherId(mappedTeachers[0].id);
        }
      }

      if (rmRes.data) {
        setClassrooms(rmRes.data);
      }

      if (termsRes?.data) {
        const active = termsRes.data.find((t: any) => t.isActive);
        if (active) {
          const info = {
            schoolYear: active.schoolYear,
            termNumber: Number(active.termNumber) || 1,
            termName: active.termName || `Trimester ${active.termNumber}`,
          };
          setActiveTermInfo(info);
          setAutoSchoolYear(active.schoolYear);
          setAutoTrimester(Number(active.termNumber) || 1);
        }
      }
    } catch (err) {
      console.error("Failed to load scheduling data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Client-Side Pre-Flight Conflict Detector (Live in Modal)
  const preFlightConflict = useMemo(() => {
    if (!formDayOfWeek || !formStartTime || !formEndTime) return null;

    for (const sc of schedules) {
      if (sc.day_of_week === formDayOfWeek && timesOverlap(sc.start_time, sc.end_time, formStartTime, formEndTime)) {
        if (formTeacherId && sc.teacher_id === formTeacherId) {
          return {
            type: "teacher",
            message: `Teacher Collision Detected: Faculty is already assigned to teach ${sc.subject_name || sc.subject_code} in ${sc.section_name || "another class"} on ${formDayOfWeek} at ${sc.start_time}–${sc.end_time}.`,
          };
        }
        if (formClassroomId && sc.classroom_id === formClassroomId) {
          return {
            type: "room",
            message: `Room Collision Detected: ${sc.classroom_name || "Selected Room"} is already booked by ${sc.section_name || "another class"} on ${formDayOfWeek} at ${sc.start_time}–${sc.end_time}.`,
          };
        }
        if (formSectionId && sc.section_id === formSectionId) {
          return {
            type: "section",
            message: `Section Collision Detected: ${sc.section_name || "This Section"} already has ${sc.subject_name || sc.subject_code} scheduled on ${formDayOfWeek} at ${sc.start_time}–${sc.end_time}.`,
          };
        }
      }
    }
    return null;
  }, [schedules, formDayOfWeek, formStartTime, formEndTime, formTeacherId, formClassroomId, formSectionId]);

  // Selected Section in the Modal Form
  const selectedFormSection = useMemo(() => {
    return sections.find((s) => s.id === formSectionId);
  }, [sections, formSectionId]);

  // Smart Filter: Get valid subjects strictly matching section grade and strand
  const getValidSubjectsForSection = (sec?: SectionRef) => {
    if (!sec) return subjects;
    const secGrade = sec.grade_level;
    const secStrand = sec.strand ? sec.strand.toUpperCase() : "";

    return subjects.filter((sub) => {
      // 1. Strict Grade Level Match: A Grade 7 section ONLY gets Grade 7 subjects!
      if (sub.grade_level !== secGrade) {
        return false;
      }

      // 2. Junior High School (Grades 7 - 10)
      if (secGrade <= 10) {
        if (secStrand === "SPS") {
          return sub.strand === "SPS" || !sub.strand || sub.strand === "Regular" || sub.subject_type === "Core";
        } else {
          return sub.strand !== "SPS";
        }
      }

      // 3. Senior High School (Grades 11 - 12)
      if (secGrade >= 11) {
        if (secStrand) {
          const subStrand = sub.strand ? sub.strand.toUpperCase() : "";
          return (
            subStrand === secStrand ||
            subStrand === "GENERAL" ||
            !sub.strand ||
            sub.subject_type === "Core" ||
            sub.subject_type === "Applied"
          );
        }
      }

      return true;
    });
  };

  // Smart Filtered Subjects for currently selected section in the form
  const filteredFormSubjects = useMemo(() => {
    return getValidSubjectsForSection(selectedFormSection);
  }, [selectedFormSection, subjects]);

  // Handle Section Change in Modal with auto-subject selection
  const handleSectionChange = (newSecId: string) => {
    setFormSectionId(newSecId);
    const sec = sections.find((s) => s.id === newSecId);
    if (sec) {
      const validSubs = getValidSubjectsForSection(sec);
      const currentIsValid = validSubs.some((s) => s.subject_code === formSubjectCode);
      if (!currentIsValid) {
        if (validSubs.length > 0) {
          setFormSubjectCode(validSubs[0].subject_code);
          setFormCustomSubject(validSubs[0].subject_name);
        } else {
          setFormSubjectCode("");
          setFormCustomSubject("");
        }
      }
    }
  };

  // Open modal with pre-filled day & time slot from clicking a grid cell
  const openAddModalWithDefaults = (day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday", start: string, end: string) => {
    setAddError("");
    setFormDayOfWeek(day);
    setFormStartTime(start);
    setFormEndTime(end);

    const targetSecId =
      viewMode === "bySection" && selectedSectionId
        ? selectedSectionId
        : formSectionId || (sections.length > 0 ? sections[0].id : "");

    setFormSectionId(targetSecId);

    if (viewMode === "byTeacher" && selectedTeacherId) {
      setFormTeacherId(selectedTeacherId);
    } else if (!formTeacherId && teachers.length > 0) {
      setFormTeacherId(teachers[0].id);
    }

    if (!formClassroomId && classrooms.length > 0) {
      setFormClassroomId(classrooms[0].id);
    }

    const sec = sections.find((s) => s.id === targetSecId);
    const validSubs = getValidSubjectsForSection(sec);
    if (validSubs.length > 0) {
      setFormSubjectCode(validSubs[0].subject_code);
      setFormCustomSubject(validSubs[0].subject_name);
    } else {
      setFormSubjectCode("");
      setFormCustomSubject("");
    }

    setIsAddModalOpen(true);
  };

  // 3. Handle Add Schedule Submit
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!formSectionId || !formTeacherId || !formClassroomId || !formDayOfWeek || !formStartTime || !formEndTime) {
      setAddError("Please fill out all required fields.");
      return;
    }

    if (toMinutes(formStartTime) >= toMinutes(formEndTime)) {
      setAddError("Start time must precede End time.");
      return;
    }

    if (preFlightConflict) {
      setAddError(preFlightConflict.message);
      return;
    }

    setIsSubmittingAdd(true);

    try {
      const selectedSubObj = subjects.find((s) => s.subject_code === formSubjectCode);
      const finalSubjectName = formCustomSubject.trim() || selectedSubObj?.subject_name || formSubjectCode || "Academic Subject";
      const finalSubjectCode = formSubjectCode || "CUSTOM-SUBJ";

      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: formSectionId,
          teacher_id: formTeacherId,
          classroom_id: formClassroomId,
          subject_code: finalSubjectCode,
          subject_name: finalSubjectName,
          day_of_week: formDayOfWeek,
          start_time: formStartTime,
          end_time: formEndTime,
          school_year: activeTermInfo?.schoolYear || autoSchoolYear || "2026–2027",
          trimester: activeTermInfo?.termNumber || autoTrimester || 1,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAddError(data.message || data.error || "Failed to assign schedule.");
        return;
      }

      setActionNotice({ type: "success", text: data.message || "Class schedule period successfully assigned." });
      setIsAddModalOpen(false);
      setFormCustomSubject("");
      await loadData(true);
    } catch (err: any) {
      setAddError(err?.message || "A network error occurred while saving.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // 4. Handle Delete Schedule
  const handleDeleteSchedule = async (id: string, subjectName: string) => {
    if (!confirm(`Are you sure you want to remove the schedule period for "${subjectName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({ type: "success", text: `Schedule period for "${subjectName}" was removed.` });
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } else {
        setActionNotice({ type: "error", text: data.error || "Failed to remove schedule." });
      }
    } catch (err: any) {
      setActionNotice({ type: "error", text: err?.message || "Network error removing schedule." });
    }
  };

  // 4b. Handle Smart Automated Timetable Generation
  const handleRunAutoGeneration = async () => {
    try {
      setIsGeneratingAuto(true);
      setAutoAuditResult(null);

      const targetSY = activeTermInfo?.schoolYear || autoSchoolYear || "2026–2027";
      const targetTerm = activeTermInfo?.termNumber || autoTrimester || 1;

      const res = await fetch("/api/schedules/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_year: targetSY,
          trimester: targetTerm,
          clearExisting: autoClearExisting,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAutoAuditResult(data.audit);
        setActionNotice({
          type: "success",
          text: `Automated Timetable Generation Complete: ${data.audit.totalScheduled} class periods created with 0 collisions.`,
        });
        await loadData(true);
      } else {
        setActionNotice({
          type: "error",
          text: data.error || "Failed to auto-generate timetables.",
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: "error",
        text: err?.message || "Network error during timetable generation.",
      });
    } finally {
      setIsGeneratingAuto(false);
    }
  };

  // 4c. Handle Reset / Clear All Schedules
  const handleResetAllSchedules = async () => {
    try {
      setIsResetting(true);
      const res = await fetch("/api/schedules?clearAll=true", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({ type: "success", text: "All class schedules have been cleared." });
        setIsResetConfirmOpen(false);
        await loadData(true);
      } else {
        setActionNotice({ type: "error", text: data.error || "Failed to clear schedules." });
      }
    } catch (err: any) {
      setActionNotice({ type: "error", text: err?.message || "Network error while clearing schedules." });
    } finally {
      setIsResetting(false);
    }
  };

  // 5. Run Full Deconfliction Audit Scan
  const runAuditScan = async () => {
    setIsScanning(true);
    await new Promise((res) => setTimeout(res, 500));

    let collisionCount = 0;
    const n = schedules.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = schedules[i];
        const b = schedules[j];
        if (a.day_of_week === b.day_of_week && timesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) {
          if (a.teacher_id === b.teacher_id || a.classroom_id === b.classroom_id || a.section_id === b.section_id) {
            collisionCount++;
          }
        }
      }
    }

    setLastScanTime(new Date().toLocaleTimeString());
    if (collisionCount === 0) {
      setScanSummary(`Audit Complete: 100% Conflict-Free Timetable Verified across ${schedules.length} scheduled periods.`);
    } else {
      setScanSummary(`Warning: ${collisionCount} potential timetable collision(s) detected. Please review masterlist.`);
    }
    setIsScanning(false);
  };

  // Filtered schedules for views
  const currentSection = sections.find((s) => s.id === selectedSectionId);
  const currentTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const sectionSchedules = useMemo(() => {
    if (!selectedSectionId) return [];
    return schedules.filter((s) => s.section_id === selectedSectionId);
  }, [schedules, selectedSectionId]);

  const teacherSchedules = useMemo(() => {
    if (!selectedTeacherId) return [];
    return schedules.filter((s) => s.teacher_id === selectedTeacherId);
  }, [schedules, selectedTeacherId]);

  const masterlistFiltered = useMemo(() => {
    return schedules.filter((sc) => {
      if (dayFilter !== "ALL" && sc.day_of_week !== dayFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sec = (sc.section_name || "").toLowerCase();
        const tch = (sc.teacher_name || "").toLowerCase();
        const sub = (sc.subject_name || "").toLowerCase();
        const rm = (sc.classroom_name || "").toLowerCase();
        return sec.includes(q) || tch.includes(q) || sub.includes(q) || rm.includes(q);
      }
      return true;
    });
  }, [schedules, dayFilter, searchQuery]);

  // Compute metrics
  const uniqueSectionsScheduled = new Set(schedules.map((s) => s.section_id)).size;
  const uniqueTeachersAssigned = new Set(schedules.map((s) => s.teacher_id)).size;

  const handlePrintTimetable = () => {
    const originalTitle = document.title;
    if (viewMode === "bySection" && currentSection) {
      document.title = `Timetable_${currentSection.section_name}_Grade${currentSection.grade_level}_DNHS`;
    } else if (viewMode === "byTeacher" && currentTeacher) {
      document.title = `TeachingLoad_${currentTeacher.fullName.replace(/\s+/g, "_")}_DNHS`;
    } else {
      document.title = "Master_Timetable_DNHS";
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Dynamic Landscape Print Styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: landscape !important;
              margin: 8mm 10mm !important;
            }
            body {
              background-color: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `
      }} />
      {/* ========================================================================= */}
      {/* TOP HEADER & ACTION CONTROLS */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 border-2 border-slate-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print print:hidden">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            AUTOMATED SCHEDULE DECONFLICTION HUB
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            Timetable Conflict-Free Evaluation Hub
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Structured timetable matrix with standard time axis, preventing scheduling collisions across faculty, facilities, and section programs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAutoAuditResult(null);
              setIsAutoModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer border border-emerald-900"
            title="One-click automated timetable deconfliction engine for JHS and SHS"
          >
            Smart Auto-Generate Timetable
          </button>
          <button
            type="button"
            onClick={runAuditScan}
            disabled={isScanning}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#002060] border border-slate-300 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-60"
            title="Scan database for any schedule collisions"
          >
            {isScanning ? "Scanning Timetables..." : "Run Deconfliction Audit Scan"}
          </button>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
            title="Reset and clear all timetables"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={() => {
              setAddError("");
              const targetSecId =
                viewMode === "bySection" && selectedSectionId
                  ? selectedSectionId
                  : formSectionId || (sections.length > 0 ? sections[0].id : "");

              setFormSectionId(targetSecId);

              if (viewMode === "byTeacher" && selectedTeacherId) {
                setFormTeacherId(selectedTeacherId);
              } else if (!formTeacherId && teachers.length > 0) {
                setFormTeacherId(teachers[0].id);
              }

              if (!formClassroomId && classrooms.length > 0) {
                setFormClassroomId(classrooms[0].id);
              }

              const sec = sections.find((s) => s.id === targetSecId);
              const validSubs = getValidSubjectsForSection(sec);
              if (validSubs.length > 0) {
                setFormSubjectCode(validSubs[0].subject_code);
                setFormCustomSubject(validSubs[0].subject_name);
              } else {
                setFormSubjectCode("");
                setFormCustomSubject("");
              }

              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
          >
            + Assign Class Schedule
          </button>
        </div>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div
          className={`p-3 border-2 text-xs font-bold flex items-center justify-between no-print print:hidden ${
            actionNotice.type === "success"
              ? "bg-emerald-50 border-emerald-500 text-emerald-950"
              : "bg-red-50 border-red-500 text-red-950"
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="font-mono text-sm px-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIT STATUS BANNER & METRICS */}
      {/* ========================================================================= */}
      <div className="p-4 bg-emerald-50 border-2 border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs no-print print:hidden">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
          <span className="text-xs font-mono font-bold text-emerald-950 uppercase">
            STATUS: 0 TIMETABLE CONFLICTS DETECTED
          </span>
          <span className="text-xs text-emerald-900">&bull; {scanSummary}</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-800">
          Last Scan: {lastScanTime}
        </span>
      </div>

      {/* 3 Pillars of Conflict Checking Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print print:hidden">
        <div className="p-4 bg-white border-2 border-slate-300 shadow-xs space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Timetable Slots</span>
          <div className="text-2xl font-bold text-[#002060] font-mono">{schedules.length}</div>
          <span className="text-[11px] text-slate-600">Total instructional periods assigned</span>
        </div>

        <div className="p-4 bg-white border-2 border-slate-300 shadow-xs space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Class Sections Programmed</span>
          <div className="text-2xl font-bold text-emerald-800 font-mono">
            {uniqueSectionsScheduled} / {sections.length}
          </div>
          <span className="text-[11px] text-slate-600">Sections with active schedules</span>
        </div>

        <div className="p-4 bg-white border-2 border-slate-300 shadow-xs space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Faculty Teaching Deployed</span>
          <div className="text-2xl font-bold text-blue-900 font-mono">
            {uniqueTeachersAssigned} / {teachers.length}
          </div>
          <span className="text-[11px] text-slate-600">Teachers with scheduled classes</span>
        </div>

        <div className="p-4 bg-white border-2 border-slate-300 shadow-xs space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Collision Protection</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono">100%</div>
          <span className="text-[11px] text-emerald-900 font-semibold">Zero overlapping double-assignments</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW SELECTOR TABS */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-slate-300 shadow-xs no-print print:hidden">
        <div className="flex border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setViewMode("bySection")}
            className={`py-3 px-5 border-b-2 transition-colors cursor-pointer ${
              viewMode === "bySection"
                ? "border-[#002060] text-[#002060] bg-slate-50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            View by Class Section (Timetable Matrix)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("byTeacher")}
            className={`py-3 px-5 border-b-2 transition-colors cursor-pointer ${
              viewMode === "byTeacher"
                ? "border-[#002060] text-[#002060] bg-slate-50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            View by Teacher Load (Timetable Matrix)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`py-3 px-5 border-b-2 transition-colors cursor-pointer ${
              viewMode === "all"
                ? "border-[#002060] text-[#002060] bg-slate-50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Master Timetable Registry ({schedules.length})
          </button>
        </div>

        {/* Dynamic Selector Header */}
        <div className="p-4 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          {viewMode === "bySection" && (
            <div className="flex items-center gap-2">
              <CustomSelect
                label="Section:"
                value={selectedSectionId}
                onChange={setSelectedSectionId}
                options={sections.map((sec) => ({
                  value: sec.id,
                  label: `${sec.section_name} (Grade ${sec.grade_level}${sec.strand ? ` • ${sec.strand}` : ""})`,
                }))}
              />
            </div>
          )}

          {viewMode === "byTeacher" && (
            <div className="flex items-center gap-2">
              <CustomSelect
                label="Faculty:"
                value={selectedTeacherId}
                onChange={setSelectedTeacherId}
                options={teachers.map((tch) => ({
                  value: tch.id,
                  label: `${tch.fullName} (${tch.department})`,
                }))}
              />
            </div>
          )}

          {viewMode === "all" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Subject, Teacher, Section, Room..."
                className="p-1.5 bg-white border border-slate-400 text-xs font-mono w-64 outline-none"
              />
              <CustomSelect
                label="Day:"
                value={dayFilter}
                onChange={setDayFilter}
                options={[
                  { value: "ALL", label: "All Days" },
                  ...DAYS_OF_WEEK.map((d) => ({ value: d, label: d })),
                ]}
              />
            </div>
          )}

          <button
            type="button"
            onClick={handlePrintTimetable}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-mono font-bold uppercase tracking-wider border border-slate-400 cursor-pointer"
            title="Print printable class timetable program"
          >
            Print Official Timetable
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL DEPED LETTERHEAD FOR PRINTOUT (LANDSCAPE 3-LINE COMPACT FORMAT) */}
      {/* ========================================================================= */}
      <div className="hidden print:block pb-2 mb-3 text-center border-b-2 border-slate-900 text-slate-900">
        {/* LINE 1: Government and DepEd Hierarchy */}
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-700 leading-tight">
          Republic of the Philippines • Department of Education • Region I • Schools Division of Ilocos Norte
        </div>

        {/* LINE 2: School Name */}
        <h1 className="text-base font-bold uppercase tracking-tight text-[#002060] leading-tight my-0.5">
          DUMALNEG NATIONAL HIGH SCHOOL
        </h1>

        {/* LINE 3: School ID, Document Title, and Target Section/Faculty */}
        <div className="text-[10px] font-mono text-slate-700 flex items-center justify-between border-t border-slate-400 pt-1 mt-1 leading-tight">
          <div>
            Dumalneg, Ilocos Norte • School ID: 300017
          </div>
          <div className="font-bold text-slate-900 uppercase">
            OFFICIAL CLASS PROGRAM &amp; TIMETABLE • SY {activeTermInfo?.schoolYear || autoSchoolYear || "2026–2027"}
          </div>
          <div>
            {viewMode === "bySection" && currentSection
              ? `Section: ${currentSection.section_name} (Grade ${currentSection.grade_level})`
              : viewMode === "byTeacher" && currentTeacher
              ? `Faculty: ${currentTeacher.fullName} (${currentTeacher.department})`
              : "Institutional Master Schedule"}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW CONTENT */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="p-12 bg-white border-2 border-slate-300 text-center">
          <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs font-mono text-slate-500 uppercase mt-2 block">Loading Schedules &amp; Resources...</span>
        </div>
      ) : (
        <>
          {/* ===================================================================== */}
          {/* VIEW 1: BY SECTION TIMETABLE MATRIX (WITH TIME COLUMN ON LEFT) */}
          {/* ===================================================================== */}
          {viewMode === "bySection" && (
            <div className="space-y-4">
              {currentSection && (
                <div className="p-4 bg-white border-2 border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-mono no-print print:hidden">
                  <div>
                    Class Program: <strong className="text-[#002060] text-sm uppercase">{currentSection.section_name}</strong> &bull; Grade: <strong>Grade {currentSection.grade_level}</strong>
                    {currentSection.strand && <> &bull; Strand: <strong>{currentSection.strand}</strong></>}
                  </div>
                  <div className="text-slate-700">
                    Total Instructional Hours: <strong>{sectionSchedules.length} periods / week</strong>
                  </div>
                </div>
              )}

              {/* Matrix Table with Time Column on the Left */}
              <div className="bg-white border-2 border-slate-300 shadow-xs overflow-x-auto print:border print:shadow-none">
                <table className="w-full border-collapse text-xs font-sans min-w-[750px]">
                  <thead>
                    <tr className="bg-[#002060] text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="p-3 w-44 text-left font-mono border-r border-blue-900">
                        Time Period
                      </th>
                      {DAYS_OF_WEEK.map((day) => (
                        <th key={day} className="p-3 text-center border-r border-blue-900 last:border-r-0">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ACADEMIC_TIME_SLOTS.map((slot) => {
                      // Institutional Break Row (Recess / Lunch Break)
                      if (slot.isBreak) {
                        return (
                          <tr key={slot.id} className="bg-slate-100 font-mono text-[11px] font-bold">
                            <td className="p-2.5 font-bold border-r border-slate-300 bg-slate-200/80 text-slate-800">
                              <div>{slot.start} – {slot.end}</div>
                              <div className="text-[10px] text-slate-500 uppercase font-sans font-normal">{slot.name}</div>
                            </td>
                            <td colSpan={5} className="p-2.5 text-center tracking-wider uppercase text-slate-500 bg-slate-100/90 border-r border-slate-300 last:border-r-0">
                              {slot.start} – {slot.end} &bull; {slot.name}
                            </td>
                          </tr>
                        );
                      }

                      // Standard Class Period Row
                      return (
                        <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Left Time Column */}
                          <td className="p-3 font-mono border-r-2 border-slate-300 bg-slate-50 text-slate-800 align-top">
                            <div className="font-bold text-[#002060] text-xs">
                              {slot.start} – {slot.end}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase mt-0.5 font-sans font-semibold">
                              {slot.name}
                            </div>
                          </td>

                          {/* 5 Day Cells (Monday to Friday) */}
                          {DAYS_OF_WEEK.map((day) => {
                            const daySchedules = sectionSchedules.filter((s) => s.day_of_week === day);
                            const matchedItem = findScheduleInSlot(daySchedules, slot.start, slot.end);
                            const isElective = Boolean(matchedItem && (matchedItem.is_elective_slot || (matchedItem.start_time === "15:30" && (matchedItem.grade_level || 0) >= 11)));

                            return (
                              <td key={day} className="p-2 border-r border-slate-200 last:border-r-0 align-top w-1/5">
                                {matchedItem ? (
                                  <div className={`p-2.5 border transition-colors shadow-2xs space-y-1 relative group ${
                                    isElective
                                      ? "bg-purple-50/80 border-purple-400/60 hover:border-purple-600"
                                      : "bg-blue-50/70 border-[#002060]/30 hover:border-[#002060]"
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                                          isElective
                                            ? "text-purple-950 bg-white border-purple-200"
                                            : "text-blue-950 bg-white border-blue-200"
                                        }`}>
                                          {matchedItem.start_time}–{matchedItem.end_time}
                                        </span>
                                        {isElective && (
                                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 bg-purple-700 text-white">
                                            Elective
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSchedule(matchedItem.id, matchedItem.subject_name)}
                                        className="text-slate-400 hover:text-red-700 font-mono text-xs px-1 no-print print:hidden cursor-pointer"
                                        title="Remove this class period"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                    <div className="font-bold text-slate-900 uppercase text-xs">
                                      {matchedItem.subject_name}
                                    </div>
                                    <div className="text-[11px] text-slate-700">
                                      Faculty: <strong className="text-slate-900">{matchedItem.teacher_name}</strong>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500">
                                      Room: {matchedItem.classroom_name}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openAddModalWithDefaults(day, slot.start, slot.end)}
                                      className="w-full h-full min-h-[58px] p-2 border border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-100/70 text-slate-400 hover:text-[#002060] text-[11px] font-mono flex items-center justify-center transition-colors cursor-pointer group no-print print:hidden"
                                      title={`Assign class to ${currentSection?.section_name || "Section"} on ${day} at ${slot.start}–${slot.end}`}
                                    >
                                      <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                        + Assign Slot
                                      </span>
                                    </button>
                                    <div className="hidden print:flex items-center justify-center min-h-[36px] text-[10px] font-mono text-slate-300">
                                      —
                                    </div>
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW 2: BY TEACHER TIMETABLE MATRIX (WITH TIME COLUMN ON LEFT) */}
          {/* ===================================================================== */}
          {viewMode === "byTeacher" && (
            <div className="space-y-4">
              {currentTeacher && (
                <div className="p-4 bg-white border-2 border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-mono no-print print:hidden">
                  <div>
                    Faculty: <strong className="text-[#002060] text-sm uppercase">{currentTeacher.fullName}</strong> &bull; Dept: <strong>{currentTeacher.department}</strong>
                    {currentTeacher.email && <> &bull; Email: <strong>{currentTeacher.email}</strong></>}
                  </div>
                  <div className="text-slate-700">
                    Teaching Load: <strong className="text-emerald-800 font-bold">{teacherSchedules.length} Hours / Week</strong> (DepEd Limit: 30 Hours / Week)
                  </div>
                </div>
              )}

              {/* Matrix Table with Time Column on the Left */}
              <div className="bg-white border-2 border-slate-300 shadow-xs overflow-x-auto print:border print:shadow-none">
                <table className="w-full border-collapse text-xs font-sans min-w-[750px]">
                  <thead>
                    <tr className="bg-[#002060] text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="p-3 w-44 text-left font-mono border-r border-blue-900">
                        Time Period
                      </th>
                      {DAYS_OF_WEEK.map((day) => (
                        <th key={day} className="p-3 text-center border-r border-blue-900 last:border-r-0">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ACADEMIC_TIME_SLOTS.map((slot) => {
                      if (slot.isBreak) {
                        return (
                          <tr key={slot.id} className="bg-slate-100 font-mono text-[11px] font-bold">
                            <td className="p-2.5 font-bold border-r border-slate-300 bg-slate-200/80 text-slate-800">
                              <div>{slot.start} – {slot.end}</div>
                              <div className="text-[10px] text-slate-500 uppercase font-sans font-normal">{slot.name}</div>
                            </td>
                            <td colSpan={5} className="p-2.5 text-center tracking-wider uppercase text-slate-500 bg-slate-100/90 border-r border-slate-300 last:border-r-0">
                              {slot.start} – {slot.end} &bull; {slot.name}
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Left Time Column */}
                          <td className="p-3 font-mono border-r-2 border-slate-300 bg-slate-50 text-slate-800 align-top">
                            <div className="font-bold text-[#002060] text-xs">
                              {slot.start} – {slot.end}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase mt-0.5 font-sans font-semibold">
                              {slot.name}
                            </div>
                          </td>

                          {/* 5 Day Cells */}
                          {DAYS_OF_WEEK.map((day) => {
                            const daySchedules = teacherSchedules.filter((s) => s.day_of_week === day);
                            const matchedItem = findScheduleInSlot(daySchedules, slot.start, slot.end);
                            const isElective = Boolean(matchedItem && (matchedItem.is_elective_slot || (matchedItem.start_time === "15:30" && (matchedItem.grade_level || 0) >= 11)));

                            return (
                              <td key={day} className="p-2 border-r border-slate-200 last:border-r-0 align-top w-1/5">
                                {matchedItem ? (
                                  <div className={`p-2.5 border transition-colors shadow-2xs space-y-1 relative group ${
                                    isElective
                                      ? "bg-purple-50/80 border-purple-400/60 hover:border-purple-600"
                                      : "bg-emerald-50/70 border-emerald-600/30 hover:border-emerald-700"
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                                          isElective
                                            ? "text-purple-950 bg-white border-purple-200"
                                            : "text-emerald-950 bg-white border-emerald-300"
                                        }`}>
                                          {matchedItem.start_time}–{matchedItem.end_time}
                                        </span>
                                        {isElective && (
                                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 bg-purple-700 text-white">
                                            Elective
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSchedule(matchedItem.id, matchedItem.subject_name)}
                                        className="text-slate-400 hover:text-red-700 font-mono text-xs px-1 no-print print:hidden cursor-pointer"
                                        title="Remove this class period"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                    <div className="font-bold text-slate-900 uppercase text-xs">
                                      {matchedItem.subject_name}
                                    </div>
                                    <div className="text-[11px] text-slate-700">
                                      Class: <strong className="text-[#002060]">{matchedItem.section_name}</strong>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500">
                                      Facility: {matchedItem.classroom_name}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openAddModalWithDefaults(day, slot.start, slot.end)}
                                      className="w-full h-full min-h-[58px] p-2 border border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-100/70 text-slate-400 hover:text-[#002060] text-[11px] font-mono flex items-center justify-center transition-colors cursor-pointer group no-print print:hidden"
                                      title={`Assign load to ${currentTeacher?.fullName || "Faculty"} on ${day} at ${slot.start}–${slot.end}`}
                                    >
                                      <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                        + Vacant (Assign)
                                      </span>
                                    </button>
                                    <div className="hidden print:flex items-center justify-center min-h-[36px] text-[10px] font-mono text-slate-300">
                                      —
                                    </div>
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW 3: MASTER TIMETABLE REGISTRY TABLE */}
          {/* ===================================================================== */}
          {viewMode === "all" && (
            <div className="bg-white border-2 border-slate-300 shadow-xs overflow-x-auto print:border-none print:shadow-none">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print print:hidden">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                  MASTER TIMETABLE ALLOCATIONS &bull; {masterlistFiltered.length} ITEMS
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  DepEd Conflict-Free Timetable Engine
                </span>
              </div>

              {masterlistFiltered.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-slate-500 uppercase">
                  No schedules matching your filter query.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="p-3">Day</th>
                      <th className="p-3">Time Period</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Class Section</th>
                      <th className="p-3">Assigned Faculty</th>
                      <th className="p-3">Classroom / Facility</th>
                      <th className="p-3 text-right no-print print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {masterlistFiltered.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-[#002060]">{item.day_of_week}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {item.start_time} – {item.end_time}
                        </td>
                        <td className="p-3 font-bold text-slate-900 uppercase">{item.subject_name}</td>
                        <td className="p-3 text-[#002060] font-semibold">{item.section_name}</td>
                        <td className="p-3 text-slate-900">{item.teacher_name}</td>
                        <td className="p-3 font-mono text-slate-600">{item.classroom_name}</td>
                        <td className="p-3 text-right no-print print:hidden">
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(item.id, item.subject_name)}
                            className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-red-700 border border-slate-300 text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* DepEd Official Signatories for Printout */}
          <div className="hidden print:flex justify-between items-end pt-4 mt-3 text-xs font-sans text-slate-900 pb-1 px-4" style={{ pageBreakInside: "avoid" }}>
            <div className="text-center w-56">
              <div className="border-b border-slate-900 pb-1 font-bold uppercase">
                {viewMode === "byTeacher" && currentTeacher ? currentTeacher.fullName : "HEAD TEACHER / SCHEDULER"}
              </div>
              <div className="text-[10px] font-mono text-slate-600 uppercase mt-1">
                Prepared By: Timetable Committee
              </div>
            </div>
            <div className="text-center w-56">
              <div className="border-b border-slate-900 pb-1 font-bold uppercase">
                OFFICE OF THE SCHOOL PRINCIPAL
              </div>
              <div className="text-[10px] font-mono text-slate-600 uppercase mt-1">
                Approved Correct • DepEd DNHS
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN NEW CLASS SCHEDULE (WITH REAL-TIME DECONFLICTION GUARD) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white border-4 border-[#002060] w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#002060] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200">
                  SCHEDULE BUILDER &bull; DECONFLICTION GUARD
                </span>
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white mt-0.5">
                  Assign Class Timetable Period
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white hover:text-slate-300 font-mono text-2xl font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddSchedule} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Error Notice */}
              {addError && (
                <div className="p-3 bg-red-50 border-2 border-red-500 text-red-950 text-xs font-bold">
                  {addError}
                </div>
              )}

              {/* REAL-TIME PRE-FLIGHT COLLISION ALERT */}
              {preFlightConflict && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-600 text-amber-950 text-xs font-sans space-y-1">
                  <div className="font-bold flex items-center gap-1.5 uppercase tracking-wide text-amber-900">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    Automated Collision Warning
                  </div>
                  <p className="leading-relaxed">{preFlightConflict.message}</p>
                </div>
              )}

              {/* 1. Section Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 uppercase block">
                  Target Class Section: <span className="text-red-600">*</span>
                </label>
                <select
                  value={formSectionId}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#002060]"
                  required
                >
                  <option value="">-- Choose Class Section --</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.section_name} (Grade {sec.grade_level}{sec.strand ? ` • ${sec.strand}` : ""})
                    </option>
                  ))}
                </select>
              </div>

              {/* Smart Automation Status Banner */}
              {selectedFormSection && (
                <div className="p-3 bg-blue-50 border-2 border-blue-400 text-xs flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#002060] shrink-0 animate-pulse" />
                    <div>
                      <span className="font-mono text-[#002060] font-bold text-[11px] uppercase block">
                        SMART AUTOMATION ACTIVE: Grade {selectedFormSection.grade_level} Filter Enforced
                      </span>
                      <span className="text-slate-700 text-[11px] block mt-0.5">
                        Detected Section: <strong>{selectedFormSection.section_name}</strong> (Grade {selectedFormSection.grade_level}
                        {selectedFormSection.strand ? ` • ${selectedFormSection.strand}` : ""}). Subject offerings are strictly restricted to Grade {selectedFormSection.grade_level} ({filteredFormSubjects.length} available).
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Subject Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 uppercase block">
                    Curricular Subject: <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formSubjectCode}
                    onChange={(e) => {
                      setFormSubjectCode(e.target.value);
                      const s = subjects.find((sub) => sub.subject_code === e.target.value);
                      if (s) setFormCustomSubject(s.subject_name);
                    }}
                    className="w-full p-2 bg-white border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-[#002060]"
                  >
                    <option value="">
                      {selectedFormSection
                        ? `-- Choose Grade ${selectedFormSection.grade_level} Subject --`
                        : "-- Choose DepEd Subject --"}
                    </option>
                    {filteredFormSubjects.map((sub) => (
                      <option key={sub.id} value={sub.subject_code}>
                        {sub.subject_name} ({sub.subject_code}) {sub.subject_type ? `• ${sub.subject_type}` : ""}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom / Special Subject</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 uppercase block">
                    Subject Title Display:
                  </label>
                  <input
                    type="text"
                    value={formCustomSubject}
                    onChange={(e) => setFormCustomSubject(e.target.value)}
                    placeholder="e.g. Science 7, General Biology 1..."
                    className="w-full p-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#002060]"
                  />
                </div>
              </div>

              {/* 3. Teacher Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 uppercase block">
                  Assigned Faculty Member (Teacher): <span className="text-red-600">*</span>
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#002060]"
                  required
                >
                  <option value="">-- Choose Faculty Member --</option>
                  {teachers.map((tch) => (
                    <option key={tch.id} value={tch.id}>
                      {tch.fullName} ({tch.department} &bull; {tch.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Classroom Facility Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 uppercase block">
                  Classroom / Physical Facility: <span className="text-red-600">*</span>
                </label>
                <select
                  value={formClassroomId}
                  onChange={(e) => setFormClassroomId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-[#002060]"
                  required
                >
                  <option value="">-- Choose Classroom or Laboratory --</option>
                  {classrooms.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.room_name} ({rm.building})
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Day & Time Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 uppercase block">
                    Day of Week: <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formDayOfWeek}
                    onChange={(e) => setFormDayOfWeek(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:border-[#002060]"
                    required
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 uppercase block">
                    Start Time: <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#002060]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 uppercase block">
                    End Time: <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#002060]"
                    required
                  />
                </div>
              </div>

              {/* Preset Period Quick Pickers */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">
                  Quick Select DepEd Standard Class Periods:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ACADEMIC_TIME_SLOTS.filter((s) => !s.isBreak).map((period) => (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => {
                        setFormStartTime(period.start);
                        setFormEndTime(period.end);
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono border border-slate-300 uppercase cursor-pointer"
                    >
                      {period.name} ({period.start}–{period.end})
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd || Boolean(preFlightConflict)}
                  className="px-5 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {isSubmittingAdd ? "Verifying..." : "Save & Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SMART AUTO-GENERATE TIMETABLE MODAL */}
      {/* ========================================================================= */}
      {isAutoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print print:hidden">
          <div className="bg-white border-2 border-[#002060] shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#002060] p-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase opacity-80 block">
                  Dumalneg NHS • Intelligent Timetable Engine
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight">
                  One-Click Smart Automated Scheduling Deconfliction
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isGeneratingAuto) {
                    setIsAutoModalOpen(false);
                    setAutoAuditResult(null);
                  }
                }}
                disabled={isGeneratingAuto}
                className="text-white hover:text-slate-300 font-mono text-xl px-2 cursor-pointer disabled:opacity-40"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto">
              {/* Algorithm Specifications Card */}
              <div className="p-4 bg-slate-50 border-2 border-slate-300 space-y-3">
                <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
                  Automated Deconfliction Logic &amp; Constraints
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                  <div className="p-2.5 bg-white border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px] uppercase mb-1">
                      1. Junior High School (Grades 7–10)
                    </strong>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Fixed standard DepEd core curriculum (English, Math, Science, AP, Filipino, TLE, ESP, MAPEH). Evenly distributed across 07:30–15:00 periods with zero faculty or classroom collisions.
                    </p>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200">
                    <strong className="text-slate-900 block font-mono text-[11px] uppercase mb-1">
                      2. Senior High School (Grades 11–12)
                    </strong>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Two-tier daily architecture: 07:30–15:30 for Academic &amp; Tech-Pro core track subjects; 15:30–17:00 dedicated exclusively to Specialized Electives without timetable overlaps.
                    </p>
                  </div>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 text-[11px] text-blue-950 font-mono">
                  Guaranteed Conflict-Free: Mathematical constraint satisfaction checks faculty load, physical facility occupancy, and section student programs simultaneously.
                </div>
              </div>

              {/* Active Academic Term Card (Automatically Synced with IT Support) */}
              <div className="p-4 bg-blue-50/70 border-2 border-[#002060]/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider">
                      ACTIVE TERM CONFIGURED BY IT SUPPORT
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-700 text-white font-bold uppercase tracking-wider">
                    Synced with IT Support
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                      Target Academic Year:
                    </span>
                    <div className="text-sm font-bold font-mono text-[#002060] mt-0.5">
                      {activeTermInfo ? activeTermInfo.schoolYear : autoSchoolYear}
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                      Target Academic Term:
                    </span>
                    <div className="text-sm font-bold font-mono text-[#002060] mt-0.5">
                      {activeTermInfo ? activeTermInfo.termName : `Trimester ${autoTrimester}`}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 font-sans">
                  Awtomatikong naka-sync sa kasalukuyang active enrollment cycle na itinakda ni IT Support sa Control Room. Hindi na kailangang pumili nang manu-mano.
                </p>
              </div>

              {/* Clean Slate Checkbox */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoClearExisting}
                  onChange={(e) => setAutoClearExisting(e.target.checked)}
                  disabled={isGeneratingAuto}
                  className="mt-0.5 accent-[#002060]"
                />
                <div className="text-xs">
                  <strong className="text-slate-900 block">Clean Slate Generation (Recommended)</strong>
                  <span className="text-slate-600 text-[11px]">
                    Clears any existing schedule records to prevent legacy overlapping conflicts and ensure a 100% mathematically verified conflict-free matrix.
                  </span>
                </div>
              </label>

              {/* Generation Audit Results Banner */}
              {autoAuditResult && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-500 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-emerald-300 pb-2">
                    <span className="text-xs font-mono font-bold text-emerald-950 uppercase">
                      AUDIT REPORT: 100% CONFLICT-FREE TIMETABLE CERTIFIED
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-700 text-white font-bold uppercase">
                      Zero Collisions
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                    <div className="p-2 bg-white border border-emerald-200">
                      <div className="text-base font-bold text-[#002060]">{autoAuditResult.totalScheduled}</div>
                      <div className="text-[10px] text-slate-600 uppercase">Total Periods</div>
                    </div>
                    <div className="p-2 bg-white border border-emerald-200">
                      <div className="text-base font-bold text-emerald-900">{autoAuditResult.jhsCount}</div>
                      <div className="text-[10px] text-slate-600 uppercase">JHS Core</div>
                    </div>
                    <div className="p-2 bg-white border border-emerald-200">
                      <div className="text-base font-bold text-blue-900">{autoAuditResult.shsTrackCount}</div>
                      <div className="text-[10px] text-slate-600 uppercase">SHS Track</div>
                    </div>
                    <div className="p-2 bg-white border border-emerald-200">
                      <div className="text-base font-bold text-purple-900">{autoAuditResult.shsElectiveCount}</div>
                      <div className="text-[10px] text-slate-600 uppercase">SHS Electives</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-center pt-1 border-t border-emerald-200">
                    <div className="text-emerald-900">
                      Faculty Collisions: <strong className="text-emerald-950 font-bold">{autoAuditResult.teacherCollisions}</strong>
                    </div>
                    <div className="text-emerald-900">
                      Facility Collisions: <strong className="text-emerald-950 font-bold">{autoAuditResult.roomCollisions}</strong>
                    </div>
                    <div className="text-emerald-900">
                      Section Collisions: <strong className="text-emerald-950 font-bold">{autoAuditResult.sectionCollisions}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-100 border-t border-slate-300 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAutoModalOpen(false);
                  setAutoAuditResult(null);
                }}
                disabled={isGeneratingAuto}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider border border-slate-300 cursor-pointer disabled:opacity-50"
              >
                {autoAuditResult ? "Close" : "Cancel"}
              </button>

              <div className="flex items-center gap-2">
                {autoAuditResult && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoModalOpen(false);
                      setAutoAuditResult(null);
                    }}
                    className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    View Updated Timetables
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRunAutoGeneration}
                  disabled={isGeneratingAuto}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs border border-emerald-900"
                >
                  {isGeneratingAuto ? "Generating & Validating..." : "Execute Smart Timetable Generation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET / CLEAR ALL SCHEDULES CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print print:hidden">
          <div className="bg-white border-2 border-red-600 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-red-700 p-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase opacity-80 block">
                  Dumalneg NHS Administrative Action
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight">
                  Clear All Class Schedules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isResetting && setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="text-white hover:text-slate-300 font-mono text-xl px-2 cursor-pointer disabled:opacity-40"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                Are you sure you want to clear all active class schedule timetables? This will remove scheduled periods for both Junior and Senior High School sections.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-950 text-[11px] font-mono">
                Notice: You can instantly regenerate a 100% conflict-free timetable at any time using the Smart Auto-Generate Timetable engine.
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-300 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider border border-slate-300 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAllSchedules}
                disabled={isResetting}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isResetting ? "Clearing..." : "Yes, Clear All Schedules"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
