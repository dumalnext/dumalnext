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

const DAYS_OF_WEEK: Array<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"> = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export default function TeachingSchedulePage() {
  const { user, isLoading } = useTeacherAuth();

  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState<boolean>(true);

  const fetchSchedules = async () => {
    setIsLoadingSchedules(true);
    try {
      if (user) {
        const queryParams = new URLSearchParams();
        if (user.id) queryParams.set("teacherId", user.id);
        if (user.email) queryParams.set("email", user.email);

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

  // Group schedules by day for the calendar grid
  const daySchedulesMap = new Map<string, ScheduleRecord[]>();
  DAYS_OF_WEEK.forEach((d) => daySchedulesMap.set(d, []));
  schedules.forEach((sc) => {
    const list = daySchedulesMap.get(sc.day_of_week) || [];
    list.push(sc);
    daySchedulesMap.set(sc.day_of_week, list);
  });

  const uniqueSectionsCount = new Set(schedules.map((s) => s.section_id)).size;

  return (
    <div className="space-y-6 font-sans">
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
            Official weekly instructional timetable for Faculty Member <strong className="text-slate-900 uppercase">{user.fullName}</strong> ({user.teacherId}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {schedules.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => window.print()}
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

      {/* Official DepEd Printable Letterhead */}
      <div className="hidden print:block p-6 text-center border-b-2 border-slate-900 text-slate-900 mb-6">
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
            <strong>OFFICIAL TEACHING LOAD &amp; CLASS TIMETABLE</strong> • SY 2025–2026
          </div>
          <div>
            Faculty: <strong>{user.fullName}</strong> ({user.department} &bull; {user.teacherId})
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-600">
          <div>Department: <strong>{user.department}</strong></div>
          <div>Weekly Instructional Load: <strong>{schedules.length} Hours / Week</strong></div>
          <div>Prescribed Limit: <strong>30 Hours / Week Maximum</strong></div>
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

          {/* Weekly 5-Day Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 print:grid-cols-5">
            {DAYS_OF_WEEK.map((day) => {
              const dayItems = daySchedulesMap.get(day) || [];
              return (
                <div key={day} className="bg-white border-2 border-slate-300 shadow-xs flex flex-col print:border print:shadow-none">
                  <div className="p-2.5 bg-[#002060] text-white text-center font-bold text-xs uppercase tracking-wider">
                    {day}
                  </div>
                  <div className="p-2.5 flex-1 space-y-2.5 min-h-[220px] bg-slate-50/50">
                    {dayItems.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center p-4 text-slate-400 text-xs italic">
                        No scheduled class
                      </div>
                    ) : (
                      dayItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 bg-white border border-slate-300 hover:border-[#002060] transition-colors shadow-2xs space-y-1"
                        >
                          <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 border border-blue-200 block w-fit">
                            {item.start_time} – {item.end_time}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 uppercase">
                            {item.subject_name}
                          </h4>
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <div>Class: <strong className="text-[#002060]">{item.section_name}</strong></div>
                            <div>Facility: <strong className="text-slate-800">{item.classroom_name}</strong></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Masterlist Detail Table */}
          <div className="bg-white border-2 border-slate-300 shadow-xs overflow-x-auto print:border-none print:shadow-none">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print print:hidden">
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
          <div className="hidden print:flex justify-between items-end pt-12 mt-8 text-xs font-sans text-slate-900 pb-4 px-2">
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
