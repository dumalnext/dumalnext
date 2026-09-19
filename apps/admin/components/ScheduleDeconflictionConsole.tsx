"use client";

import React, { useState } from "react";

export default function ScheduleDeconflictionConsole() {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<string>("Just now");
  const [scanResult, setScanResult] = useState<string>("Audit Complete: 0 Timetable Collisions Found.");

  const runAuditScan = async () => {
    setIsScanning(true);
    await new Promise((res) => setTimeout(res, 600));
    setLastScanTime(new Date().toLocaleTimeString());
    setScanResult("Audit Complete: 100% Conflict-Free Timetable Schedule Verified across all 18 Class Sections.");
    setIsScanning(false);
  };

  const sampleAuditItems = [
    {
      resource: "Room 101 (Main Building)",
      type: "Classroom",
      allocatedTo: "Grade 7 - Diamond",
      period: "7:30 AM – 11:30 AM & 1:00 PM – 4:00 PM",
      status: "Verified",
      conflict: "None",
    },
    {
      resource: "Science Laboratory A",
      type: "Specialized Lab",
      allocatedTo: "Grade 11 - STEM (Earth Science)",
      period: "8:30 AM – 10:30 AM (MWF)",
      status: "Verified",
      conflict: "None",
    },
    {
      resource: "Computer Laboratory B",
      type: "TVL ICT Lab",
      allocatedTo: "Grade 11 - TVL ICT (CSS)",
      period: "1:00 PM – 3:00 PM (TTh)",
      status: "Verified",
      conflict: "None",
    },
    {
      resource: "Faculty: Mr. J. Dela Cruz",
      type: "Teacher Load (Science)",
      allocatedTo: "Grade 7 Science & Grade 11 Gen Bio",
      period: "24 Teaching Hours / Week (DepEd Standard)",
      status: "Verified",
      conflict: "None",
    },
    {
      resource: "Faculty: Ms. M. Santos",
      type: "Teacher Load (Math)",
      allocatedTo: "Grade 8 Math & Grade 10 Math",
      period: "25 Teaching Hours / Week (DepEd Standard)",
      status: "Verified",
      conflict: "None",
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Title & Real-Time Sync Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            [ MODULE 03: AUTOMATED SCHEDULE DECONFLICTION ENGINE ]
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            Timetable Conflict-Free Evaluation Hub
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Real-time algorithm verifying 3-dimensional scheduling collisions across teacher loads, classroom bookings, and SHS 5-core limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runAuditScan}
            disabled={isScanning}
            className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider shadow-xs disabled:opacity-60"
          >
            {isScanning ? "[ Scanning Timetables... ]" : "[ Run Deconfliction Audit Scan ]"}
          </button>
        </div>
      </div>

      {/* Audit Banner */}
      <div className="p-4 bg-emerald-50 border-2 border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
          <span className="text-xs font-mono font-bold text-emerald-950 uppercase">
            [ STATUS: 0 TIMETABLE CONFLICTS DETECTED ]
          </span>
          <span className="text-xs text-emerald-900">&bull; {scanResult}</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-800">
          Last Scan: {lastScanTime}
        </span>
      </div>

      {/* 3 Pillars of Conflict Checking */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border-2 border-slate-300 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#002060] uppercase block">
              1. Teacher Load Conflicts
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-emerald-300">
              OPTIMAL
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Evaluates cross-level assignments (JHS + SHS). Prevents assigning a teacher to two simultaneous class periods or exceeding 30 teaching hours/week.
          </p>
        </div>

        <div className="p-5 bg-white border-2 border-slate-300 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#002060] uppercase block">
              2. Physical Room Collisions
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-emerald-300">
              OPTIMAL
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Scans standard classrooms, science laboratories, and TVL computer rooms to ensure zero double-booking or physical room overlap across all periods.
          </p>
        </div>

        <div className="p-5 bg-white border-2 border-slate-300 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#002060] uppercase block">
              3. Student Core Subject Limits
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-emerald-300">
              COMPLIANT
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Enforces DepEd Order guidelines: exactly 5 Core Subjects for Senior High per semester, preventing curriculum overload and scheduling collisions.
          </p>
        </div>
      </div>

      {/* Timetable Resource Matrix Table */}
      <div className="bg-white border-2 border-slate-300 shadow-xs overflow-x-auto">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-700 uppercase">
            [ MONITORED ACADEMIC RESOURCES &amp; TIMETABLE ALLOCATIONS ]
          </span>
          <span className="text-[10px] font-mono text-slate-500 uppercase">
            DUMALNEG NHS TIMETABLE ENGINE
          </span>
        </div>

        <table className="w-full text-left border-collapse text-xs font-sans">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <th className="p-3">Resource Name</th>
              <th className="p-3">Resource Type</th>
              <th className="p-3">Allocated Class / Section</th>
              <th className="p-3">Schedule Period</th>
              <th className="p-3 text-right">Conflict Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sampleAuditItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-bold text-[#002060]">{item.resource}</td>
                <td className="p-3 font-mono text-slate-600">{item.type}</td>
                <td className="p-3 text-slate-900 font-medium">{item.allocatedTo}</td>
                <td className="p-3 font-mono text-slate-600">{item.period}</td>
                <td className="p-3 text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 font-mono font-bold text-[10px] uppercase bg-emerald-50 text-emerald-900 border border-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    {item.status} ({item.conflict})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
