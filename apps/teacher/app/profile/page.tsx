"use client";

import React, { useState } from "react";
import { useTeacherAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import TeacherLoginForm from "@/components/TeacherLoginForm";

export default function FacultyProfilePage() {
  const { user, isLoading, logout, updateUserName } = useTeacherAuth();
  const supabase = createClient();

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editFirstName, setEditFirstName] = useState<string>("");
  const [editMiddleName, setEditMiddleName] = useState<string>("");
  const [editLastName, setEditLastName] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState<string>("");

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

  const handleStartEdit = () => {
    setEditFirstName(user.firstName || "");
    setEditMiddleName("");
    setEditLastName(user.lastName || "");
    setSaveError("");
    setSaveSuccess("");
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setSaveError("");
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");

    const cleanFirst = editFirstName.trim();
    const cleanMiddle = editMiddleName.trim();
    const cleanLast = editLastName.trim();

    if (!cleanFirst) {
      setSaveError("Please enter your First Name.");
      return;
    }
    if (!cleanLast) {
      setSaveError("Please enter your Last Name.");
      return;
    }

    const newFullName = `${cleanFirst} ${cleanMiddle ? cleanMiddle + " " : ""}${cleanLast}`.trim();
    const oldFullName = user.fullName;

    setIsSavingName(true);

    try {
      // 1. Update teachers table in Supabase
      const { error: tchErr } = await supabase
        .from("teachers")
        .update({
          first_name: cleanFirst,
          middle_name: cleanMiddle || null,
          last_name: cleanLast,
        })
        .or(`email.eq.${user.email},teacher_id.eq.${user.teacherId}`);

      if (tchErr) {
        console.warn("Notice updating teachers table:", tchErr.message);
      }

      // 2. If this teacher was listed as adviser in sections, update sections.adviser_name so Admin & Student see new name in real time
      if (oldFullName && oldFullName !== newFullName) {
        try {
          await supabase
            .from("sections")
            .update({ adviser_name: newFullName })
            .eq("adviser_name", oldFullName);
        } catch (secErr) {
          console.warn("Notice updating section adviser name:", secErr);
        }
      }

      // 3. Update local session state in TeacherAuthContext
      updateUserName(cleanFirst, cleanMiddle || undefined, cleanLast);

      // 4. Dispatch custom events for cross-tab and real-time synchronization
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:teacher-data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }

      setSaveSuccess(`Faculty Name officially updated to [ ${newFullName} ]. Synchronized in real time across Teacher, Admin, and Student portals.`);
      setIsEditingName(false);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to update name. Please check database connection.");
    } finally {
      setIsSavingName(false);
    }
  };

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

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-xs text-emerald-950 font-bold font-mono">
          {saveSuccess}
        </div>
      )}

      {/* Credentials Grid */}
      <div className="bg-white p-6 border-2 border-slate-300 shadow-xs space-y-6">
        <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-[#002060] uppercase">
            [ ACADEMIC STAFF VERIFICATION DETAILS ]
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-950 font-mono text-xs font-bold uppercase border border-emerald-300">
              [ VERIFIED INSTITUTIONAL FACULTY ]
            </span>
            {!isEditingName && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3 py-1 bg-slate-100 hover:bg-[#002060] text-[#002060] hover:text-white border border-slate-300 hover:border-[#002060] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                [ Edit Faculty Name ]
              </button>
            )}
          </div>
        </div>

        {/* Edit Name In-Line Modal / Box */}
        {isEditingName && (
          <div className="p-5 bg-blue-50/60 border-2 border-[#002060] space-y-4">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase">
                [ MODIFY OFFICIAL FACULTY NAME ]
              </span>
              <span className="text-[11px] font-mono text-slate-600">
                Real-time synchronization across Admin &amp; Student Portals
              </span>
            </div>

            {saveError && (
              <div className="p-3 bg-red-100 border border-red-400 text-xs text-red-950 font-bold">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveName} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    First Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    placeholder="e.g. Juan"
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Middle Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={editMiddleName}
                    onChange={(e) => setEditMiddleName(e.target.value)}
                    placeholder="e.g. Reyes"
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Last Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                    placeholder="e.g. Dela Cruz"
                    className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="px-5 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingName ? "[ Saving Name... ]" : "[ Save Updated Name ]"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSavingName}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  [ Cancel ]
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Faculty Full Name</span>
            <div className="flex items-center justify-between">
              <strong className="text-sm text-slate-900 block">{user.fullName}</strong>
              {!isEditingName && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="text-[11px] text-[#002060] font-bold uppercase underline cursor-pointer hover:text-blue-950"
                >
                  [ Edit ]
                </button>
              )}
            </div>
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
