"use client";

import React, { useState, useEffect } from "react";
import ModernDatePicker from "@/components/ModernDatePicker";

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

const EXAM_MONTH_MAP: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

const EXAM_MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseTermExamDates(raw: string | null | undefined): { start: string; end: string } {
  if (!raw || typeof raw !== "string") return { start: "", end: "" };
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "---") return { start: "", end: "" };

  // Case 1: ISO Range "YYYY-MM-DD to YYYY-MM-DD" or "YYYY-MM-DD - YYYY-MM-DD"
  const isoRange = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})$/i);
  if (isoRange) {
    return { start: isoRange[1], end: isoRange[2] };
  }

  // Case 2: Single ISO Date "YYYY-MM-DD"
  const isoSingle = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (isoSingle) {
    return { start: isoSingle[1], end: isoSingle[1] };
  }

  // Case 3: "Nov 5-6, 2026" or "Nov 5 - 6, 2026" or "November 5-6, 2026"
  const sameMonthRange = trimmed.match(/^([a-zA-Z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})$/);
  if (sameMonthRange) {
    const mStr = sameMonthRange[1].toLowerCase();
    const m = EXAM_MONTH_MAP[mStr];
    if (m) {
      const d1 = String(parseInt(sameMonthRange[2], 10)).padStart(2, "0");
      const d2 = String(parseInt(sameMonthRange[3], 10)).padStart(2, "0");
      const y = sameMonthRange[4];
      return { start: `${y}-${m}-${d1}`, end: `${y}-${m}-${d2}` };
    }
  }

  // Case 4: "Nov 28 - Dec 2, 2026" or "Nov 28 to Dec 2, 2026"
  const diffMonthRange = trimmed.match(
    /^([a-zA-Z]+)\s+(\d{1,2})\s*(?:[-–]|to)\s*([a-zA-Z]+)\s+(\d{1,2}),?\s*(\d{4})$/
  );
  if (diffMonthRange) {
    const m1 = EXAM_MONTH_MAP[diffMonthRange[1].toLowerCase()];
    const m2 = EXAM_MONTH_MAP[diffMonthRange[3].toLowerCase()];
    if (m1 && m2) {
      const d1 = String(parseInt(diffMonthRange[2], 10)).padStart(2, "0");
      const d2 = String(parseInt(diffMonthRange[4], 10)).padStart(2, "0");
      const y = diffMonthRange[5];
      return { start: `${y}-${m1}-${d1}`, end: `${y}-${m2}-${d2}` };
    }
  }

  // Case 5: "Nov 5, 2026" or "November 5, 2026"
  const singleDate = trimmed.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
  if (singleDate) {
    const m = EXAM_MONTH_MAP[singleDate[1].toLowerCase()];
    if (m) {
      const d = String(parseInt(singleDate[2], 10)).padStart(2, "0");
      const y = singleDate[3];
      return { start: `${y}-${m}-${d}`, end: `${y}-${m}-${d}` };
    }
  }

  return { start: "", end: "" };
}

