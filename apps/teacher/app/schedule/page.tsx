"use client";

import React, { useState, useEffect } from "react";
import { useTeacherAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import TeacherLoginForm from "@/components/TeacherLoginForm";

export default function TeachingSchedulePage() {
  const { user, isLoading } = useTeacherAuth();
  const supabase = createClient();

  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState<boolean>(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoadingSchedules(true);
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from("class_schedules")
            .select("*")
            .eq("teacherId", user.id);

          if (!error && data) {
            setSchedules(data);
          }
        }
      } catch {
        setSchedules([]);
      } finally {
        setIsLoadingSchedules(false);
      }
    };

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

  return (
    <div className="space-y-6 font-sans">
      {/* Title Bar */}
      <div className="p-5 bg-white border-2 border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            [ PORTAL 02: INSTRUCTIONAL SCHEDULE HUB ]
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            Teaching Load &amp; Class Schedule
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Official weekly instructional timetable for Faculty Member <strong>{user.fullName}</strong> ({user.teacherId}).
          </p>
        </div>

        <span className="px-3 py-1.5 bg-amber-100 text-amber-950 font-mono text-xs font-bold uppercase border border-amber-400 shrink-0">
          [ STATUS: AWAITING TIMETABLE RELEASE ]
        </span>
      </div>

      {/* Clean DepEd Empty State Advisory as Requested */}
      {schedules.length === 0 ? (
        <div className="p-8 sm:p-14 bg-white border-2 border-slate-300 shadow-xs text-center space-y-4">
          <div className="max-w-xl mx-auto space-y-3">
            <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 font-mono font-bold text-xs text-slate-700 uppercase">
              [ NO CLASS SCHEDULE ASSIGNED YET ]
            </span>
            <h3 className="text-lg font-bold text-slate-900 uppercase">
              Awaiting Administrative Schedule Assignment
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your official teaching load and class schedule for School Year 2026–2027 has not yet been assigned by the School Administrator or Principal. 
              Once the Schedule Deconfliction console finalizes the official class program, your weekly timetable will automatically appear here.
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
        <div className="bg-white border-2 border-slate-300 shadow-xs p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[11px] text-slate-700">
                  <th className="p-3">Day</th>
                  <th className="p-3">Time Period</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Class / Section</th>
                  <th className="p-3">Classroom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {schedules.map((sc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-[#002060]">{sc.dayOfWeek}</td>
                    <td className="p-3 font-mono">{sc.startTime} – {sc.endTime}</td>
                    <td className="p-3 font-bold">{sc.subjectCode}</td>
                    <td className="p-3">{sc.sectionId}</td>
                    <td className="p-3 font-mono">{sc.classroomId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
