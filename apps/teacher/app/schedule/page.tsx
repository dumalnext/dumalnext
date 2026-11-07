"use client";

import React, { useState, useEffect } from "react";
import { useTeacherAuth } from "@/lib/auth/authContext";
import TeacherLoginForm from "@/components/TeacherLoginForm";

interface ScheduleRecord {
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

  section_name?: string;
  grade_level?: number;
  strand?: string | null;
  teacher_name?: string;
  classroom_name?: string;
  building?: string;
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
  { id: "RECESS", name: "Health Break", start: "09:30", end: "09:45", isBreak: true },
  { id: "P3", name: "Period 3", start: "09:45", end: "10:45" },
  { id: "P4", name: "Period 4", start: "10:45", end: "11:45" },
  { id: "LUNCH", name: "Lunch Break & Arrival", start: "11:45", end: "13:00", isBreak: true },
  { id: "P5", name: "Period 5", start: "13:00", end: "14:00" },
  { id: "P6", name: "Period 6", start: "14:00", end: "15:00" },
  { id: "P7", name: "Period 7", start: "15:00", end: "16:00" },
  { id: "P8", name: "ARAL / Remediation / Co-Curricular", start: "16:00", end: "17:00" },
];

function formatTo12Hour(timeStr?: string | null): string {
  if (!timeStr) return "";
  const cleaned = timeStr.trim();
  if (/am|pm/i.test(cleaned)) return cleaned;
  const parts = cleaned.split(":");
  if (parts.length === 0) return cleaned;
  const rawHour = parseInt(parts[0], 10);
  if (isNaN(rawHour)) return cleaned;
  const minutes = parts.length > 1 ? parts[1].slice(0, 2) : "00";
  const period = rawHour >= 12 ? "PM" : "AM";
  const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;
  return `${hour12}:${minutes} ${period}`;
}

function formatTimeRange(start?: string | null, end?: string | null): string {
  const formattedStart = formatTo12Hour(start);
  const formattedEnd = formatTo12Hour(end);
  if (formattedStart && formattedEnd) {
    return `${formattedStart} – ${formattedEnd}`;
  }
  return formattedStart || formattedEnd || "";
}

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

function normalizeSlotWindow(start: string, end: string): { s: string; e: string } {
  const s = (start || "").slice(0, 5);
  const e = (end || "").slice(0, 5);
  if (s === "10:00" && e === "11:00") return { s: "09:45", e: "10:45" };
  if (s === "11:00" && e === "12:00") return { s: "10:45", e: "11:45" };
  return { s, e };
}

function findScheduleInSlot(daySchedules: ScheduleRecord[], slotStart: string, slotEnd: string): ScheduleRecord | undefined {
  const exact = daySchedules.find((item) => {
    const norm = normalizeSlotWindow(item.start_time, item.end_time);
    return norm.s === slotStart;
  });
  if (exact) return exact;
  return daySchedules.find((item) => {
    const norm = normalizeSlotWindow(item.start_time, item.end_time);
    return timesOverlap(norm.s, norm.e, slotStart, slotEnd);
  });
}

