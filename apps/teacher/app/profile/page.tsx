"use client";

import React from "react";
import { useTeacherAuth } from "@/lib/auth/authContext";
import TeacherLoginForm from "@/components/TeacherLoginForm";

export default function FacultyProfilePage() {
  const { user, isLoading, logout } = useTeacherAuth();

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] text-center space-y-2">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
          [ DUMALNEG NATIONAL HIGH SCHOOL ]
        </span>
        <p className="text-xs font-mono text-slate-600">
          [ Loading Faculty Profile... ]
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
            [ PORTAL 02: FACULTY PROFILE &amp; VERIFICATION RECORD ]
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            Faculty Profile &amp; Credentials
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Official DepEd personnel record for Dumalneg National High School.
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer shrink-0"
        >
          [ Sign Out ]
        </button>
      </div>

      {/* Credentials Grid */}
      <div className="bg-white p-6 border-2 border-slate-300 shadow-xs space-y-6">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#002060] uppercase">
            [ ACADEMIC STAFF VERIFICATION DETAILS ]
          </span>
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-950 font-mono text-xs font-bold uppercase border border-emerald-300">
            [ VERIFIED INSTITUTIONAL FACULTY ]
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Faculty Full Name</span>
            <strong className="text-sm text-slate-900 block">{user.fullName}</strong>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Faculty Employee ID</span>
            <strong className="text-sm font-mono text-[#002060] block">{user.teacherId}</strong>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Department Affiliation</span>
            <strong className="text-sm text-slate-900 block">{user.department}</strong>
            <p className="text-[10px] text-slate-500">
              {user.department === "JHS" && "Junior High School (Grades 7–10) Specialist"}
              {user.department === "SHS" && "Senior High School (Grades 11–12) Specialist"}
              {user.department === "CROSS_LEVEL" && "Authorized Cross-Level Instruction (Junior & Senior High School)"}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Verified Gmail Address</span>
            <strong className="text-sm font-mono text-slate-900 block">{user.email}</strong>
            <span className="text-[10px] font-mono text-emerald-800">
              [ Institutional Google Account ]
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">School Affiliation</span>
            <strong className="text-sm text-slate-900 block">Dumalneg National High School</strong>
            <p className="text-[10px] text-slate-500">School ID: 300050 &bull; Region I &bull; SDO Ilocos Norte</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">DepEd Workload Compliance</span>
            <strong className="text-sm text-slate-900 block">30 Hours / Week Maximum Teaching Hours</strong>
            <p className="text-[10px] text-slate-500">Governed by DepEd Order on Teaching Load Deconfliction</p>
          </div>
        </div>
      </div>
    </div>
  );
}
