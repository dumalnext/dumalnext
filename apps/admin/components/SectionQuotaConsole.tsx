"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const SHS_STRANDS = [
  { code: "STEM", name: "Science, Technology, Engineering, and Mathematics", track: "Academic Track" },
  { code: "HUMSS", name: "Humanities and Social Sciences", track: "Academic Track" },
  { code: "ABM", name: "Accountancy, Business, and Management", track: "Academic Track" },
  { code: "TVL-ICT", name: "Information and Communications Technology", track: "TVL Track" },
  { code: "TVL-HE", name: "Home Economics", track: "TVL Track" },
  { code: "TVL-AFA", name: "Agri-Fishery Arts", track: "TVL Track" },
];

export interface SectionDetail {
  id: string;
  section_name: string;
  grade_level: number;
  strand?: string;
  room?: string;
  adviser_name?: string;
  capacity: number;
  enrolledCount: number;
  school_year?: string;
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

export default function SectionQuotaConsole() {
  const supabase = createClient();

  const [sections, setSections] = useState<SectionDetail[]>([]);
  const [teachersList, setTeachersList] = useState<RegisteredTeacher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");

  // Add Section Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newSectionName, setNewSectionName] = useState<string>("");
  const [newGradeLevel, setNewGradeLevel] = useState<number>(7);
  const [newStrand, setNewStrand] = useState<string>("");
  const [newCapacity, setNewCapacity] = useState<number>(40);
  const [newRoom, setNewRoom] = useState<string>("");
  const [newAdviser, setNewAdviser] = useState<string>("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);
  const [addError, setAddError] = useState<string>("");

  // Edit Section Modal State
  const [editingSection, setEditingSection] = useState<SectionDetail | null>(null);
  const [editSectionName, setEditSectionName] = useState<string>("");
  const [editCapacity, setEditCapacity] = useState<number>(40);
  const [editRoom, setEditRoom] = useState<string>("");
  const [editAdviser, setEditAdviser] = useState<string>("");
  const [editStrand, setEditStrand] = useState<string>("");
  const [autoTransferAdviser, setAutoTransferAdviser] = useState<boolean>(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");

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

  // Fetch all sections
  const fetchSections = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);

      const res = await fetch(`/api/sections?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sections)) {
          setSections(data.sections);
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

      const { data: studentSecData } = await supabase
        .from("students")
        .select("current_section_id")
        .not("current_section_id", "is", null);

      const countMap = new Map<string, number>();
      if (studentSecData) {
        studentSecData.forEach((st: any) => {
          if (st.current_section_id) {
            countMap.set(
              st.current_section_id,
              (countMap.get(st.current_section_id) || 0) + 1
            );
          }
        });
      }

      const enriched: SectionDetail[] = Array.from(secMap.values()).map((s: any) => ({
        id: s.id,
        section_name: s.section_name,
        grade_level: Number(s.grade_level),
        strand: s.strand || undefined,
        room: s.room || undefined,
        adviser_name: s.adviser_name || undefined,
        capacity: Number(s.capacity) || 40,
        enrolledCount: countMap.get(s.id) || s.enrolled_count || 0,
      }));

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

    try {
      // 1. Try API route first
      const res = await fetch(`/api/sections?sectionId=${section.id}&includeStudents=true&_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.section?.students) {
          setRosterStudents(data.section.students);
          setIsLoadingRoster(false);
          return;
        }
      }

      // 2. Fallback directly to Supabase client
      const { data: students, error } = await supabase
        .from("students")
        .select("id, student_id, first_name, middle_name, last_name, gender, grade_level, strand, current_section_id, contact_number, barangay")
        .eq("current_section_id", section.id)
        .order("last_name", { ascending: true });

      if (error) {
        console.warn("Notice querying section roster:", error.message);
      }

      setRosterStudents(students || []);
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

  useEffect(() => {
    fetchSections();
    fetchTeachers();

    // Real-time subscription to sections, teachers, students, and enrollment_applications
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
        { event: "*", schema: "public", table: "students" },
        () => fetchSections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => fetchSections(true)
      )
      .subscribe();

    const handleCustomEvent = () => {
      fetchSections(true);
      fetchTeachers();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("dumalnext:data-changed", handleCustomEvent);
      window.addEventListener("dumalnext:teacher-data-changed", handleCustomEvent);
      window.addEventListener("dumalnext:admin-data-changed", handleCustomEvent);
    }

    return () => {
      supabase.removeChannel(channel);
      if (typeof window !== "undefined") {
        window.removeEventListener("dumalnext:data-changed", handleCustomEvent);
        window.removeEventListener("dumalnext:teacher-data-changed", handleCustomEvent);
        window.removeEventListener("dumalnext:admin-data-changed", handleCustomEvent);
      }
    };
  }, []);

