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

  // Modal States
  const [isAddSYModalOpen, setIsAddSYModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New School Year Input
  const [newSchoolYear, setNewSchoolYear] = useState("2027-2028");

  // Selected Term for Editing
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);

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
          text: `School Year ${newSchoolYear} initialized with Trimesters 1, 2, and 3. You can now configure dates using the [ Edit ] buttons.`,
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

  // Open Edit Modal for a Specific Trimester
  const handleOpenEdit = (term: AcademicTerm) => {
    setEditingTerm({ ...term });
    setIsEditModalOpen(true);
  };

  // Save Edited Term Dates
  const handleSaveTermDates = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setIsEditModalOpen(false);
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

  const activeTerm = terms.find((t) => t.isActive);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Banner */}
      <div className="p-4 bg-blue-50 border-2 border-[#002060]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
              [ DEPED POLICY GUIDELINE: DYNAMIC TRISEM CALENDAR CONFIGURATION ]
            </span>
            <p className="text-xs text-slate-700 mt-1">
              Zero Hardcoded Dates: School year boundaries, instructional periods, summative deadlines, and report card distribution dates are strictly configured dynamically through this IT Support console.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddSYModalOpen(true)}
            className="px-4 py-2 bg-[#002060] hover:bg-[#001845] text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
          >
            [ + CONFIGURE NEW TERM ]
          </button>
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

      {/* Main Table: Registered Academic Terms */}
      <div className="bg-white border-2 border-slate-300">
        <div className="px-5 py-3 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            REGISTERED ACADEMIC TERMS • DUMALNEG NATIONAL HIGH SCHOOL
          </h3>
          <span className="text-[11px] font-mono font-bold text-slate-600">
            TOTAL CONFIGURED: {terms.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500 uppercase">
            [ Loading Academic Terms from PostgreSQL Database... ]
          </div>
        ) : terms.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600">
            No academic terms configured yet. Click &quot;Configure New Term&quot; to initialize a School Year.
          </div>
        ) : (
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
                {terms.map((term) => (
                  <tr key={term.id} className={term.isActive ? "bg-blue-50/40" : "hover:bg-slate-50"}>
                    {/* Fixed School Year Display */}
                    <td className="p-3 font-black text-slate-950 font-mono text-xs">
                      {term.schoolYear}
                    </td>

                    {/* Trimester (1, 2, 3) */}
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

                    {/* Status Column */}
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

                    {/* Actions: Edit Term Dates */}
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(term)}
                        className="px-3 py-1 bg-white hover:bg-slate-100 text-[#002060] border-2 border-[#002060] text-[11px] font-bold uppercase transition-colors cursor-pointer shadow-2xs"
                      >
                        [ Edit ]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ENTER SCHOOL YEAR ONLY (Step 1) */}
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
              Enter the incoming academic school year. The system will automatically create rows for <strong>Trimester 1, Trimester 2, and Trimester 3</strong> with initial &quot;---&quot; placeholder dates, ready for individual date editing.
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

      {/* MODAL 2: EDITABLE DATES TABS FOR SPECIFIC TRIMESTER */}
      {isEditModalOpen && editingTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-[#002060] max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="border-b-2 border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#002060] uppercase tracking-widest block">
                  IT SUPPORT TRIMESTER SCHEDULE EDITOR
                </span>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Edit Trimester Dates • {editingTerm.termName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTerm(null);
                }}
                className="text-xs font-mono font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                [ CLOSE X ]
              </button>
            </div>

            {/* Fixed Non-Editable School Year and Trimester Indicator */}
            <div className="p-3 bg-slate-100 border border-slate-300 flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">School Year (Fixed):</span>
                <strong className="text-slate-900 font-bold text-sm">{editingTerm.schoolYear}</strong>
              </div>
              <div className="border-l border-slate-300 pl-4">
                <span className="text-[10px] uppercase text-slate-500 block">Trimester (Fixed):</span>
                <strong className="text-[#002060] font-bold text-sm">{editingTerm.termName}</strong>
              </div>
            </div>

            <form onSubmit={handleSaveTermDates} className="space-y-4 text-xs">
              {/* Total Class Days */}
              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Total Class Days in Trimester
                </label>
                <input
                  type="number"
                  value={editingTerm.totalClassDays || ""}
                  onChange={(e) => setEditingTerm({ ...editingTerm, totalClassDays: Number(e.target.value) })}
                  placeholder="e.g. 68"
                  className="w-full sm:w-48 p-2 border-2 border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
                />
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200">
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Term Start Date
                  </label>
                  <input
                    type="date"
                    value={editingTerm.startDate || ""}
                    onChange={(e) => setEditingTerm({ ...editingTerm, startDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Term End Date
                  </label>
                  <input
                    type="date"
                    value={editingTerm.endDate || ""}
                    onChange={(e) => setEditingTerm({ ...editingTerm, endDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              {/* Instructional Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Instructional Period Start
                  </label>
                  <input
                    type="date"
                    value={editingTerm.instructionalStart || ""}
                    onChange={(e) => setEditingTerm({ ...editingTerm, instructionalStart: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Instructional Period End
                  </label>
                  <input
                    type="date"
                    value={editingTerm.instructionalEnd || ""}
                    onChange={(e) => setEditingTerm({ ...editingTerm, instructionalEnd: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              {/* Summative 1 & Summative 2 (Late Cutoff) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-red-50/40 border border-red-200">
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    1st Summative Test Date
                  </label>
                  <input
                    type="date"
                    value={editingTerm.summative1Date || ""}
                    onChange={(e) => setEditingTerm({ ...editingTerm, summative1Date: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-red-900 mb-1">
                    2nd Summative Test Date (Late Enrollment Cutoff)
                  </label>
                  <input
                    type="date"
                    value={editingTerm.summative2Date || ""}
                    onChange={(e) => setEditingTerm({ ...editingTerm, summative2Date: e.target.value })}
                    className="w-full p-2 border-2 border-red-400 font-mono font-bold focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              {/* Term Exams & Report Card PTC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Term Examination Dates
                  </label>
                  <input
                    type="text"
                    value={editingTerm.termExamDates || ""}
                    onChange={(e) => setEditingTerm({ ...editingTerm, termExamDates: e.target.value })}
                    placeholder="e.g. Nov 5-6, 2026"
                    className="w-full p-2 border border-slate-300 focus:border-[#002060] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Report Card Distribution (PTC)
                  </label>
                  <input
                    type="date"
                    value={editingTerm.reportCardDate || ""}
                    onChange={(e) => setEditingTerm({ ...editingTerm, reportCardDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="adminEditIsActiveToggle"
                  checked={Boolean(editingTerm.isActive)}
                  onChange={(e) => setEditingTerm({ ...editingTerm, isActive: e.target.checked })}
                  className="accent-[#002060]"
                />
                <label htmlFor="adminEditIsActiveToggle" className="font-bold text-slate-900 uppercase cursor-pointer">
                  Set this trimester as the active school calendar for Dumalneg National High School
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTerm(null);
                  }}
                  className="px-4 py-2 border-2 border-slate-300 text-slate-700 font-bold uppercase hover:bg-slate-100 cursor-pointer"
                >
                  [ Cancel ]
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002060] text-white font-bold uppercase hover:bg-[#001845] disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? "[ Saving to Database... ]" : "[ Save Trimester Dates ]"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
