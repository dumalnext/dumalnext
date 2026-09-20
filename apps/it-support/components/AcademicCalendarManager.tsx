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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<AcademicTerm>>({
    schoolYear: "2026-2027",
    termNumber: 1,
    termName: "Trimester 1",
    totalClassDays: 68,
    startDate: "2026-08-17",
    endDate: "2026-11-20",
    openingBlockStart: "2026-08-17",
    openingBlockEnd: "2026-08-28",
    instructionalStart: "2026-09-01",
    instructionalEnd: "2026-11-13",
    endOfTermStart: "2026-11-16",
    endOfTermEnd: "2026-11-20",
    summative1Date: "2026-09-25",
    summative2Date: "2026-10-16",
    termExamDates: "Nov 5-6, 2026",
    reportCardDate: "2026-11-21",
    isActive: true,
  });

  const fetchTerms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/terms");
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

  const handleActivate = async (termId: string) => {
    try {
      const res = await fetch("/api/terms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: termId }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: "success", text: "Academic Term successfully activated as the official school-wide term." });
        fetchTerms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to activate term." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Failed to activate academic term." });
    }
  };

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: "success", text: "Academic Term saved and registered in database." });
        setIsModalOpen(false);
        fetchTerms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to save term." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Error submitting academic term." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTerm = terms.find((t) => t.isActive);

  return (
    <div className="space-y-6 font-sans">
      <div className="p-4 bg-blue-50 border-2 border-[#002060]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
              [ DepEd Policy Guideline: Dynamic Trisem Calendar Configuration ]
            </span>
            <p className="text-xs text-slate-700 mt-1">
              Zero Hardcoded Dates: School year boundaries, instructional periods, summative deadlines, and report card distribution dates are strictly configured dynamically through this IT Support console.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                schoolYear: "2026-2027",
                termNumber: 1,
                termName: "Trimester 1",
                totalClassDays: 68,
                startDate: "2026-08-17",
                endDate: "2026-11-20",
                openingBlockStart: "2026-08-17",
                openingBlockEnd: "2026-08-28",
                instructionalStart: "2026-09-01",
                instructionalEnd: "2026-11-13",
                endOfTermStart: "2026-11-16",
                endOfTermEnd: "2026-11-20",
                summative1Date: "2026-09-25",
                summative2Date: "2026-10-16",
                termExamDates: "Nov 5-6, 2026",
                reportCardDate: "2026-11-21",
                isActive: false,
              });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-[#002060] hover:bg-[#001845] text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
          >
            [ + Configure New Term ]
          </button>
        </div>
      </div>

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

      <div className="p-5 bg-white border-2 border-slate-300 shadow-xs">
        <div className="border-b border-slate-200 pb-3 mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              CURRENTLY ACTIVE ACADEMIC CALENDAR
            </span>
            <h3 className="text-lg font-bold text-slate-950 uppercase">
              {activeTerm ? `SY ${activeTerm.schoolYear} &bull; ${activeTerm.termName}` : "No Active Term Configured"}
            </h3>
          </div>
          {activeTerm && (
            <span className="bg-green-700 text-white font-mono font-bold text-xs px-2.5 py-1 uppercase tracking-widest">
              [ ACTIVE STATUS ]
            </span>
          )}
        </div>

        {activeTerm ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Term Duration</span>
              <div className="font-bold text-slate-900 mt-0.5">
                {activeTerm.startDate || "N/A"} to {activeTerm.endDate || "N/A"}
              </div>
              <span className="text-[10px] text-slate-600 font-mono mt-0.5 block">
                {activeTerm.totalClassDays || "N/A"} Class Days
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Instructional Block</span>
              <div className="font-bold text-slate-900 mt-0.5">
                {activeTerm.instructionalStart || "N/A"} to {activeTerm.instructionalEnd || "N/A"}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Late Enrollment Cutoff (Summative 2)</span>
              <div className="font-bold text-red-800 mt-0.5">
                {activeTerm.summative2Date || "N/A"}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Report Card Distribution (PTC)</span>
              <div className="font-bold text-[#002060] mt-0.5">
                {activeTerm.reportCardDate || "N/A"}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Please configure and activate an academic trimester to establish enrollment cutoff parameters and term schedules.
          </p>
        )}
      </div>

      <div className="bg-white border-2 border-slate-300">
        <div className="px-5 py-3 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Registered Academic Terms &bull; Dumalneg National High School
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
            No academic terms configured yet. Click &quot;Configure New Term&quot; to set up Trimester 1, 2, and 3.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-mono text-[11px] uppercase text-slate-700">
                  <th className="p-3">School Year</th>
                  <th className="p-3">Trimester</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Late Cutoff (Summative 2)</th>
                  <th className="p-3">Term Exams</th>
                  <th className="p-3">Card Day (PTC)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {terms.map((term) => (
                  <tr key={term.id} className={term.isActive ? "bg-blue-50/40" : "hover:bg-slate-50"}>
                    <td className="p-3 font-bold text-slate-950 font-mono">{term.schoolYear}</td>
                    <td className="p-3 font-bold text-[#002060]">{term.termName}</td>
                    <td className="p-3 font-mono">{term.startDate || "--"}</td>
                    <td className="p-3 font-mono">{term.endDate || "--"}</td>
                    <td className="p-3 font-mono font-bold text-red-800">{term.summative2Date || "--"}</td>
                    <td className="p-3">{term.termExamDates || "--"}</td>
                    <td className="p-3 font-mono">{term.reportCardDate || "--"}</td>
                    <td className="p-3">
                      {term.isActive ? (
                        <span className="px-2 py-0.5 bg-green-700 text-white font-mono font-bold text-[10px] uppercase">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono text-[10px] uppercase">
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {!term.isActive && (
                        <button
                          type="button"
                          onClick={() => handleActivate(term.id)}
                          className="px-2.5 py-1 bg-[#002060] hover:bg-[#001845] text-white text-[11px] font-bold uppercase transition-colors"
                        >
                          [ Set Active ]
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-[#002060] max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b-2 border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#002060] uppercase tracking-widest block">
                  IT SUPPORT DYNAMIC CONFIGURATION
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Configure Academic Term &amp; Trisem Dates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-mono font-bold text-slate-500 hover:text-slate-800"
              >
                [ CLOSE X ]
              </button>
            </div>

            <form onSubmit={handleSaveTerm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    School Year <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.schoolYear || ""}
                    onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                    required
                    placeholder="e.g. 2026-2027"
                    className="w-full p-2 border-2 border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Trimester Number <span className="text-red-700">*</span>
                  </label>
                  <select
                    value={formData.termNumber || 1}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setFormData({
                        ...formData,
                        termNumber: num,
                        termName: `Trimester ${num}`,
                      });
                    }}
                    className="w-full p-2 border-2 border-slate-300 font-bold focus:border-[#002060] outline-none"
                  >
                    <option value={1}>Trimester 1</option>
                    <option value={2}>Trimester 2</option>
                    <option value={3}>Trimester 3</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Total Class Days
                  </label>
                  <input
                    type="number"
                    value={formData.totalClassDays || ""}
                    onChange={(e) => setFormData({ ...formData, totalClassDays: Number(e.target.value) })}
                    placeholder="e.g. 68"
                    className="w-full p-2 border-2 border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200">
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Term Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Term End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Instructional Period Start
                  </label>
                  <input
                    type="date"
                    value={formData.instructionalStart || ""}
                    onChange={(e) => setFormData({ ...formData, instructionalStart: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Instructional Period End
                  </label>
                  <input
                    type="date"
                    value={formData.instructionalEnd || ""}
                    onChange={(e) => setFormData({ ...formData, instructionalEnd: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-red-50/40 border border-red-200">
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    1st Summative Test Date
                  </label>
                  <input
                    type="date"
                    value={formData.summative1Date || ""}
                    onChange={(e) => setFormData({ ...formData, summative1Date: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-red-900 mb-1">
                    2nd Summative Test Date (Late Enrollment Cutoff)
                  </label>
                  <input
                    type="date"
                    value={formData.summative2Date || ""}
                    onChange={(e) => setFormData({ ...formData, summative2Date: e.target.value })}
                    className="w-full p-2 border-2 border-red-400 font-mono font-bold focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Term Examination Dates
                  </label>
                  <input
                    type="text"
                    value={formData.termExamDates || ""}
                    onChange={(e) => setFormData({ ...formData, termExamDates: e.target.value })}
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
                    value={formData.reportCardDate || ""}
                    onChange={(e) => setFormData({ ...formData, reportCardDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 font-mono focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={Boolean(formData.isActive)}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="accent-[#002060]"
                />
                <label htmlFor="isActiveToggle" className="font-bold text-slate-900 uppercase">
                  Immediately activate this term as the official active school calendar
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border-2 border-slate-300 text-slate-700 font-bold uppercase hover:bg-slate-100"
                >
                  [ Cancel ]
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002060] text-white font-bold uppercase hover:bg-[#001845] disabled:opacity-50"
                >
                  {isSubmitting ? "[ Saving to Database... ]" : "[ Save Academic Term ]"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
