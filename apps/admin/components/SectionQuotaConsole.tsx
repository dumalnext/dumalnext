"use client";

import React, { useState, useEffect } from "react";
import CustomSelect, { CustomSelectOption } from "@/components/CustomSelect";
import { createClient } from "@/lib/supabase/client";

export const SHS_TRACKS = [
  { code: "Academic", name: "Academic Track" },
  { code: "TechPro", name: "Technical-Professional Track (TechPro)" },
  { code: "Elective", name: "Academic Elective Class / Section" },
];

export function extractBaseSectionName(rawName: string, gradeLevel: number, strandOrTrack?: string | null): string {
  if (!rawName) return "";
  let base = rawName.trim();

  // Strip prefixes like "Grade 7 - ", "Grade 11 Academic - ", "Grade 11 Elective - ", "GRADE 11 - HUMSS ", "Grade 11 - "
  base = base.replace(/^(Grade|Gr\.?)\s*\d+\s*(Academic|TechPro|Elective|TVL|STEM|HUMSS|ABM|GAS)?\s*[-–:]*\s*/i, "");

  // Strip old strand codes if present at start
  base = base.replace(/^(Academic|TechPro|Elective|TVL-ICT|TVL-HE|TVL-AFA|TVL|STEM|HUMSS|ABM|GAS)\s*[-–:]*\s*/i, "");

  if (strandOrTrack) {
    const trackPattern = new RegExp(`^${strandOrTrack}\\s*[-–:]*\\s*`, "i");
    base = base.replace(trackPattern, "");
  }

  return base.trim();
}

