"use client";

import React, { useState, useEffect, useRef } from "react";
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
  school_year?: string;
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
  const { user, isLoading: isAuthLoading } = useTeacherAuth();
  const supabase = createClient();

  const [advisorySections, setAdvisorySections] = useState<SectionSummary[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [rosterStudents, setRosterStudents] = useState<StudentItem[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState<boolean>(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [rosterSearch, setRosterSearch] = useState<string>("");
  const hasLoadedOnceRef = useRef<boolean>(false);

  // Fetch sections and filter specifically by the logged-in teacher's advisory assignment
  const fetchAdvisorySections = async (silent: boolean = false) => {
    if (!user) return;
    if (!silent && !hasLoadedOnceRef.current) {
      setIsLoadingSections(true);
    }

    try {
      // 1. Fetch live teacher profile from teachers table for accurate name matching
      const cleanEmail = (user.email || "").trim().toLowerCase();
      const { data: teacherRecords } = await supabase
        .from("teachers")
        .select("id, teacher_id, first_name, middle_name, last_name, email")
        .or(`email.eq.${cleanEmail},user_id.eq.${user.id}`)
        .limit(1);

      const teacherProfile = teacherRecords?.[0];
      const tFirst = (teacherProfile?.first_name || user.firstName || "").trim();
      const tMiddle = (teacherProfile?.middle_name || "").trim();
      const tLast = (teacherProfile?.last_name || user.lastName || "").trim();

      const fullNameWithMiddle = `${tFirst}${tMiddle ? " " + tMiddle : ""} ${tLast}`.trim();
      const fullNameNoMiddle = `${tFirst} ${tLast}`.trim();
      const userFullName = (user.fullName || "").trim();

      // 2. Fetch base sections from sections table
      const { data: secData, error: secErr } = await supabase
        .from("sections")
        .select("*")
        .order("grade_level", { ascending: true })
        .order("section_name", { ascending: true });

      if (secErr) {
        console.warn("Notice querying sections:", secErr.message);
      }

      // 3. Fetch overrides from system_settings config (where admin saves adviser_name and room)
      let deletedIds: string[] = [];
      let customSections: any[] = [];
      try {
        const { data: sysData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "sections_config")
          .maybeSingle();

        if (sysData?.value) {
          deletedIds = sysData.value.deletedIds || [];
          customSections = sysData.value.customSections || [];
        }
      } catch {}

      // Merge base DB sections + system_settings custom overrides
      const secMap = new Map<string, any>();
      (secData || []).forEach((s: any) => {
        if (!deletedIds.includes(s.id)) {
          secMap.set(s.id, s);
        }
      });

      customSections.forEach((cs: any) => {
        if (cs.id && !deletedIds.includes(cs.id)) {
          secMap.set(cs.id, { ...(secMap.get(cs.id) || {}), ...cs });
        }
      });

      const allMergedSections: SectionSummary[] = Array.from(secMap.values()).map((s: any) => ({
        id: s.id,
        section_name: s.section_name,
        grade_level: Number(s.grade_level),
        strand: s.strand || undefined,
        room: s.room || undefined,
        capacity: Number(s.capacity) || 40,
        adviser_name: s.adviser_name || undefined,
        school_year: s.school_year || "2025-2026",
      }));

      // 4. Filter sections where the logged-in teacher is specifically assigned as Class Adviser
      const mySections = allMergedSections.filter((s) => {
        if (!s.adviser_name) return false;
        const adv = s.adviser_name.trim().toLowerCase();

        if (fullNameWithMiddle && adv === fullNameWithMiddle.toLowerCase()) return true;
        if (fullNameNoMiddle && adv === fullNameNoMiddle.toLowerCase()) return true;
        if (userFullName && adv === userFullName.toLowerCase()) return true;
        if (cleanEmail && (adv === cleanEmail || adv.includes(cleanEmail))) return true;

        if (tFirst && tLast && adv.includes(tFirst.toLowerCase()) && adv.includes(tLast.toLowerCase())) {
          return true;
        }

        return false;
      });

      setAdvisorySections(mySections);
      hasLoadedOnceRef.current = true;

      // Ensure a valid advisory section is selected
      setSelectedSectionId((prev) => {
        if (mySections.length === 0) return "";
        if (prev && mySections.some((s) => s.id === prev)) return prev;
        return mySections[0].id;
      });
    } catch (err) {
      console.error("Error fetching advisory sections:", err);
    } finally {
      setIsLoadingSections(false);
    }
  };

  // Initial fetch and real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchAdvisorySections(false);

    // Supabase Realtime Channel: Listen for section, teacher, student, or settings changes
    const channel = supabase
      .channel("teacher-advisory-roster-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sections" },
        () => fetchAdvisorySections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings" },
        () => fetchAdvisorySections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => fetchAdvisorySections(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchAdvisorySections(true);
        }
      )
      .subscribe();

    const handleCustomEvent = () => fetchAdvisorySections(true);
    window.addEventListener("dumalnext:data-changed", handleCustomEvent);
    window.addEventListener("dumalnext:teacher-data-changed", handleCustomEvent);
    window.addEventListener("dumalnext:admin-data-changed", handleCustomEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("dumalnext:data-changed", handleCustomEvent);
      window.removeEventListener("dumalnext:teacher-data-changed", handleCustomEvent);
      window.removeEventListener("dumalnext:admin-data-changed", handleCustomEvent);
    };
  }, [user?.id, user?.email, user?.fullName]);

  // Fetch enrolled students for the currently selected advisory section
  useEffect(() => {
    if (!selectedSectionId) {
      setRosterStudents([]);
      return;
    }

    let isMounted = true;
    const fetchRoster = async () => {
      setIsLoadingRoster(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, student_id, first_name, middle_name, last_name, gender, barangay, contact_number, grade_level")
          .eq("current_section_id", selectedSectionId)
          .order("last_name", { ascending: true });

        if (!error && data && isMounted) {
          setRosterStudents(data);
        } else if (isMounted) {
          setRosterStudents([]);
        }
      } catch (err) {
        console.warn("Notice loading section roster:", err);
        if (isMounted) setRosterStudents([]);
      } finally {
        if (isMounted) setIsLoadingRoster(false);
      }
    };

    fetchRoster();

    // Listen to changes in students table specifically for this section
    const studentChannel = supabase
      .channel(`advisory-students-${selectedSectionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchRoster()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(studentChannel);
    };
  }, [selectedSectionId]);

  if (isAuthLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] text-center space-y-2">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
          [ DUMALNEG NATIONAL HIGH SCHOOL ]
        </span>
        <p className="text-xs font-mono text-slate-600">
          [ Verifying Faculty Session... ]
        </p>
      </div>
    );
  }

  if (!user) {
    return <TeacherLoginForm />;
  }

  const currentSection = advisorySections.find((s) => s.id === selectedSectionId);

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
      <div className="bg-white p-5 border-2 border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print print:hidden">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            [ PORTAL 02: OFFICIAL ADVISORY CLASS MASTERLIST ]
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            Advisory Section Roster
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Official advisory class masterlist for designated Class Adviser:{" "}
            <strong className="text-slate-900 uppercase">
              {user.fullName || user.email}
            </strong>
          </p>
        </div>

        {/* Action Controls & Section Selector */}
        <div className="flex items-center gap-2">
          {currentSection && (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-mono font-bold border border-blue-400 uppercase cursor-pointer transition-colors shadow-2xs shrink-0"
              title="Print official advisory class roster"
            >
              [ Print Class Roster ]
            </button>
          )}

          {advisorySections.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-800 uppercase shrink-0">
                Select Advisory Section:
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="p-2 bg-slate-50 border-2 border-slate-400 text-xs font-bold text-slate-900 outline-none focus:border-[#002060] cursor-pointer"
              >
                {advisorySections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name} (Grade {sec.grade_level})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {isLoadingSections ? (
        <div className="p-8 bg-white border-2 border-slate-200 text-center">
          <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : advisorySections.length === 0 ? (
        /* SCENARIO: NO ADVISORY SECTION CURRENTLY DESIGNATED BY ADMIN */
        <div className="bg-white p-8 border-2 border-slate-300 text-center space-y-3 shadow-xs">
          <span className="text-xs font-mono font-bold text-amber-800 uppercase block">
            [ NO ADVISORY CLASS SECTION CURRENTLY ASSIGNED ]
          </span>
          <h3 className="text-lg font-bold text-slate-900 uppercase">
            No Designated Advisory Class Found
          </h3>
          <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
            You are currently signed in as <strong className="text-slate-900">{user.fullName}</strong> ({user.email}). 
            The school administration has not yet designated you as a Class Adviser for any section in School Year 2025–2026.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 max-w-lg mx-auto text-left text-xs text-slate-600 space-y-1">
            <span className="font-bold text-[#002060] block uppercase">
              How Advisory Class Assignment Works:
            </span>
            <p>
              1. The School Principal or Registrar assigns you as Class Adviser in the Admin Portal under [ Section Quota &amp; Capacity Management ].
            </p>
            <p>
              2. Once assigned, your section and all officially enrolled learners will appear here in real time automatically.
            </p>
          </div>
        </div>
      ) : (
        /* SCENARIO: TEACHER HAS AN ASSIGNED ADVISORY CLASS */
        <>
          {/* Section Details Summary Bar */}
          {currentSection && (
            <div className="p-4 bg-white border-2 border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-mono no-print print:hidden">
              <div className="space-y-0.5">
                <div>
                  Advisory Class: <strong className="text-[#002060] text-sm uppercase">{currentSection.section_name}</strong> &bull; Grade: <strong>Grade {currentSection.grade_level}</strong>
                  {currentSection.strand && <> &bull; Strand: <strong>{currentSection.strand}</strong></>}
                  {currentSection.room && <> &bull; Room: <strong>{currentSection.room}</strong></>}
                </div>
                <div className="text-slate-600">
                  Designated Class Adviser: <strong className="text-emerald-800 uppercase">{currentSection.adviser_name}</strong>
                  <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-emerald-300 font-bold uppercase">
                    [ Official Adviser ]
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-800 font-bold block">
                  Enrolled Learners: {rosterStudents.length} / {currentSection.capacity} Maximum Capacity
                </span>
                <span className="text-[10px] text-slate-500 block">
                  School Year 2025–2026
                </span>
              </div>
            </div>
          )}

          {/* Search & Student Masterlist */}
          <div className="bg-white p-5 border-2 border-slate-300 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none">
            {/* DepEd Official Letterhead for Printout */}
            {currentSection && (
              <div className="hidden print:block p-6 text-center border-b-2 border-slate-900 text-slate-900 mb-4">
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
                    <strong>OFFICIAL ADVISORY CLASS ROSTER</strong> • SY 2025–2026
                  </div>
                  <div>
                    Section: <strong>{currentSection.section_name}</strong> (Grade {currentSection.grade_level}{currentSection.strand ? ` • ${currentSection.strand}` : ""})
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <div>Room: <strong>{currentSection.room || "Main Building"}</strong></div>
                  <div>Class Adviser: <strong>{currentSection.adviser_name || user.fullName || "Designated Faculty"}</strong></div>
                  <div>Total Enrolled: <strong>{rosterStudents.length} / {currentSection.capacity}</strong></div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 no-print print:hidden">
              <div className="flex items-center gap-2 w-full sm:max-w-md">
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search student by Full Name or 12-digit LRN..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-[#002060]"
                />
                {rosterSearch && (
                  <button
                    type="button"
                    onClick={() => setRosterSearch("")}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase cursor-pointer shrink-0"
                  >
                    [ Clear ]
                  </button>
                )}
              </div>
              <span className="text-xs font-mono text-slate-600">
                Displaying: <strong>{filteredStudents.length}</strong> learner(s)
              </span>
            </div>

            {isLoadingRoster ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200 text-center text-xs font-mono text-slate-600 space-y-1">
                <p className="font-bold">
                  {rosterSearch ? "[ No students matching search query. ]" : "[ No students currently enrolled in this advisory section. ]"}
                </p>
                {!rosterSearch && (
                  <p className="text-[11px] text-slate-500">
                    Once the Registrar approves applicants and assigns them to {currentSection?.section_name}, they will automatically be listed here.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 print:border-none">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[11px] text-slate-700">
                      <th className="p-2.5 w-12 text-center font-mono">#</th>
                      <th className="p-2.5 font-mono">Learner Reference Number (LRN)</th>
                      <th className="p-2.5">Student Full Name</th>
                      <th className="p-2.5">Gender</th>
                      <th className="p-2.5">Barangay</th>
                      <th className="p-2.5">Emergency Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredStudents.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-[#002060]">
                          {st.student_id || "PENDING LIS"}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 uppercase">
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

            {/* DepEd Official Signatory Block for Printout */}
            {currentSection && (
              <div className="hidden print:flex justify-between items-end pt-12 mt-6 text-xs font-sans text-slate-900 pb-4 px-2">
                <div className="text-center w-56">
                  <div className="border-b border-slate-900 pb-1 font-bold uppercase">
                    {currentSection.adviser_name || user.fullName || "Class Adviser"}
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 uppercase mt-1">
                    Class Adviser
                  </div>
                </div>
                <div className="text-center w-56">
                  <div className="border-b border-slate-900 pb-1 font-bold uppercase">
                    OFFICE OF THE REGISTRAR
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 uppercase mt-1">
                    Certified Correct • DepEd DNHS
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
