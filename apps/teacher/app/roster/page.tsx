"use client";

import React, { useState, useEffect } from "react";
import { useTeacherAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import TeacherLoginForm from "@/components/TeacherLoginForm";

interface SectionSummary {
  id: string;
  section_name: string;
  grade_level: number;
  strand?: string;
  room?: string;
  capacity: number;
  adviser_name?: string;
}

interface StudentItem {
  id: string;
  student_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  barangay?: string;
  contact_number?: string;
  grade_level?: number;
}

export default function ClassSectionRosterPage() {
  const { user, isLoading } = useTeacherAuth();
  const supabase = createClient();

  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [rosterStudents, setRosterStudents] = useState<StudentItem[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [rosterSearch, setRosterSearch] = useState<string>("");

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const { data, error } = await supabase
          .from("sections")
          .select("*")
          .order("grade_level", { ascending: true })
          .order("section_name", { ascending: true });

        if (!error && data) {
          setSections(data);
          if (data.length > 0 && !selectedSectionId) {
            setSelectedSectionId(data[0].id);
          }
        }
      } catch (err) {
        console.warn("Notice loading sections in teacher portal:", err);
      }
    };

    if (user) {
      fetchSections();
    }
  }, [user]);

  useEffect(() => {
    if (!selectedSectionId) return;

    const fetchRoster = async () => {
      setIsLoadingRoster(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, student_id, first_name, middle_name, last_name, gender, barangay, contact_number, grade_level")
          .eq("current_section_id", selectedSectionId)
          .order("last_name", { ascending: true });

        if (!error && data) {
          setRosterStudents(data);
        } else {
          setRosterStudents([]);
        }
      } catch (err) {
        console.warn("Notice loading section roster:", err);
        setRosterStudents([]);
      } finally {
        setIsLoadingRoster(false);
      }
    };

    fetchRoster();
  }, [selectedSectionId]);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] text-center space-y-2">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
          [ DUMALNEG NATIONAL HIGH SCHOOL ]
        </span>
        <p className="text-xs font-mono text-slate-600">
          [ Loading Class Section Rosters... ]
        </p>
      </div>
    );
  }

  if (!user) {
    return <TeacherLoginForm />;
  }

  const currentSection = sections.find((s) => s.id === selectedSectionId);
  const filteredStudents = rosterStudents.filter((st) => {
    if (!rosterSearch.trim()) return true;
    const q = rosterSearch.toLowerCase();
    const fullName = `${st.last_name}, ${st.first_name} ${st.middle_name || ""}`.toLowerCase();
    const lrn = (st.student_id || "").toLowerCase();
    return fullName.includes(q) || lrn.includes(q);
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Title Bar */}
      <div className="bg-white p-5 border-2 border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            [ PORTAL 02: OFFICIAL STUDENT MASTERLIST LOOKUP ]
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            Class Section Rosters
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Certified enrollment lists per class section for Dumalneg National High School.
          </p>
        </div>

        {/* Section Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-800 uppercase shrink-0">
            Select Section:
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="p-2 bg-slate-50 border-2 border-slate-400 text-xs font-bold text-slate-900 outline-none focus:border-[#002060]"
          >
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.section_name} (Grade {sec.grade_level})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section Details Bar */}
      {currentSection && (
        <div className="p-4 bg-white border-2 border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div>
            Section: <strong className="text-[#002060]">{currentSection.section_name}</strong> &bull; Grade: <strong>Grade {currentSection.grade_level}</strong>
            {currentSection.room && <> &bull; Room: <strong>{currentSection.room}</strong></>}
            {currentSection.adviser_name && <> &bull; Class Adviser: <strong>{currentSection.adviser_name}</strong></>}
          </div>
          <div className="text-slate-800 font-bold">
            Total Enrolled: {rosterStudents.length} / {currentSection.capacity} Max Capacity
          </div>
        </div>
      )}

      {/* Search & Student List */}
      <div className="bg-white p-5 border-2 border-slate-300 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={rosterSearch}
            onChange={(e) => setRosterSearch(e.target.value)}
            placeholder="Search student by Full Name or 12-digit LRN..."
            className="w-full max-w-md p-2 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-[#002060]"
          />
          {rosterSearch && (
            <button
              type="button"
              onClick={() => setRosterSearch("")}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase cursor-pointer"
            >
              [ Clear ]
            </button>
          )}
        </div>

        {isLoadingRoster ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            [ Loading Official Class Roster... ]
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 bg-slate-50 border border-slate-200 text-center text-xs font-mono text-slate-600">
            {rosterSearch ? "[ No students matching search query. ]" : "[ No students currently enrolled in this section. ]"}
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[11px] text-slate-700">
                  <th className="p-2.5 w-12 text-center font-mono">#</th>
                  <th className="p-2.5 font-mono">Learner Reference Number (LRN)</th>
                  <th className="p-2.5">Student Full Name</th>
                  <th className="p-2.5">Gender</th>
                  <th className="p-2.5">Barangay</th>
                  <th className="p-2.5">Contact Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 font-mono font-bold text-[#002060]">{st.student_id || "PENDING LIS"}</td>
                    <td className="p-2.5 font-bold text-slate-900">
                      {st.last_name}, {st.first_name} {st.middle_name || ""}
                    </td>
                    <td className="p-2.5 font-mono">{st.gender || "—"}</td>
                    <td className="p-2.5 text-slate-700">{st.barangay || "—"}</td>
                    <td className="p-2.5 font-mono text-slate-600">{st.contact_number || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
