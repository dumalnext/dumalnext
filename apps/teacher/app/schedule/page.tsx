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
  { id: "RECESS", name: "Morning Recess", start: "09:30", end: "09:45", isBreak: true },
  { id: "P3", name: "Period 3", start: "09:45", end: "10:45" },
  { id: "P4", name: "Period 4", start: "10:45", end: "11:45" },
  { id: "LUNCH", name: "Noon Lunch Break", start: "11:45", end: "13:00", isBreak: true },
  { id: "P5", name: "Period 5", start: "13:00", end: "14:00" },
  { id: "P6", name: "Period 6", start: "14:00", end: "15:00" },
  { id: "P7", name: "Period 7", start: "15:00", end: "16:00" },
  { id: "P8", name: "Homeroom / Remediation", start: "16:00", end: "17:00" },
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

function findScheduleInSlot(daySchedules: ScheduleRecord[], slotStart: string, slotEnd: string): ScheduleRecord | undefined {
  return daySchedules.find((s) => timesOverlap(s.start_time, s.end_time, slotStart, slotEnd));
}

export default function TeachingSchedulePage() {
  const { user, isLoading } = useTeacherAuth();

  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState<boolean>(true);

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
          [ DUMALNEG NATIONAL HIGH SCHOOL ]
        </span>
        <p className="text-xs font-mono text-slate-600">
          [ Loading Teaching Load &amp; Schedule... ]
        </p>
      </div>
    );
  }

  if (!user) {
    return <TeacherLoginForm />;
  }

  const uniqueSectionsCount = new Set(schedules.map((s) => s.section_id)).size;

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
      <div className="p-5 bg-white border-2 border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print print:hidden">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            [ PORTAL 02: INSTRUCTIONAL SCHEDULE HUB ]
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            Teaching Load &amp; Class Schedule
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Official weekly instructional timetable matrix for Faculty Member <strong className="text-slate-900 uppercase">{user.fullName}</strong> ({user.teacherId}).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchSchedules()}
            disabled={isLoadingSchedules}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border border-slate-300 shadow-2xs shrink-0 disabled:opacity-50"
            title="Synchronize schedule from official database"
          >
            {isLoadingSchedules ? "[ Synchronizing... ]" : "[ Refresh Timetable ]"}
          </button>
          {schedules.length > 0 ? (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border border-blue-400 shadow-2xs shrink-0"
                title="Print certified weekly teaching load timetable"
              >
                [ Print Weekly Schedule ]
              </button>
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-950 font-mono text-xs font-bold uppercase border border-emerald-400 shrink-0">
                [ STATUS: TIMETABLE ACTIVE &bull; {schedules.length} HOURS / WK ]
              </span>
            </>
          ) : (
            <span className="px-3 py-1.5 bg-amber-100 text-amber-950 font-mono text-xs font-bold uppercase border border-amber-400 shrink-0">
              [ STATUS: AWAITING TIMETABLE RELEASE ]
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
        <div className="p-12 bg-white border-2 border-slate-300 text-center space-y-2">
          <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs font-mono text-slate-500 uppercase block">Synchronizing with Official Class Program...</span>
        </div>
      ) : schedules.length === 0 ? (
        /* Empty State */
        <div className="p-8 sm:p-14 bg-white border-2 border-slate-300 shadow-xs text-center space-y-4">
          <div className="max-w-xl mx-auto space-y-3">
            <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 font-mono font-bold text-xs text-slate-700 uppercase">
              [ NO CLASS SCHEDULE ASSIGNED YET ]
            </span>
            <h3 className="text-lg font-bold text-slate-900 uppercase">
              Awaiting Administrative Schedule Assignment
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your official teaching load and class schedule for School Year 2025–2026 has not yet been finalized by the School Administrator or Principal. 
              Once the Schedule Deconfliction console in the Admin Portal assigns your class program, your weekly timetable will automatically appear here in real time.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 text-left space-y-1.5">
              <div>&bull; Assigned Faculty: <strong>{user.fullName}</strong> ({user.teacherId})</div>
              <div>&bull; Department: <strong>{user.department}</strong></div>
              <div>&bull; Prescribed Teaching Load: <strong>30 Hours / Week Maximum (DepEd Standard)</strong></div>
              <div>&bull; Action Required: <strong>None. Please wait for the Principal / Admin to publish the schedule.</strong></div>
            </div>
          </div>
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
                    [ Time Period ]
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
                          [ {slot.start} – {slot.end} &bull; {slot.name} ]
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
                        const daySchedules = schedules.filter((s) => s.day_of_week === day);
                        const matchedItem = findScheduleInSlot(daySchedules, slot.start, slot.end);

                        return (
                          <td key={day} className="p-2 border-r border-slate-200 last:border-r-0 align-top w-1/5">
                            {matchedItem ? (
                              <div className="p-2.5 bg-blue-50/70 border border-[#002060]/30 hover:border-[#002060] transition-colors shadow-2xs space-y-1">
                                <span className="text-[10px] font-mono font-bold text-blue-950 bg-white px-1.5 py-0.5 border border-blue-200 block w-fit">
                                  {matchedItem.start_time}–{matchedItem.end_time}
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
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                [ COMPLETE INSTRUCTIONAL LOAD MASTERLIST &bull; {schedules.length} PERIODS ]
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Dumalneg NHS Academic Timetable
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
                {schedules.map((sc) => (
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