export default function TeachingSchedulePage() {
  const { user, isLoading } = useTeacherAuth();

  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PERIODS_PER_PAGE = 10;

  const fetchSchedules = async () => {
    setIsLoadingSchedules(true);
    try {
      if (user) {
        const queryParams = new URLSearchParams();
        if (user.teacherDbId) queryParams.set("teacherDbId", user.teacherDbId);
        if (user.teacherId) queryParams.set("teacherId", user.teacherId);
        if (user.id) queryParams.set("userId", user.id);
        if (user.email) queryParams.set("email", user.email);
        if (user.fullName) queryParams.set("name", user.fullName);

        const res = await fetch(`/api/schedules?${queryParams.toString()}&_t=${Date.now()}`, {
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.schedules)) {
            setSchedules(data.schedules);
            return;
          }
        }
      }
      setSchedules([]);
    } catch (err) {
      console.error("Failed to load teacher schedule:", err);
      setSchedules([]);
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSchedules();
    }

    const handleSync = () => {
      if (user) fetchSchedules();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("dumalnext:teacher-data-changed", handleSync);
      window.addEventListener("dumalnext:admin-data-changed", handleSync);
      window.addEventListener("dumalnext:data-changed", handleSync);
      window.addEventListener("focus", handleSync);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dumalnext:teacher-data-changed", handleSync);
        window.removeEventListener("dumalnext:admin-data-changed", handleSync);
        window.removeEventListener("dumalnext:data-changed", handleSync);
        window.removeEventListener("focus", handleSync);
      }
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] text-center space-y-2">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
          DUMALNEG NATIONAL HIGH SCHOOL
        </span>
        <p className="text-xs font-mono text-slate-600">
          Loading Teaching Load &amp; Schedule...
        </p>
      </div>
    );
  }

  if (!user) {
    return <TeacherLoginForm />;
  }

  const uniqueSectionsCount = new Set(schedules.map((s) => s.section_id)).size;
  const totalPeriods = schedules.length;
  const totalPages = Math.max(1, Math.ceil(totalPeriods / PERIODS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PERIODS_PER_PAGE;
  const endIndex = Math.min(startIndex + PERIODS_PER_PAGE, totalPeriods);
  const paginatedSchedules = schedules.slice(startIndex, endIndex);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `TeachingLoad_${user.fullName.replace(/\s+/g, "_")}_SY2025-2026_DNHS`;
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

      {/* Title Bar */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white border-t-4 border-amber-400 p-5 sm:p-6 rounded-[4px] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[4px] bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Teaching Load &amp; Class Schedule
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="px-2 py-0.5 bg-white/10 text-blue-100 text-[11px] font-bold rounded-[4px]">
                {user.fullName} ({user.teacherId})
              </span>
              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-200 text-[11px] font-bold rounded-[4px] border border-amber-300/30">
                Dept: {user.department}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchSchedules()}
            disabled={isLoadingSchedules}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer border border-white/25 rounded-[4px] shrink-0 disabled:opacity-50 flex items-center gap-1.5"
            title="Synchronize schedule from official database"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isLoadingSchedules ? "Synchronizing..." : "Refresh Timetable"}</span>
          </button>
          {schedules.length > 0 ? (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#002060] text-xs font-bold transition-colors cursor-pointer rounded-[4px] shadow-xs shrink-0 flex items-center gap-1.5"
                title="Print certified weekly teaching load timetable"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Weekly Schedule</span>
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-100 text-xs font-bold border border-emerald-400/50 rounded-[4px] shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Timetable Active &bull; {schedules.length} Hrs/Wk
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-400/20 text-amber-200 text-xs font-bold border border-amber-300/40 rounded-[4px] shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Awaiting Timetable Release
            </span>
          )}
        </div>
      </div>

      {/* Official DepEd Printable Letterhead (Landscape 3-Line Compact Format) */}
      <div className="hidden print:block pb-2 mb-3 text-center border-b-2 border-slate-900 text-slate-900">
        {/* LINE 1: Government and DepEd Hierarchy */}
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-700 leading-tight">
          Republic of the Philippines • Department of Education • Region I • Schools Division of Ilocos Norte
        </div>

        {/* LINE 2: Institution Name */}
        <h1 className="text-base font-bold uppercase tracking-tight text-[#002060] leading-tight my-0.5">
          DUMALNEG NATIONAL HIGH SCHOOL
        </h1>

        {/* LINE 3: School ID, Document Title, and Faculty Target */}
        <div className="text-[10px] font-mono text-slate-700 flex items-center justify-between border-t border-slate-400 pt-1 mt-1 leading-tight">
          <div>
            Dumalneg, Ilocos Norte • School ID: 300017
          </div>
          <div className="font-bold text-slate-900 uppercase">
            OFFICIAL TEACHING LOAD &amp; CLASS TIMETABLE • SY 2025–2026
          </div>
          <div>
            Faculty: <strong>{user.fullName}</strong> ({user.department} &bull; {schedules.length} Hours/Wk)
          </div>
        </div>
      </div>

      {isLoadingSchedules ? (
        <div className="p-12 bg-white border-2 border-slate-300 rounded-[4px] text-center space-y-2">
          <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs font-mono text-slate-500 uppercase block">Synchronizing with Official Class Program...</span>
        </div>
      ) : schedules.length === 0 ? (
        /* Empty State */
        <div className="p-8 sm:p-14 bg-white border-2 border-slate-300 rounded-[4px] shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 text-slate-500 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-300 font-mono font-bold text-xs text-amber-900 uppercase rounded-[4px]">
            No Class Schedule Assigned Yet
          </span>
          <h3 className="text-base font-bold text-slate-900 uppercase">
            Awaiting Administrative Timetable Release
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Your official weekly teaching load and class schedule will appear here automatically once published by the School Administrator.
          </p>
        </div>
      ) : (
        /* Active Schedule Timetable Display */
        <div className="space-y-6">
          {/* Summary Load Card */}
          <div className="p-4 bg-white border-2 border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-mono no-print print:hidden">
            <div>
              Faculty Member: <strong className="text-[#002060] text-sm uppercase">{user.fullName}</strong> &bull; Dept: <strong>{user.department}</strong>
            </div>
            <div className="text-slate-700">
              Total Teaching Load: <strong className="text-emerald-800 font-bold">{schedules.length} Hours / Week</strong> &bull; Assigned Sections: <strong>{uniqueSectionsCount} Class(es)</strong>
            </div>
          </div>

          {/* Timetable Matrix with Time Column on the Left */}
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
                          <div>{formatTimeRange(slot.start, slot.end)}</div>
                          <div className="text-[10px] text-slate-500 uppercase font-sans font-normal">{slot.name}</div>
                        </td>
                        <td colSpan={5} className="p-2.5 text-center tracking-wider uppercase text-slate-500 bg-slate-100/90 border-r border-slate-300 last:border-r-0">
                          {formatTimeRange(slot.start, slot.end)} &bull; {slot.name}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Left Time Column */}
                      <td className="p-3 font-mono border-r-2 border-slate-300 bg-slate-50 text-slate-800 align-top">
                        <div className="font-bold text-[#002060] text-xs">
                          {formatTimeRange(slot.start, slot.end)}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase mt-0.5 font-sans font-semibold">
                          {slot.name}
                        </div>
                      </td>

                      {/* 5 Day Cells */}
                      {DAYS_OF_WEEK.map((day) => {
                        const daySchedules = schedules.filter((s) => s.day_of_week === day);
                        const matchedItem = findScheduleInSlot(daySchedules, slot.start, slot.end);

                        return (
                          <td key={day} className="p-2 border-r border-slate-200 last:border-r-0 align-top w-1/5">
                            {matchedItem ? (
                              <div className="p-2.5 bg-blue-50/70 border border-[#002060]/30 hover:border-[#002060] transition-colors shadow-2xs space-y-1">
                                <span className="text-[10px] font-mono font-bold text-blue-950 bg-white px-1.5 py-0.5 border border-blue-200 block w-fit">
                                  {formatTimeRange(matchedItem.start_time, matchedItem.end_time)}
                                </span>
                                <div className="font-bold text-slate-900 uppercase text-xs">
                                  {matchedItem.subject_name}
                                </div>
                                <div className="text-[11px] text-slate-700">
                                  Class: <strong className="text-[#002060]">{matchedItem.section_name}</strong>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  Room: {matchedItem.classroom_name}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full min-h-[52px] p-2 text-slate-400 text-[10px] font-mono flex items-center justify-center italic">
                                Vacant
                              </div>
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

          {/* Masterlist Detail Table (Screen View Only) */}
          <div className="bg-white border-2 border-slate-300 shadow-xs overflow-x-auto no-print print:hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                COMPLETE INSTRUCTIONAL LOAD MASTERLIST &bull; {schedules.length} PERIODS
              </span>
              <span className="text-xs font-mono text-slate-600">
                Showing <strong>{startIndex + 1}&ndash;{endIndex}</strong> of <strong>{totalPeriods}</strong> period(s)
              </span>
            </div>

            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 font-bold uppercase text-[11px] text-slate-700">
                  <th className="p-3">Day of Week</th>
                  <th className="p-3">Time Period</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Class Section</th>
                  <th className="p-3">Designated Classroom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedSchedules.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-[#002060]">{sc.day_of_week}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {sc.start_time} – {sc.end_time}
                    </td>
                    <td className="p-3 font-bold text-slate-900 uppercase">{sc.subject_name}</td>
                    <td className="p-3 font-semibold text-[#002060]">{sc.section_name}</td>
                    <td className="p-3 font-mono text-slate-600">{sc.classroom_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Bar (10 Periods Per Page) */}
            <div
              className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
              role="navigation"
              aria-label="Instructional load masterlist pagination"
            >
              <div className="text-slate-600">
                Page <strong className="text-[#002060]">{safeCurrentPage}</strong> of{" "}
                <strong className="text-[#002060]">{totalPages}</strong> &bull; Showing{" "}
                <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of{" "}
                <strong>{totalPeriods}</strong> period(s) (10 per page)
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
                  &larr; Prev
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
                  Next &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* DepEd Official Signatories for Hard Copy Printout */}
          <div className="hidden print:flex justify-between items-end pt-4 mt-3 text-xs font-sans text-slate-900 pb-1 px-4" style={{ pageBreakInside: "avoid" }}>
            <div className="text-center w-56">
              <div className="border-b border-slate-900 pb-1 font-bold uppercase">
                {user.fullName}
              </div>
              <div className="text-[10px] font-mono text-slate-600 uppercase mt-1">
                Faculty Member / Teacher
              </div>
            </div>
            <div className="text-center w-56">
              <div className="border-b border-slate-900 pb-1 font-bold uppercase">
                OFFICE OF THE PRINCIPAL
              </div>
              <div className="text-[10px] font-mono text-slate-600 uppercase mt-1">
                Approved Correct • DepEd DNHS
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
