"use client";

import React, { useState, useEffect } from "react";
import { CourseSubjectItem } from "@/app/api/subjects/route";

export default function CurriculumSubjectsConsole() {
  const [subjects, setSubjects] = useState<CourseSubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Filters
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [trimesterFilter, setTrimesterFilter] = useState<string>("ALL");
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
  const [formTrimester, setFormTrimester] = useState<number>(1);
  const [formStrand, setFormStrand] = useState<string>("Regular");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

  // Filter subjects based on active selections
  const filteredSubjects = subjects.filter((s) => {
    if (gradeFilter !== "ALL" && s.grade_level !== Number(gradeFilter)) return false;
    if (trimesterFilter !== "ALL" && s.trimester !== Number(trimesterFilter)) return false;
    if (typeFilter !== "ALL" && s.subject_type.toUpperCase() !== typeFilter.toUpperCase()) return false;
    if (strandFilter !== "ALL") {
      if (!s.strand) return false;
      if (s.strand.toUpperCase() !== strandFilter.toUpperCase()) return false;
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
  const jhsCount = subjects.filter((s) => s.grade_level <= 10).length;
  const shsCount = subjects.filter((s) => s.grade_level >= 11).length;
  const electivesCount = subjects.filter((s) => s.subject_type === "Elective" || s.subject_type === "Specialized").length;

  // Auto-generate code helper
  const handleAutoGenerateCode = () => {
    const isJhs = formGrade <= 10;
    const prefix = isJhs ? "JHS" : "SHS";
    const cleaned = formName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    const codeTag = cleaned || "SUBJ";
    const generated = `${prefix}-${codeTag}${formGrade}-T${formTrimester}`;
    setFormCode(generated);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId("");
    setFormCode("");
    setFormName("");
    setFormType("Core");
    setFormGrade(7);
    setFormTrimester(1);
    setFormStrand("Regular");
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
    setFormTrimester(s.trimester);
    setFormStrand(s.strand || (s.grade_level <= 10 ? "Regular" : "General"));
    setFormDescription(s.description || "");
    setFormError("");
    setIsModalOpen(true);
  };

  // Save Subject (Create or Edit)
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formCode.trim()) {
      setFormError("Subject Code is required (e.g., JHS-ENG7-T1).");
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
      const payload = {
        id: editingId || undefined,
        subject_code: formCode.trim().toUpperCase(),
        subject_name: formName.trim(),
        subject_type: formType,
        grade_level: formGrade,
        trimester: formTrimester,
        strand: formStrand || null,
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
        setSuccessMessage(
          isEditing
            ? `Subject [ ${formCode.toUpperCase()} ] updated successfully.`
            : `New subject [ ${formCode.toUpperCase()} ] created successfully.`
        );
        fetchSubjects();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
          window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
        }
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
      const res = await fetch(`/api/subjects?subjectCode=${encodeURIComponent(deleteSubjectTarget.subject_code)}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`Subject [ ${deleteSubjectTarget.subject_code} ] removed successfully.`);
        setDeleteSubjectTarget(null);
        fetchSubjects();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
          window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
        }
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        alert(json.error || "Failed to delete subject.");
      }
    } catch (err: any) {
      alert(err.message || "Error deleting subject.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
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
            [ Refresh Roster ]
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
          >
            [ + Add New Subject ]
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
        <div className="bg-white border-2 border-slate-300 p-4 space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Total Active Subjects
          </span>
          <div className="text-2xl font-mono font-bold text-[#002060]">{totalCount}</div>
          <span className="text-[10px] text-slate-500 block">Across all Grade 7-12 offerings</span>
        </div>

        <div className="bg-white border-2 border-slate-300 p-4 space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            JHS Core &amp; SPS Subjects
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-800">{jhsCount}</div>
          <span className="text-[10px] text-slate-500 block">Grades 7, 8, 9, and 10</span>
        </div>

        <div className="bg-white border-2 border-slate-300 p-4 space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Senior High School (SHS)
          </span>
          <div className="text-2xl font-mono font-bold text-blue-800">{shsCount}</div>
          <span className="text-[10px] text-slate-500 block">Grades 11 and 12</span>
        </div>

        <div className="bg-white border-2 border-slate-300 p-4 space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Specialized &amp; Electives
          </span>
          <div className="text-2xl font-mono font-bold text-indigo-800">{electivesCount}</div>
          <span className="text-[10px] text-slate-500 block">Strand &amp; Cross-Strand subjects</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border-2 border-slate-300 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Grade Level Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">Grade:</span>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#002060] outline-none cursor-pointer"
              >
                <option value="ALL">All Grades (7-12)</option>
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11 (SHS)</option>
                <option value="12">Grade 12 (SHS)</option>
              </select>
            </div>

            {/* Trimester Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">Trimester:</span>
              <select
                value={trimesterFilter}
                onChange={(e) => setTrimesterFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#002060] outline-none cursor-pointer"
              >
                <option value="ALL">All Trimesters</option>
                <option value="1">Trimester 1</option>
                <option value="2">Trimester 2</option>
                <option value="3">Trimester 3</option>
              </select>
            </div>

            {/* Subject Type Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#002060] outline-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="Core">Core Subject</option>
                <option value="Elective">Elective</option>
                <option value="Applied">Applied</option>
                <option value="Specialized">Specialized</option>
                <option value="Intervention">Intervention (ARAL)</option>
              </select>
            </div>

            {/* Strand / Program Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">Program:</span>
              <select
                value={strandFilter}
                onChange={(e) => setStrandFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#002060] outline-none cursor-pointer"
              >
                <option value="ALL">All Programs / Strands</option>
                <option value="Regular">JHS Regular</option>
                <option value="SPS">JHS SPS (General)</option>
                <option value="General">SHS General</option>
                <option value="STEM">SHS STEM</option>
                <option value="TVL-ICT">SHS TVL-ICT</option>
                <option value="HUMSS">SHS HUMSS</option>
                <option value="TVL-Agri-Fishery">SHS TVL-Agri</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px] sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Subject Code or Title..."
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

        {/* Active Filter Indicator */}
        {(gradeFilter !== "ALL" || trimesterFilter !== "ALL" || typeFilter !== "ALL" || strandFilter !== "ALL" || searchQuery.trim()) && (
          <div className="p-2.5 bg-blue-50/80 border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-[#002060]">
              Active Filters: Showing <strong>{filteredSubjects.length}</strong> of <strong>{totalCount}</strong> subjects.
            </span>
            <button
              type="button"
              onClick={() => {
                setGradeFilter("ALL");
                setTrimesterFilter("ALL");
                setTypeFilter("ALL");
                setStrandFilter("ALL");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-red-700 hover:text-red-900 underline cursor-pointer"
            >
              [ Reset All Filters ]
            </button>
          </div>
        )}
      </div>

      {/* Subjects Table */}
      <div className="bg-white border-2 border-slate-300 shadow-xs overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs font-mono text-slate-600 uppercase block font-bold">
              Loading Subjects Database...
            </span>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
              [ NO SUBJECTS FOUND MATCHING ACTIVE FILTERS ]
            </span>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No subjects match the selected grade level, trimester, subject type, or search term. Click the button below to reset filters or create a new subject.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGradeFilter("ALL");
                  setTrimesterFilter("ALL");
                  setTypeFilter("ALL");
                  setStrandFilter("ALL");
                  setSearchQuery("");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 uppercase tracking-wider transition-colors cursor-pointer"
              >
                [ View All Subjects ]
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                [ + Create Subject ]
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="p-3">Subject Code</th>
                <th className="p-3">Official Subject Title</th>
                <th className="p-3">Classification</th>
                <th className="p-3">Grade &amp; Program</th>
                <th className="p-3">Trimester</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSubjects.map((sub) => {
                const isJhs = sub.grade_level <= 10;
                return (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    {/* Subject Code */}
                    <td className="p-3 font-mono font-bold text-[#002060]">
                      {sub.subject_code}
                    </td>

                    {/* Subject Title */}
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">
                        {sub.subject_name}
                      </span>
                      {sub.description && (
                        <span className="text-[11px] text-slate-500 block line-clamp-1">
                          {sub.description}
                        </span>
                      )}
                    </td>

                    {/* Classification Type Badge */}
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

                    {/* Grade Level & Program */}
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">
                        Grade {sub.grade_level} {isJhs ? "JHS" : "SHS"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 block">
                        {isJhs
                          ? sub.strand === "SPS"
                            ? "Special Program in Sports (General SPS)"
                            : "Regular Basic Education"
                          : sub.strand
                          ? `Strand: ${sub.strand}`
                          : "General Academic"}
                      </span>
                    </td>

                    {/* Trimester */}
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        Trimester {sub.trimester}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(sub)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        [ Edit ]
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteSubjectTarget(sub)}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        [ Delete ]
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE / EDIT SUBJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white border-4 border-[#002060] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#002060] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-200 uppercase tracking-widest block">
                  [ DEPED SUBJECT MANAGEMENT ]
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight">
                  {isEditing ? "Edit Subject" : "Add New Subject"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-slate-300 text-lg font-bold px-2 py-0.5"
              >
                ✕
              </button>
            </div>

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
                  placeholder="e.g., General Biology 1, Mathematics, Technical Drafting"
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
                    className="text-[10px] font-mono text-[#002060] hover:underline font-bold"
                  >
                    [ Auto-Generate Code ]
                  </button>
                </div>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g., JHS-MTH7-T1, SHS-GMATH11-T1"
                  disabled={isEditing}
                  className={`w-full p-2.5 border-2 text-xs font-mono font-bold outline-none uppercase ${
                    isEditing ? "bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300 focus:border-[#002060]"
                  }`}
                  required
                />
                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                  Standard format: [LEVEL]-[CODE][GRADE]-T[TRIMESTER]
                </span>
              </div>

              {/* Grade Level, Trimester & Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Grade Level */}
                <div>
                  <label className="block font-bold text-slate-900 uppercase mb-1">
                    Grade Level <span className="text-red-700">*</span>
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => {
                      const g = Number(e.target.value);
                      setFormGrade(g);
                      if (g <= 10 && formStrand !== "Regular" && formStrand !== "SPS") {
                        setFormStrand("Regular");
                      } else if (g >= 11 && (formStrand === "Regular" || formStrand === "SPS")) {
                        setFormStrand("General");
                      }
                    }}
                    className="w-full p-2 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  >
                    <option value={7}>Grade 7 (JHS)</option>
                    <option value={8}>Grade 8 (JHS)</option>
                    <option value={9}>Grade 9 (JHS)</option>
                    <option value={10}>Grade 10 (JHS)</option>
                    <option value={11}>Grade 11 (SHS)</option>
                    <option value={12}>Grade 12 (SHS)</option>
                  </select>
                </div>

                {/* Trimester */}
                <div>
                  <label className="block font-bold text-slate-900 uppercase mb-1">
                    Trimester <span className="text-red-700">*</span>
                  </label>
                  <select
                    value={formTrimester}
                    onChange={(e) => setFormTrimester(Number(e.target.value))}
                    className="w-full p-2 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  >
                    <option value={1}>Trimester 1</option>
                    <option value={2}>Trimester 2</option>
                    <option value={3}>Trimester 3</option>
                  </select>
                </div>

                {/* Classification Type */}
                <div>
                  <label className="block font-bold text-slate-900 uppercase mb-1">
                    Classification <span className="text-red-700">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-2 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  >
                    <option value="Core">Core Subject</option>
                    <option value="Elective">Elective</option>
                    <option value="Specialized">Specialized</option>
                    <option value="Applied">Applied</option>
                    <option value="Intervention">Intervention (ARAL)</option>
                  </select>
                </div>
              </div>

              {/* Program / Strand Selection */}
              <div>
                <label className="block font-bold text-slate-900 uppercase mb-1">
                  Program / Strand Designation
                </label>
                {formGrade <= 10 ? (
                  <select
                    value={formStrand}
                    onChange={(e) => setFormStrand(e.target.value)}
                    className="w-full p-2 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  >
                    <option value="Regular">Regular Basic Education</option>
                    <option value="SPS">Special Program in Sports (General SPS)</option>
                  </select>
                ) : (
                  <select
                    value={formStrand}
                    onChange={(e) => setFormStrand(e.target.value)}
                    className="w-full p-2 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  >
                    <option value="General">General (All SHS Tracks)</option>
                    <option value="STEM">Science, Technology, Engineering &amp; Math (STEM)</option>
                    <option value="TVL-ICT">TVL - Information &amp; Communications Technology</option>
                    <option value="HUMSS">Humanities and Social Sciences (HUMSS)</option>
                    <option value="TVL-Agri-Fishery">TVL - Agri-Fishery Arts</option>
                    <option value="TVL-HE">TVL - Home Economics</option>
                    <option value="GAS">General Academic Strand (GAS)</option>
                  </select>
                )}
              </div>

              {/* Description / Course Notes */}
              <div>
                <label className="block font-bold text-slate-900 uppercase mb-1">
                  Course Description / Curriculum Notes (Optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Additional syllabus notes, prerequisites, or DepEd learning competencies..."
                  className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-medium focus:border-[#002060] outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  [ Cancel ]
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer disabled:bg-slate-400"
                >
                  {isSaving ? "Saving..." : isEditing ? "[ Update Subject ]" : "[ Save Subject Offering ]"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteSubjectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white border-4 border-red-700 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="border-b border-red-200 pb-2">
              <span className="text-[10px] font-mono font-bold text-red-700 uppercase tracking-widest block">
                [ CONFIRM REMOVAL OF SUBJECT ]
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
                Grade {deleteSubjectTarget.grade_level} &bull; Trimester {deleteSubjectTarget.trimester}
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
                [ Cancel ]
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:bg-slate-400"
              >
                {isDeleting ? "Removing..." : "[ Confirm Delete ]"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
