"use client";

import React, { useState, useEffect } from "react";
import CustomSelect from "@/components/CustomSelect";
import { CourseSubjectItem } from "@/app/api/subjects/route";
import { createClient } from "@/lib/supabase/client";

export default function CurriculumSubjectsConsole() {
  const [subjects, setSubjects] = useState<CourseSubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Broadcast curriculum mutations in real-time across tabs and devices
  const broadcastCurriculumChanged = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
      window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      window.dispatchEvent(new CustomEvent("dumalnext:subjects-changed"));

      try {
        const bc = new BroadcastChannel("dumalnext-subjects-sync");
        bc.postMessage({ type: "SUBJECTS_CHANGED", timestamp: Date.now() });
        bc.close();
      } catch {}

      try {
        localStorage.setItem("dumalnext:subjects-timestamp", String(Date.now()));
      } catch {}
    }

    try {
      const supabase = createClient();
      const channel = supabase.channel("dumalnext-subjects-sync");
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "subjects-updated",
            payload: { timestamp: Date.now() },
          });
        }
      });
    } catch {}
  };

  // Filters (Trimester removed per institutional requirements)
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [strandFilter, setStrandFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [formCode, setFormCode] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formType, setFormType] = useState<CourseSubjectItem["subject_type"]>("Core");
  const [formGrade, setFormGrade] = useState<number>(7);
  const [formStrand, setFormStrand] = useState<string>("Regular");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [modalLockedTrack, setModalLockedTrack] = useState<{
    track: "Academic" | "TechPro";
    category: "Core" | "Elective";
    grade?: number;
  } | null>(null);

  // Delete State
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<CourseSubjectItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch subjects from API
  const fetchSubjects = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/subjects?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.subjects)) {
          setSubjects(json.subjects);
        } else {
          setErrorMessage(json.error || "Failed to load subjects.");
        }
      } else {
        setErrorMessage("Server error while retrieving subject list.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to communicate with subjects API.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Filter subjects based on search query, type, and strand
  const filteredSubjects = subjects.filter((s) => {
    if (typeFilter !== "ALL" && s.subject_type.toUpperCase() !== typeFilter.toUpperCase()) return false;
    if (strandFilter !== "ALL") {
      const strandUpper = (s.strand || "").toUpperCase();
      const filterUpper = strandFilter.toUpperCase();
      // Universal core subjects for SHS (strand General or empty/null) apply to all SHS tracks
      if (s.grade_level >= 11 && s.subject_type === "Core" && (strandUpper === "GENERAL" || !s.strand)) {
        // Retained for universal core coverage
      } else if (filterUpper === "ACADEMIC") {
        const isAcademic =
          strandUpper === "ACADEMIC" ||
          strandUpper === "STEM" ||
          strandUpper === "HUMSS" ||
          strandUpper === "GAS" ||
          strandUpper === "ABM";
        if (!isAcademic) return false;
      } else if (filterUpper === "TECHPRO") {
        const isTechPro = strandUpper === "TECHPRO" || strandUpper.startsWith("TVL");
        if (!isTechPro) return false;
      } else {
        if (!s.strand) return false;
        if (strandUpper !== filterUpper) return false;
      }
    }
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const codeMatch = s.subject_code.toLowerCase().includes(query);
      const nameMatch = s.subject_name.toLowerCase().includes(query);
      const strandMatch = s.strand ? s.strand.toLowerCase().includes(query) : false;
      if (!codeMatch && !nameMatch && !strandMatch) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalCount = subjects.length;
  const jhsTotal = subjects.filter((s) => s.grade_level <= 10).length;
  const shsTotal = subjects.filter((s) => s.grade_level >= 11).length;
  const electivesCount = subjects.filter(
    (s) => s.subject_type === "Elective" || s.subject_type === "Specialized"
  ).length;

  // Auto-generate standard subject code helper (without trimester)
  const handleAutoGenerateCode = () => {
    const isJhs = formGrade <= 10;
    const prefix = isJhs ? "JHS" : "SHS";
    let strandTag = "";
    if (modalLockedTrack) {
      const trackCode = modalLockedTrack.track === "Academic" ? "ACAD" : "TECH";
      const catCode = modalLockedTrack.category === "Core" ? "CORE" : "ELEC";
      strandTag = `${trackCode}-${catCode}-`;
    } else if (!isJhs && formStrand && formStrand !== "General") {
      let strandCode = formStrand.toUpperCase();
      if (strandCode === "ACADEMIC") strandCode = "ACAD";
      if (strandCode === "TECHPRO") strandCode = "TECH";
      strandTag = `${strandCode}-`;
    }
    const cleaned = formName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);
    const codeTag = cleaned || "SUBJ";
    const targetGrade = modalLockedTrack?.grade || formGrade;
    const generated = `${prefix}-${strandTag}${codeTag}${targetGrade}`;
    setFormCode(generated);
  };

  // Open Create Modal with optional pre-filled grade, strand, classification type, and locked track
  const handleOpenCreateModal = (
    prefillGrade?: number,
    prefillStrand?: string,
    prefillType?: CourseSubjectItem["subject_type"],
    lockedTrack?: { track: "Academic" | "TechPro"; category: "Core" | "Elective"; grade?: number } | null
  ) => {
    setIsEditing(false);
    setEditingId("");
    setFormCode("");
    setFormName("");
    const g = prefillGrade || 7;
    setFormGrade(g);

    if (lockedTrack) {
      const targetGrade = lockedTrack.grade || g;
      setModalLockedTrack({ ...lockedTrack, grade: targetGrade });
      setFormGrade(targetGrade);
      setFormType(
        lockedTrack.category === "Core"
          ? "Core"
          : lockedTrack.track === "TechPro"
          ? "Specialized"
          : "Elective"
      );
      setFormStrand(lockedTrack.track);
    } else {
      setModalLockedTrack(null);
      setFormType(prefillType || "Core");
      if (prefillStrand) {
        setFormStrand(prefillStrand);
      } else if (g <= 10) {
        setFormStrand("Regular");
      } else {
        setFormStrand("General");
      }
    }

    setFormDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (s: CourseSubjectItem) => {
    setIsEditing(true);
    setEditingId(s.id);
    setFormCode(s.subject_code);
    setFormName(s.subject_name);
    setFormType(s.subject_type);
    setFormGrade(s.grade_level);
    setFormStrand(s.strand || (s.grade_level <= 10 ? "Regular" : "General"));
    setFormDescription(s.description || "");
    setFormError("");
    setModalLockedTrack(null);
    setIsModalOpen(true);
  };

  // Close Modal and clear locked track state
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalLockedTrack(null);
  };

  // Save Subject (Create or Edit)
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formCode.trim()) {
      setFormError("Subject Code is required (e.g., JHS-MATH7, SHS-STEM-PRECAL11).");
      return;
    }
    if (!formName.trim()) {
      setFormError("Subject Descriptive Title is required.");
      return;
    }

    setIsSaving(true);
    try {
      const endpoint = "/api/subjects";
      const method = isEditing ? "PUT" : "POST";
      const finalGrade = modalLockedTrack ? (modalLockedTrack.grade || formGrade) : formGrade;
      const finalType = modalLockedTrack
        ? modalLockedTrack.category === "Core"
          ? "Core"
          : modalLockedTrack.track === "TechPro"
          ? "Specialized"
          : "Elective"
        : formType;
      const finalStrand = modalLockedTrack ? modalLockedTrack.track : (formStrand || null);

      const payload = {
        id: editingId || undefined,
        subject_code: formCode.trim().toUpperCase(),
        subject_name: formName.trim(),
        subject_type: finalType,
        grade_level: finalGrade,
        trimester: 1, // Trimester defaulted silently in background
        strand: finalStrand,
        description: formDescription.trim() || null,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setModalLockedTrack(null);
        setSuccessMessage(
          isEditing
            ? `Subject [ ${formCode.toUpperCase()} ] updated successfully.`
            : `New subject [ ${formCode.toUpperCase()} ] created successfully.`
        );
        fetchSubjects();
        broadcastCurriculumChanged();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setFormError(json.error || "Failed to save subject record.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save subject.");
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Delete Subject
  const handleConfirmDelete = async () => {
    if (!deleteSubjectTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/subjects?subjectCode=${encodeURIComponent(deleteSubjectTarget.subject_code)}`,
        {
          method: "DELETE",
        }
      );

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(
          `Subject [ ${deleteSubjectTarget.subject_code} ] removed successfully.`
        );
        setDeleteSubjectTarget(null);
        fetchSubjects();
        broadcastCurriculumChanged();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(
          json.error || "Could not remove subject. It may be assigned to an active class timetable."
        );
        setDeleteSubjectTarget(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete subject.");
      setDeleteSubjectTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper predicates for SHS tracks
  const isTechProSubject = (s: CourseSubjectItem) => {
    const strand = (s.strand || "").toUpperCase();
    const code = (s.subject_code || "").toUpperCase();
    return (
      strand === "TECHPRO" ||
      strand.startsWith("TVL") ||
      code.startsWith("TECH-") ||
      code.startsWith("TVL-")
    );
  };

  // Groupings for JHS
  const jhsGrade7 = filteredSubjects.filter((s) => s.grade_level === 7);
  const jhsGrade8 = filteredSubjects.filter((s) => s.grade_level === 8);
  const jhsGrade9 = filteredSubjects.filter((s) => s.grade_level === 9);
  const jhsGrade10 = filteredSubjects.filter((s) => s.grade_level === 10);

  // Groupings for SHS Grade 11 (Separated into Academic & TechPro, each with Core and Elective)
  const shsGrade11AcademicCore = filteredSubjects.filter(
    (s) => s.grade_level === 11 && s.subject_type === "Core" && !isTechProSubject(s)
  );
  const shsGrade11AcademicElectives = filteredSubjects.filter(
    (s) => s.grade_level === 11 && s.subject_type !== "Core" && !isTechProSubject(s)
  );

  const shsGrade11TechproCore = filteredSubjects.filter(
    (s) =>
      s.grade_level === 11 &&
      s.subject_type === "Core" &&
      (isTechProSubject(s) || s.strand === "General" || !s.strand)
  );
  const shsGrade11TechproElectives = filteredSubjects.filter(
    (s) => s.grade_level === 11 && s.subject_type !== "Core" && isTechProSubject(s)
  );

  // Groupings for SHS Grade 12 (Separated into Academic & TechPro, each with Core and Elective)
  const shsGrade12AcademicCore = filteredSubjects.filter(
    (s) => s.grade_level === 12 && s.subject_type === "Core" && !isTechProSubject(s)
  );
  const shsGrade12AcademicElectives = filteredSubjects.filter(
    (s) => s.grade_level === 12 && s.subject_type !== "Core" && !isTechProSubject(s)
  );

  const shsGrade12TechproCore = filteredSubjects.filter(
    (s) =>
      s.grade_level === 12 &&
      s.subject_type === "Core" &&
      (isTechProSubject(s) || s.strand === "General" || !s.strand)
  );
  const shsGrade12TechproElectives = filteredSubjects.filter(
    (s) => s.grade_level === 12 && s.subject_type !== "Core" && isTechProSubject(s)
  );

  // Helper to render the actual HTML table of subjects
  const renderSubjectRowsTable = (
    list: CourseSubjectItem[],
    emptyMessage: string,
    onAddClick?: () => void,
    addLabel?: string
  ) => {
    if (list.length === 0) {
      return (
        <div className="p-6 text-center space-y-2 bg-slate-50/50">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
            [ {emptyMessage} ]
          </span>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            No subjects currently match this category or active filter. Click below to add a new subject.
          </p>
          {onAddClick && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onAddClick}
                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-[#002060] uppercase tracking-wider transition-colors cursor-pointer"
              >
                {addLabel || "+ Add Subject"}
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-[11px] font-mono text-slate-700 uppercase">
              <th className="p-3 w-40">Subject Code</th>
              <th className="p-3 min-w-[240px]">Descriptive Title</th>
              <th className="p-3 w-32">Classification</th>
              <th className="p-3 min-w-[180px]">Program / Track</th>
              <th className="p-3 w-36 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {list.map((sub) => {
              const isJhs = sub.grade_level <= 10;
              return (
                <tr
                  key={sub.id}
                  className="hover:bg-blue-50/40 transition-colors"
                >
                  {/* Subject Code */}
                  <td className="p-3 font-mono font-bold text-[#002060]">
                    {sub.subject_code}
                  </td>

                  {/* Subject Title */}
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                      {sub.subject_name}
                    </span>
                    {sub.description && (
                      <span className="text-[11px] text-slate-500 block line-clamp-1 mt-0.5">
                        {sub.description}
                      </span>
                    )}
                  </td>

                  {/* Classification Badge */}
                  <td className="p-3">
                    {sub.subject_type === "Core" ? (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-blue-100 text-[#002060] border border-blue-300">
                        CORE
                      </span>
                    ) : sub.subject_type === "Elective" ? (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-purple-100 text-purple-900 border border-purple-300">
                        ELECTIVE
                      </span>
                    ) : sub.subject_type === "Specialized" ? (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-950 border border-amber-400">
                        SPECIALIZED
                      </span>
                    ) : sub.subject_type === "Applied" ? (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-950 border border-emerald-400">
                        APPLIED
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-red-100 text-red-950 border border-red-300">
                        INTERVENTION
                      </span>
                    )}
                  </td>

                  {/* Program / Track */}
                  <td className="p-3">
                    <span className="text-[11px] font-mono font-bold text-slate-800 block">
                      {isJhs
                        ? sub.strand === "SPS"
                          ? "Special Program in Sports (General SPS)"
                          : "Regular Basic Education"
                        : sub.strand
                        ? sub.strand === "General"
                          ? "General (All Tracks)"
                          : `${sub.strand}`
                        : "General (All Tracks)"}
                    </span>
                  </td>

                  {/* Action Buttons */}
                  <td className="p-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(sub)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteSubjectTarget(sub)}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Helper to render subjects table for single-list sub-headings (e.g., JHS Grade 7-10, Grade 12)
  const renderSubjectTable = (
    gradeSubjects: CourseSubjectItem[],
    gradeNum: number,
    subHeadingTitle: string,
    defaultStrand: string,
    addBtnLabel: string
  ) => {
    return (
      <div className="bg-white border-2 border-slate-300 shadow-xs mb-6 overflow-hidden">
        {/* Sub-Heading Header Bar */}
        <div className="bg-slate-100 border-b-2 border-slate-300 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-6 bg-[#002060]" />
            <div>
              <h4 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#002060]">
                {subHeadingTitle}
              </h4>
              <span className="text-[10px] font-mono text-slate-500 block uppercase">
                {gradeSubjects.length}{" "}
                {gradeSubjects.length === 1 ? "Subject Offering" : "Subject Offerings"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenCreateModal(gradeNum, defaultStrand)}
            className="px-3 py-1.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
          >
            {addBtnLabel}
          </button>
        </div>

        {/* Table Content */}
        {renderSubjectRowsTable(
          gradeSubjects,
          "NO SUBJECTS ON RECORD FOR THIS LEVEL",
          () => handleOpenCreateModal(gradeNum, defaultStrand),
          addBtnLabel
        )}
      </div>
    );
  };

  // Helper to render Grade 11 / Grade 12 with 2 separated sections in one single box: Core Subjects and Elective Part
  const renderSeparatedTrackBox = (
    subHeadingTitle: string,
    coreSubjects: CourseSubjectItem[],
    electiveSubjects: CourseSubjectItem[],
    trackStrand: "Academic" | "TechPro",
    gradeLevel: number = 11
  ) => {
    const totalCount = coreSubjects.length + electiveSubjects.length;
    const defaultElectiveType = trackStrand === "TechPro" ? "Specialized" : "Elective";

    return (
      <div className="bg-white border-2 border-slate-300 shadow-xs mb-6 overflow-hidden">
        {/* Main Subheading Header Bar */}
        <div className="bg-slate-100 border-b-2 border-slate-300 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-6 bg-[#002060]" />
            <div>
              <h4 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#002060]">
                {subHeadingTitle}
              </h4>
              <span className="text-[10px] font-mono text-slate-500 block uppercase">
                {totalCount} Total Subject Offerings ({coreSubjects.length} Core • {electiveSubjects.length} Elective / Specialized)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleOpenCreateModal(gradeLevel, trackStrand, "Core", {
                  track: trackStrand,
                  category: "Core",
                  grade: gradeLevel,
                })
              }
              className="px-3 py-1.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
            >
              + Add Core Subject
            </button>
            <button
              type="button"
              onClick={() =>
                handleOpenCreateModal(gradeLevel, trackStrand, defaultElectiveType, {
                  track: trackStrand,
                  category: "Elective",
                  grade: gradeLevel,
                })
              }
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
            >
              + Add Elective Subject
            </button>
          </div>
        </div>

        {/* SUBSECTION 1: CORE SUBJECTS */}
        <div className="border-b-4 border-slate-300">
          <div className="bg-blue-50/70 border-b border-blue-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider">
                Core Subjects
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-100 text-[#002060] font-bold border border-blue-300">
                {coreSubjects.length} {coreSubjects.length === 1 ? "COURSE" : "COURSES"}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                handleOpenCreateModal(gradeLevel, trackStrand, "Core", {
                  track: trackStrand,
                  category: "Core",
                  grade: gradeLevel,
                })
              }
              className="text-[11px] font-mono font-bold text-[#002060] hover:underline uppercase cursor-pointer"
            >
              + Add Core
            </button>
          </div>

          {renderSubjectRowsTable(
            coreSubjects,
            `NO CORE SUBJECTS ON RECORD FOR GRADE ${gradeLevel} ${trackStrand.toUpperCase()}`,
            () =>
              handleOpenCreateModal(gradeLevel, trackStrand, "Core", {
                track: trackStrand,
                category: "Core",
                grade: gradeLevel,
              }),
            "+ Add Core Subject"
          )}
        </div>

        {/* SUBSECTION 2: ELECTIVE PART */}
        <div>
          <div className="bg-purple-50/60 border-b border-purple-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-purple-950 uppercase tracking-wider">
                Elective Part
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-purple-100 text-purple-950 font-bold border border-purple-300">
                {electiveSubjects.length} {electiveSubjects.length === 1 ? "COURSE" : "COURSES"}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                handleOpenCreateModal(gradeLevel, trackStrand, defaultElectiveType, {
                  track: trackStrand,
                  category: "Elective",
                  grade: gradeLevel,
                })
              }
              className="text-[11px] font-mono font-bold text-purple-900 hover:underline uppercase cursor-pointer"
            >
              + Add Elective
            </button>
          </div>

          {renderSubjectRowsTable(
            electiveSubjects,
            `NO ELECTIVE / SPECIALIZED SUBJECTS ON RECORD FOR GRADE ${gradeLevel} ${trackStrand.toUpperCase()}`,
            () =>
              handleOpenCreateModal(gradeLevel, trackStrand, defaultElectiveType, {
                track: trackStrand,
                category: "Elective",
                grade: gradeLevel,
              }),
            "+ Add Elective Subject"
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Top Header Card */}
      <div className="bg-white border-2 border-slate-300 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#002060]">
              [ DEPED COURSE CATALOG &amp; SUBJECT OFFERINGS ]
            </span>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 uppercase">
              Live Subject Catalog
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 uppercase">
            Subjects Management Console
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Manage official learning areas and subjects across Junior High School (Grades 7–10) and Senior High School (Grades 11–12) at Dumalneg National High School.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchSubjects}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Refresh Subjects
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
          >
            + Add New Subject
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-emerald-950 text-xs font-bold uppercase tracking-wide flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-emerald-800 hover:text-emerald-950 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border-2 border-red-500 text-red-950 text-xs font-bold uppercase tracking-wide flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-red-800 hover:text-red-950 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
        <div className="bg-white border-2 border-slate-300 p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Total Active Subjects
          </span>
          <div className="text-2xl font-mono font-bold text-[#002060]">{totalCount}</div>
          <span className="text-[10px] text-slate-500 block">Across all Grade 7-12 levels</span>
        </div>

        <div className="bg-white border-2 border-slate-300 p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            JHS Subjects (Grades 7–10)
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-800">{jhsTotal}</div>
          <span className="text-[10px] text-slate-500 block">Regular &amp; Special Program in Sports</span>
        </div>

        <div className="bg-white border-2 border-slate-300 p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            SHS Subjects (Grades 11–12)
          </span>
          <div className="text-2xl font-mono font-bold text-blue-800">{shsTotal}</div>
          <span className="text-[10px] text-slate-500 block">STEM, TVL, HUMSS &amp; Core Tracks</span>
        </div>

        <div className="bg-white border-2 border-slate-300 p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Specialized &amp; Electives
          </span>
          <div className="text-2xl font-mono font-bold text-indigo-800">{electivesCount}</div>
          <span className="text-[10px] text-slate-500 block">Applied, Sports &amp; Track Subjects</span>
        </div>
      </div>

      {/* Global Filter & Search Bar */}
      <div className="bg-white border-2 border-slate-300 p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Subject Code, Title, or Track..."
              className="w-full pl-3 pr-7 py-2 bg-white border border-slate-300 text-xs font-mono font-bold focus:border-[#002060] outline-none"
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

          {/* Classification Type Filter */}
          <CustomSelect
            label="Type:"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "ALL", label: "All Classification Types" },
              { value: "Core", label: "Core Subjects" },
              { value: "Specialized", label: "Specialized Subjects" },
              { value: "Applied", label: "Applied Subjects" },
              { value: "Elective", label: "Elective Subjects" },
              { value: "Intervention", label: "Intervention (ARAL)" },
            ]}
          />

          {/* Strand Filter */}
          <CustomSelect
            label="Program:"
            value={strandFilter}
            onChange={setStrandFilter}
            options={[
              { value: "ALL", label: "All Programs / Tracks" },
              { value: "Academic", label: "Academic Track (Strengthened SHS)" },
              { value: "TechPro", label: "Technical-Professional (TechPro) Track" },
              { value: "Regular", label: "Regular Basic Education (JHS)" },
              { value: "SPS", label: "Special Program in Sports (SPS)" },
              { value: "STEM", label: "STEM Track (Legacy SHS)" },
              { value: "TVL-ICT", label: "TVL-ICT Track (Legacy SHS)" },
              { value: "HUMSS", label: "HUMSS Track (Legacy SHS)" },
              { value: "General", label: "General / Core (SHS)" },
            ]}
          />
        </div>

        {/* Active Filter Indicator */}
        {(typeFilter !== "ALL" || strandFilter !== "ALL" || searchQuery.trim()) && (
          <div className="p-2.5 bg-blue-50/80 border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-[#002060]">
              Active Filter: Showing <strong>{filteredSubjects.length}</strong> of{" "}
              <strong>{totalCount}</strong> subjects across all levels.
            </span>
            <button
              type="button"
              onClick={() => {
                setTypeFilter("ALL");
                setStrandFilter("ALL");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-red-700 hover:text-red-900 underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* LOADING STATE */}
      {isLoading && (
        <div className="bg-white border-2 border-slate-300 p-12 text-center shadow-xs">
          <div className="w-6 h-6 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs font-mono text-slate-600 uppercase block font-bold">
            Loading Subjects Database...
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. JHS (HEADINGS) SECTION */}
      {/* ========================================================================= */}
      {!isLoading && (
        <section className="border-4 border-[#002060] bg-slate-50 shadow-md">
          {/* Main JHS Heading Bar */}
          <div className="bg-[#002060] text-white p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-4 border-amber-400">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest bg-blue-900 border border-blue-300/40 px-2 py-0.5 font-bold text-blue-200">
                  DEPED BASIC EDUCATION
                </span>
                <span className="text-[10px] font-mono uppercase bg-emerald-900/90 border border-emerald-400/40 px-2 py-0.5 font-bold text-emerald-200">
                  Grades 7, 8, 9, and 10
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight uppercase text-white">
                JHS (Headings)
              </h3>
              <p className="text-xs text-blue-100 mt-0.5 max-w-xl">
                Junior High School official learning areas for Regular Basic Education and General Special Program in Sports (SPS).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1.5 text-white border border-white/20">
                {jhsTotal} Subjects on Record
              </span>
              <button
                type="button"
                onClick={() => handleOpenCreateModal(7, "Regular")}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
              >
                + Add JHS Subject
              </button>
            </div>
          </div>

          {/* JHS Sub-Headings Stack */}
          <div className="p-4 sm:p-6 space-y-2">
            {/* Grade 7 Sub-Heading */}
            {renderSubjectTable(
              jhsGrade7,
              7,
              "Grade 7 (Sub Headings)",
              "Regular",
              "+ Add Grade 7 Subject"
            )}

            {/* Grade 8 Sub-Heading */}
            {renderSubjectTable(
              jhsGrade8,
              8,
              "Grade 8 (Sub Headings)",
              "Regular",
              "+ Add Grade 8 Subject"
            )}

            {/* Grade 9 Sub-Heading */}
            {renderSubjectTable(
              jhsGrade9,
              9,
              "Grade 9 (Sub Headings)",
              "Regular",
              "+ Add Grade 9 Subject"
            )}

            {/* Grade 10 Sub-Heading */}
            {renderSubjectTable(
              jhsGrade10,
              10,
              "Grade 10 (Sub Headings)",
              "Regular",
              "+ Add Grade 10 Subject"
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. SHS (HEADINGS) SECTION */}
      {/* ========================================================================= */}
      {!isLoading && (
        <section className="border-4 border-[#0b3c7e] bg-slate-50 shadow-md">
          {/* Main SHS Heading Bar */}
          <div className="bg-[#0b3c7e] text-white p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-4 border-amber-400">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest bg-blue-950 border border-blue-300/40 px-2 py-0.5 font-bold text-blue-200">
                  DEPED SENIOR HIGH SCHOOL
                </span>
                <span className="text-[10px] font-mono uppercase bg-indigo-900/90 border border-indigo-400/40 px-2 py-0.5 font-bold text-indigo-200">
                  Grades 11 and 12
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight uppercase text-white">
                SHS (Headings)
              </h3>
              <p className="text-xs text-blue-100 mt-0.5 max-w-xl">
                Senior High School Academic Tracks (STEM, HUMSS, TVL-ICT) and General Core subject offerings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1.5 text-white border border-white/20">
                {shsTotal} Subjects on Record
              </span>
              <button
                type="button"
                onClick={() => handleOpenCreateModal(11, "Academic")}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
              >
                + Add SHS Subject
              </button>
            </div>
          </div>

          {/* SHS Sub-Headings Stack */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Grade 11 Academic (Sub Headings) */}
            {renderSeparatedTrackBox(
              "Grade 11 Academic (Sub Headings)",
              shsGrade11AcademicCore,
              shsGrade11AcademicElectives,
              "Academic",
              11
            )}

            {/* Grade 11 Techpro (Sub Headings) */}
            {renderSeparatedTrackBox(
              "Grade 11 Techpro (Sub Headings)",
              shsGrade11TechproCore,
              shsGrade11TechproElectives,
              "TechPro",
              11
            )}

            {/* Grade 12 Academic (Sub Headings) */}
            {renderSeparatedTrackBox(
              "Grade 12 Academic (Sub Headings)",
              shsGrade12AcademicCore,
              shsGrade12AcademicElectives,
              "Academic",
              12
            )}

            {/* Grade 12 Techpro (Sub Headings) */}
            {renderSeparatedTrackBox(
              "Grade 12 Techpro (Sub Headings)",
              shsGrade12TechproCore,
              shsGrade12TechproElectives,
              "TechPro",
              12
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. CREATE / EDIT SUBJECT MODAL (NO TRIMESTER FIELD) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white border-4 border-[#002060] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#002060] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-200 uppercase tracking-widest block">
                  DEPED SUBJECT MANAGEMENT
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight">
                  {isEditing
                    ? "Edit Subject"
                    : modalLockedTrack
                    ? `Add Grade ${modalLockedTrack.grade || formGrade} ${modalLockedTrack.track} ${
                        modalLockedTrack.category === "Core" ? "Core Subject" : "Elective Subject"
                      }`
                    : "Add New Subject"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-white hover:text-slate-300 text-lg font-bold px-2 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Locked Track Banner */}
            {modalLockedTrack && (
              <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#002060] uppercase">
                    [ Track Mode: Grade {modalLockedTrack.grade || formGrade} {modalLockedTrack.track.toUpperCase()} ]
                  </span>
                  <span className="text-slate-600 font-bold uppercase">
                    • {modalLockedTrack.category === "Core" ? "Core Subject" : "Elective / Specialized"}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase bg-[#002060] text-white px-2 py-0.5">
                  Locked
                </span>
              </div>
            )}

            {/* Modal Form Body */}
            <form onSubmit={handleSaveSubject} className="p-6 space-y-4 overflow-y-auto text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border-2 border-red-400 text-red-900 font-bold text-xs">
                  {formError}
                </div>
              )}

              {/* Subject Title */}
              <div>
                <label className="block font-bold text-slate-900 uppercase mb-1">
                  Subject Descriptive Title <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={
                    modalLockedTrack?.category === "Core"
                      ? "e.g., General Mathematics, Effective Communication, General Science"
                      : modalLockedTrack?.track === "Academic"
                      ? "e.g., Introduction to Philosophy, Creative Writing, Philippine Politics"
                      : "e.g., Computer Systems Servicing, Work Immersion, Electrical Installation Maintenance"
                  }
                  className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  required
                />
              </div>

              {/* Subject Code + Auto-generate Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-900 uppercase">
                    Subject Code <span className="text-red-700">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="text-[10px] font-mono text-[#002060] hover:underline font-bold cursor-pointer"
                  >
                    Auto-Generate Code
                  </button>
                </div>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder={
                    modalLockedTrack
                      ? modalLockedTrack.track === "Academic"
                        ? modalLockedTrack.category === "Core"
                          ? `e.g., SHS-ACAD-CORE-MATH${modalLockedTrack.grade || formGrade}`
                          : `e.g., SHS-ACAD-ELEC-PHIL${modalLockedTrack.grade || formGrade}`
                        : modalLockedTrack.category === "Core"
                        ? `e.g., SHS-TECH-CORE-MATH${modalLockedTrack.grade || formGrade}`
                        : `e.g., SHS-TECH-ELEC-CSS${modalLockedTrack.grade || formGrade}`
                      : "e.g., JHS-MATH7, SHS-STEM-PRECAL11"
                  }
                  disabled={isEditing}
                  className={`w-full p-2.5 border-2 text-xs font-mono font-bold outline-none uppercase ${
                    isEditing
                      ? "bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed"
                      : "bg-white border-slate-300 focus:border-[#002060]"
                  }`}
                  required
                />
                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                  Standard format: LEVEL-STRAND-TITLE-GRADE
                </span>
              </div>

              {/* Grade Level & Classification Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Grade Level */}
                <div>
                  <label className="block font-bold text-slate-900 uppercase mb-1">
                    Grade Level <span className="text-red-700">*</span>
                  </label>
                  {modalLockedTrack ? (
                    <div className="w-full p-2.5 bg-slate-100 border-2 border-slate-300 text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="font-mono text-slate-900">
                        Grade {modalLockedTrack.grade || formGrade} (SHS)
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-2 py-0.5 border border-slate-300 font-bold">
                        Locked
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formGrade}
                      onChange={(e) => {
                        const g = Number(e.target.value);
                        setFormGrade(g);
                        if (g <= 10 && formStrand !== "Regular" && formStrand !== "SPS") {
                          setFormStrand("Regular");
                        } else if (g >= 11 && (formStrand === "Regular" || formStrand === "SPS")) {
                          setFormStrand("Academic");
                        }
                      }}
                      className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                    >
                      <option value={7}>Grade 7 (JHS)</option>
                      <option value={8}>Grade 8 (JHS)</option>
                      <option value={9}>Grade 9 (JHS)</option>
                      <option value={10}>Grade 10 (JHS)</option>
                      <option value={11}>Grade 11 (SHS)</option>
                      <option value={12}>Grade 12 (SHS)</option>
                    </select>
                  )}
                </div>

                {/* Classification Type */}
                <div>
                  <label className="block font-bold text-slate-900 uppercase mb-1">
                    Classification <span className="text-red-700">*</span>
                  </label>
                  {modalLockedTrack ? (
                    <div
                      className={`w-full p-2.5 border-2 text-xs font-bold flex items-center justify-between ${
                        modalLockedTrack.category === "Core"
                          ? "bg-blue-50 border-[#002060] text-[#002060]"
                          : "bg-purple-50 border-purple-800 text-purple-900"
                      }`}
                    >
                      <span>
                        {modalLockedTrack.category === "Core"
                          ? "Core Subject"
                          : modalLockedTrack.track === "TechPro"
                          ? "Specialized / Elective Subject"
                          : "Elective Subject"}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 text-white font-bold ${
                          modalLockedTrack.category === "Core" ? "bg-[#002060]" : "bg-purple-800"
                        }`}
                      >
                        Locked
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                    >
                      <option value="Core">Core Subject</option>
                      <option value="Specialized">Specialized Subject</option>
                      <option value="Applied">Applied Subject</option>
                      <option value="Elective">Elective</option>
                      <option value="Intervention">Intervention (ARAL)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Program / Strand Selection */}
              <div>
                <label className="block font-bold text-slate-900 uppercase mb-1">
                  Program / Strand Designation <span className="text-red-700">*</span>
                </label>
                {modalLockedTrack ? (
                  <div className="w-full p-2.5 bg-amber-50 border-2 border-amber-500 text-xs font-bold text-slate-950 flex items-center justify-between">
                    <div>
                      <span className="block text-slate-900 font-bold">
                        {modalLockedTrack.track === "Academic"
                          ? "Academic Track (Strengthened SHS)"
                          : "Technical-Professional Track (TechPro)"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 font-normal block mt-0.5">
                        Automatic designation for Grade {modalLockedTrack.grade || formGrade} {modalLockedTrack.track}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-amber-400 text-slate-950 px-2 py-0.5 font-bold border border-amber-600">
                      Auto-Assigned
                    </span>
                  </div>
                ) : formGrade <= 10 ? (
                  <select
                    value={formStrand}
                    onChange={(e) => setFormStrand(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  >
                    <option value="Regular">Regular Basic Education</option>
                    <option value="SPS">Special Program in Sports (General SPS)</option>
                  </select>
                ) : (
                  <select
                    value={formStrand}
                    onChange={(e) => setFormStrand(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  >
                    <option value="Academic">Academic Track (Strengthened SHS)</option>
                    <option value="TechPro">Technical-Professional Track (TechPro)</option>
                    <option value="General">General (All SHS Tracks / Core)</option>
                    <option value="STEM">Science, Technology, Engineering &amp; Math (STEM)</option>
                    <option value="TVL-ICT">TVL - Information &amp; Communications Tech (ICT)</option>
                    <option value="HUMSS">Humanities &amp; Social Sciences (HUMSS)</option>
                    <option value="GAS">General Academic Strand (GAS)</option>
                    <option value="ABM">Accountancy, Business &amp; Management (ABM)</option>
                    <option value="TVL-Agri-Fishery">TVL - Agri-Fishery Arts</option>
                  </select>
                )}
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block font-bold text-slate-900 uppercase mb-1">
                  Description / Prerequisites (Optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Notes, course objectives, or learning area scope..."
                  className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none font-sans"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:bg-slate-400"
                >
                  {isSaving
                    ? "Saving..."
                    : isEditing
                    ? "Update Subject"
                    : "Save Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONFIRM DELETE MODAL */}
      {/* ========================================================================= */}
      {deleteSubjectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white border-4 border-red-700 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="border-b border-red-200 pb-2">
              <span className="text-[10px] font-mono font-bold text-red-700 uppercase tracking-widest block">
                CONFIRM REMOVAL OF SUBJECT
              </span>
              <h3 className="text-base font-bold text-slate-900 uppercase">
                Remove Subject?
              </h3>
            </div>

            <div className="p-3 bg-red-50 border border-red-300 text-xs space-y-1 text-red-950">
              <p>Are you sure you want to remove the following subject?</p>
              <div className="font-mono font-bold text-sm text-[#002060]">
                {deleteSubjectTarget.subject_code}
              </div>
              <div className="font-bold text-slate-900">
                {deleteSubjectTarget.subject_name}
              </div>
              <div className="text-[11px] text-slate-600">
                Grade {deleteSubjectTarget.grade_level}{" "}
                {deleteSubjectTarget.strand ? `• ${deleteSubjectTarget.strand}` : ""}
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Note: If this subject is actively assigned in any existing class schedules, removal will be prevented to protect timetable integrity.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteSubjectTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:bg-slate-400"
              >
                {isDeleting ? "Removing..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
