"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";

interface SectionRecord {
  id: string;
  section_name: string;
  grade_level: number;
  strand?: string | null;
  room?: string | null;
  adviser_name?: string | null;
  capacity?: number;
  school_year?: string;
}

interface ClassmateRecord {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  gender?: string | null;
}

function SectionPageContent() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { schoolYear, semester, termNumber } = useEnrollmentControl();

  const [studentRec, setStudentRec] = useState<any | null>(null);
  const [assignedSection, setAssignedSection] = useState<SectionRecord | null>(null);
  const [classmates, setClassmates] = useState<ClassmateRecord[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetableSchedules, setTimetableSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"overview" | "classmates" | "schedule">("overview");

  // Authentication Guard: Redirect guests to signin
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/?tab=signin&reason=auth_required");
    }
  }, [user, isAuthLoading, router]);

  // Main Data Fetcher with Realtime Auto-sync
  useEffect(() => {
    if (!user) {
      setStudentRec(null);
      setAssignedSection(null);
      setClassmates([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    const fetchSectionData = async () => {
      try {
        // 1. Fetch Student Profile
        const { data: stData } = await supabase
          .from("students")
          .select("id, student_id, first_name, last_name, middle_name, current_section_id, grade_level, strand, gender")
          .or(`student_id.eq.${user.lrn || user.userId},user_id.eq.${user.id}`)
          .limit(1);

        if (!stData || stData.length === 0) {
          if (isMounted) {
            setStudentRec(null);
            setAssignedSection(null);
            setClassmates([]);
            setIsLoading(false);
          }
          return;
        }

        const student = stData[0];
        if (isMounted) {
          setStudentRec(student);
        }

        // 2. If student has a current_section_id, query the section
        if (student.current_section_id) {
          const { data: secData } = await supabase
            .from("sections")
            .select("id, section_name, grade_level, strand, room, adviser_name, capacity, school_year")
            .eq("id", student.current_section_id)
            .limit(1);

          if (secData && secData.length > 0) {
            const sec = secData[0];
            if (isMounted) {
              setAssignedSection(sec);
            }

            // 3. Fetch Classmates in the same section
            const { data: cmData } = await supabase
              .from("students")
              .select("id, student_id, first_name, last_name, middle_name, gender")
              .eq("current_section_id", student.current_section_id)
              .order("last_name", { ascending: true });

            if (isMounted && cmData) {
              setClassmates(cmData);
            }

            // 4. Fetch Subjects & Timetable Schedules
            const gradeParam = sec.grade_level || student.grade_level || 7;
            const strandParam = sec.strand || student.strand || "Regular";

            try {
              const subjRes = await fetch(
                `/api/subjects?gradeLevel=${gradeParam}&strand=${encodeURIComponent(strandParam)}`
              ).then((r) => r.json()).catch(() => null);

              if (isMounted && subjRes?.success && Array.isArray(subjRes.subjects)) {
                setSubjects(subjRes.subjects);
              }

              const schedRes = await fetch(
                `/api/schedules?sectionId=${sec.id}&gradeLevel=${gradeParam}`
              ).then((r) => r.json()).catch(() => null);

              if (isMounted && schedRes?.success && Array.isArray(schedRes.schedules)) {
                setTimetableSchedules(schedRes.schedules);
              }
            } catch (err) {
              console.error("Error loading subjects/schedules:", err);
            }
          } else {
            if (isMounted) {
              setAssignedSection(null);
              setClassmates([]);
            }
          }
        } else {
          if (isMounted) {
            setAssignedSection(null);
            setClassmates([]);
          }
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error fetching section details:", err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSectionData();

    // Event listener for tab focus
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSectionData();
      }
    };
    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 10-Second Heartbeat Polling
    const heartbeat = setInterval(fetchSectionData, 10000);

    // Supabase Realtime Channels: Push updates immediately when admin assigns/changes section
    const studentChannel = supabase
      .channel("student-section-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchSectionData();
        }
      )
      .subscribe();

    const sectionChannel = supabase
      .channel("sections-table-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sections" },
        () => {
          fetchSectionData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(heartbeat);
      supabase.removeChannel(studentChannel);
      supabase.removeChannel(sectionChannel);
    };
  }, [user?.id, user?.lrn]);

  if (isAuthLoading || (isLoading && !studentRec)) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-6 font-sans">
        <div className="bg-white border-2 border-slate-300 p-8 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono font-bold text-slate-700 uppercase tracking-widest">
            Synchronizing Official Class Section Records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6 font-sans">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-mono text-slate-500 pb-2 border-b border-slate-200">
        <Link href="/" className="hover:text-[#002060] hover:underline uppercase">
          Home Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-400 uppercase">Portal Modules</span>
        <span>/</span>
        <span className="font-bold text-[#002060] uppercase">
          [ 04 ] Class Section &amp; Advisory
        </span>
      </nav>

      {/* Institutional Top Banner */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#002060] uppercase block mb-1">
              [ DepEd Region I &bull; SDO Ilocos Norte &bull; Dumalneg NHS ]
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Class Section &amp; Advisory Placement
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Official section roster, classroom advisory assignment, and prescribed schedule console.
            </p>
          </div>
          {user && (
            <div className="text-left sm:text-right bg-slate-50 border border-slate-200 p-2.5 font-mono text-xs">
              <span className="text-[10px] text-slate-500 uppercase block">Active Learner</span>
              <strong className="text-slate-900 uppercase block">{user.firstName} {user.lastName}</strong>
              <span className="text-[10px] text-[#002060]">LRN: {user.lrn || user.userId}</span>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          STATE A: ASSIGNED TO A SECTION
          ========================================================================= */}
      {assignedSection ? (
        <div className="space-y-6">
          {/* Main Hero Placement Banner */}
          <div className="p-5 sm:p-6 bg-emerald-50 border-2 border-emerald-500 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-emerald-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-widest">
                    [ SECTION ASSIGNED ]
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-200/90 text-emerald-950 font-mono text-[10px] font-bold uppercase border border-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                    Official Roster Enrolled
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-emerald-950 uppercase tracking-tight">
                  Assigned in Section: <span className="underline decoration-emerald-500">{assignedSection.section_name}</span>
                </h2>
                <p className="text-xs font-mono text-emerald-800">
                  Grade {assignedSection.grade_level} &bull; {assignedSection.strand ? `Strand: ${assignedSection.strand}` : "Junior High School"} &bull; S.Y. {assignedSection.school_year || schoolYear || "2026-2027"}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] font-mono text-emerald-800 uppercase block">Class Advisory Status</span>
                <span className="inline-block px-3 py-1 bg-white border border-emerald-300 font-mono text-xs font-bold text-emerald-900 shadow-xs uppercase">
                  Confirmed Placement
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="bg-white p-3 border border-emerald-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Grade &amp; Curriculum</span>
                <strong className="text-slate-900 text-xs sm:text-sm">
                  Grade {assignedSection.grade_level}
                </strong>
                <span className="text-[10px] text-slate-500 block truncate">
                  {assignedSection.strand || "General / Regular"}
                </span>
              </div>
              <div className="bg-white p-3 border border-emerald-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Classroom / Wing</span>
                <strong className="text-slate-900 text-xs sm:text-sm">
                  {assignedSection.room || "Room 101 - Main Wing"}
                </strong>
                <span className="text-[10px] text-slate-500 block">Dumalneg NHS Campus</span>
              </div>
              <div className="bg-white p-3 border border-emerald-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Class Adviser</span>
                <strong className="text-slate-900 text-xs sm:text-sm truncate block">
                  {assignedSection.adviser_name || "Faculty Adviser Assigned"}
                </strong>
                <span className="text-[10px] text-slate-500 block">Homeroom Teacher</span>
              </div>
              <div className="bg-white p-3 border border-emerald-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Enrolled Learners</span>
                <strong className="text-emerald-900 text-xs sm:text-sm font-mono">
                  {classmates.length} {assignedSection.capacity ? `/ ${assignedSection.capacity} max` : "Learners"}
                </strong>
                <span className="text-[10px] text-emerald-700 block">Active Section Roster</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b-2 border-slate-300 gap-1 text-xs font-mono font-bold uppercase">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`py-2.5 px-4 border-t-2 border-x-2 transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-white border-[#002060] text-[#002060] -mb-[2px] bg-white border-b-2 border-b-white z-10"
                  : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"
              }`}
            >
              [ 01 ] Section Overview &amp; Advisory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("classmates")}
              className={`py-2.5 px-4 border-t-2 border-x-2 transition-all cursor-pointer ${
                activeTab === "classmates"
                  ? "bg-white border-[#002060] text-[#002060] -mb-[2px] bg-white border-b-2 border-b-white z-10"
                  : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"
              }`}
            >
              [ 02 ] Section Classmates ({classmates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              className={`py-2.5 px-4 border-t-2 border-x-2 transition-all cursor-pointer ${
                activeTab === "schedule"
                  ? "bg-white border-[#002060] text-[#002060] -mb-[2px] bg-white border-b-2 border-b-white z-10"
                  : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"
              }`}
            >
              [ 03 ] Prescribed Schedule &amp; Subjects
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="bg-white border-2 border-slate-300 p-6 space-y-6">
              <div>
                <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
                  [ Official Advisory Information ]
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Class Profile &bull; {assignedSection.section_name}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  You are officially designated to this class section for the academic school year. Keep in touch with your assigned Homeroom Adviser for announcements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase font-mono text-[11px] border-b border-slate-200 pb-1">
                    Class Advisory Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Official Section Name:</span>
                      <strong className="text-slate-900 font-mono">{assignedSection.section_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Grade Level:</span>
                      <strong className="text-slate-900">Grade {assignedSection.grade_level}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Curriculum / Strand:</span>
                      <strong className="text-slate-900">{assignedSection.strand || "Regular / JHS Core"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Academic Year:</span>
                      <strong className="text-slate-900 font-mono">{assignedSection.school_year || schoolYear || "2026-2027"}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase font-mono text-[11px] border-b border-slate-200 pb-1">
                    Faculty &amp; Facility Assignment
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Homeroom Adviser:</span>
                      <strong className="text-slate-900 font-semibold">{assignedSection.adviser_name || "Faculty Member Designated"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Classroom:</span>
                      <strong className="text-slate-900">{assignedSection.room || "Room 101 - Main Campus"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Section Slot Cap:</span>
                      <span className="font-mono text-slate-900 font-bold">{assignedSection.capacity || 40} Maximum Students</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Placement Confirmation:</span>
                      <span className="font-mono text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5">Verified on DepEd System</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("classmates")}
                  className="btn-primary text-xs uppercase font-bold py-2.5 px-4 cursor-pointer"
                >
                  View Section Classmates List &rarr;
                </button>
                <Link
                  href="/track"
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-block"
                >
                  [ 03 ] Track Full Application
                </Link>
                <Link
                  href="/"
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-block"
                >
                  [ 01 ] Return to Home Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: CLASSMATES ROSTER */}
          {activeTab === "classmates" && (
            <div className="bg-white border-2 border-slate-300 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
                    [ Official Classmates Directory ]
                  </span>
                  <h3 className="text-base font-bold text-slate-900 uppercase">
                    Classmates in {assignedSection.section_name}
                  </h3>
                </div>
                <div className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1 border border-slate-200">
                  Total Enrolled: <strong className="text-slate-900">{classmates.length} Learners</strong>
                </div>
              </div>

              {classmates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-600 font-mono">
                    No other learners currently slotted in this section yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-mono uppercase text-slate-700">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">Learner Name</th>
                        <th className="py-2.5 px-3 font-mono">Learner Reference No.</th>
                        <th className="py-2.5 px-3">Gender</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-sans">
                      {classmates.map((cm, idx) => {
                        const isCurrentLearner =
                          (user && (cm.student_id === user.lrn || cm.student_id === user.userId)) ||
                          (studentRec && cm.id === studentRec.id);

                        return (
                          <tr
                            key={cm.id}
                            className={`hover:bg-blue-50/50 transition-colors ${
                              isCurrentLearner ? "bg-emerald-50/80 font-bold" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-center text-slate-500">
                              {String(idx + 1).padStart(2, "0")}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-slate-900 uppercase">
                                {cm.last_name}, {cm.first_name} {cm.middle_name || ""}
                              </span>
                              {isCurrentLearner && (
                                <span className="ml-2 inline-block px-1.5 py-0.2 bg-emerald-200 text-emerald-950 font-mono text-[9px] uppercase font-bold border border-emerald-400">
                                  You
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {cm.student_id ? cm.student_id : "LIS Pending"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 capitalize">
                              {cm.gender || "Unspecified"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-900 font-mono text-[10px] uppercase font-bold">
                                Enrolled
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRESCRIBED SCHEDULE & SUBJECTS */}
          {activeTab === "schedule" && (
            <div className="bg-white border-2 border-slate-300 p-6 space-y-6">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
                  [ Prescribed Class Curriculum ]
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Subjects &amp; Timetable &bull; Grade {assignedSection.grade_level}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Official subjects aligned with DepEd Order standards for Grade {assignedSection.grade_level}.
                </p>
              </div>

              {/* Prescribed Subjects Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase">
                  Prescribed Curriculum Subjects
                </h4>
                {subjects.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-mono uppercase text-slate-700">
                          <th className="py-2 px-3">Subject Code</th>
                          <th className="py-2 px-3">Subject Description</th>
                          <th className="py-2 px-3">Classification</th>
                          <th className="py-2 px-3 text-right">Credit Units</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {subjects.map((subj: any, i: number) => (
                          <tr key={subj.id || i} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-[#002060]">
                              {subj.subject_code || `SUBJ-0${i + 1}`}
                            </td>
                            <td className="py-2 px-3 text-slate-800">
                              {subj.subject_name || subj.name}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px] uppercase font-mono">
                                {subj.subject_type || "Core"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                              {subj.units || 1.0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
                    Official curriculum subjects will be synchronized by the registrar prior to school opening.
                  </div>
                )}
              </div>

              {/* Timetable Schedules if present */}
              {timetableSchedules.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-mono font-bold text-slate-700 uppercase">
                    Weekly Class Timetable
                  </h4>
                  <div className="overflow-x-auto border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-mono uppercase text-slate-700">
                          <th className="py-2 px-3">Day</th>
                          <th className="py-2 px-3">Time Window</th>
                          <th className="py-2 px-3">Subject</th>
                          <th className="py-2 px-3">Assigned Faculty</th>
                          <th className="py-2 px-3">Room</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {timetableSchedules.map((sch: any, idx: number) => (
                          <tr key={sch.id || idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800 uppercase">
                              {sch.day_of_week || "Mon-Fri"}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-700">
                              {sch.start_time} - {sch.end_time}
                            </td>
                            <td className="py-2 px-3 text-slate-900 font-semibold">
                              {sch.subject_name || sch.subjectCode}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {sch.teacher_name || "Faculty Assigned"}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {sch.room || assignedSection.room || "Room 101"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
           STATE B: NOT YET ASSIGNED TO A SECTION
           ========================================================================= */
        <div className="space-y-6">
          <div className="p-6 bg-amber-50 border-2 border-amber-400 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <span className="text-[10px] font-mono font-bold text-amber-900 uppercase tracking-widest block">
                [ SECTION STATUS ]
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-200 text-amber-950 font-mono text-xs font-bold uppercase border border-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                Pending Placement
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-amber-950 uppercase tracking-tight">
                You&apos;re not yet assigned to a section
              </h2>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Your student profile is currently awaiting official section placement from the school administrator and registrar.
              </p>
            </div>

            {/* Explanatory Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white p-3.5 border border-amber-300 space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Step 01</span>
                <strong className="text-slate-900 block">Enrollment Submission</strong>
                <p className="text-[11px] text-slate-600">
                  Ensure your DepEd enrollment form and documents have been submitted.
                </p>
              </div>
              <div className="bg-white p-3.5 border border-amber-300 space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase block">Step 02 &bull; Active</span>
                <strong className="text-amber-950 block">Registrar Evaluation</strong>
                <p className="text-[11px] text-amber-900">
                  School administrators verify academic eligibility and curriculum tracks.
                </p>
              </div>
              <div className="bg-white p-3.5 border border-amber-300 space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Step 03 &bull; Next</span>
                <strong className="text-slate-900 block">Class Section Slotting</strong>
                <p className="text-[11px] text-slate-600">
                  Official class section, room, and adviser will appear here automatically.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-100/70 border border-amber-300 text-xs text-amber-950">
              <strong>Notice for Learners:</strong> Once the school administrator confirms your class slotting in the Section Quota Console, this page will instantly update to show your designated section, homeroom adviser, and classmates.
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/track"
                className="btn-primary text-xs uppercase font-bold py-2.5 px-4 inline-block"
              >
                [ 03 ] Track Application Status
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-block"
              >
                [ 01 ] Return to Home Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SectionPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-12 px-4 text-center">
          <div className="w-8 h-8 border-4 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">
            Loading Class Section Module...
          </span>
        </div>
      }
    >
      <SectionPageContent />
    </Suspense>
  );
}
