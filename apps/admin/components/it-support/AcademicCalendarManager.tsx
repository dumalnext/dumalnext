"use client";

import React, { useState, useEffect } from "react";

export interface AcademicTerm {
  id: string;
  schoolYear: string;
  termNumber: number;
  termName: string;
  totalClassDays: number | null;
  startDate: string | null;
  endDate: string | null;
  openingBlockStart: string | null;
  openingBlockEnd: string | null;
  instructionalStart: string | null;
  instructionalEnd: string | null;
  endOfTermStart: string | null;
  endOfTermEnd: string | null;
  summative1Date: string | null;
  summative2Date: string | null;
  termExamDates: string | null;
  reportCardDate: string | null;
  isActive: boolean;
}

export default function AcademicCalendarManager() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // View Mode: "table" or "boxes"
  const [viewMode, setViewMode] = useState<"table" | "boxes">("table");

  // School Year Initialization Modal
  const [isAddSYModalOpen, setIsAddSYModalOpen] = useState(false);
  const [newSchoolYear, setNewSchoolYear] = useState("2027-2028");

  // Inline Expanded Trimester Editing State
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTerms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/it-support/terms");
      const json = await res.json();
      if (json.success) {
        setTerms(json.terms || []);
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to load academic terms." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Network error loading academic terms." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  // One-click Activate Term
  const handleActivate = async (termId: string, label: string) => {
    try {
      const res = await fetch("/api/it-support/terms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: termId }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: "success", text: `${label} has been activated as the official school calendar.` });
        fetchTerms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to activate term." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Failed to activate academic term." });
    }
  };

  // Toggle Inline Box Expansion for Editing
  const handleToggleEdit = (term: AcademicTerm) => {
    if (expandedTermId === term.id) {
      setExpandedTermId(null);
      setEditingTerm(null);
    } else {
      setExpandedTermId(term.id);
      setEditingTerm({ ...term });
    }
  };

  // Save Edited Term Dates from Expanded Box
  const handleSaveTermDates = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingTerm) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/it-support/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTerm),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: "success",
          text: `Updated dates for ${editingTerm.schoolYear} - ${editingTerm.termName}.`,
        });
        setExpandedTermId(null);
        setEditingTerm(null);
        fetchTerms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to update term dates." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Error saving trimester dates." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create New School Year (Generates Trimester 1, 2, 3 with "---")
  const handleCreateSchoolYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolYear.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/it-support/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_school_year",
          schoolYear: newSchoolYear.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: "success",
          text: `School Year ${newSchoolYear} initialized with Trimesters 1, 2, and 3. Click [ EDIT ] on any trimester to expand and configure dates.`,
        });
        setIsAddSYModalOpen(false);
        setNewSchoolYear("");
        fetchTerms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to create School Year." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Error creating School Year." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTerm = terms.find((t) => t.isActive);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Policy Guideline Banner */}
      <div className="p-4 bg-blue-50 border-2 border-[#002060]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
              [ DEPED POLICY GUIDELINE: DYNAMIC TRISEM CALENDAR CONFIGURATION ]
            </span>
            <p className="text-xs text-slate-700 mt-1">
              Zero Hardcoded Dates: School year boundaries, instructional periods, summative deadlines, and report card distribution dates are strictly configured dynamically through this IT Support console.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddSYModalOpen(true)}
              className="px-4 py-2 bg-[#002060] hover:bg-[#001845] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
            >
              [ + CONFIGURE NEW TERM ]
            </button>
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-3 border-2 text-xs font-bold ${
            statusMessage.type === "success"
              ? "bg-green-50 border-green-600 text-green-900"
              : "bg-red-50 border-red-600 text-red-900"
          }`}
        >
          {statusMessage.type === "success" ? "[ STATUS ]: " : "[ ERROR ]: "}
          {statusMessage.text}
        </div>
      )}

      {/* Currently Active Academic Calendar Spotlight */}
      <div className="p-5 bg-white border-2 border-slate-300 shadow-xs">
        <div className="border-b border-slate-200 pb-3 mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              CURRENTLY ACTIVE ACADEMIC CALENDAR
            </span>
            <h3 className="text-lg font-black text-slate-950 uppercase">
              {activeTerm ? `SY ${activeTerm.schoolYear} • ${activeTerm.termName}` : "NO ACTIVE TERM CONFIGURED"}
            </h3>
          </div>
          {activeTerm && (
            <span className="bg-green-700 text-white font-mono font-bold text-xs px-2.5 py-1 uppercase tracking-widest">
              ACTIVE
            </span>
          )}
        </div>

        {activeTerm ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Term Duration</span>
              <div className="font-bold text-slate-900 mt-0.5">
                {activeTerm.startDate || "---"} to {activeTerm.endDate || "---"}
              </div>
              <span className="text-[10px] text-slate-600 font-mono mt-0.5 block">
                {activeTerm.totalClassDays ? `${activeTerm.totalClassDays} Class Days` : "---"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Instructional Block</span>
              <div className="font-bold text-slate-900 mt-0.5">
                {activeTerm.instructionalStart || "---"} to {activeTerm.instructionalEnd || "---"}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Late Enrollment Cutoff (Summative 2)</span>
              <div className="font-bold text-red-800 mt-0.5 font-mono">
                {activeTerm.summative2Date || "---"}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Report Card Distribution (PTC)</span>
              <div className="font-bold text-[#002060] mt-0.5 font-mono">
                {activeTerm.reportCardDate || "---"}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Please configure and activate an academic trimester to establish enrollment cutoff parameters and term schedules.
          </p>
        )}
      </div>

      {/* Main Section: Registered Academic Terms with Inline Expansion */}
      <div className="bg-white border-2 border-slate-300">
        <div className="px-5 py-3 border-b-2 border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              REGISTERED ACADEMIC TERMS • DUMALNEG NATIONAL HIGH SCHOOL
            </h3>
            <span className="text-[11px] font-mono font-bold text-slate-600">
              TOTAL CONFIGURED: {terms.length}
            </span>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#002060] text-white"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              [ Table View ]
            </button>
            <button
              type="button"
              onClick={() => setViewMode("boxes")}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                viewMode === "boxes"
                  ? "bg-[#002060] text-white"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              [ Trimester Boxes View ]
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500 uppercase">
            [ Loading Academic Terms from PostgreSQL Database... ]
          </div>
        ) : terms.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600">
            No academic terms configured yet. Click &quot;Configure New Term&quot; to initialize a School Year.
          </div>
        ) : viewMode === "table" ? (
          /* TABLE VIEW WITH INLINE VERTICALLY SCROLLABLE EXPANDED BOX */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-mono text-[11px] uppercase text-slate-700">
                  <th className="p-3">SCHOOL YEAR</th>
                  <th className="p-3">TRIMESTER</th>
                  <th className="p-3">START DATE</th>
                  <th className="p-3">END DATE</th>
                  <th className="p-3">LATE CUTOFF (SUMMATIVE 2)</th>
                  <th className="p-3">TERM EXAMS</th>
                  <th className="p-3">CARD DAY (PTC)</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {terms.map((term) => {
                  const isExpanded = expandedTermId === term.id;
                  return (
                    <React.Fragment key={term.id}>
                      <tr
                        className={`transition-colors ${
                          isExpanded
                            ? "bg-blue-50/60 border-l-4 border-l-[#002060]"
                            : term.isActive
                            ? "bg-blue-50/30 hover:bg-blue-50/50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Fixed School Year */}
                        <td className="p-3 font-black text-slate-950 font-mono text-xs">
                          {term.schoolYear}
                        </td>

                        {/* Trimester Name */}
                        <td className="p-3 font-bold text-[#002060]">
                          {term.termName}
                        </td>

                        {/* Start Date */}
                        <td className="p-3 font-mono text-slate-800">
                          {term.startDate || "---"}
                        </td>

                        {/* End Date */}
                        <td className="p-3 font-mono text-slate-800">
                          {term.endDate || "---"}
                        </td>

                        {/* Late Cutoff */}
                        <td className="p-3 font-mono font-bold text-red-800">
                          {term.summative2Date || "---"}
                        </td>

                        {/* Term Exams */}
                        <td className="p-3 text-slate-800">
                          {term.termExamDates || "---"}
                        </td>

                        {/* Card Day (PTC) */}
                        <td className="p-3 font-mono text-slate-800">
                          {term.reportCardDate || "---"}
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          {term.isActive ? (
                            <span className="px-2.5 py-1 bg-green-700 text-white font-mono font-bold text-[10px] uppercase tracking-wider inline-block">
                              ACTIVE
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivate(term.id, `${term.schoolYear} ${term.termName}`)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-[#002060] hover:text-white text-slate-700 font-mono font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                              title="Click to activate this trimester for the school"
                            >
                              [ SET ACTIVE ]
                            </button>
                          )}
                        </td>

                        {/* Expand / Edit Action */}
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleEdit(term)}
                            className={`px-3 py-1 border-2 text-[11px] font-bold uppercase transition-colors cursor-pointer shadow-2xs ${
                              isExpanded
                                ? "bg-[#002060] text-white border-[#002060]"
                                : "bg-white hover:bg-slate-100 text-[#002060] border-[#002060]"
                            }`}
                          >
                            {isExpanded ? "[ CLOSE ▲ ]" : "[ EDIT ]"}
                          </button>
                        </td>
                      </tr>

                      {/* INLINE VERTICALLY SCROLLABLE EXPANDED BOX */}
                      {isExpanded && editingTerm && (
                        <tr className="bg-slate-50">
                          <td colSpan={9} className="p-4 border-t-2 border-b-2 border-[#002060]">
                            <div className="bg-white border-2 border-[#002060] p-4 space-y-4 shadow-md">
                              {/* Header inside Expanded Box */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-slate-200">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="px-2.5 py-1 bg-[#002060] text-white font-mono font-bold text-[10px] uppercase tracking-wider">
                                    [ EXPANDED TRIMESTER BOX ]
                                  </span>
                                  <div className="font-mono text-xs">
                                    <span className="text-slate-500 uppercase mr-1">SCHOOL YEAR:</span>
                                    <strong className="text-slate-950 font-black">{editingTerm.schoolYear}</strong>
                                    <span className="ml-1 text-[10px] text-slate-500 font-bold">(FIXED)</span>
                                  </div>
                                  <span className="text-slate-300">|</span>
                                  <div className="font-mono text-xs">
                                    <span className="text-slate-500 uppercase mr-1">TRIMESTER:</span>
                                    <strong className="text-[#002060] font-black">{editingTerm.termName}</strong>
                                    <span className="ml-1 text-[10px] text-slate-500 font-bold">(FIXED)</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedTermId(null);
                                    setEditingTerm(null);
                                  }}
                                  className="text-xs font-mono font-bold text-slate-600 hover:text-slate-950 cursor-pointer"
                                >
                                  [ COLLAPSE BOX ▲ ]
                                </button>
                              </div>

                              {/* VERTICALLY SCROLLABLE BOX CONTAINER (SCROLLABLE PABABA) */}
                              <div className="max-h-[460px] overflow-y-auto pr-2 space-y-4 border-2 border-slate-300 bg-slate-50/70 p-4 shadow-inner">
                                {/* 1. TOTAL CLASS DAYS */}
                                <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1.5">
                                    TOTAL CLASS DAYS
                                  </label>
                                  <input
                                    type="number"
                                    value={editingTerm.totalClassDays || ""}
                                    onChange={(e) => setEditingTerm({ ...editingTerm, totalClassDays: Number(e.target.value) })}
                                    placeholder="e.g. 68"
                                    className="w-full sm:w-60 p-2.5 border-2 border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#002060] outline-none"
                                  />
                                </div>

                                {/* 2. TERM DATE */}
                                <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-2">
                                    TERM DATE
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-3 border-l-4 border-[#002060]">
                                    <div>
                                      <label className="block text-[11px] font-mono font-bold text-slate-700 mb-1">
                                        a. Start:
                                      </label>
                                      <input
                                        type="date"
                                        value={editingTerm.startDate || ""}
                                        onChange={(e) => setEditingTerm({ ...editingTerm, startDate: e.target.value })}
                                        className="w-full p-2 border-2 border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#002060] outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-mono font-bold text-slate-700 mb-1">
                                        b. End:
                                      </label>
                                      <input
                                        type="date"
                                        value={editingTerm.endDate || ""}
                                        onChange={(e) => setEditingTerm({ ...editingTerm, endDate: e.target.value })}
                                        className="w-full p-2 border-2 border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#002060] outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* 3. INSTRUCTIONAL PERIOD */}
                                <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-2">
                                    INSTRUCTIONAL PERIOD
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-3 border-l-4 border-[#002060]">
                                    <div>
                                      <label className="block text-[11px] font-mono font-bold text-slate-700 mb-1">
                                        a. Start:
                                      </label>
                                      <input
                                        type="date"
                                        value={editingTerm.instructionalStart || ""}
                                        onChange={(e) => setEditingTerm({ ...editingTerm, instructionalStart: e.target.value })}
                                        className="w-full p-2 border-2 border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#002060] outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-mono font-bold text-slate-700 mb-1">
                                        b. End:
                                      </label>
                                      <input
                                        type="date"
                                        value={editingTerm.instructionalEnd || ""}
                                        onChange={(e) => setEditingTerm({ ...editingTerm, instructionalEnd: e.target.value })}
                                        className="w-full p-2 border-2 border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#002060] outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* 4. SUMMATIVE TEST DATE */}
                                <div className="p-3 bg-red-50/40 border border-red-200 shadow-2xs">
                                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-red-900 mb-2">
                                    SUMMATIVE TEST DATE
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-3 border-l-4 border-red-500">
                                    <div>
                                      <label className="block text-[11px] font-mono font-bold text-slate-700 mb-1">
                                        a. Start (1st Summative):
                                      </label>
                                      <input
                                        type="date"
                                        value={editingTerm.summative1Date || ""}
                                        onChange={(e) => setEditingTerm({ ...editingTerm, summative1Date: e.target.value })}
                                        className="w-full p-2 border-2 border-slate-300 font-mono text-xs font-bold text-slate-900 bg-white focus:border-[#002060] outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-mono font-bold text-red-900 mb-1">
                                        b. End (2nd Summative / Late Cutoff):
                                      </label>
                                      <input
                                        type="date"
                                        value={editingTerm.summative2Date || ""}
                                        onChange={(e) => setEditingTerm({ ...editingTerm, summative2Date: e.target.value })}
                                        className="w-full p-2 border-2 border-red-400 font-mono text-xs font-bold text-red-900 bg-white focus:border-[#002060] outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* 5. TERM EXAMINATION */}
                                <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-2">
                                    TERM EXAMINATION
                                  </span>
                                  <div className="pl-3 border-l-4 border-[#002060]">
                                    <label className="block text-[11px] font-mono font-bold text-slate-700 mb-1">
                                      Examination Date(s):
                                    </label>
                                    <input
                                      type="text"
                                      value={editingTerm.termExamDates || ""}
                                      onChange={(e) => setEditingTerm({ ...editingTerm, termExamDates: e.target.value })}
                                      placeholder="e.g. Nov 5-6, 2026"
                                      className="w-full sm:w-80 p-2.5 border-2 border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#002060] outline-none"
                                    />
                                  </div>
                                </div>

                                {/* 6. REPORT CARD DISTRIBUTION (PTC) */}
                                <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-2">
                                    REPORT CARD DISTRIBUTION (PTC)
                                  </span>
                                  <div className="pl-3 border-l-4 border-[#002060]">
                                    <label className="block text-[11px] font-mono font-bold text-slate-700 mb-1">
                                      Date:
                                    </label>
                                    <input
                                      type="date"
                                      value={editingTerm.reportCardDate || ""}
                                      onChange={(e) => setEditingTerm({ ...editingTerm, reportCardDate: e.target.value })}
                                      className="w-full sm:w-80 p-2 border-2 border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#002060] outline-none"
                                    />
                                  </div>
                                </div>

                                {/* 7. STATUS (CLICKABLE) */}
                                <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-2">
                                    STATUS (CLICKABLE)
                                  </span>
                                  <div className="pl-3 border-l-4 border-[#002060] flex flex-wrap items-center gap-3">
                                    {editingTerm.isActive ? (
                                      <button
                                        type="button"
                                        onClick={() => setEditingTerm({ ...editingTerm, isActive: false })}
                                        className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                                        title="Click to deactivate"
                                      >
                                        [ ACTIVE OFFICIAL CALENDAR &bull; CLICK TO SET INACTIVE ]
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEditingTerm({ ...editingTerm, isActive: true })}
                                        className="px-4 py-2 bg-[#002060] hover:bg-[#001845] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                                        title="Click to activate"
                                      >
                                        [ CLICK TO ACTIVATE THIS TRIMESTER ]
                                      </button>
                                    )}
                                    <span className="text-[11px] text-slate-600 font-mono">
                                      {editingTerm.isActive
                                        ? "Currently active for school enrollment and scheduling."
                                        : "Currently inactive. Click button to activate."}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Footer for Expanded Box */}
                              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs text-slate-600 font-mono">
                                  Scroll up/down inside the box above to verify all dates before saving.
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedTermId(null);
                                      setEditingTerm(null);
                                    }}
                                    className="px-4 py-2 border-2 border-slate-300 text-slate-700 text-xs font-bold uppercase hover:bg-slate-100 cursor-pointer"
                                  >
                                    [ CANCEL ]
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleSaveTermDates}
                                    className="px-4 py-2 bg-[#002060] text-white text-xs font-bold uppercase hover:bg-[#001845] disabled:opacity-50 cursor-pointer shadow-xs"
                                  >
                                    {isSubmitting ? "[ SAVING TO DATABASE... ]" : `[ SAVE ${editingTerm.termName.toUpperCase()} DATES ]`}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* TRIMESTER BOXES VIEW: Vertically scrollable boxes */
          <div className="p-5 space-y-4 bg-slate-100">
            {terms.map((term) => {
              const isExpanded = expandedTermId === term.id;
              return (
                <div
                  key={term.id}
                  className={`bg-white border-2 transition-shadow ${
                    isExpanded
                      ? "border-[#002060] shadow-md ring-2 ring-[#002060]/20"
                      : term.isActive
                      ? "border-green-700 shadow-xs"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {/* Trimester Box Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black text-slate-950 bg-slate-200 px-2 py-0.5">
                        SY {term.schoolYear}
                      </span>
                      <h4 className="text-sm font-black text-[#002060] uppercase">
                        {term.termName}
                      </h4>
                      {term.isActive ? (
                        <span className="px-2 py-0.5 bg-green-700 text-white font-mono font-bold text-[10px] uppercase tracking-wider">
                          ACTIVE
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(term.id, `${term.schoolYear} ${term.termName}`)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-[#002060] hover:text-white text-slate-700 font-mono font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          [ SET ACTIVE ]
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleEdit(term)}
                      className={`px-3 py-1 border-2 text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                        isExpanded
                          ? "bg-[#002060] text-white border-[#002060]"
                          : "bg-white hover:bg-slate-100 text-[#002060] border-[#002060]"
                      }`}
                    >
                      {isExpanded ? "[ CLOSE BOX ▲ ]" : "[ EDIT DATES ]"}
                    </button>
                  </div>

                  {/* Vertically Scrollable Content Box */}
                  <div className="p-4">
                    <div className="max-h-[440px] overflow-y-auto pr-2 space-y-3 border border-slate-200 bg-slate-50/70 p-4">
                      {/* 1. Total Class Days */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1">
                          TOTAL CLASS DAYS
                        </span>
                        {isExpanded && editingTerm ? (
                          <input
                            type="number"
                            value={editingTerm.totalClassDays || ""}
                            onChange={(e) => setEditingTerm({ ...editingTerm, totalClassDays: Number(e.target.value) })}
                            placeholder="e.g. 68"
                            className="w-full sm:w-48 p-2 border-2 border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#002060] outline-none"
                          />
                        ) : (
                          <div className="font-mono text-xs font-bold text-slate-900">
                            {term.totalClassDays ? `${term.totalClassDays} Days` : "---"}
                          </div>
                        )}
                      </div>

                      {/* 2. Term Date */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1.5">
                          TERM DATE
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 border-l-2 border-[#002060]">
                          <div>
                            <span className="block text-[11px] font-mono text-slate-600">a. Start:</span>
                            {isExpanded && editingTerm ? (
                              <input
                                type="date"
                                value={editingTerm.startDate || ""}
                                onChange={(e) => setEditingTerm({ ...editingTerm, startDate: e.target.value })}
                                className="w-full p-1.5 border border-slate-300 font-mono text-xs font-bold"
                              />
                            ) : (
                              <span className="font-mono text-xs font-bold text-slate-900">{term.startDate || "---"}</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[11px] font-mono text-slate-600">b. End:</span>
                            {isExpanded && editingTerm ? (
                              <input
                                type="date"
                                value={editingTerm.endDate || ""}
                                onChange={(e) => setEditingTerm({ ...editingTerm, endDate: e.target.value })}
                                className="w-full p-1.5 border border-slate-300 font-mono text-xs font-bold"
                              />
                            ) : (
                              <span className="font-mono text-xs font-bold text-slate-900">{term.endDate || "---"}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. Instructional Period */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1.5">
                          INSTRUCTIONAL PERIOD
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 border-l-2 border-[#002060]">
                          <div>
                            <span className="block text-[11px] font-mono text-slate-600">a. Start:</span>
                            {isExpanded && editingTerm ? (
                              <input
                                type="date"
                                value={editingTerm.instructionalStart || ""}
                                onChange={(e) => setEditingTerm({ ...editingTerm, instructionalStart: e.target.value })}
                                className="w-full p-1.5 border border-slate-300 font-mono text-xs font-bold"
                              />
                            ) : (
                              <span className="font-mono text-xs font-bold text-slate-900">{term.instructionalStart || "---"}</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[11px] font-mono text-slate-600">b. End:</span>
                            {isExpanded && editingTerm ? (
                              <input
                                type="date"
                                value={editingTerm.instructionalEnd || ""}
                                onChange={(e) => setEditingTerm({ ...editingTerm, instructionalEnd: e.target.value })}
                                className="w-full p-1.5 border border-slate-300 font-mono text-xs font-bold"
                              />
                            ) : (
                              <span className="font-mono text-xs font-bold text-slate-900">{term.instructionalEnd || "---"}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 4. Summative Test Date */}
                      <div className="p-2.5 bg-red-50/40 border border-red-200">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-red-900 mb-1.5">
                          SUMMATIVE TEST DATE
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 border-l-2 border-red-500">
                          <div>
                            <span className="block text-[11px] font-mono text-slate-600">a. Start (1st Summative):</span>
                            {isExpanded && editingTerm ? (
                              <input
                                type="date"
                                value={editingTerm.summative1Date || ""}
                                onChange={(e) => setEditingTerm({ ...editingTerm, summative1Date: e.target.value })}
                                className="w-full p-1.5 border border-slate-300 font-mono text-xs font-bold"
                              />
                            ) : (
                              <span className="font-mono text-xs font-bold text-slate-900">{term.summative1Date || "---"}</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[11px] font-mono font-bold text-red-900">b. End (Late Cutoff):</span>
                            {isExpanded && editingTerm ? (
                              <input
                                type="date"
                                value={editingTerm.summative2Date || ""}
                                onChange={(e) => setEditingTerm({ ...editingTerm, summative2Date: e.target.value })}
                                className="w-full p-1.5 border-2 border-red-400 font-mono text-xs font-bold text-red-900"
                              />
                            ) : (
                              <span className="font-mono text-xs font-bold text-red-800">{term.summative2Date || "---"}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 5. Term Examination */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1">
                          TERM EXAMINATION
                        </span>
                        <div className="pl-2 border-l-2 border-[#002060]">
                          <span className="block text-[11px] font-mono text-slate-600">Date:</span>
                          {isExpanded && editingTerm ? (
                            <input
                              type="text"
                              value={editingTerm.termExamDates || ""}
                              onChange={(e) => setEditingTerm({ ...editingTerm, termExamDates: e.target.value })}
                              placeholder="e.g. Nov 5-6, 2026"
                              className="w-full sm:w-72 p-1.5 border border-slate-300 font-mono text-xs font-bold"
                            />
                          ) : (
                            <span className="font-mono text-xs font-bold text-slate-900">{term.termExamDates || "---"}</span>
                          )}
                        </div>
                      </div>

                      {/* 6. Report Card Distribution (PTC) */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1">
                          REPORT CARD DISTRIBUTION (PTC)
                        </span>
                        <div className="pl-2 border-l-2 border-[#002060]">
                          <span className="block text-[11px] font-mono text-slate-600">Date:</span>
                          {isExpanded && editingTerm ? (
                            <input
                              type="date"
                              value={editingTerm.reportCardDate || ""}
                              onChange={(e) => setEditingTerm({ ...editingTerm, reportCardDate: e.target.value })}
                              className="w-full sm:w-72 p-1.5 border border-slate-300 font-mono text-xs font-bold"
                            />
                          ) : (
                            <span className="font-mono text-xs font-bold text-slate-900">{term.reportCardDate || "---"}</span>
                          )}
                        </div>
                      </div>

                      {/* 7. Status (Clickable) */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1.5">
                          STATUS (CLICKABLE)
                        </span>
                        <div className="pl-2 border-l-2 border-[#002060] flex items-center gap-3">
                          {isExpanded && editingTerm ? (
                            editingTerm.isActive ? (
                              <button
                                type="button"
                                onClick={() => setEditingTerm({ ...editingTerm, isActive: false })}
                                className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white font-mono font-bold text-xs uppercase cursor-pointer"
                              >
                                [ ACTIVE &bull; CLICK TO SET INACTIVE ]
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingTerm({ ...editingTerm, isActive: true })}
                                className="px-3 py-1.5 bg-[#002060] hover:bg-[#001845] text-white font-mono font-bold text-xs uppercase cursor-pointer"
                              >
                                [ CLICK TO SET ACTIVE ]
                              </button>
                            )
                          ) : term.isActive ? (
                            <span className="px-3 py-1 bg-green-700 text-white font-mono font-bold text-xs uppercase">
                              ACTIVE
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivate(term.id, `${term.schoolYear} ${term.termName}`)}
                              className="px-3 py-1 bg-slate-200 hover:bg-[#002060] hover:text-white text-slate-800 font-mono font-bold text-xs uppercase cursor-pointer"
                            >
                              [ SET ACTIVE ]
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Save Bar when Box is Expanded */}
                    {isExpanded && editingTerm && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedTermId(null);
                            setEditingTerm(null);
                          }}
                          className="px-4 py-2 border-2 border-slate-300 text-slate-700 text-xs font-bold uppercase hover:bg-slate-100 cursor-pointer"
                        >
                          [ CANCEL ]
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleSaveTermDates}
                          className="px-4 py-2 bg-[#002060] text-white text-xs font-bold uppercase hover:bg-[#001845] disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {isSubmitting ? "[ SAVING... ]" : `[ SAVE ${editingTerm.termName.toUpperCase()} DATES ]`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ENTER SCHOOL YEAR ONLY (Step 1 Initialization) */}
      {isAddSYModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-[#002060] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="border-b-2 border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#002060] uppercase tracking-widest block">
                  IT SUPPORT INITIALIZATION
                </span>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Configure New School Year
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSYModalOpen(false)}
                className="text-xs font-mono font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                [ CLOSE X ]
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter the incoming academic school year. The system will automatically create rows/boxes for <strong>Trimester 1, Trimester 2, and Trimester 3</strong> with initial &quot;---&quot; placeholder dates, ready for individual date editing.
            </p>

            <form onSubmit={handleCreateSchoolYear} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-900 mb-1">
                  School Year <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={newSchoolYear}
                  onChange={(e) => setNewSchoolYear(e.target.value)}
                  required
                  placeholder="e.g. 2027-2028"
                  className="w-full p-3 border-2 border-slate-300 font-mono font-bold text-sm text-slate-900 focus:border-[#002060] outline-none"
                />
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  Format: YYYY-YYYY (e.g. 2026-2027, 2027-2028)
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSYModalOpen(false)}
                  className="px-4 py-2 border-2 border-slate-300 text-slate-700 font-bold uppercase hover:bg-slate-100 cursor-pointer"
                >
                  [ Cancel ]
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002060] text-white font-bold uppercase hover:bg-[#001845] disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? "[ Initializing... ]" : "[ Create 3 Trimesters ]"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