function formatTermExamDates(start: string, end: string): string {
  if (!start && !end) return "";
  if (start && !end) {
    const parts = start.split("-");
    if (parts.length === 3) {
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return `${EXAM_MONTH_ABBR[mIdx] || parts[1]} ${d}, ${parts[0]}`;
    }
    return start;
  }
  if (!start && end) {
    const parts = end.split("-");
    if (parts.length === 3) {
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return `${EXAM_MONTH_ABBR[mIdx] || parts[1]} ${d}, ${parts[0]}`;
    }
    return end;
  }

  if (start === end) {
    const parts = start.split("-");
    if (parts.length === 3) {
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return `${EXAM_MONTH_ABBR[mIdx] || parts[1]} ${d}, ${parts[0]}`;
    }
    return start;
  }

  const p1 = start.split("-");
  const p2 = end.split("-");

  if (p1.length === 3 && p2.length === 3) {
    const y1 = p1[0];
    const m1Idx = parseInt(p1[1], 10) - 1;
    const d1 = parseInt(p1[2], 10);

    const y2 = p2[0];
    const m2Idx = parseInt(p2[1], 10) - 1;
    const d2 = parseInt(p2[2], 10);

    // Same year & month: "Nov 5-6, 2026"
    if (y1 === y2 && m1Idx === m2Idx) {
      return `${EXAM_MONTH_ABBR[m1Idx] || p1[1]} ${d1}-${d2}, ${y1}`;
    }

    // Same year, diff month: "Nov 28 - Dec 2, 2026"
    if (y1 === y2) {
      return `${EXAM_MONTH_ABBR[m1Idx] || p1[1]} ${d1} - ${EXAM_MONTH_ABBR[m2Idx] || p2[1]} ${d2}, ${y1}`;
    }

    // Diff year: "Dec 30, 2026 - Jan 2, 2027"
    return `${EXAM_MONTH_ABBR[m1Idx] || p1[1]} ${d1}, ${y1} - ${EXAM_MONTH_ABBR[m2Idx] || p2[1]} ${d2}, ${y2}`;
  }

  return `${start} to ${end}`;
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
      let res = await fetch(`/api/it-support/terms?_t=${Date.now()}`, { cache: "no-store" });
      if (res.status === 404) {
        res = await fetch(`/api/terms?_t=${Date.now()}`, { cache: "no-store" });
      }
      const rawText = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(rawText ? rawText.slice(0, 150) : "Invalid server response");
      }
      if (res.ok && json.success) {
        setTerms(json.terms || []);
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to load academic terms." });
      }
    } catch (err: any) {
      console.error("fetchTerms error:", err);
      setStatusMessage({ type: "error", text: err.message || "Network error loading academic terms." });
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
      let res = await fetch("/api/it-support/terms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: termId }),
      });
      if (res.status === 404) {
        res = await fetch("/api/terms", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: termId }),
        });
      }
      const rawText = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(rawText ? rawText.slice(0, 150) : "Invalid server response");
      }
      if (res.ok && json.success) {
        setStatusMessage({ type: "success", text: `${label} has been activated as the official school calendar.` });
        fetchTerms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to activate term." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to activate academic term." });
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
      let res = await fetch("/api/it-support/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTerm),
      });
      if (res.status === 404) {
        res = await fetch("/api/terms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingTerm),
        });
      }
      const rawText = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(rawText ? rawText.slice(0, 150) : "Invalid server response");
      }
      if (res.ok && json.success) {
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
      setStatusMessage({ type: "error", text: err.message || "Error saving trimester dates." });
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
      let res = await fetch("/api/it-support/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_school_year",
          schoolYear: newSchoolYear.trim(),
        }),
      });
      if (res.status === 404) {
        res = await fetch("/api/terms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_school_year",
            schoolYear: newSchoolYear.trim(),
          }),
        });
      }
      const rawText = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(rawText ? rawText.slice(0, 150) : "Invalid server response");
      }
      if (res.ok && json.success) {
        setStatusMessage({
          type: "success",
          text: `School Year ${newSchoolYear} initialized with Trimesters 1, 2, and 3. Click EDIT on any trimester to expand and configure dates.`,
        });
        setIsAddSYModalOpen(false);
        setNewSchoolYear("");
        fetchTerms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to create School Year." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error creating School Year." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTerm = terms.find((t) => t.isActive);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Policy Guideline Banner */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white rounded-xl p-5 sm:p-6 shadow-md border border-[#001744] border-t-4 border-t-amber-400">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <img
              src="/dumalneg-logo.png"
              alt="Dumalneg NHS Seal"
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0 hidden sm:block mt-0.5"
            />
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Academic Year &amp; Trimester Schedule Control
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddSYModalOpen(true)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Configure New Term</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-bold ${
            statusMessage.type === "success"
              ? "bg-green-50 border-green-500 text-green-900"
              : "bg-red-50 border-red-500 text-red-900"
          }`}
        >
          {statusMessage.type === "success" ? "Status: " : "Error: "}
          {statusMessage.text}
        </div>
      )}

      {/* Currently Active Academic Calendar Spotlight */}
      <div className="p-5 sm:p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="border-b border-slate-200 pb-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#002060] shrink-0 shadow-2xs">
              <svg className="w-5 h-5 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
                Currently Active Term
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight">
                {activeTerm ? `SY ${activeTerm.schoolYear} • ${activeTerm.termName}` : "NO ACTIVE TERM CONFIGURED"}
              </h3>
            </div>
          </div>
          {activeTerm && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white rounded-full font-bold text-xs px-3 py-1 uppercase tracking-wider shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Active
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-200 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-2.5 w-16 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTerm ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Term Duration */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100/70 border border-blue-200 flex items-center justify-center text-[#002060] shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block tracking-wider">Term Duration</span>
                <div className="font-bold text-slate-900 text-xs mt-0.5 truncate">
                  {activeTerm.startDate || "---"} to {activeTerm.endDate || "---"}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                  {activeTerm.totalClassDays ? `${activeTerm.totalClassDays} Class Days` : "---"}
                </span>
              </div>
            </div>

            {/* 2. Instructional Block */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100/70 border border-indigo-200 flex items-center justify-center text-indigo-800 shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block tracking-wider">Instructional Block</span>
                <div className="font-bold text-slate-900 text-xs mt-0.5 truncate">
                  {activeTerm.instructionalStart || "---"} to {activeTerm.instructionalEnd || "---"}
                </div>
                <span className="text-[10px] text-indigo-700 font-mono mt-0.5 block">
                  Active Classes
                </span>
              </div>
            </div>

            {/* 3. Late Cutoff */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block tracking-wider">Late Cutoff (Summative 2)</span>
                <div className="font-bold text-[#002060] text-xs mt-0.5 font-mono truncate">
                  {activeTerm.summative2Date || "---"}
                </div>
                <span className="text-[10px] text-amber-700 font-mono mt-0.5 block">
                  Enrollment Deadline
                </span>
              </div>
            </div>

            {/* 4. Report Card Distribution */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block tracking-wider">Card Day / PTC</span>
                <div className="font-bold text-[#002060] text-xs mt-0.5 font-mono truncate">
                  {activeTerm.reportCardDate || "---"}
                </div>
                <span className="text-[10px] text-emerald-700 font-mono mt-0.5 block">
                  Distribution Day
                </span>
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#002060]/10 flex items-center justify-center text-[#002060]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Registered Academic Terms
            </h3>
            {isLoading ? (
              <span className="inline-block w-6 h-4 bg-slate-300 animate-pulse rounded-full" />
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                {terms.length}
              </span>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-[#002060] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/60"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Table View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("boxes")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "boxes"
                  ? "bg-[#002060] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/60"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Trimester Boxes View</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2 animate-pulse" aria-busy="true" aria-label="Loading Academic Terms">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-slate-50 rounded w-full border border-slate-100" />
            ))}
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
                        <td className="p-3 font-mono font-bold text-[#002060]">
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-md">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              ACTIVE
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivate(term.id, `${term.schoolYear} ${term.termName}`)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-[#002060] text-slate-700 hover:text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-md transition-colors cursor-pointer border border-slate-300"
                              title="Click to activate this trimester for the school"
                            >
                              SET ACTIVE
                            </button>
                          )}
                        </td>

                        {/* Expand / Edit Action */}
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleEdit(term)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-colors cursor-pointer border ${
                              isExpanded
                                ? "bg-[#002060] text-white border-[#002060]"
                                : "bg-white hover:bg-slate-100 text-[#002060] border-slate-300"
                            }`}
                          >
                            {isExpanded ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                <span>Close</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit</span>
                              </>
                            )}
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
                                    EXPANDED TRIMESTER BOX
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
                                  COLLAPSE BOX ▲
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
                                      <ModernDatePicker
                                        label="a. Start:"
                                        value={editingTerm.startDate || ""}
                                        onChange={(val) => setEditingTerm({ ...editingTerm, startDate: val })}
                                      />
                                    </div>
                                    <div>
                                      <ModernDatePicker
                                        label="b. End:"
                                        value={editingTerm.endDate || ""}
                                        onChange={(val) => setEditingTerm({ ...editingTerm, endDate: val })}
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
                                      <ModernDatePicker
                                        label="a. Start:"
                                        value={editingTerm.instructionalStart || ""}
                                        onChange={(val) => setEditingTerm({ ...editingTerm, instructionalStart: val })}
                                      />
                                    </div>
                                    <div>
                                      <ModernDatePicker
                                        label="b. End:"
                                        value={editingTerm.instructionalEnd || ""}
                                        onChange={(val) => setEditingTerm({ ...editingTerm, instructionalEnd: val })}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* 4. SUMMATIVE TEST DATE */}
                                <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-2">
                                    SUMMATIVE TEST DATE
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-3 border-l-4 border-[#002060]">
                                    <div>
                                      <ModernDatePicker
                                        label="a. Start (1st Summative):"
                                        value={editingTerm.summative1Date || ""}
                                        onChange={(val) => setEditingTerm({ ...editingTerm, summative1Date: val })}
                                      />
                                    </div>
                                    <div>
                                      <ModernDatePicker
                                        label="b. End (2nd Summative / Late Cutoff):"
                                        value={editingTerm.summative2Date || ""}
                                        onChange={(val) => setEditingTerm({ ...editingTerm, summative2Date: val })}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* 5. TERM EXAMINATION */}
                                <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-2">
                                    TERM EXAMINATION
                                  </span>
                                  {(() => {
                                    const examRange = parseTermExamDates(editingTerm.termExamDates);
                                    return (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-3 border-l-4 border-[#002060]">
                                        <div>
                                          <ModernDatePicker
                                            label="a. Start Date:"
                                            value={examRange.start}
                                            onChange={(val) => {
                                              const updated = formatTermExamDates(val, examRange.end);
                                              setEditingTerm({ ...editingTerm, termExamDates: updated });
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <ModernDatePicker
                                            label="b. End Date:"
                                            value={examRange.end}
                                            onChange={(val) => {
                                              const updated = formatTermExamDates(examRange.start, val);
                                              setEditingTerm({ ...editingTerm, termExamDates: updated });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* 6. REPORT CARD DISTRIBUTION (PTC) */}
                                <div className="p-3 bg-white border border-slate-300 shadow-2xs">
                                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-2">
                                    REPORT CARD DISTRIBUTION (PTC)
                                  </span>
                                  <div className="pl-3 border-l-4 border-[#002060]">
                                    <div className="w-full sm:w-80">
                                      <ModernDatePicker
                                        label="Date:"
                                        value={editingTerm.reportCardDate || ""}
                                        onChange={(val) => setEditingTerm({ ...editingTerm, reportCardDate: val })}
                                      />
                                    </div>
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
                                        ACTIVE OFFICIAL CALENDAR &bull; CLICK TO SET INACTIVE
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEditingTerm({ ...editingTerm, isActive: true })}
                                        className="px-4 py-2 bg-[#002060] hover:bg-[#001845] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                                        title="Click to activate"
                                      >
                                        CLICK TO ACTIVATE THIS TRIMESTER
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
                                    CANCEL
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleSaveTermDates}
                                    className="px-4 py-2 bg-[#002060] text-white text-xs font-bold uppercase hover:bg-[#001845] disabled:opacity-50 cursor-pointer shadow-xs"
                                  >
                                    {isSubmitting ? "SAVING TO DATABASE..." : `SAVE ${editingTerm.termName.toUpperCase()} DATES`}
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
              const currentTerm = isExpanded && editingTerm ? editingTerm : term;

              const updateTermField = (field: keyof AcademicTerm, value: any) => {
                if (isExpanded && editingTerm) {
                  setEditingTerm({ ...editingTerm, [field]: value });
                } else {
                  setExpandedTermId(term.id);
                  setEditingTerm({ ...term, [field]: value });
                }
              };

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
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-md">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          ACTIVE
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(term.id, `${term.schoolYear} ${term.termName}`)}
                          className="px-2.5 py-0.5 bg-slate-100 hover:bg-[#002060] text-slate-700 hover:text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-md transition-colors cursor-pointer border border-slate-300"
                        >
                          SET ACTIVE
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleEdit(term)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-colors cursor-pointer border ${
                        isExpanded
                          ? "bg-[#002060] text-white border-[#002060]"
                          : "bg-white hover:bg-slate-100 text-[#002060] border-slate-300"
                      }`}
                    >
                      {isExpanded ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          <span>Close Box</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit Dates</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Vertically Scrollable Content Box */}
                  <div className="p-4">
                    <div className="max-h-[460px] overflow-y-auto pr-2 space-y-3 border border-slate-200 bg-slate-50/70 p-4">
                      {/* 1. Total Class Days */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1">
                          TOTAL CLASS DAYS
                        </span>
                        <input
                          type="number"
                          value={currentTerm.totalClassDays || ""}
                          onChange={(e) =>
                            updateTermField(
                              "totalClassDays",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          placeholder="e.g. 68"
                          className="w-full sm:w-48 p-2 border border-slate-300 font-mono text-xs font-bold text-slate-900 bg-white focus:border-[#002060] outline-none rounded-[4px]"
                        />
                      </div>

                      {/* 2. Term Date */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1.5">
                          TERM DATE
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 border-l-2 border-[#002060]">
                          <div>
                            <ModernDatePicker
                              label="a. Start:"
                              value={currentTerm.startDate || ""}
                              onChange={(val) => updateTermField("startDate", val)}
                            />
                          </div>
                          <div>
                            <ModernDatePicker
                              label="b. End:"
                              value={currentTerm.endDate || ""}
                              onChange={(val) => updateTermField("endDate", val)}
                            />
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
                            <ModernDatePicker
                              label="a. Start:"
                              value={currentTerm.instructionalStart || ""}
                              onChange={(val) => updateTermField("instructionalStart", val)}
                            />
                          </div>
                          <div>
                            <ModernDatePicker
                              label="b. End:"
                              value={currentTerm.instructionalEnd || ""}
                              onChange={(val) => updateTermField("instructionalEnd", val)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 4. Summative Test Date */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1.5">
                          SUMMATIVE TEST DATE
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 border-l-2 border-[#002060]">
                          <div>
                            <ModernDatePicker
                              label="a. Start (1st Summative):"
                              value={currentTerm.summative1Date || ""}
                              onChange={(val) => updateTermField("summative1Date", val)}
                            />
                          </div>
                          <div>
                            <ModernDatePicker
                              label="b. End (Late Cutoff):"
                              value={currentTerm.summative2Date || ""}
                              onChange={(val) => updateTermField("summative2Date", val)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 5. Term Examination */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1.5">
                          TERM EXAMINATION
                        </span>
                        <div className="pl-2 border-l-2 border-[#002060]">
                          {(() => {
                            const examRange = parseTermExamDates(currentTerm.termExamDates);
                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <ModernDatePicker
                                    label="a. Start Date:"
                                    value={examRange.start}
                                    onChange={(val) => {
                                      const updated = formatTermExamDates(val, examRange.end);
                                      updateTermField("termExamDates", updated);
                                    }}
                                  />
                                </div>
                                <div>
                                  <ModernDatePicker
                                    label="b. End Date:"
                                    value={examRange.end}
                                    onChange={(val) => {
                                      const updated = formatTermExamDates(examRange.start, val);
                                      updateTermField("termExamDates", updated);
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 6. Report Card Distribution (PTC) */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1">
                          REPORT CARD DISTRIBUTION (PTC)
                        </span>
                        <div className="pl-2 border-l-2 border-[#002060]">
                          <div className="w-full sm:w-72">
                            <ModernDatePicker
                              label="Date:"
                              value={currentTerm.reportCardDate || ""}
                              onChange={(val) => updateTermField("reportCardDate", val)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 7. Status (Clickable) */}
                      <div className="p-2.5 bg-white border border-slate-300">
                        <span className="block text-xs font-mono font-bold uppercase tracking-wider text-[#002060] mb-1.5">
                          STATUS (CLICKABLE)
                        </span>
                        <div className="pl-2 border-l-2 border-[#002060] flex items-center gap-3">
                          {currentTerm.isActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (isExpanded && editingTerm) {
                                  setEditingTerm({ ...editingTerm, isActive: false });
                                } else {
                                  handleActivate(term.id, `${term.schoolYear} ${term.termName}`);
                                }
                              }}
                              className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white font-mono font-bold text-xs uppercase cursor-pointer"
                            >
                              ACTIVE &bull; {isExpanded ? "CLICK TO SET INACTIVE" : "CURRENT SCHOOL TERM"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (isExpanded && editingTerm) {
                                  setEditingTerm({ ...editingTerm, isActive: true });
                                } else {
                                  handleActivate(term.id, `${term.schoolYear} ${term.termName}`);
                                }
                              }}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-[#002060] hover:text-white text-slate-800 font-mono font-bold text-xs uppercase cursor-pointer transition-colors"
                            >
                              CLICK TO SET ACTIVE
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Save Bar when Box is Expanded */}
                    {isExpanded && editingTerm && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-slate-600">
                          Editing {term.termName}. Click save to apply changes.
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedTermId(null);
                              setEditingTerm(null);
                            }}
                            className="px-4 py-2 border-2 border-slate-300 text-slate-700 text-xs font-bold uppercase hover:bg-slate-100 cursor-pointer"
                          >
                            CANCEL
                          </button>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSaveTermDates}
                            className="px-4 py-2 bg-[#002060] text-white text-xs font-bold uppercase hover:bg-[#001845] disabled:opacity-50 cursor-pointer shadow-xs"
                          >
                            {isSubmitting ? "SAVING..." : `SAVE ${editingTerm.termName.toUpperCase()} DATES`}
                          </button>
                        </div>
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
                CLOSE X
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002060] text-white font-bold uppercase hover:bg-[#001845] disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? "Initializing..." : "Create 3 Trimesters"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
