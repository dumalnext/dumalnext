"use client";

import React, { useState, useEffect } from "react";
import { useTeacherAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";

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

export default function TeacherDashboard() {
  const { user, logout } = useTeacherAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"schedule" | "roster" | "profile">("schedule");

  // Sections & Roster State
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [rosterStudents, setRosterStudents] = useState<StudentItem[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [rosterSearch, setRosterSearch] = useState<string>("");

  // Schedule State (defaults to empty as required by user)
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState<boolean>(true);

  // Fetch sections
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

    fetchSections();
  }, []);

  // Fetch roster when selectedSectionId changes
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

  // Check schedules in database
  useEffect(() => {
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
      } catch {
        setSchedules([]);
      } finally {
        setIsLoadingSchedules(false);
      }
    };

    fetchSchedules();
  }, [user]);

  if (!user) return null;

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
      {/* Faculty Profile Overview Card */}
      <div className="bg-white p-6 border-2 border-[#002060] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-900 text-white font-mono text-xs font-bold uppercase">
              {user.teacherId}
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-950 font-mono text-xs font-bold uppercase border border-emerald-300">
              [ ACTIVE FACULTY ]
            </span>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-mono text-xs font-bold uppercase border border-slate-300">
              Dept: {user.department}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight">
            {user.fullName || user.email}
          </h2>
          <p className="text-xs font-mono text-slate-600">
            Dumalneg National High School &bull; Faculty Workstation &bull; {user.email}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-900 border border-slate-300 hover:border-red-400 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            [ Sign Out ]
          </button>
        </div>
      </div>

      {/* Workstation Navigation Tabs */}
      <div className="border-b-2 border-slate-300 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-t-2 border-x-2 -mb-[2px] ${
            activeTab === "schedule"
              ? "bg-white border-[#002060] text-[#002060] border-b-2 border-b-white z-10"
              : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
          }`}
        >
          [ Teaching Load &amp; Schedule ]
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roster")}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-t-2 border-x-2 -mb-[2px] ${
            activeTab === "roster"
              ? "bg-white border-[#002060] text-[#002060] border-b-2 border-b-white z-10"
              : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
          }`}
        >
          [ Class Section Rosters ]
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-t-2 border-x-2 -mb-[2px] ${
            activeTab === "profile"
              ? "bg-white border-[#002060] text-[#002060] border-b-2 border-b-white z-10"
              : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
          }`}
        >
          [ Faculty Profile &amp; Credentials ]
        </button>
      </div>

      {/* TAB 1: TEACHING LOAD & SCHEDULE */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="p-4 bg-white border-2 border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
                [ OFFICIAL TIMETABLE &amp; TEACHING LOAD STATUS ]
              </span>
              <h3 className="text-base font-bold text-slate-900 uppercase">
                School Year 2026–2027 Timetable
              </h3>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-950 font-mono text-xs font-bold uppercase border border-amber-400">
              [ STATUS: PENDING TIMETABLE RELEASE ]
            </span>
          </div>

          {/* Clean DepEd Empty State Advisory as Requested */}
          {schedules.length === 0 ? (
            <div className="p-8 sm:p-12 bg-white border-2 border-slate-300 shadow-xs text-center space-y-4">
              <div className="max-w-xl mx-auto space-y-3">
                <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 font-mono font-bold text-xs text-slate-700 uppercase">
                  [ NO CLASS SCHEDULE ASSIGNED YET ]
                </span>
                <h4 className="text-lg font-bold text-slate-900 uppercase">
                  Awaiting Administrative Schedule Assignment
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your official teaching load and class schedule for School Year 2026–2027 has not yet been assigned by the School Administrator / Principal. 
                  Once the Schedule Deconfliction console finalizes the official class program, your weekly timetable will automatically appear here.
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 text-left space-y-1">
                  <div>&bull; Faculty Account: <strong>{user.fullName}</strong> ({user.teacherId})</div>
                  <div>&bull; Department: <strong>{user.department}</strong></div>
                  <div>&bull; Max Prescribed Load: <strong>30 Teaching Hours / Week (DepEd Standard)</strong></div>
                  <div>&bull; Status: <strong>Waiting for Principal / Admin Timetable Publication</strong></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-300 shadow-xs p-4">
              {/* If schedules exist, render the list */}
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
      )}

      {/* TAB 2: CLASS SECTION ROSTER */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          <div className="bg-white p-5 border-2 border-slate-300 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
                  [ OFFICIAL ENROLLED CLASS ROSTER LOOKUP ]
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Class Sections &amp; Student Masterlists
                </h3>
              </div>

              {/* Section Dropdown */}
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

            {/* Section Overview Bar */}
            {currentSection && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div>
                  Class: <strong className="text-[#002060]">{currentSection.section_name}</strong> &bull; Grade Level: <strong>Grade {currentSection.grade_level}</strong>
                  {currentSection.room && <> &bull; Room: <strong>{currentSection.room}</strong></>}
                  {currentSection.adviser_name && <> &bull; Adviser: <strong>{currentSection.adviser_name}</strong></>}
                </div>
                <div className="text-slate-700 font-bold">
                  Enrolled Students: {rosterStudents.length} / {currentSection.capacity} Max Capacity
                </div>
              </div>
            )}

            {/* Search Filter */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search student by Name or 12-digit LRN..."
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

            {/* Roster Table */}
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
      )}

      {/* TAB 3: FACULTY PROFILE & CREDENTIALS */}
      {activeTab === "profile" && (
        <div className="bg-white p-6 border-2 border-slate-300 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
              [ OFFICIAL DEPED FACULTY PROFILE ]
            </span>
            <h3 className="text-base font-bold text-slate-900 uppercase">
              Academic Staff Verification Record
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase block">Faculty Member Name</span>
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
                [ Verified Institutional Account ]
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
      )}
    </div>
  );
}