export function formatSectionFullName(grade: number, rawInput: string, track?: string | null): string {
  if (!rawInput || !rawInput.trim()) return "";
  const trimmed = rawInput.trim();

  let base = trimmed;
  // If user entered Grade prefix, clean it out so we have the pure base name
  if (/^(Grade|Gr\.?)\s*\d+/i.test(trimmed)) {
    base = extractBaseSectionName(trimmed, grade, track);
    if (!base) {
      base = trimmed.replace(/^(Grade|Gr\.?)\s*\d+\s*[-–:]*\s*/i, "").trim();
    }
  } else if (track) {
    const trackPattern = new RegExp(`^${track}\\s*[-–:]*\\s*`, "i");
    base = base.replace(trackPattern, "").trim();
  }

  // Proper title casing if all lowercase (e.g. "rizal" -> "Rizal")
  if (base && base === base.toLowerCase()) {
    base = base
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  if (grade >= 11) {
    if (track === "Elective") {
      return base ? `Grade ${grade} Elective - ${base}` : `Grade ${grade} Elective`;
    }
    const cleanTrack = track === "TechPro" ? "TechPro" : "Academic";
    return base ? `Grade ${grade} ${cleanTrack} - ${base}` : `Grade ${grade} ${cleanTrack}`;
  }

  return base ? `Grade ${grade} - ${base}` : `Grade ${grade}`;
}

export interface SectionDetail {
  id: string;
  section_name: string;
  grade_level: number;
  strand?: string;
  room?: string;
  adviser_name?: string;
  capacity: number;
  enrolledCount: number;
  totalRosterCount?: number;
  school_year?: string;
  isElective?: boolean;
  electiveCode?: string;
  electiveName?: string;
  students?: any[];
}

export interface EnrolledStudent {
  id: string;
  student_id: string; // LRN or student ID
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  gender?: string | null;
  grade_level: number;
  strand?: string | null;
  current_section_id?: string | null;
  contact_number?: string | null;
  barangay?: string | null;
  isEnrolledInActiveTerm?: boolean;
  base_section_name?: string | null;
  base_section_id?: string | null;
}

// Helpers for multi-semester enrollment automation
function extractTermNumber(termStr?: string | null): number {
  if (!termStr) return 0;
  const lower = String(termStr).toLowerCase();
  if (lower.includes("1") || lower.includes("first")) return 1;
  if (lower.includes("2") || lower.includes("second")) return 2;
  if (lower.includes("3") || lower.includes("third")) return 3;
  return 0;
}

function getApplicationTermNumber(app: any): number {
  const fd = app.selected_electives?.[0] || {};
  const rawTerm = (
    fd.term_name ||
    fd.termName ||
    fd.semester ||
    fd.term ||
    fd.targetSemester ||
    app.term_name ||
    app.semester ||
    ""
  );
  const num = extractTermNumber(rawTerm);
  return num !== 0 ? num : 1;
}

function isApplicationInActiveTerm(
  app: any,
  activeSchoolYear: string,
  activeTermNumber: number
): boolean {
  const cleanAppSY = (app.school_year || "").replace("–", "-").trim();
  const cleanActiveSY = (activeSchoolYear || "").replace("–", "-").trim();

  if (cleanActiveSY && cleanAppSY && cleanActiveSY !== cleanAppSY) {
    return false;
  }

  const appTermNum = getApplicationTermNumber(app);
  return appTermNum === activeTermNumber;
}

export interface RegisteredTeacher {
  id: string;
  teacher_id?: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email?: string | null;
  department?: string | null;
  fullName: string;
}

export interface RegisteredClassroom {
  id: string;
  classroomId: string;
  classroom_id: string;
  roomName: string;
  room_name: string;
  building: string;
  capacity: number;
}

export default function SectionQuotaConsole() {
  const supabase = createClient();

  const [sections, setSections] = useState<SectionDetail[]>([]);
  const [electiveSections, setElectiveSections] = useState<SectionDetail[]>([]);
  const [teachersList, setTeachersList] = useState<RegisteredTeacher[]>([]);
  const [classroomsList, setClassroomsList] = useState<RegisteredClassroom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");

  // Add Section Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newSectionName, setNewSectionName] = useState<string>("");
  const [newGradeLevel, setNewGradeLevel] = useState<number>(7);
  const [newStrand, setNewStrand] = useState<string>("Academic");
  const [newCapacity, setNewCapacity] = useState<number>(40);
  const [newRoom, setNewRoom] = useState<string>("");
  const [newAdviser, setNewAdviser] = useState<string>("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);
  const [addError, setAddError] = useState<string>("");

  // Edit Section Modal State
  const [editingSection, setEditingSection] = useState<SectionDetail | null>(null);
  const [editSectionName, setEditSectionName] = useState<string>("");
  const [editGradeLevel, setEditGradeLevel] = useState<number>(7);
  const [editCapacity, setEditCapacity] = useState<number>(40);
  const [editRoom, setEditRoom] = useState<string>("");
  const [editAdviser, setEditAdviser] = useState<string>("");
  const [editStrand, setEditStrand] = useState<string>("Academic");
  const [autoTransferAdviser, setAutoTransferAdviser] = useState<boolean>(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");

  // Delete Section Target Modal State
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<SectionDetail | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState<boolean>(false);

  // Reassign Over-Capacity Override Prompt Modal State
  const [reassignOverridePrompt, setReassignOverridePrompt] = useState<{
    studentId: string;
    newSectionId: string;
    targetSecName: string;
    enrolled: number;
    cap: number;
  } | null>(null);

  // Automated Deconfliction Helper: Check if a teacher is already advising another section
  const getExistingAdvisorySection = (adviserName: string, excludeSectionId?: string): SectionDetail | undefined => {
    if (!adviserName || !adviserName.trim()) return undefined;
    const cleanTarget = adviserName.trim().toLowerCase();
    return sections.find((s) => {
      if (excludeSectionId && s.id === excludeSectionId) return false;
      if (!s.adviser_name) return false;
      return s.adviser_name.trim().toLowerCase() === cleanTarget;
    });
  };

  // Helper to normalize room value to match registered facility format
  const normalizeRoomValue = (val: string) => {
    if (!val || !val.trim()) return "";
    const clean = val.trim();
    const directMatch = classroomsList.find(
      (r) =>
        `${r.room_name} (${r.building})`.toLowerCase() === clean.toLowerCase() ||
        `${r.classroom_id} - ${r.room_name} (${r.building})`.toLowerCase() === clean.toLowerCase()
    );
    if (directMatch) return `${directMatch.room_name} (${directMatch.building})`;

    const partialMatch = classroomsList.find(
      (r) =>
        r.room_name.toLowerCase() === clean.toLowerCase() ||
        r.classroom_id.toLowerCase() === clean.toLowerCase()
    );
    if (partialMatch) return `${partialMatch.room_name} (${partialMatch.building})`;

    return clean;
  };

  // Helper to find the registered classroom details object by room string
  const findClassroomDetails = (roomStr: string) => {
    if (!roomStr || !roomStr.trim()) return undefined;
    const clean = roomStr.trim().toLowerCase();
    return classroomsList.find((r) => {
      const full = `${r.room_name} (${r.building})`.toLowerCase();
      const codeFull = `${r.classroom_id} - ${r.room_name} (${r.building})`.toLowerCase();
      return (
        full === clean ||
        codeFull === clean ||
        r.room_name.toLowerCase() === clean ||
        r.classroom_id.toLowerCase() === clean
      );
    });
  };

  // Group registered classrooms by building
  const classroomsByBuilding = classroomsList.reduce((acc, rm) => {
    const bldg = rm.building ? rm.building.trim() : "Main Academic Building";
    if (!acc[bldg]) acc[bldg] = [];
    acc[bldg].push(rm);
    return acc;
  }, {} as Record<string, RegisteredClassroom[]>);

  // Helper to find which section is currently occupying a room
  const getSectionOccupyingRoom = (roomCandidate: string, excludeSectionId?: string): SectionDetail | undefined => {
    if (!roomCandidate || !roomCandidate.trim()) return undefined;
    const cleanCand = roomCandidate.trim().toLowerCase();
    return sections.find((s) => {
      if (excludeSectionId && s.id === excludeSectionId) return false;
      if (!s.room || !s.room.trim()) return false;
      const sRoom = s.room.trim().toLowerCase();
      return (
        sRoom === cleanCand ||
        sRoom.includes(cleanCand) ||
        cleanCand.includes(sRoom)
      );
    });
  };

  // Class Roster Modal State
  const [selectedRosterSection, setSelectedRosterSection] = useState<SectionDetail | null>(null);
  const [rosterStudents, setRosterStudents] = useState<EnrolledStudent[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [rosterSearch, setRosterSearch] = useState<string>("");
  const [reassigningStudentId, setReassigningStudentId] = useState<string | null>(null);
  const [reassignTargetSectionId, setReassignTargetSectionId] = useState<string>("");
  const [reassignMessage, setReassignMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Status message for actions (add/edit/delete)
  const [statusNotice, setStatusNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active academic term tracking state
  const [activeTerm, setActiveTerm] = useState<{
    schoolYear: string;
    termNumber: number;
    termName: string;
  }>({
    schoolYear: "2026-2027",
    termNumber: 1,
    termName: "Trimester 1",
  });
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
  const [isRemovingStudent, setIsRemovingStudent] = useState<boolean>(false);

  // Fetch all sections
  const fetchSections = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);

      const res = await fetch(`/api/sections?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sections)) {
          setSections(data.sections);
          if (Array.isArray(data.electiveSections)) {
            setElectiveSections(data.electiveSections);
          }
          if (data.activeTerm) {
            setActiveTerm(data.activeTerm);
          }
          return;
        }
      }

      // Fallback directly to Supabase client
      const { data: secData, error: secErr } = await supabase
        .from("sections")
        .select("*")
        .order("grade_level", { ascending: true })
        .order("section_name", { ascending: true });

      if (secErr) {
        console.warn("Notice querying sections:", secErr.message);
      }

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

      // 3. Fallback term tracking & enrollment calculations
      const { data: termsData } = await supabase
        .from("academic_terms")
        .select("schoolYear, termNumber, termName, isActive")
        .order("schoolYear", { ascending: false });

      const active = (termsData || []).find((t: any) => t.isActive);
      const activeSY = (active?.schoolYear || "2026-2027").replace("–", "-").trim();
      const activeNum = Number(active?.termNumber) || 1;
      const activeName = active?.termName || `Trimester ${activeNum}`;
      setActiveTerm({ schoolYear: activeSY, termNumber: activeNum, termName: activeName });

      const { data: appsData } = await supabase
        .from("enrollment_applications")
        .select("id, student_id, school_year, status, selected_electives");

      const enrolledInActiveTermSet = new Set<string>();
      (appsData || []).forEach((app: any) => {
        if (app.status === "Approved" && app.student_id) {
          if (isApplicationInActiveTerm(app, activeSY, activeNum)) {
            enrolledInActiveTermSet.add(app.student_id);
          }
        }
      });

      const { data: studentSecData } = await supabase
        .from("students")
        .select("id, current_section_id")
        .not("current_section_id", "is", null);

      const countMap = new Map<string, number>();
      const totalRosterMap = new Map<string, number>();
      if (studentSecData) {
        studentSecData.forEach((st: any) => {
          if (st.current_section_id) {
            totalRosterMap.set(
              st.current_section_id,
              (totalRosterMap.get(st.current_section_id) || 0) + 1
            );
            if (enrolledInActiveTermSet.has(st.id)) {
              countMap.set(
                st.current_section_id,
                (countMap.get(st.current_section_id) || 0) + 1
              );
            }
          }
        });
      }

      const enriched: SectionDetail[] = Array.from(secMap.values()).map((s: any) => {
        let capacity = Number(s.capacity) || 40;
        if (s.room) {
          const matched = findClassroomDetails(s.room);
          if (matched && matched.capacity) {
            capacity = matched.capacity;
          }
        }
        return {
          id: s.id,
          section_name: s.section_name,
          grade_level: Number(s.grade_level),
          strand: s.strand || undefined,
          room: s.room || undefined,
          adviser_name: s.adviser_name || undefined,
          capacity,
          enrolledCount: countMap.get(s.id) || 0,
          totalRosterCount: totalRosterMap.get(s.id) || 0,
          school_year: s.school_year || activeSY,
        };
      });

      setSections(enriched);
    } catch (err) {
      console.error("Failed to load sections:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch students for a specific section (Class Roster)
  const fetchRoster = async (section: SectionDetail) => {
    setSelectedRosterSection(section);
    setIsLoadingRoster(true);
    setReassignMessage(null);
    setRosterSearch("");
    setRemovingStudentId(null);
    setReassigningStudentId(null);

    try {
      if (section.isElective && Array.isArray(section.students) && section.students.length > 0) {
        setRosterStudents(section.students);
        setIsLoadingRoster(false);
        return;
      }

      // 1. Try API route first
      const res = await fetch(`/api/sections?sectionId=${encodeURIComponent(section.id)}&includeStudents=true&_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.section?.students) {
          setRosterStudents(data.section.students);
          if (data.activeTerm) {
            setActiveTerm(data.activeTerm);
          }
          setIsLoadingRoster(false);
          return;
        }
      }

      // 2. Fallback directly to Supabase client
      const { data: termsData } = await supabase
        .from("academic_terms")
        .select("schoolYear, termNumber, termName, isActive")
        .order("schoolYear", { ascending: false });

      const active = (termsData || []).find((t: any) => t.isActive);
      const activeSY = (active?.schoolYear || activeTerm.schoolYear || "2026-2027").replace("–", "-").trim();
      const activeNum = Number(active?.termNumber) || activeTerm.termNumber || 1;
      const activeName = active?.termName || activeTerm.termName || `Trimester ${activeNum}`;

      const { data: appsData } = await supabase
        .from("enrollment_applications")
        .select("id, student_id, school_year, status, selected_electives");

      const enrolledInActiveTermSet = new Set<string>();
      (appsData || []).forEach((app: any) => {
        if (app.status === "Approved" && app.student_id) {
          if (isApplicationInActiveTerm(app, activeSY, activeNum)) {
            enrolledInActiveTermSet.add(app.student_id);
          }
        }
      });

      const { data: students, error } = await supabase
        .from("students")
        .select("id, student_id, first_name, middle_name, last_name, gender, grade_level, strand, current_section_id, contact_number, barangay")
        .eq("current_section_id", section.id)
        .order("last_name", { ascending: true });

      if (error) {
        console.warn("Notice querying section roster:", error.message);
      }

      const mapped = (students || []).map((st: any) => ({
        ...st,
        isEnrolledInActiveTerm: enrolledInActiveTermSet.has(st.id),
      }));

      setRosterStudents(mapped);
    } catch (err) {
      console.error("Error loading roster:", err);
      setRosterStudents([]);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  // Fetch registered teachers for adviser dropdown
  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, teacher_id, first_name, middle_name, last_name, email, department")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) {
        console.warn("Notice querying teachers for dropdown:", error.message);
        return;
      }

      if (data) {
        const mapped: RegisteredTeacher[] = data.map((t: any) => {
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
        setTeachersList(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch teachers for dropdown:", err);
    }
  };

  // Fetch registered classrooms from IT Support facility directory
  const fetchClassrooms = async () => {
    try {
      const res = await fetch(`/api/it-support/classrooms?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.classrooms)) {
          setClassroomsList(data.classrooms);
          return;
        }
      }

      // Fallback directly to Supabase client
      const { data: dbRooms, error } = await supabase
        .from("classrooms")
        .select("id, classroom_id, room_name, building, capacity")
        .order("building", { ascending: true })
        .order("classroom_id", { ascending: true });

      if (error) {
        console.warn("Notice querying classrooms for dropdown:", error.message);
        return;
      }

      if (dbRooms) {
        const mapped: RegisteredClassroom[] = dbRooms.map((r: any) => ({
          id: r.id,
          classroomId: r.classroom_id || r.classroomId || "",
          classroom_id: r.classroom_id || r.classroomId || "",
          roomName: r.room_name || r.roomName || "",
          room_name: r.room_name || r.roomName || "",
          building: r.building || "Main Academic Building",
          capacity: Number(r.capacity) || 40,
        }));
        setClassroomsList(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch classrooms for dropdown:", err);
    }
  };

  useEffect(() => {
    fetchSections();
    fetchTeachers();
    fetchClassrooms();

    // Real-time subscription to sections, teachers, classrooms, students, and enrollment_applications
    const channel = supabase
      .channel("admin-sections-quota-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sections" },
        () => fetchSections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => {
          fetchSections(true);
          fetchTeachers();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classrooms" },
        () => {
          fetchClassrooms();
          fetchSections(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchSections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => fetchSections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "academic_terms" },
        () => fetchSections(true)
      )
      .subscribe();

    const handleCustomEvent = () => {
      fetchSections(true);
      fetchTeachers();
      fetchClassrooms();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("dumalnext:data-changed", handleCustomEvent);
      window.addEventListener("dumalnext:teacher-data-changed", handleCustomEvent);
      window.addEventListener("dumalnext:admin-data-changed", handleCustomEvent);
      window.addEventListener("dumalnext:classrooms-changed", handleCustomEvent);
    }

    return () => {
      supabase.removeChannel(channel);
      if (typeof window !== "undefined") {
        window.removeEventListener("dumalnext:data-changed", handleCustomEvent);
        window.removeEventListener("dumalnext:teacher-data-changed", handleCustomEvent);
        window.removeEventListener("dumalnext:admin-data-changed", handleCustomEvent);
        window.removeEventListener("dumalnext:classrooms-changed", handleCustomEvent);
      }
    };
  }, []);

  // Strictly use elective sections derived dynamically from Subject Management
  const allElectivesMerged: SectionDetail[] = [...electiveSections];


  // Base regular sections
  const regularSections = sections.filter((sec) => sec.strand !== "Elective" && !sec.isElective);

  // Filter regular sections by grade
  const filteredSections = regularSections.filter((sec) => {
    if (gradeFilter === "ALL") return true;
    return String(sec.grade_level) === String(gradeFilter);
  });

  // JHS Sections (Grades 7 to 10)
  const jhsSections = regularSections.filter((s) => s.grade_level >= 7 && s.grade_level <= 10);
  const g7Sections = jhsSections.filter((s) => s.grade_level === 7);
  const g8Sections = jhsSections.filter((s) => s.grade_level === 8);
  const g9Sections = jhsSections.filter((s) => s.grade_level === 9);
  const g10Sections = jhsSections.filter((s) => s.grade_level === 10);

  // SHS Track Sections (Grades 11 and 12)
  const shsTrackSections = regularSections.filter((s) => s.grade_level >= 11);
  const g11TrackSections = shsTrackSections.filter((s) => s.grade_level === 11);
  const g12TrackSections = shsTrackSections.filter((s) => s.grade_level === 12);

  // SHS Elective Sections
  const g11ElectiveSections = allElectivesMerged.filter((s) => s.grade_level === 11);
  const g12ElectiveSections = allElectivesMerged.filter((s) => s.grade_level === 12);

  // Visibility filters
  const shouldShowJhs = gradeFilter === "ALL" || ["7", "8", "9", "10"].includes(gradeFilter);
  const shouldShowShs = gradeFilter === "ALL" || ["11", "12"].includes(gradeFilter);
  const shouldShowGrade = (g: number) => gradeFilter === "ALL" || String(g) === String(gradeFilter);

  // Total summary
  const totalSections = filteredSections.length + (gradeFilter === "ALL" ? allElectivesMerged.length : allElectivesMerged.filter(e => String(e.grade_level) === String(gradeFilter)).length);
  const totalCapacity = filteredSections.reduce((sum, s) => sum + s.capacity, 0);
  const totalEnrolled = filteredSections.reduce((sum, s) => sum + s.enrolledCount, 0);
  const totalAvailable = Math.max(0, totalCapacity - totalEnrolled);
  const overallPct = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;


  // Open Add Section Modal
  const openAddModal = () => {
    setIsAddModalOpen(true);
    setAddError("");
    const initialGrade = gradeFilter !== "ALL" ? Number(gradeFilter) : 7;
    setNewGradeLevel(initialGrade);
    setNewStrand(initialGrade >= 11 ? "Academic" : "Academic");
    setNewSectionName("");
    setNewCapacity(40);
    setNewRoom("");
    setNewAdviser("");
  };

  // Handle Add Section Submit
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    const fullSectionName = formatSectionFullName(
      newGradeLevel,
      newSectionName,
      newGradeLevel >= 11 ? (newStrand || "Academic") : null
    );

    if (!fullSectionName.trim()) {
      setAddError("Section name cannot be empty. Please enter a section name (e.g. Rizal, A).");
      return;
    }

    if (newCapacity <= 0 || isNaN(newCapacity)) {
      setAddError("Please enter a valid section capacity (minimum 1 seat).");
      return;
    }

    // Automated Deconfliction Guard: Check if the teacher already advises another section
    if (newAdviser.trim()) {
      const conflict = getExistingAdvisorySection(newAdviser);
      if (conflict) {
        setAddError(
          `Adviser Conflict Detected: ${newAdviser.trim()} is already designated as Class Adviser to section ${conflict.section_name} (Grade ${conflict.grade_level}). Under DepEd staffing rules, a faculty member can only advise ONE section per school year. Please select an available teacher or unassign the previous section first.`
        );
        return;
      }
    }

    const matchedRoom = findClassroomDetails(newRoom);
    const finalCapacity = matchedRoom ? matchedRoom.capacity : 40;

    setIsSubmittingAdd(true);

    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_name: fullSectionName,
          grade_level: newGradeLevel,
          strand: newGradeLevel >= 11 ? (newStrand || "Academic") : null,
          capacity: finalCapacity,
          room: newRoom.trim() || null,
          adviser_name: newAdviser.trim() || null,
          school_year: "2026-2027",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create section.");
      }

      setStatusNotice({
        type: "success",
        text: `Section ${fullSectionName} has been successfully created with a fixed capacity of ${finalCapacity} students (governed by IT Facilities).`,
      });

      // Reset form
      setNewSectionName("");
      setNewGradeLevel(7);
      setNewStrand("Academic");
      setNewCapacity(40);
      setNewRoom("");
      setNewAdviser("");
      setIsAddModalOpen(false);

      // Refresh
      await fetchSections(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }
    } catch (err: any) {
      setAddError(err?.message || "Failed to create section. Please check database connection.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit Section Modal
  const openEditModal = (sec: SectionDetail) => {
    setEditingSection(sec);
    const initialGrade = sec.grade_level || 7;
    setEditGradeLevel(initialGrade);

    let initialTrack = "Academic";
    if (sec.strand) {
      const upper = sec.strand.toUpperCase();
      if (upper.includes("TECH") || upper.includes("TVL")) {
        initialTrack = "TechPro";
      } else {
        initialTrack = "Academic";
      }
    }
    setEditStrand(initialTrack);

    const extracted = extractBaseSectionName(sec.section_name, initialGrade, sec.strand);
    setEditSectionName(extracted || sec.section_name);

    const initialRoom = normalizeRoomValue(sec.room || "");
    setEditRoom(initialRoom);
    const matchedClassroom = findClassroomDetails(initialRoom);
    const syncedCapacity = matchedClassroom ? matchedClassroom.capacity : (sec.capacity || 40);
    setEditCapacity(syncedCapacity);
    setEditAdviser(sec.adviser_name || "");
    setEditError("");
    setAutoTransferAdviser(false);
  };

  // Handle Edit Section Submit
  const handleEditSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setEditError("");

    const fullSectionName = formatSectionFullName(
      editGradeLevel,
      editSectionName,
      editGradeLevel >= 11 ? (editStrand || "Academic") : null
    );

    if (!fullSectionName.trim()) {
      setEditError("Section name cannot be empty. Please enter a section name (e.g. Rizal, A).");
      return;
    }

    const matchedRoom = findClassroomDetails(editRoom);
    const finalCapacity = matchedRoom ? matchedRoom.capacity : (editingSection.capacity || 40);

    if (finalCapacity < editingSection.enrolledCount) {
      setEditError(
        `Classroom Capacity Conflict: The selected room capacity (${finalCapacity} seats) is lower than currently enrolled students (${editingSection.enrolledCount} students). Please reassign students or select a classroom with adequate seating.`
      );
      return;
    }

    // Automated Deconfliction Guard
    const conflictSection = editAdviser.trim()
      ? getExistingAdvisorySection(editAdviser, editingSection.id)
      : undefined;

    if (conflictSection && !autoTransferAdviser) {
      setEditError(
        `Adviser Conflict Detected: ${editAdviser.trim()} is already designated as Class Adviser to section ${conflictSection.section_name} (Grade ${conflictSection.grade_level}). Under DepEd staffing policy, a faculty member can only advise ONE section per school year. Please check "1-Click Automated Transfer" below to transfer them automatically, or select an available teacher.`
      );
      return;
    }

    setIsSubmittingEdit(true);

    try {
      // Automation: If autoTransferAdviser is enabled, automatically unassign the teacher from the conflicting section first
      if (conflictSection && autoTransferAdviser) {
        await fetch("/api/sections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: conflictSection.id,
            section_name: conflictSection.section_name,
            grade_level: conflictSection.grade_level,
            capacity: conflictSection.capacity,
            room: conflictSection.room || null,
            adviser_name: null, // Automated unassignment
            strand: conflictSection.grade_level >= 11 ? conflictSection.strand || null : null,
          }),
        });
      }

      const res = await fetch("/api/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSection.id,
          section_name: fullSectionName,
          grade_level: editGradeLevel,
          capacity: finalCapacity,
          room: editRoom.trim() || null,
          adviser_name: editAdviser.trim() || null,
          strand: editGradeLevel >= 11 ? (editStrand || "Academic") : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update section.");
      }

      setStatusNotice({
        type: "success",
        text: conflictSection && autoTransferAdviser
          ? `Automated Advisory Transfer Complete: ${editAdviser.trim()} was unassigned from ${conflictSection.section_name} and successfully assigned as Class Adviser of ${fullSectionName}.`
          : `Section ${fullSectionName} updated successfully (Class Adviser: ${editAdviser.trim() || "Unassigned"}).`,
      });

      setEditingSection(null);
      await fetchSections(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }
    } catch (err: any) {
      setEditError(err?.message || "Failed to update section. Please check database connection.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Section
  const handleConfirmDeleteSection = async () => {
    if (!deleteSectionTarget) return;
    if (deleteSectionTarget.enrolledCount > 0) return;

    setIsDeletingSection(true);
    try {
      const res = await fetch(`/api/sections?id=${deleteSectionTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete section.");
      }

      setStatusNotice({
        type: "success",
        text: `Section ${deleteSectionTarget.section_name} has been removed successfully.`,
      });

      setDeleteSectionTarget(null);
      await fetchSections(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: err?.message || "Failed to delete section.",
      });
      setDeleteSectionTarget(null);
    } finally {
      setIsDeletingSection(false);
    }
  };

  // Execute Reassign Student to another section from Class Roster Modal
  const executeReassignStudent = async (studentId: string, newSectionId: string) => {
    const targetSec = sections.find((s) => s.id === newSectionId);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          current_section_id: newSectionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId);

      if (error) throw error;

      setReassignMessage({
        type: "success",
        text: `Learner successfully reassigned to ${targetSec?.section_name || "new section"}.`,
      });

      setReassignOverridePrompt(null);
      setReassigningStudentId(null);
      setReassignTargetSectionId("");

      // Refresh current roster and section stats
      if (selectedRosterSection) {
        await fetchRoster(selectedRosterSection);
      }
      await fetchSections(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }
    } catch (err: any) {
      setReassignMessage({
        type: "error",
        text: `Reassign Error: ${err?.message || "Failed to transfer student."}`,
      });
      setReassignOverridePrompt(null);
    }
  };

  const handleReassignStudent = async (studentId: string, newSectionId: string) => {
    if (!newSectionId) return;
    setReassignMessage(null);

    const targetSec = sections.find((s) => s.id === newSectionId);
    if (!targetSec) return;

    if (targetSec.enrolledCount >= targetSec.capacity) {
      setReassignOverridePrompt({
        studentId,
        newSectionId,
        targetSecName: targetSec.section_name,
        enrolled: targetSec.enrolledCount,
        cap: targetSec.capacity,
      });
      return;
    }

    await executeReassignStudent(studentId, newSectionId);
  };

  // Handle Remove Student from Section Roster (for learners not enrolled in active semester)
  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    setIsRemovingStudent(true);
    setReassignMessage(null);

    try {
      // 1. Direct Supabase update
      const { error } = await supabase
        .from("students")
        .update({
          current_section_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId);

      if (error) throw error;

      // 2. Also call API route to ensure server cache sync
      try {
        await fetch("/api/sections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ removeStudentId: studentId }),
        });
      } catch {}

      setReassignMessage({
        type: "success",
        text: `Learner ${studentName} was removed from this section roster successfully.`,
      });

      // Refresh current roster and section stats
      if (selectedRosterSection) {
        await fetchRoster(selectedRosterSection);
      }
      await fetchSections(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }

      setRemovingStudentId(null);
    } catch (err: any) {
      setReassignMessage({
        type: "error",
        text: `Remove Error: ${err?.message || "Failed to remove student from section roster."}`,
      });
    } finally {
      setIsRemovingStudent(false);
    }
  };

  // Filter roster students by search query
  const filteredRoster = rosterStudents.filter((st) => {
    if (!rosterSearch.trim()) return true;
    const q = rosterSearch.toLowerCase().trim();
    const lrnMatch = (st.student_id || "").toLowerCase().includes(q);
    const firstNameMatch = (st.first_name || "").toLowerCase().includes(q);
    const lastNameMatch = (st.last_name || "").toLowerCase().includes(q);
    const fullNameMatch = `${st.first_name || ""} ${st.last_name || ""}`.toLowerCase().includes(q);
    const brgyMatch = (st.barangay || "").toLowerCase().includes(q);
    return lrnMatch || firstNameMatch || lastNameMatch || fullNameMatch || brgyMatch;
  });

  const renderSectionCard = (sec: SectionDetail, isElectiveView?: boolean) => {
    const count = sec.enrolledCount || 0;
    const capacity = sec.capacity || 40;
    const pct = Math.min(100, Math.round((count / capacity) * 100));
    const isFull = count >= capacity;

    return (
      <div
        key={sec.id}
        className={`rounded-xl bg-white border p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
          isElectiveView
            ? "border-purple-200/90 hover:border-purple-400 hover:ring-1 hover:ring-purple-200 bg-gradient-to-b from-purple-50/20 via-white to-white"
            : "border-slate-200/90 hover:border-blue-400 hover:ring-1 hover:ring-blue-100"
        }`}
      >
        <div>
          {/* Card Header */}
          <div
            className={`flex items-start justify-between gap-2.5 pb-3.5 border-b ${
              isElectiveView ? "border-purple-100" : "border-slate-100"
            }`}
          >
            <div className="min-w-0 flex-1">
              {isElectiveView && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wide">
                    <svg className="w-3 h-3 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    ELECTIVE: {sec.electiveCode || "SHS-ELEC"}
                  </span>
                </div>
              )}
              <h4 className={`text-base font-extrabold tracking-tight truncate leading-snug ${isElectiveView ? "text-purple-950" : "text-[#002060]"}`} title={sec.section_name}>
                {extractBaseSectionName(sec.section_name, sec.grade_level, sec.strand) || sec.section_name}
              </h4>

              {sec.adviser_name ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-700 mt-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-[11px] text-slate-500 font-medium">{isElectiveView ? "Instructor:" : "Adviser:"}</span>
                  <strong className="text-slate-900 font-bold truncate uppercase text-xs">{sec.adviser_name}</strong>
                </div>
              ) : (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                  <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Needs Faculty Assignment</span>
                </div>
              )}

              {sec.room && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-mono">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="truncate">{sec.room}</span>
                </div>
              )}
            </div>

            {sec.grade_level >= 11 && (
              <span
                className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs shrink-0 ${
                  isElectiveView
                    ? "bg-purple-50 text-purple-800 border-purple-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {isElectiveView
                  ? "Elective"
                  : sec.strand?.toUpperCase().includes("TECH") || sec.strand?.toUpperCase().includes("TVL")
                  ? "TechPro"
                  : "Academic"}
              </span>
            )}
          </div>

          {/* Slots Remaining */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
            <span className="text-slate-500 font-medium">Available Slots:</span>
            <span
              className={`inline-flex items-center font-bold font-mono px-2.5 py-0.5 rounded-full border text-[11px] shadow-2xs ${
                isFull
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              {isFull ? "FULL (0 SLOTS)" : `${capacity - count} SLOTS REMAINING`}
            </span>
          </div>
        </div>

        {/* Card Action Buttons */}
        <div className="pt-3.5 border-t border-slate-100 space-y-2 mt-4">
          <button
            type="button"
            onClick={() => fetchRoster(sec)}
            className={`w-full py-2 px-3 rounded-lg text-white text-xs font-bold tracking-wide text-center transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isElectiveView ? "bg-purple-800 hover:bg-purple-900" : "bg-[#002060] hover:bg-blue-950"
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>View {isElectiveView ? "Elective" : "Class"} Roster</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEditModal(sec)}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title={isElectiveView ? "Assign room or instructor" : "Edit capacity and details"}
            >
              <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>{isElectiveView ? "Assign Facility" : "Edit Capacity"}</span>
            </button>
            <button
              type="button"
              onClick={() => setDeleteSectionTarget(sec)}
              className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Remove section"
            >
              <svg className="w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div id="admin-sections-dashboard" className="space-y-6 font-sans">
        {/* Title & Real-Time Sync Banner */}
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white border-t-4 border-t-amber-400 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/dumalneg-logo.png"
              alt="Dumalneg NHS Seal"
              className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0 hidden sm:block"
            />
            <div>
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
                Section Quota &bull; Classroom Capacity Control
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
                Class Sections &amp; Quota Limits Management
              </h2>
              <p className="text-xs text-blue-100/85 mt-0.5">
                Configure section capacity, create new classes, manage advisers, and inspect live student rosters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            {/* Add Section Button */}
            <button
              type="button"
              onClick={openAddModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold tracking-wide transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <span>+ Add New Class Section</span>
            </button>
          </div>
        </div>

        {/* Global Status Notice */}
        {statusNotice && (
          <div
            className={`p-3.5 rounded-lg border border-l-4 text-xs font-bold flex items-center justify-between gap-2 ${
              statusNotice.type === "success"
                ? "bg-emerald-50 border-emerald-300 border-l-emerald-600 text-emerald-950"
                : "bg-red-50 border-red-300 border-l-red-600 text-red-950"
            }`}
          >
            <span>{statusNotice.type === "success" ? "Notice" : "Error"}: {statusNotice.text}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="text-slate-500 hover:text-slate-900 font-bold text-sm px-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Sections */}
          <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Sections
                </span>
                {isLoading ? (
                  <div className="h-8 w-20 bg-slate-200 animate-pulse rounded-md mt-1" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1">
                    {totalSections}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#002060] flex items-center justify-center border border-blue-100 shrink-0 shadow-2xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-2 pt-2 border-t border-slate-100">
              {gradeFilter === "ALL" ? "All Grades Combined" : `Grade ${gradeFilter} Only`}
            </span>
          </div>

          {/* Total Capacity */}
          <div className="p-4 sm:p-5 bg-white rounded-xl border border-blue-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                  Total Capacity
                </span>
                {isLoading ? (
                  <div className="h-8 w-20 bg-blue-100 animate-pulse rounded-md mt-1" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#002060] mt-1">
                    {totalCapacity}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#002060] flex items-center justify-center border border-blue-200 shrink-0 shadow-2xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <span className="text-[11px] text-blue-700 font-medium block mt-2 pt-2 border-t border-blue-100/60">
              Configured Max Seats
            </span>
          </div>

          {/* Officially Enrolled */}
          <div className="p-4 sm:p-5 bg-white rounded-xl border border-emerald-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Officially Enrolled ({activeTerm.termName})
                </span>
                {isLoading ? (
                  <div className="h-8 w-20 bg-emerald-100 animate-pulse rounded-md mt-1" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-950 mt-1">
                    {totalEnrolled}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0 shadow-2xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-emerald-100/60 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-medium">Capacity Utilized:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {isLoading ? (
                  <span className="inline-block w-8 h-3.5 bg-emerald-200/60 animate-pulse rounded" />
                ) : (
                  `${overallPct}%`
                )}
              </span>
            </div>
          </div>

          {/* Available Slots */}
          <div className="p-4 sm:p-5 bg-white rounded-xl border border-amber-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block">
                  Available Slots
                </span>
                {isLoading ? (
                  <div className="h-8 w-20 bg-amber-100 animate-pulse rounded-md mt-1" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-950 mt-1">
                    {totalAvailable}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0 shadow-2xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
            <span className="text-[11px] text-amber-800 font-medium block mt-2 pt-2 border-t border-amber-100/60">
              Unfilled Seats Remaining
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="w-full sm:w-auto">
            <CustomSelect
              label="Grade Level:"
              value={gradeFilter}
              onChange={setGradeFilter}
              options={[
                { value: "ALL", label: "All Grade Levels" },
                { value: "7", label: "Grade 7" },
                { value: "8", label: "Grade 8" },
                { value: "9", label: "Grade 9" },
                { value: "10", label: "Grade 10" },
                { value: "11", label: "Grade 11 (SHS)" },
                { value: "12", label: "Grade 12 (SHS)" },
              ]}
              fullWidth
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <span>Showing</span>
              {isLoading ? (
              <span className="inline-block w-5 h-3.5 bg-slate-200 animate-pulse rounded mx-0.5 align-middle" />
            ) : (
              <strong className="text-slate-900 font-mono">{filteredSections.length}</strong>
            )}
              <span>section{filteredSections.length === 1 ? "" : "s"}</span>
            </span>
            <button
              type="button"
              onClick={() => fetchSections(false)}
              className="px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Refresh sections"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh List</span>
            </button>
          </div>
        </div>

      {/* Sections Grid */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          {/* Skeleton Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-32 bg-slate-200 rounded" />
              <div className="h-5 w-52 bg-slate-200 rounded" />
            </div>
            <div className="h-7 w-36 bg-slate-200 rounded-lg" />
          </div>

          {/* Skeleton Grade Subgroup */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between bg-slate-50/80 px-3.5 py-2.5 rounded-lg border border-slate-200">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-200 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl bg-white border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2.5 pb-3.5 border-b border-slate-100">
                      <div className="space-y-2 flex-1">
                        <div className="h-5 w-36 bg-slate-200 rounded" />
                        <div className="h-3.5 w-44 bg-slate-100 rounded" />
                        <div className="h-3 w-32 bg-slate-100 rounded" />
                      </div>
                      <div className="h-5 w-16 bg-slate-100 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-3 w-28 bg-slate-100 rounded" />
                        <div className="h-3 w-16 bg-slate-100 rounded" />
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full" />
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                      <div className="h-5 w-28 bg-slate-100 rounded-full" />
                    </div>
                  </div>
                  <div className="pt-3.5 border-t border-slate-100 space-y-2">
                    <div className="h-8 w-full bg-slate-200 rounded-lg" />
                    <div className="flex gap-2">
                      <div className="h-7 flex-1 bg-slate-100 rounded-lg" />
                      <div className="h-7 w-16 bg-slate-100 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : filteredSections.length === 0 && allElectivesMerged.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-800 uppercase block tracking-wider">
            No Sections Found
          </span>
          <p className="text-xs text-slate-500 max-w-md mx-auto">No sections exist for the selected grade filter. Create a new section to begin allocating learners.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-lg bg-[#002060] hover:bg-blue-900 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <span>+ Add Section for {gradeFilter === "ALL" ? "All Grades" : `Grade ${gradeFilter}`}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* ========================================================================= */}
          {/* JUNIOR HIGH SCHOOL (JHS) SECTION BLOCK */}
          {/* ========================================================================= */}
          {shouldShowJhs && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Junior High School (JHS)
                </h3>
              </div>

              {/* Grade 7 Sub-block */}
              {shouldShowGrade(7) && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between bg-slate-50/80 px-3.5 py-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#002060]" />
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                        Grade 7 Sections
                      </h4>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {g7Sections.length} {g7Sections.length === 1 ? "Section" : "Sections"}
                    </span>
                  </div>
                  {g7Sections.length === 0 ? (
                    <div className="p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      No Grade 7 sections created yet. Click "+ Add New Class Section" to register one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {g7Sections.map((sec) => renderSectionCard(sec))}
                    </div>
                  )}
                </div>
              )}

              {/* Grade 8 Sub-block */}
              {shouldShowGrade(8) && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between bg-slate-50/80 px-3.5 py-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#002060]" />
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                        Grade 8 Sections
                      </h4>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {g8Sections.length} {g8Sections.length === 1 ? "Section" : "Sections"}
                    </span>
                  </div>
                  {g8Sections.length === 0 ? (
                    <div className="p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      No Grade 8 sections created yet. Click "+ Add New Class Section" to register one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {g8Sections.map((sec) => renderSectionCard(sec))}
                    </div>
                  )}
                </div>
              )}

              {/* Grade 9 Sub-block */}
              {shouldShowGrade(9) && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between bg-slate-50/80 px-3.5 py-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#002060]" />
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                        Grade 9 Sections
                      </h4>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {g9Sections.length} {g9Sections.length === 1 ? "Section" : "Sections"}
                    </span>
                  </div>
                  {g9Sections.length === 0 ? (
                    <div className="p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      No Grade 9 sections created yet. Click "+ Add New Class Section" to register one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {g9Sections.map((sec) => renderSectionCard(sec))}
                    </div>
                  )}
                </div>
              )}

              {/* Grade 10 Sub-block */}
              {shouldShowGrade(10) && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between bg-slate-50/80 px-3.5 py-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#002060]" />
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                        Grade 10 Sections
                      </h4>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {g10Sections.length} {g10Sections.length === 1 ? "Section" : "Sections"}
                    </span>
                  </div>
                  {g10Sections.length === 0 ? (
                    <div className="p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      No Grade 10 sections created yet. Click "+ Add New Class Section" to register one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {g10Sections.map((sec) => renderSectionCard(sec))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SENIOR HIGH SCHOOL (SHS) SECTION BLOCK */}
          {/* ========================================================================= */}
          {shouldShowShs && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Senior High School (SHS)
                </h3>
              </div>

              {/* Grade 11 Block */}
              {shouldShowGrade(11) && (
                <div className="space-y-6">
                  {/* Grade 11 Track Sections (Academic at Tech-Pro) */}
                  <div className="space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/80">
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-[#002060] uppercase tracking-tight flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#002060]" />
                          Grade 11 Academic &amp; Tech-Pro (Track Sections)
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Primary homeroom cohorts for core curriculum. Students in the same track are classmates here.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#002060] bg-white px-3 py-1 rounded-full border border-blue-200 shadow-2xs self-start sm:self-auto shrink-0">
                        {g11TrackSections.length} {g11TrackSections.length === 1 ? "Track Section" : "Track Sections"}
                      </span>
                    </div>

                    {g11TrackSections.length === 0 ? (
                      <div className="p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                        No Grade 11 track sections found. Click "+ Add New Class Section" to add Academic or TechPro sections.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {g11TrackSections.map((sec) => renderSectionCard(sec))}
                      </div>
                    )}
                  </div>

                  {/* Electives Subheading -> Grade 11 mga section ulit */}
                  <div className="space-y-3.5 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200/80">
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-purple-950 uppercase tracking-tight flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-600" />
                          Electives — Grade 11 Elective Sections
                        </h4>
                        <p className="text-[11px] text-purple-900 mt-0.5">
                          Specialized subject sections. Students taking the same elective are classmates during elective periods.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-purple-900 bg-white px-3 py-1 rounded-full border border-purple-200 shadow-2xs self-start sm:self-auto shrink-0">
                        {g11ElectiveSections.length} {g11ElectiveSections.length === 1 ? "Elective Class" : "Elective Classes"}
                      </span>
                    </div>

                    {g11ElectiveSections.length === 0 ? (
                      <div className="p-6 bg-purple-50/40 rounded-xl border border-dashed border-purple-300 text-center text-xs text-purple-800">
                        No Grade 11 elective classes currently populated. As SHS students select electives during enrollment, sections appear here automatically.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {g11ElectiveSections.map((sec) => renderSectionCard(sec, true))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Grade 12 Block */}
              {shouldShowGrade(12) && (
                <div className="space-y-6">
                  {/* Grade 12 Track Sections (Academic at Tech-Pro) */}
                  <div className="space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/80">
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-[#002060] uppercase tracking-tight flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#002060]" />
                          Grade 12 Academic &amp; Tech-Pro (Track Sections)
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Primary homeroom cohorts for core curriculum. Students in the same track are classmates here.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#002060] bg-white px-3 py-1 rounded-full border border-blue-200 shadow-2xs self-start sm:self-auto shrink-0">
                        {g12TrackSections.length} {g12TrackSections.length === 1 ? "Track Section" : "Track Sections"}
                      </span>
                    </div>

                    {g12TrackSections.length === 0 ? (
                      <div className="p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                        No Grade 12 track sections found. Click "+ Add New Class Section" to add Academic or TechPro sections.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {g12TrackSections.map((sec) => renderSectionCard(sec))}
                      </div>
                    )}
                  </div>

                  {/* Electives Subheading -> Grade 12 mga section ulit */}
                  <div className="space-y-3.5 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200/80">
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-purple-950 uppercase tracking-tight flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-600" />
                          Electives — Grade 12 Elective Sections
                        </h4>
                        <p className="text-[11px] text-purple-900 mt-0.5">
                          Specialized subject sections. Students taking the same elective are classmates during elective periods.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-purple-900 bg-white px-3 py-1 rounded-full border border-purple-200 shadow-2xs self-start sm:self-auto shrink-0">
                        {g12ElectiveSections.length} {g12ElectiveSections.length === 1 ? "Elective Class" : "Elective Classes"}
                      </span>
                    </div>

                    {g12ElectiveSections.length === 0 ? (
                      <div className="p-6 bg-purple-50/40 rounded-xl border border-dashed border-purple-300 text-center text-xs text-purple-800">
                        No Grade 12 elective classes currently populated. As SHS students select electives during enrollment, sections appear here automatically.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {g12ElectiveSections.map((sec) => renderSectionCard(sec, true))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* ADD SECTION MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
            <div className="bg-[#002060] text-white p-4 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200 block">
                  SECTION MANAGEMENT
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-white mt-0.5">
                  Create New Class Section
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white hover:text-slate-300 font-mono text-xl font-bold px-2 py-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSection} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 stable-gutter custom-scrollbar">
              {addError && (
                <div className="p-2.5 bg-red-50 border border-red-400 text-red-900 font-bold">
                  Error: {addError}
                </div>
              )}

              {/* 1. Grade Level & Track Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Grade Level <span className="text-red-600">*</span>
                  </label>
                  <CustomSelect
                    fullWidth
                    value={String(newGradeLevel)}
                    onChange={(val) => {
                      const g = Number(val);
                      setNewGradeLevel(g);
                      if (g >= 11 && !newStrand) {
                        setNewStrand("Academic");
                      }
                    }}
                    options={[
                      { value: "7", label: "Grade 7", badge: "JHS", sublabel: "Junior High School" },
                      { value: "8", label: "Grade 8", badge: "JHS", sublabel: "Junior High School" },
                      { value: "9", label: "Grade 9", badge: "JHS", sublabel: "Junior High School" },
                      { value: "10", label: "Grade 10", badge: "JHS", sublabel: "Junior High School" },
                      { value: "11", label: "Grade 11", badge: "SHS", sublabel: "Senior High School" },
                      { value: "12", label: "Grade 12", badge: "SHS", sublabel: "Senior High School" },
                    ]}
                  />
                </div>

                {newGradeLevel >= 11 ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                      Senior High School Track <span className="text-red-600">*</span>
                    </label>
                    <CustomSelect
                      fullWidth
                      value={newStrand || "Academic"}
                      onChange={(val) => setNewStrand(val)}
                      options={SHS_TRACKS.map((t) => ({
                        value: t.code,
                        label: t.name,
                        badge: t.code,
                      }))}
                    />
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex flex-col justify-center">
                    <span className="font-bold text-slate-700">Junior High School</span>
                    <span className="text-slate-500">General Standard Curriculum (No Specialized Strand)</span>
                  </div>
                )}
              </div>

              {/* 2. Section Name Input with Live Computed Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-900 uppercase">
                    Section Name <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">
                    (e.g. Rizal, Bonifacio, Luna, A)
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder={newGradeLevel >= 11 ? "e.g. A, B, Rizal, or Bonifacio" : "e.g. Rizal, Bonifacio, or Aguinaldo"}
                  className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] outline-none"
                />
                <div className="mt-1.5 p-2 bg-blue-50/60 border border-blue-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-mono text-[11px] uppercase">
                    Saved Section Name:
                  </span>
                  <strong className="font-mono font-bold text-[#002060] text-xs">
                    {formatSectionFullName(
                      newGradeLevel,
                      newSectionName,
                      newGradeLevel >= 11 ? (newStrand || "Academic") : null
                    ) || "Enter section name above"}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-900 uppercase">
                      Classroom &amp; Building <span className="text-slate-500 font-normal">(IT Facilities)</span>
                    </label>
                    <span className="text-[10px] font-mono text-[#002060] uppercase">
                      IT Facilities: {classroomsList.length} Rooms
                    </span>
                  </div>
                  <CustomSelect
                    fullWidth
                    placeholder="-- Select Classroom / Room (From IT Facilities) --"
                    value={newRoom}
                    onChange={(selectedVal) => {
                      setNewRoom(selectedVal);
                      const matched = findClassroomDetails(selectedVal);
                      if (matched) {
                        setNewCapacity(matched.capacity);
                      }
                    }}
                    options={[
                      { value: "", label: "-- Select Classroom / Room (From IT Facilities) --" },
                      ...Object.entries(classroomsByBuilding).flatMap(([bldg, rooms]) =>
                        rooms.map((rm) => {
                          const optionVal = `${rm.room_name} (${rm.building})`;
                          const occupyingSec = getSectionOccupyingRoom(optionVal);
                          const isOccupied = Boolean(occupyingSec);
                          return {
                            value: optionVal,
                            label: `${rm.classroom_id ? `${rm.classroom_id} • ` : ""}${rm.room_name}`,
                            category: `BUILDING: ${bldg.toUpperCase()}`,
                            badge: occupyingSec ? `OCCUPIED: ${occupyingSec.section_name}` : "AVAILABLE",
                            sublabel: `Max Capacity: ${rm.capacity} seats`,
                          };
                        })
                      ),
                    ]}
                  />
                  {classroomsList.length === 0 ? (
                    <p className="text-[11px] text-amber-700 mt-1">
                      No classrooms registered in IT Support facilities yet.
                    </p>
                  ) : newRoom ? (
                    (() => {
                      const rmDetails = findClassroomDetails(newRoom);
                      if (!rmDetails) return null;
                      return (
                        <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 text-[11px] text-blue-950 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#002060] uppercase">
                              {rmDetails.classroom_id}: {rmDetails.room_name}
                            </span>
                            <span className="font-mono font-bold">
                              Seating: {rmDetails.capacity} seats
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Location: <strong>{rmDetails.building}</strong>
                          </div>
                        </div>
                      );
                    })()
                  ) : null}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-900 uppercase">
                      Class Adviser / Teacher
                    </label>
                    <span className="text-[10px] font-mono text-[#002060] uppercase">
                      Registered Faculty: {teachersList.length}
                    </span>
                  </div>
                  <CustomSelect
                    fullWidth
                    placeholder="-- Select Registered Teacher (Optional) --"
                    value={newAdviser}
                    onChange={(val) => setNewAdviser(val)}
                    options={[
                      { value: "", label: "-- Select Registered Teacher (Optional) --" },
                      ...teachersList.map((t) => {
                        const alreadyAssignedSec = sections.find(
                          (s) => s.adviser_name && s.adviser_name.trim().toLowerCase() === t.fullName.toLowerCase()
                        );
                        return {
                          value: t.fullName,
                          label: t.fullName,
                          sublabel: t.email || undefined,
                          badge: alreadyAssignedSec
                            ? `ADVISING: ${alreadyAssignedSec.section_name}`
                            : "AVAILABLE",
                        };
                      }),
                    ]}
                  />
                  {teachersList.length === 0 && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      No registered faculty accounts found in database.
                    </p>
                  )}
                  {(() => {
                    const conflict = getExistingAdvisorySection(newAdviser);
                    if (!conflict) return null;
                    return (
                      <div className="mt-2 p-2.5 bg-amber-50 border border-amber-400 text-xs text-amber-950 space-y-1">
                        <span className="font-mono font-bold text-amber-900 uppercase block text-[11px]">
                          DECONFLICTION ALERT: SINGLE-ADVISER RULE
                        </span>
                        <p>
                          <strong>{newAdviser}</strong> is already designated as Class Adviser to <strong>{conflict.section_name}</strong> (Grade {conflict.grade_level}).
                        </p>
                        <p className="text-[11px] text-amber-800">
                          A faculty member can only be assigned to one section per school year. Please select an available teacher or reassign the previous section.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Section Capacity (Fixed & Governed by IT Support physical room) */}
              {(() => {
                const matchedRoom = findClassroomDetails(newRoom);
                const effectiveCapacity = matchedRoom ? matchedRoom.capacity : 40;
                return (
                  <div className="p-3.5 bg-slate-50 border-2 border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 uppercase">
                          Section Capacity (Allowed Seats)
                        </span>
                        {matchedRoom ? (
                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-950 px-2 py-0.5 border border-emerald-400 uppercase">
                            FIXED BY IT FACILITY: {matchedRoom.classroom_id || matchedRoom.room_name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-950 px-2 py-0.5 border border-amber-300 uppercase">
                            STANDARD QUOTA: UNASSIGNED ROOM
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {matchedRoom ? (
                          <span>
                            Classroom seating limit is <strong>automatically locked and fixed</strong> by the IT Support Facility Registry to ensure zero student overcrowding.
                          </span>
                        ) : (
                          <span>
                            Standard DepEd default quota is 40 seats. Select a registered classroom above to lock to its physical IT room capacity.
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-left sm:text-right bg-white p-2.5 sm:px-4 border border-slate-300 min-w-[120px]">
                      <span className="text-2xl sm:text-3xl font-mono font-bold text-[#002060] block leading-tight">
                        {effectiveCapacity}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                        Maximum Seats
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer text-center order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer text-center order-1 sm:order-2"
                >
                  {isSubmittingAdd ? "Saving Section..." : "Save Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT SECTION MODAL (CAPACITY & DETAILS) */}
      {/* ========================================================================= */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
            <div className="bg-[#002060] text-white p-4 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200 block">
                  EDIT SECTION CAPACITY &amp; DETAILS
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-white mt-0.5">
                  {editingSection.section_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="text-white hover:text-slate-300 font-mono text-xl font-bold px-2 py-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSection} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 stable-gutter custom-scrollbar">
              {editError && (
                <div className="p-2.5 bg-red-50 border border-red-400 text-red-900 font-bold">
                  Error: {editError}
                </div>
              )}

              {/* Current Enrollment Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between">
                <span>Currently Enrolled Students:</span>
                <strong className="font-mono font-bold text-[#002060]">
                  {editingSection.enrolledCount} Students
                </strong>
              </div>

              {/* 1. Grade Level & Track Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Grade Level <span className="text-red-600">*</span>
                  </label>
                  <CustomSelect
                    fullWidth
                    value={String(editGradeLevel)}
                    onChange={(val) => {
                      const g = Number(val);
                      setEditGradeLevel(g);
                      if (g >= 11 && !editStrand) {
                        setEditStrand("Academic");
                      }
                    }}
                    options={[
                      { value: "7", label: "Grade 7", badge: "JHS", sublabel: "Junior High School" },
                      { value: "8", label: "Grade 8", badge: "JHS", sublabel: "Junior High School" },
                      { value: "9", label: "Grade 9", badge: "JHS", sublabel: "Junior High School" },
                      { value: "10", label: "Grade 10", badge: "JHS", sublabel: "Junior High School" },
                      { value: "11", label: "Grade 11", badge: "SHS", sublabel: "Senior High School" },
                      { value: "12", label: "Grade 12", badge: "SHS", sublabel: "Senior High School" },
                    ]}
                  />
                </div>

                {editGradeLevel >= 11 ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                      Senior High School Track <span className="text-red-600">*</span>
                    </label>
                    <CustomSelect
                      fullWidth
                      value={editStrand || "Academic"}
                      onChange={(val) => setEditStrand(val)}
                      options={SHS_TRACKS.map((t) => ({
                        value: t.code,
                        label: t.name,
                        badge: t.code,
                      }))}
                    />
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex flex-col justify-center">
                    <span className="font-bold text-slate-700">Junior High School</span>
                    <span className="text-slate-500">General Standard Curriculum (No Specialized Strand)</span>
                  </div>
                )}
              </div>

              {/* 2. Section Name Input with Live Computed Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-900 uppercase">
                    Section Name <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">
                    (e.g. Rizal, Bonifacio, Luna, A)
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={editSectionName}
                  onChange={(e) => setEditSectionName(e.target.value)}
                  placeholder={editGradeLevel >= 11 ? "e.g. A, B, Rizal, or Bonifacio" : "e.g. Rizal, Bonifacio, or Aguinaldo"}
                  className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] outline-none"
                />
                <div className="mt-1.5 p-2 bg-blue-50/60 border border-blue-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-mono text-[11px] uppercase">
                    Saved Section Name:
                  </span>
                  <strong className="font-mono font-bold text-[#002060] text-xs">
                    {formatSectionFullName(
                      editGradeLevel,
                      editSectionName,
                      editGradeLevel >= 11 ? (editStrand || "Academic") : null
                    ) || "Enter section name above"}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-900 uppercase">
                      Classroom &amp; Building <span className="text-slate-500 font-normal">(IT Facilities)</span>
                    </label>
                    <span className="text-[10px] font-mono text-[#002060] uppercase">
                      IT Facilities: {classroomsList.length} Rooms
                    </span>
                  </div>
                  <CustomSelect
                    fullWidth
                    placeholder="-- Select Classroom / Room (From IT Facilities) --"
                    value={editRoom}
                    onChange={(selectedVal) => {
                      setEditRoom(selectedVal);
                      const matched = findClassroomDetails(selectedVal);
                      if (matched) {
                        setEditCapacity(matched.capacity);
                      }
                    }}
                    options={[
                      { value: "", label: "-- Select Classroom / Room (From IT Facilities) --" },
                      ...(editRoom &&
                      !classroomsList.some((r) => {
                        const standard = `${r.room_name} (${r.building})`.toLowerCase();
                        return (
                          standard === editRoom.toLowerCase() ||
                          r.room_name.toLowerCase() === editRoom.toLowerCase() ||
                          r.classroom_id.toLowerCase() === editRoom.toLowerCase()
                        );
                      })
                        ? [
                            {
                              value: editRoom,
                              label: `${editRoom} (Current / Unlisted Room)`,
                              badge: "CURRENT",
                            },
                          ]
                        : []),
                      ...Object.entries(classroomsByBuilding).flatMap(([bldg, rooms]) =>
                        rooms.map((rm) => {
                          const optionVal = `${rm.room_name} (${rm.building})`;
                          const occupyingSec = getSectionOccupyingRoom(optionVal, editingSection?.id);
                          const isCurrent =
                            editingSection &&
                            editingSection.room &&
                            (editingSection.room.toLowerCase() === optionVal.toLowerCase() ||
                              editingSection.room.toLowerCase() === rm.room_name.toLowerCase() ||
                              editingSection.room.toLowerCase() === rm.classroom_id.toLowerCase());

                          const statusBadge = isCurrent
                            ? "CURRENT ROOM"
                            : occupyingSec
                            ? `ASSIGNED: ${occupyingSec.section_name}`
                            : "AVAILABLE";

                          return {
                            value: optionVal,
                            label: `${rm.classroom_id ? `${rm.classroom_id} • ` : ""}${rm.room_name}`,
                            category: `BUILDING: ${bldg.toUpperCase()}`,
                            badge: statusBadge,
                            sublabel: `Max Capacity: ${rm.capacity} seats`,
                          };
                        })
                      ),
                    ]}
                  />
                  {classroomsList.length === 0 ? (
                    <p className="text-[11px] text-amber-700 mt-1">
                      No classrooms registered in IT Support facilities yet.
                    </p>
                  ) : editRoom ? (
                    (() => {
                      const rmDetails = findClassroomDetails(editRoom);
                      if (!rmDetails) return null;
                      return (
                        <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 text-[11px] text-blue-950 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#002060] uppercase">
                              {rmDetails.classroom_id}: {rmDetails.room_name}
                            </span>
                            <span className="font-mono font-bold">
                              Seating: {rmDetails.capacity} seats
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Location: <strong>{rmDetails.building}</strong>
                          </div>
                        </div>
                      );
                    })()
                  ) : null}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-900 uppercase">
                      Class Adviser / Teacher
                    </label>
                    <span className="text-[10px] font-mono text-[#002060] uppercase">
                      Registered Faculty: {teachersList.length}
                    </span>
                  </div>
                  <CustomSelect
                    fullWidth
                    placeholder="-- Select Registered Teacher (Unassigned) --"
                    value={editAdviser}
                    onChange={(val) => {
                      setEditAdviser(val);
                      setAutoTransferAdviser(false);
                    }}
                    options={[
                      { value: "", label: "-- Select Registered Teacher (Unassigned) --" },
                      ...(editAdviser && !teachersList.some((t) => t.fullName === editAdviser)
                        ? [
                            {
                              value: editAdviser,
                              label: `${editAdviser} (Current Adviser)`,
                              badge: "CURRENT",
                            },
                          ]
                        : []),
                      ...teachersList.map((t) => {
                        const assignedSec = sections.find(
                          (s) => s.adviser_name && s.adviser_name.trim().toLowerCase() === t.fullName.toLowerCase()
                        );
                        const isCurrent = editingSection && assignedSec && assignedSec.id === editingSection.id;
                        const statusBadge = isCurrent
                          ? "CURRENT ADVISER"
                          : assignedSec
                          ? `ADVISING: ${assignedSec.section_name}`
                          : "AVAILABLE";

                        return {
                          value: t.fullName,
                          label: t.fullName,
                          sublabel: t.email || undefined,
                          badge: statusBadge,
                        };
                      }),
                    ]}
                  />
                  {(() => {
                    const conflict = getExistingAdvisorySection(editAdviser, editingSection?.id);
                    if (!conflict) return null;
                    return (
                      <div className="mt-2 p-3 bg-amber-50 border-2 border-amber-400 text-xs text-amber-950 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-900 uppercase text-[11px]">
                            AUTOMATED DECONFLICTION ALERT
                          </span>
                          <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.5 font-bold uppercase font-mono">
                            Adviser Conflict
                          </span>
                        </div>
                        <p>
                          <strong>{editAdviser}</strong> is currently assigned as Class Adviser to <strong>{conflict.section_name}</strong> (Grade {conflict.grade_level}).
                        </p>
                        <div className="pt-2 border-t border-amber-200">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoTransferAdviser}
                              onChange={(e) => setAutoTransferAdviser(e.target.checked)}
                              className="mt-0.5 accent-[#002060]"
                            />
                            <span className="text-[11px] font-medium leading-tight text-slate-900">
                              <strong className="text-[#002060] uppercase block">
                                1-Click Automated Transfer
                              </strong>
                              Automatically unassign <strong>{editAdviser}</strong> from <u>{conflict.section_name}</u> and designate as Class Adviser for <u>{editSectionName || editingSection?.section_name}</u> upon saving.
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Section Capacity (Fixed & Governed by IT Support physical room) */}
              {(() => {
                const matchedRoom = findClassroomDetails(editRoom);
                const effectiveCapacity = matchedRoom ? matchedRoom.capacity : (editingSection.capacity || 40);
                return (
                  <div className="p-3.5 bg-slate-50 border-2 border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 uppercase">
                          Section Capacity (Allowed Seats)
                        </span>
                        {matchedRoom ? (
                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-950 px-2 py-0.5 border border-emerald-400 uppercase">
                            FIXED BY IT FACILITY: {matchedRoom.classroom_id || matchedRoom.room_name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-950 px-2 py-0.5 border border-amber-300 uppercase">
                            STANDARD QUOTA: UNASSIGNED ROOM
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {matchedRoom ? (
                          <span>
                            Classroom seating limit is <strong>automatically locked and fixed</strong> by the IT Support Facility Registry ({matchedRoom.room_name}, {matchedRoom.building}).
                          </span>
                        ) : (
                          <span>
                            Standard DepEd default quota. Select a registered classroom above to lock to its physical IT room capacity.
                          </span>
                        )}
                      </p>
                      <div className="mt-1 text-[11px] font-mono text-slate-500">
                        Currently enrolled learners: <strong className="text-slate-900">{editingSection.enrolledCount}</strong> students.
                      </div>
                    </div>

                    <div className="shrink-0 text-left sm:text-right bg-white p-2.5 sm:px-4 border border-slate-300 min-w-[120px]">
                      <span className="text-2xl sm:text-3xl font-mono font-bold text-[#002060] block leading-tight">
                        {effectiveCapacity}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                        Maximum Seats
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer text-center order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer text-center order-1 sm:order-2"
                >
                  {isSubmittingEdit ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLASS ROSTER / STUDENT LIST MODAL */}
      {/* ========================================================================= */}
      {selectedRosterSection && (
        <div className="roster-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
          <div className="roster-modal-container bg-white rounded-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* DepEd Official Letterhead for Printout */}
            <div className="hidden print:block p-6 text-center border-b-2 border-slate-900 text-slate-900">
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
                  <strong>OFFICIAL CLASS SECTION ROSTER</strong> • SY 2025–2026
                </div>
                <div>
                  Section: <strong>{selectedRosterSection.section_name}</strong> (Grade {selectedRosterSection.grade_level}{selectedRosterSection.grade_level >= 11 && selectedRosterSection.strand ? ` • ${selectedRosterSection.strand === "TechPro" || selectedRosterSection.strand.toUpperCase().includes("TVL") ? "TechPro" : "Academic"}` : ""})
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <div>Room: <strong>{selectedRosterSection.room || "Main Building"}</strong></div>
                <div>Class Adviser: <strong>{selectedRosterSection.adviser_name || "Unassigned"}</strong></div>
                <div>Total Enrolled: <strong>{rosterStudents.length} / {selectedRosterSection.capacity}</strong></div>
              </div>
            </div>

            {/* Portrait Print Styling for Roster */}
            <style dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  @page {
                    size: portrait !important;
                    margin: 10mm 15mm 15mm 15mm !important;
                  }
                }
              `
            }} />

            {/* Modal Header (Screen Only) */}
            <div className="no-print print:hidden bg-[#002060] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200">
                    OFFICIAL CLASS ROSTER
                  </span>
                  <span className="text-[10px] font-mono bg-blue-900 border border-blue-400/40 px-2 py-0.5 font-bold">
                    GRADE {selectedRosterSection.grade_level} {selectedRosterSection.grade_level >= 11 && selectedRosterSection.strand ? `• ${selectedRosterSection.strand === "TechPro" || selectedRosterSection.strand.toUpperCase().includes("TVL") ? "TechPro" : "Academic"}` : ""}
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-950 border border-emerald-400/50 text-emerald-200 px-2 py-0.5 font-bold uppercase">
                    {activeTerm.termName} &bull; S.Y. {activeTerm.schoolYear}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
                  {selectedRosterSection.section_name}
                </h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  Capacity: {rosterStudents.filter((s) => s.isEnrolledInActiveTerm).length} / {selectedRosterSection.capacity} Students Enrolled &bull; {selectedRosterSection.room ? `Room: ${selectedRosterSection.room}` : "Main Building"} &bull; Adviser: {selectedRosterSection.adviser_name || "Unassigned"}
                </p>
              </div>

              <div className="flex items-center gap-2 no-print print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-mono font-bold border border-blue-400 uppercase cursor-pointer"
                  title="Print official class roster"
                >
                  Print Class Roster
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRosterSection(null)}
                  className="text-white hover:text-slate-300 font-mono text-2xl font-bold px-2 py-1 cursor-pointer"
                  title="Close roster"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Roster Search & Action Feedback (Screen Only) */}
            <div className="no-print print:hidden p-4 bg-slate-50 border-b border-slate-300 space-y-3 shrink-0">
              {reassignMessage && (
                <div
                  className={`p-2.5 border text-xs font-bold flex items-center justify-between ${
                    reassignMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950"
                      : "bg-red-50 border-red-500 text-red-950"
                  }`}
                >
                  <span>{reassignMessage.text}</span>
                  <button
                    type="button"
                    onClick={() => setReassignMessage(null)}
                    className="font-mono text-sm px-1 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 sm:max-w-xs">
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search Student Name or LRN..."
                    className="w-full pl-3 pr-7 py-1.5 bg-white border border-slate-300 text-xs font-mono font-bold focus:border-[#002060] outline-none"
                  />
                  {rosterSearch && (
                    <button
                      type="button"
                      onClick={() => setRosterSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono">
                  <span>
                    Enrolled Count: <strong>{rosterStudents.filter((s) => s.isEnrolledInActiveTerm).length}</strong> / <strong>{selectedRosterSection.capacity}</strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Available Slots: <strong>{Math.max(0, selectedRosterSection.capacity - rosterStudents.filter((s) => s.isEnrolledInActiveTerm).length)}</strong>
                  </span>
                  {rosterStudents.length > rosterStudents.filter((s) => s.isEnrolledInActiveTerm).length && (
                    <>
                      <span>&bull;</span>
                      <span className="text-amber-800 font-bold">
                        Un-enrolled: <strong>{rosterStudents.length - rosterStudents.filter((s) => s.isEnrolledInActiveTerm).length}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0 print:m-0 stable-gutter custom-scrollbar">
              {isLoadingRoster ? (
                <div className="space-y-3 p-4 animate-pulse">
                  <div className="h-10 bg-slate-100 rounded-lg w-full" />
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-8 bg-slate-200 rounded" />
                        <div className="h-4 w-36 bg-slate-200 rounded" />
                        <div className="h-4 w-28 bg-slate-100 rounded" />
                      </div>
                      <div className="h-6 w-20 bg-slate-200 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="p-12 text-center space-y-2 bg-slate-50 border-2 border-dashed border-slate-300">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
                    {rosterSearch ? "NO MATCHING STUDENTS IN THIS SECTION" : "NO STUDENTS CURRENTLY ENROLLED IN THIS SECTION"}
                  </span>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    {rosterSearch
                      ? "Try searching for a different name or LRN."
                      : `No learners have been assigned to ${selectedRosterSection.section_name} yet. To assign learners, go to Enrollment Adjudication and select this section when approving applications.`}
                  </p>
                </div>
              ) : (
                <div className="border-2 border-slate-300 overflow-x-auto shadow-xs print:border-none print:shadow-none">
                  <table className="w-full min-w-[700px] text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">12-Digit LRN</th>
                        <th className="p-3">Learner Full Name</th>
                        {selectedRosterSection.isElective && (
                          <th className="p-3">Base / Academic Section</th>
                        )}
                        <th className="p-3">Gender</th>
                        <th className="p-3">Barangay / Contact</th>
                        <th className="p-3 text-right no-print print:hidden">Section Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredRoster.map((st, index) => {
                        const fullName = `${st.last_name}, ${st.first_name} ${st.middle_name || ""}`.trim();
                        const isReassigningThis = reassigningStudentId === st.id;
                        const isRemovingThis = removingStudentId === st.id;
                        const isEnrolled = !!st.isEnrolledInActiveTerm;

                        // Other eligible sections for this student's grade level
                        const eligibleTargetSections = sections.filter(
                          (s) =>
                            s.id !== selectedRosterSection.id &&
                            s.grade_level === selectedRosterSection.grade_level
                        );

                        return (
                          <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-500 text-center">
                              {index + 1}
                            </td>
                            <td className="p-3 font-mono">
                              {st.student_id && /^\d{12}$/.test(st.student_id) ? (
                                <span className="font-bold text-slate-900">{st.student_id}</span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Pending LIS</span>
                              )}
                            </td>
                            <td className="p-3 font-bold text-slate-900 uppercase">
                              <div className="flex items-center gap-2">
                                <span>{fullName}</span>
                                {isEnrolled ? (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                                    Enrolled
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                                    Not Yet Enrolled
                                  </span>
                                )}
                              </div>
                            </td>
                            {selectedRosterSection.isElective && (
                              <td className="p-3">
                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-[#002060] border border-blue-200 font-mono font-bold text-[11px]">
                                  {st.base_section_name || "Academic"}
                                </span>
                              </td>
                            )}
                            <td className="p-3">
                              {st.gender || "—"}
                            </td>
                            <td className="p-3 text-slate-600">
                              <div>{st.barangay || "Dumalneg"}</div>
                              {st.contact_number && (
                                <div className="text-[10px] font-mono text-slate-500">{st.contact_number}</div>
                              )}
                            </td>
                            <td className="p-3 text-right no-print print:hidden">
                              {selectedRosterSection.isElective ? (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 uppercase">
                                  Elective Cohort
                                </span>
                              ) : isEnrolled ? (
                                isReassigningThis ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <CustomSelect
                                      placeholder="-- Choose Section --"
                                      align="right"
                                      className="min-w-[170px]"
                                      value={reassignTargetSectionId}
                                      onChange={(val) => setReassignTargetSectionId(val)}
                                      options={[
                                        { value: "", label: "-- Choose Section --" },
                                        ...eligibleTargetSections.map((ts) => ({
                                          value: ts.id,
                                          label: ts.section_name,
                                          badge: `${ts.enrolledCount}/${ts.capacity}`,
                                        })),
                                      ]}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleReassignStudent(st.id, reassignTargetSectionId)}
                                      disabled={!reassignTargetSectionId}
                                      className="px-2.5 py-1.5 bg-[#002060] hover:bg-blue-950 text-white text-[11px] font-bold uppercase disabled:opacity-50 cursor-pointer rounded-[4px]"
                                    >
                                      Move
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReassigningStudentId(null);
                                        setReassignTargetSectionId("");
                                      }}
                                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold uppercase cursor-pointer rounded-[4px]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReassigningStudentId(st.id);
                                      setReassignTargetSectionId("");
                                      setRemovingStudentId(null);
                                    }}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#002060] border border-slate-300 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                    title="Transfer student to another section"
                                  >
                                    Reassign
                                  </button>
                                )
                              ) : (
                                isRemovingThis ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-red-700 font-bold">Remove?</span>
                                    <button
                                      type="button"
                                      disabled={isRemovingStudent}
                                      onClick={() => handleRemoveStudent(st.id, fullName)}
                                      className="px-2 py-1 bg-red-700 hover:bg-red-800 text-white text-[11px] font-bold uppercase cursor-pointer disabled:opacity-50"
                                    >
                                      {isRemovingStudent ? "..." : "Confirm"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isRemovingStudent}
                                      onClick={() => setRemovingStudentId(null)}
                                      className="px-2 py-1 bg-slate-200 text-slate-700 text-[11px] font-bold uppercase cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRemovingStudentId(st.id);
                                      setReassigningStudentId(null);
                                    }}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                    title="Remove learner who is not enrolled in this semester from this section roster"
                                  >
                                    Remove
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* DepEd Official Signatory Block for Printout */}
              <div className="hidden print:flex justify-between items-end pt-12 mt-6 text-xs font-sans text-slate-900 pb-4 px-2">
                <div className="text-center w-56">
                  <div className="border-b border-slate-900 pb-1 font-bold uppercase">
                    {selectedRosterSection.adviser_name || "Unassigned"}
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
            </div>

            {/* Modal Footer (Screen Only) */}
            <div className="no-print print:hidden p-4 bg-slate-100 border-t border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-slate-600">
                Official DepEd Class Roster &bull; Dumalneg National High School
              </span>
              <button
                type="button"
                onClick={() => setSelectedRosterSection(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Confirm Delete Section Modal */}
      {deleteSectionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="border-b-2 border-slate-200 pb-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#002060] block">
                  DepEd Section Management
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-slate-900 mt-0.5">
                  {deleteSectionTarget.enrolledCount > 0 ? "Cannot Delete Section" : "Confirm Section Deletion"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteSectionTarget(null)}
                disabled={isDeletingSection}
                className="text-slate-400 hover:text-slate-600 font-mono text-xl font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {deleteSectionTarget.enrolledCount > 0 ? (
              <div className="p-3.5 bg-red-50 border border-red-300 text-xs space-y-3 text-red-950">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold text-sm">&times;</span>
                  <span className="font-bold">Active Learner Enrollment Lock</span>
                </div>
                <p>
                  Cannot delete section <strong className="font-mono text-[#002060]">{deleteSectionTarget.section_name}</strong>:
                </p>
                <div className="bg-white p-3 border border-red-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Enrolled Learners:</span>
                    <strong className="font-mono text-red-700 font-bold text-sm">
                      {deleteSectionTarget.enrolledCount} Students
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Grade {deleteSectionTarget.grade_level} {deleteSectionTarget.strand || "Core"}
                  </div>
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  DepEd Quota Control mandates that all learners must be reassigned or transferred to another section before removing this section from the school roster.
                </p>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = deleteSectionTarget;
                      setDeleteSectionTarget(null);
                      fetchRoster(target);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white font-bold text-xs uppercase cursor-pointer text-center"
                  >
                    View Class Roster &amp; Reassign
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-red-50 border border-red-300 text-xs space-y-2 text-red-950">
                  <p className="font-semibold text-slate-800">
                    Are you sure you want to permanently delete section <strong className="font-mono text-[#002060]">{deleteSectionTarget.section_name}</strong>?
                  </p>
                  <div className="bg-white p-3 border border-red-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#002060]">
                        {deleteSectionTarget.section_name}
                      </span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 font-bold uppercase">
                        Grade {deleteSectionTarget.grade_level}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Classroom: <strong className="text-slate-800">{deleteSectionTarget.room || "Unassigned"}</strong>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Adviser: <strong className="text-slate-800">{deleteSectionTarget.adviser_name || "Unassigned"}</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-red-700 font-medium">
                    This action will remove the section from quota tracking and timetable scheduling.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDeleteSectionTarget(null)}
                    disabled={isDeletingSection}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteSection}
                    disabled={isDeletingSection}
                    className="w-full sm:w-auto px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 text-center order-1 sm:order-2"
                  >
                    {isDeletingSection ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern Reassign Capacity Override Modal */}
      {reassignOverridePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="border-b-2 border-slate-200 pb-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#002060] block">
                  Capacity Limit Warning
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-slate-900 mt-0.5">
                  Section Over-Capacity Override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignOverridePrompt(null)}
                className="text-slate-400 hover:text-slate-600 font-mono text-xl font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-300 text-xs space-y-2 text-amber-950">
              <p className="font-semibold text-slate-800">
                Target section <strong className="font-mono text-[#002060]">{reassignOverridePrompt.targetSecName}</strong> is already at or above maximum seating capacity:
              </p>
              <div className="bg-white p-3 border border-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Current Occupancy:</span>
                  <span className="font-mono font-bold text-amber-800">
                    {reassignOverridePrompt.enrolled} / {reassignOverridePrompt.cap} Seats
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-amber-900">
                Do you wish to authorize an administrative quota override and transfer this student anyway?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReassignOverridePrompt(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeReassignStudent(reassignOverridePrompt.studentId, reassignOverridePrompt.newSectionId)}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center order-1 sm:order-2"
              >
                Authorize &amp; Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