  // Filter sections by grade
  const filteredSections = sections.filter((sec) => {
    if (gradeFilter === "ALL") return true;
    return String(sec.grade_level) === String(gradeFilter);
  });

  const totalSections = filteredSections.length;
  const totalCapacity = filteredSections.reduce((sum, s) => sum + s.capacity, 0);
  const totalEnrolled = filteredSections.reduce((sum, s) => sum + s.enrolledCount, 0);
  const totalAvailable = Math.max(0, totalCapacity - totalEnrolled);
  const overallPct = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  // Handle Add Section
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!newSectionName.trim()) {
      setAddError("Please enter a valid Section Name (e.g. Grade 7 - Bonifacio).");
      return;
    }

    if (newCapacity <= 0 || isNaN(newCapacity)) {
      setAddError("Please enter a valid maximum capacity (e.g. 40).");
      return;
    }

    // Automated Deconfliction Guard: Check if the teacher already advises another section
    if (newAdviser.trim()) {
      const conflict = getExistingAdvisorySection(newAdviser);
      if (conflict) {
        setAddError(
          `Adviser Conflict Detected: [ ${newAdviser.trim()} ] is already designated as Class Adviser to section [ ${conflict.section_name} ] (Grade ${conflict.grade_level}). Under DepEd staffing rules, a faculty member can only advise ONE section per school year. Please select an available teacher or unassign the previous section first.`
        );
        return;
      }
    }

    setIsSubmittingAdd(true);

    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_name: newSectionName.trim(),
          grade_level: newGradeLevel,
          strand: newGradeLevel >= 11 ? newStrand || null : null,
          capacity: newCapacity,
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
        text: `Section [ ${newSectionName.trim()} ] has been successfully created with a capacity of ${newCapacity} students.`,
      });

      // Reset form
      setNewSectionName("");
      setNewGradeLevel(7);
      setNewStrand("");
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
    setEditSectionName(sec.section_name);
    setEditCapacity(sec.capacity);
    setEditRoom(sec.room || "");
    setEditAdviser(sec.adviser_name || "");
    setEditStrand(sec.strand || "");
    setEditError("");
    setAutoTransferAdviser(false);
  };

  // Handle Edit Section Submit
  const handleEditSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setEditError("");

    if (!editSectionName.trim()) {
      setEditError("Section name cannot be empty.");
      return;
    }

    if (editCapacity <= 0 || isNaN(editCapacity)) {
      setEditError("Please enter a valid section capacity.");
      return;
    }

    if (editCapacity < editingSection.enrolledCount) {
      setEditError(
        `Capacity cannot be set lower than currently enrolled students (${editingSection.enrolledCount} students). Please reassign students first.`
      );
      return;
    }

    // Automated Deconfliction Guard
    const conflictSection = editAdviser.trim()
      ? getExistingAdvisorySection(editAdviser, editingSection.id)
      : undefined;

    if (conflictSection && !autoTransferAdviser) {
      setEditError(
        `Adviser Conflict Detected: [ ${editAdviser.trim()} ] is already designated as Class Adviser to section [ ${conflictSection.section_name} ] (Grade ${conflictSection.grade_level}). Under DepEd staffing policy, a faculty member can only advise ONE section per school year. Please check "1-Click Automated Transfer" below to transfer them automatically, or select an available teacher.`
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
          section_name: editSectionName.trim(),
          capacity: editCapacity,
          room: editRoom.trim() || null,
          adviser_name: editAdviser.trim() || null,
          strand: editingSection.grade_level >= 11 ? editStrand || null : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update section.");
      }

      setStatusNotice({
        type: "success",
        text: conflictSection && autoTransferAdviser
          ? `Automated Advisory Transfer Complete: [ ${editAdviser.trim()} ] was unassigned from [ ${conflictSection.section_name} ] and successfully assigned as Class Adviser of [ ${editSectionName.trim()} ].`
          : `Section [ ${editSectionName.trim()} ] updated successfully (Class Adviser: ${editAdviser.trim() || "Unassigned"}).`,
      });

      setEditingSection(null);
      await fetchSections(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }
    } catch (err: any) {
      setEditError(err?.message || "Failed to update section.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Section
  const handleDeleteSection = async (sec: SectionDetail) => {
    if (sec.enrolledCount > 0) {
      alert(
        `Cannot delete section [ ${sec.section_name} ]:\n\nThere are currently ${sec.enrolledCount} student(s) officially enrolled in this section.\n\nDepEd Quota Control requires reassigning these learners to another section before removing this section.`
      );
      return;
    }

    const confirmed = window.confirm(
      `DepEd Administrative Action:\n\nAre you sure you want to permanently remove section [ ${sec.section_name} ]?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/sections?id=${sec.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete section.");
      }

      setStatusNotice({
        type: "success",
        text: `Section [ ${sec.section_name} ] has been removed successfully.`,
      });

      await fetchSections(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }
    } catch (err: any) {
      alert(`Delete Error: ${err?.message || "Failed to delete section."}`);
    }
  };

  // Handle Reassign Student to another section from Class Roster Modal
  const handleReassignStudent = async (studentId: string, newSectionId: string) => {
    if (!newSectionId) return;
    setReassignMessage(null);

    const targetSec = sections.find((s) => s.id === newSectionId);
    if (!targetSec) return;

    if (targetSec.enrolledCount >= targetSec.capacity) {
      const proceed = window.confirm(
        `Warning: Target section [ ${targetSec.section_name} ] is already at full capacity (${targetSec.enrolledCount}/${targetSec.capacity}).\n\nDo you wish to override and reassign this student anyway?`
      );
      if (!proceed) return;
    }

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
        text: `Learner successfully reassigned to [ ${targetSec.section_name} ].`,
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

      setReassigningStudentId(null);
      setReassignTargetSectionId("");
    } catch (err: any) {
      setReassignMessage({
        type: "error",
        text: `Reassign Error: ${err?.message || "Failed to transfer student."}`,
      });
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

  return (
    <>
      <div id="admin-sections-dashboard" className="space-y-6 font-sans">
        {/* Title & Real-Time Sync Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            [ SECTION QUOTA &bull; CLASSROOM CAPACITY CONTROL ]
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            Class Sections &amp; Quota Limits Management
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Configure section capacity, add new classes, remove empty sections, and inspect live student rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Section Button */}
          <button
            type="button"
            onClick={() => {
              setIsAddModalOpen(true);
              setAddError("");
            }}
            className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span> Add New Class Section
          </button>

          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 border border-emerald-300 text-xs font-mono font-bold text-emerald-950">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="uppercase">Live Capacity Sync</span>
          </div>
        </div>
      </div>

      {/* Global Status Notice */}
      {statusNotice && (
        <div
          className={`p-3.5 border-2 text-xs font-bold flex items-center justify-between gap-2 ${
            statusNotice.type === "success"
              ? "bg-emerald-50 border-emerald-500 text-emerald-950"
              : "bg-red-50 border-red-500 text-red-950"
          }`}
        >
          <span>[ {statusNotice.type === "success" ? "Notice" : "Error"} ]: {statusNotice.text}</span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-slate-500 hover:text-slate-900 font-mono text-sm px-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border-2 border-slate-300 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
            Total Sections
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-1">
            {totalSections}
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {gradeFilter === "ALL" ? "All Grades Combined" : `Grade ${gradeFilter} Only`}
          </span>
        </div>

        <div className="p-4 bg-blue-50/70 border-2 border-blue-300 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#002060] uppercase block">
            Total Capacity
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#002060] mt-1">
            {totalCapacity}
          </div>
          <span className="text-[10px] text-blue-900 block truncate">
            Configured Max Seats
          </span>
        </div>

        <div className="p-4 bg-emerald-50/70 border-2 border-emerald-500 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-emerald-950 uppercase block">
            Officially Enrolled
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-950 mt-1">
            {totalEnrolled}
          </div>
          <span className="text-[10px] text-emerald-900 block truncate">
            {overallPct}% Capacity Utilized
          </span>
        </div>

        <div className="p-4 bg-amber-50/70 border-2 border-amber-400 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-amber-950 uppercase block">
            Available Slots
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-950 mt-1">
            {totalAvailable}
          </div>
          <span className="text-[10px] text-amber-900 block truncate">
            Unfilled Seats Remaining
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white border-2 border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-600 uppercase">
            Filter by Grade Level:
          </span>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs font-bold text-[#002060] px-3 py-1.5 outline-none cursor-pointer"
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

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">
            Showing <strong>{filteredSections.length}</strong> section{filteredSections.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => fetchSections(false)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold border border-slate-300 uppercase cursor-pointer"
            title="Refresh sections"
          >
            [ Refresh List ]
          </button>
        </div>
      </div>

      {/* Sections Grid */}
      {isLoading ? (
        <div className="p-8 bg-white border-2 border-slate-200 text-center">
          <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="p-12 bg-white border-2 border-slate-300 text-center space-y-3">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
            [ NO SECTIONS FOUND ]
          </span>
          <p className="text-xs text-slate-600">No sections exist for the selected grade filter.</p>
          <button
            type="button"
            onClick={() => {
              setIsAddModalOpen(true);
              if (gradeFilter !== "ALL") {
                setNewGradeLevel(Number(gradeFilter));
              }
            }}
            className="px-4 py-2 bg-[#002060] text-white text-xs font-bold uppercase tracking-wider"
          >
            + Add Section for {gradeFilter === "ALL" ? "All Grades" : `Grade ${gradeFilter}`}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSections.map((sec) => {
            const count = sec.enrolledCount || 0;
            const pct = Math.min(100, Math.round((count / sec.capacity) * 100));
            const isFull = count >= sec.capacity;

            return (
              <div
                key={sec.id}
                className="p-5 bg-white border-2 border-slate-300 shadow-xs space-y-4 hover:border-[#002060] transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-sm font-bold uppercase text-[#002060] block">
                        {sec.section_name}
                      </span>
                      {sec.adviser_name ? (
                        <span className="text-[11px] text-slate-700 block">
                          Adviser: <strong className="text-slate-900 uppercase">{sec.adviser_name}</strong>
                        </span>
                      ) : (
                        <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-300 font-mono font-bold px-1.5 py-0.5 uppercase">
                          [ Needs Class Adviser ]
                        </span>
                      )}
                      {sec.room && (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Room: {sec.room}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono bg-slate-100 px-2.5 py-1 border border-slate-300 font-bold shrink-0">
                      Grade {sec.grade_level} {sec.strand ? `(${sec.strand})` : ""}
                    </span>
                  </div>

                  {/* Progress & Capacity */}
                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Enrolled Capacity:</span>
                      <strong className="font-mono text-slate-900">
                        {count} / {sec.capacity} students ({pct}%)
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 overflow-hidden border border-slate-300">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFull ? "bg-red-600" : pct > 75 ? "bg-amber-500" : "bg-[#002060]"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Slots Remaining */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs mt-3">
                    <span className="text-slate-500">Available Slots:</span>
                    <span
                      className={`font-bold font-mono px-2 py-0.5 border ${
                        isFull
                          ? "bg-red-50 text-red-700 border-red-300"
                          : "bg-emerald-50 text-emerald-900 border-emerald-300"
                      }`}
                    >
                      {isFull ? "FULL (0 SLOTS)" : `${sec.capacity - count} SLOTS REMAINING`}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <button
                    type="button"
                    onClick={() => fetchRoster(sec)}
                    className="w-full py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider text-center transition-colors shadow-2xs cursor-pointer"
                  >
                    [ View Class Roster ({count} {count === 1 ? "Student" : "Students"}) ]
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(sec)}
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold uppercase tracking-wider text-center transition-colors cursor-pointer"
                      title="Edit capacity and details"
                    >
                      [ Edit Capacity ]
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sec)}
                      className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      title="Remove section"
                    >
                      [ Delete ]
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* ADD SECTION MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white border-4 border-[#002060] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#002060] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200 block">
                  [ SECTION MANAGEMENT ]
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

            <form onSubmit={handleAddSection} className="p-5 sm:p-6 space-y-4 text-xs">
              {addError && (
                <div className="p-2.5 bg-red-50 border border-red-400 text-red-900 font-bold">
                  [ Error ]: {addError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Section Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g. Grade 7 - Bonifacio / Grade 11 - STEM B"
                  className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Grade Level <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={newGradeLevel}
                    onChange={(e) => setNewGradeLevel(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-[#002060] outline-none cursor-pointer"
                  >
                    <option value={7}>Grade 7 (JHS)</option>
                    <option value={8}>Grade 8 (JHS)</option>
                    <option value={9}>Grade 9 (JHS)</option>
                    <option value={10}>Grade 10 (JHS)</option>
                    <option value={11}>Grade 11 (SHS)</option>
                    <option value={12}>Grade 12 (SHS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Section Capacity (Seats) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    required
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:border-[#002060] outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    DepEd standard quota: 40 students
                  </span>
                </div>
              </div>

              {/* Strand selection for SHS (Grades 11 & 12) */}
              {newGradeLevel >= 11 && (
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Senior High School Strand
                  </label>
                  <select
                    value={newStrand}
                    onChange={(e) => setNewStrand(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-[#002060] outline-none cursor-pointer"
                  >
                    <option value="">-- Select Strand (Optional / General) --</option>
                    {SHS_STRANDS.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name} ({s.track})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Classroom / Room Number
                  </label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="e.g. Room 102 / Building B"
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs text-slate-900 focus:border-[#002060] outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-900 uppercase">
                      Class Adviser / Teacher
                    </label>
                    <span className="text-[10px] font-mono text-[#002060] uppercase">
                      [ Registered Faculty: {teachersList.length} ]
                    </span>
                  </div>
                  <select
                    value={newAdviser}
                    onChange={(e) => setNewAdviser(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs text-slate-900 focus:border-[#002060] outline-none cursor-pointer"
                  >
                    <option value="">-- Select Registered Teacher (Optional) --</option>
                    {teachersList.map((t) => {
                      const alreadyAssignedSec = sections.find(
                        (s) => s.adviser_name && s.adviser_name.trim().toLowerCase() === t.fullName.toLowerCase()
                      );
                      const statusTag = alreadyAssignedSec
                        ? `[ ALREADY ADVISING: ${alreadyAssignedSec.section_name} ]`
                        : "[ AVAILABLE ]";

                      return (
                        <option key={t.id} value={t.fullName}>
                          {t.fullName} &bull; {statusTag} {t.email ? `(${t.email})` : ""}
                        </option>
                      );
                    })}
                  </select>
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
                          [ DECONFLICTION ALERT: SINGLE-ADVISER RULE ]
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

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingAdd ? "Saving Section..." : "[ Save Section ]"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white border-4 border-[#002060] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#002060] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200 block">
                  [ EDIT SECTION CAPACITY &amp; DETAILS ]
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

            <form onSubmit={handleEditSection} className="p-5 sm:p-6 space-y-4 text-xs">
              {editError && (
                <div className="p-2.5 bg-red-50 border border-red-400 text-red-900 font-bold">
                  [ Error ]: {editError}
                </div>
              )}

              {/* Current Enrollment Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between">
                <span>Currently Enrolled Students:</span>
                <strong className="font-mono font-bold text-[#002060]">
                  {editingSection.enrolledCount} Students
                </strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Section Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editSectionName}
                  onChange={(e) => setEditSectionName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Section Capacity (Maximum Allowed Seats) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min={editingSection.enrolledCount || 1}
                  max={80}
                  required
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:border-[#002060] outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Cannot be lower than currently enrolled students ({editingSection.enrolledCount}).
                </span>
              </div>

              {editingSection.grade_level >= 11 && (
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Specialized Strand
                  </label>
                  <select
                    value={editStrand}
                    onChange={(e) => setEditStrand(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-[#002060] outline-none cursor-pointer"
                  >
                    <option value="">-- None / General --</option>
                    {SHS_STRANDS.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Classroom / Room Number
                  </label>
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    placeholder="e.g. Room 102"
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs text-slate-900 focus:border-[#002060] outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-900 uppercase">
                      Class Adviser / Teacher
                    </label>
                    <span className="text-[10px] font-mono text-[#002060] uppercase">
                      [ Registered Faculty: {teachersList.length} ]
                    </span>
                  </div>
                  <select
                    value={editAdviser}
                    onChange={(e) => {
                      setEditAdviser(e.target.value);
                      setAutoTransferAdviser(false);
                    }}
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs text-slate-900 focus:border-[#002060] outline-none cursor-pointer"
                  >
                    <option value="">-- Select Registered Teacher (Unassigned) --</option>
                    {/* If editAdviser is already set to a custom or legacy name not yet in teachersList, preserve it as an option */}
                    {editAdviser && !teachersList.some((t) => t.fullName === editAdviser) && (
                      <option value={editAdviser}>
                        {editAdviser} (Current Adviser)
                      </option>
                    )}
                    {teachersList.map((t) => {
                      const assignedSec = sections.find(
                        (s) => s.adviser_name && s.adviser_name.trim().toLowerCase() === t.fullName.toLowerCase()
                      );
                      const isCurrent = editingSection && assignedSec && assignedSec.id === editingSection.id;
                      const statusTag = isCurrent
                        ? "[ CURRENT ADVISER OF THIS SECTION ]"
                        : assignedSec
                        ? `[ ALREADY ADVISING: ${assignedSec.section_name} ]`
                        : "[ AVAILABLE ]";

                      return (
                        <option key={t.id} value={t.fullName}>
                          {t.fullName} &bull; {statusTag} {t.email ? `(${t.email})` : ""}
                        </option>
                      );
                    })}
                  </select>
                  {(() => {
                    const conflict = getExistingAdvisorySection(editAdviser, editingSection?.id);
                    if (!conflict) return null;
                    return (
                      <div className="mt-2 p-3 bg-amber-50 border-2 border-amber-400 text-xs text-amber-950 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-900 uppercase text-[11px]">
                            [ AUTOMATED DECONFLICTION ALERT ]
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
                                [ 1-Click Automated Transfer ]
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

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEdit ? "Updating..." : "[ Save Changes ]"}
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
        <div className="roster-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
          <div className="roster-modal-container bg-white border-4 border-[#002060] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
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
                  Section: <strong>{selectedRosterSection.section_name}</strong> (Grade {selectedRosterSection.grade_level}{selectedRosterSection.strand ? ` • ${selectedRosterSection.strand}` : ""})
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200">
                    [ OFFICIAL CLASS ROSTER ]
                  </span>
                  <span className="text-[10px] font-mono bg-blue-900 border border-blue-400/40 px-2 py-0.5 font-bold">
                    GRADE {selectedRosterSection.grade_level} {selectedRosterSection.strand ? `• ${selectedRosterSection.strand}` : ""}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white mt-1">
                  {selectedRosterSection.section_name}
                </h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  Capacity: {rosterStudents.length} / {selectedRosterSection.capacity} Students Enrolled &bull; {selectedRosterSection.room ? `Room: ${selectedRosterSection.room}` : "Main Building"} &bull; Adviser: {selectedRosterSection.adviser_name || "Unassigned"}
                </p>
              </div>

              <div className="flex items-center gap-2 no-print print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-mono font-bold border border-blue-400 uppercase cursor-pointer"
                  title="Print official class roster"
                >
                  [ Print Class Roster ]
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
                      ✕
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-600 font-mono">
                  Enrolled Count: <strong>{rosterStudents.length}</strong> / <strong>{selectedRosterSection.capacity}</strong> &bull; Available Slots: <strong>{Math.max(0, selectedRosterSection.capacity - rosterStudents.length)}</strong>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0 print:m-0">
              {isLoadingRoster ? (
                <div className="p-8 text-center">
                  <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="p-12 text-center space-y-2 bg-slate-50 border-2 border-dashed border-slate-300">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
                    [ {rosterSearch ? "NO MATCHING STUDENTS IN THIS SECTION" : "NO STUDENTS CURRENTLY ENROLLED IN THIS SECTION"} ]
                  </span>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    {rosterSearch
                      ? "Try searching for a different name or LRN."
                      : `No learners have been assigned to ${selectedRosterSection.section_name} yet. To assign learners, go to [ Enrollment Adjudication ] and select this section when approving applications.`}
                  </p>
                </div>
              ) : (
                <div className="border-2 border-slate-300 overflow-x-auto shadow-xs print:border-none print:shadow-none">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">12-Digit LRN</th>
                        <th className="p-3">Learner Full Name</th>
                        <th className="p-3">Gender</th>
                        <th className="p-3">Barangay / Contact</th>
                        <th className="p-3 text-right no-print print:hidden">Section Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredRoster.map((st, index) => {
                        const fullName = `${st.last_name}, ${st.first_name} ${st.middle_name || ""}`.trim();
                        const isReassigningThis = reassigningStudentId === st.id;

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
                              {fullName}
                            </td>
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
                              {isReassigningThis ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <select
                                    value={reassignTargetSectionId}
                                    onChange={(e) => setReassignTargetSectionId(e.target.value)}
                                    className="p-1 bg-white border border-slate-400 text-xs font-bold text-[#002060] outline-none"
                                  >
                                    <option value="">-- Choose Section --</option>
                                    {eligibleTargetSections.map((ts) => (
                                      <option key={ts.id} value={ts.id}>
                                        {ts.section_name} ({ts.enrolledCount}/{ts.capacity})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleReassignStudent(st.id, reassignTargetSectionId)}
                                    disabled={!reassignTargetSectionId}
                                    className="px-2 py-1 bg-[#002060] hover:bg-blue-950 text-white text-[11px] font-bold uppercase disabled:opacity-50 cursor-pointer"
                                  >
                                    Move
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReassigningStudentId(null);
                                      setReassignTargetSectionId("");
                                    }}
                                    className="px-2 py-1 bg-slate-200 text-slate-700 text-[11px] font-bold uppercase cursor-pointer"
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
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#002060] border border-slate-300 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                  title="Transfer student to another section"
                                >
                                  [ Reassign ]
                                </button>
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
    </>
  );
}
