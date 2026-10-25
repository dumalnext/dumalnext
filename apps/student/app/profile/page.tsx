"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import { createClient } from "@/lib/supabase/client";

interface SectionDetails {
  id: string;
  name: string;
  gradeLevel: number;
  strand?: string;
  adviserName?: string;
  roomNumber?: string;
}

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { schoolYear, semester } = useEnrollmentControl();

  const [studentRec, setStudentRec] = useState<any | null>(null);
  const [enrollmentApp, setEnrollmentApp] = useState<any | null>(null);
  const [formData, setFormData] = useState<any | null>(null);
  const [assignedSection, setAssignedSection] = useState<SectionDetails | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"academic" | "personal" | "address" | "family" | "security">("academic");

  // Authentication Guard: Redirect guests to signin
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/?tab=signin&reason=auth_required");
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (!user) {
      setIsLoadingData(false);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    const fetchProfileData = async () => {
      try {
        setIsLoadingData(true);

        // 1. Fetch Student Record from students table
        let stQuery = supabase
          .from("students")
          .select("id, user_id, student_id, first_name, last_name, middle_name, current_section_id, grade_level, strand, gender, date_of_birth, contact_number, barangay");

        const orFilters: string[] = [];
        if (user.id && user.id.length === 36) {
          orFilters.push(`user_id.eq.${user.id}`);
        }
        if (user.lrn && /^\d{12}$/.test(user.lrn)) {
          orFilters.push(`student_id.eq.${user.lrn}`);
        }
        if (user.userId && user.userId !== user.id) {
          orFilters.push(`student_id.eq.${user.userId}`);
        }

        if (orFilters.length > 0) {
          stQuery = stQuery.or(orFilters.join(","));
        }

        const { data: stData } = await stQuery.limit(1);
        let student = stData && stData.length > 0 ? stData[0] : null;

        // 2. Fetch Enrollment Application Record
        let appRecord: any = null;
        let formPayload: any = null;

        if (student?.id) {
          const { data: apps } = await supabase
            .from("enrollment_applications")
            .select("id, application_id, student_id, applicant_type, target_grade_level, target_strand, school_year, status, selected_electives, created_at")
            .eq("student_id", student.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (apps && apps.length > 0) {
            appRecord = apps[0];
          }
        }

        // Fallback: If not found via student.id, query applications by email or LRN
        if (!appRecord) {
          const { data: recentApps } = await supabase
            .from("enrollment_applications")
            .select("id, application_id, student_id, applicant_type, target_grade_level, target_strand, school_year, status, selected_electives, created_at")
            .order("created_at", { ascending: false })
            .limit(25);

          if (recentApps && recentApps.length > 0) {
            for (const a of recentApps) {
              const fd = Array.isArray(a.selected_electives) && a.selected_electives.length > 0
                ? a.selected_electives[0]
                : (typeof a.selected_electives === "object" && a.selected_electives !== null ? a.selected_electives : {});

              const emailInForm = (fd.email || fd.learnerEmail || "").toLowerCase();
              const lrnInForm = fd.lrn || fd.learnerLrn || "";

              if (
                (emailInForm && emailInForm === user.email.toLowerCase()) ||
                (lrnInForm && user.lrn && lrnInForm === user.lrn)
              ) {
                appRecord = a;
                formPayload = fd;
                if (!student && a.student_id) {
                  const { data: stById } = await supabase
                    .from("students")
                    .select("id, user_id, student_id, first_name, last_name, middle_name, current_section_id, grade_level, strand, gender, date_of_birth, contact_number, barangay")
                    .eq("id", a.student_id)
                    .limit(1);
                  if (stById && stById.length > 0) {
                    student = stById[0];
                  }
                }
                break;
              }
            }
          }
        }

        if (appRecord && !formPayload) {
          formPayload = Array.isArray(appRecord.selected_electives) && appRecord.selected_electives.length > 0
            ? appRecord.selected_electives[0]
            : (typeof appRecord.selected_electives === "object" && appRecord.selected_electives !== null ? appRecord.selected_electives : {});
        }

        // 3. Resolve Section Details
        const sectionId = student?.current_section_id || formPayload?.assignedSectionId || appRecord?.assigned_section_id;
        let secDetails: SectionDetails | null = null;

        if (sectionId) {
          const { data: secData } = await supabase
            .from("sections")
            .select("id, name, grade_level, strand, adviser_name, room_number")
            .eq("id", sectionId)
            .limit(1);

          if (secData && secData.length > 0) {
            secDetails = {
              id: secData[0].id,
              name: secData[0].name,
              gradeLevel: secData[0].grade_level,
              strand: secData[0].strand,
              adviserName: secData[0].adviser_name,
              roomNumber: secData[0].room_number,
            };
          }
        }

        if (isMounted) {
          setStudentRec(student);
          setEnrollmentApp(appRecord);
          setFormData(formPayload);
          setAssignedSection(secDetails);
          setIsLoadingData(false);
        }
      } catch (err) {
        console.error("Error fetching student profile:", err);
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    fetchProfileData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#002060] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-600">Verifying Learner Session...</p>
        </div>
      </div>
    );
  }

  // Resolve Display Values
  const fullName = `${user.firstName || ""} ${user.middleName ? user.middleName + " " : ""}${user.lastName || ""}`.trim() || "Learner Name";
  const lrnNumber = user.lrn || studentRec?.student_id || formData?.lrn || "To be assigned";
  const studentId = user.userId || studentRec?.id || "DNHS-STU-ACTIVE";
  const emailAddress = user.email || "No email on record";
  const gradeLevel = studentRec?.grade_level || enrollmentApp?.target_grade_level || formData?.targetGradeLevel || 7;
  const strandTrack = studentRec?.strand || enrollmentApp?.target_strand || formData?.targetStrand || (gradeLevel >= 11 ? "Senior High School" : "Junior High School (Regular)");
  const statusBadge = enrollmentApp?.status || (assignedSection ? "Approved" : "Active Learner");

  // Generate initials for avatar
  const initials = `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() || "DN";

  // 1-Click IT Support Gmail Link
  const itSupportGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=dumalnext@gmail.com&su=${encodeURIComponent(
    `[Inquiry / Profile Support] ${fullName} (LRN: ${lrnNumber})`
  )}&body=${encodeURIComponent(
    `Good day Dumalneg NHS IT Support Desk,\n\nI would like to request assistance regarding my student account.\n\nLearner Details:\n- Name: ${fullName}\n- 12-Digit LRN: ${lrnNumber}\n- Registered Email: ${emailAddress}\n- Grade Level: Grade ${gradeLevel}\n\nConcern:\n[Please write your inquiry here]\n\nThank you!`
  )}`;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/" className="hover:text-[#002060] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="font-bold text-[#002060]">Learner Profile</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Official Learner Profile
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Dumalneg National High School &bull; DepEd School ID: 300017
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/track"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#002060] border border-slate-300 font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Track Application / COE</span>
          </Link>

          {assignedSection && (
            <Link
              href="/section"
              className="px-3.5 py-2 bg-[#002060] hover:bg-[#001845] text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>My Class Section</span>
            </Link>
          )}
        </div>
      </div>

      {/* Hero Profile Banner */}
      <div className="bg-gradient-to-br from-[#002060] to-[#001845] text-white rounded-xl p-5 sm:p-6 shadow-md border-t-4 border-amber-400 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            {/* Avatar Circle */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-amber-400 flex items-center justify-center font-black text-xl sm:text-2xl text-amber-300 shrink-0 shadow-inner">
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {fullName}
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold uppercase rounded tracking-wider">
                  {statusBadge}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-100">
                <span className="flex items-center gap-1">
                  <span className="text-amber-300 font-bold">LRN:</span>
                  <strong className="font-mono text-white tracking-wider">{lrnNumber}</strong>
                </span>
                <span className="hidden sm:inline text-blue-300/40">&bull;</span>
                <span className="flex items-center gap-1">
                  <span className="text-blue-200">Email:</span>
                  <span className="text-white font-medium">{emailAddress}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-blue-200">
                <span className="bg-white/10 px-2 py-0.5 rounded border border-white/10 font-semibold">
                  Grade {gradeLevel} &bull; {strandTrack}
                </span>
                {assignedSection && (
                  <span className="bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded border border-amber-400/30 font-semibold">
                    Section: {assignedSection.name}
                  </span>
                )}
                <span className="bg-white/10 px-2 py-0.5 rounded border border-white/10">
                  S.Y. {schoolYear || "2026-2027"} ({semester || "Trimester 1"})
                </span>
              </div>
            </div>
          </div>

          {/* Quick IT Support Button */}
          <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t border-white/10 sm:border-t-0 pt-3 sm:pt-0">
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block mb-1">
              Need Help with your record?
            </span>
            <a
              href={itSupportGmailUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Open Gmail to email IT Support"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email IT Support Desk</span>
            </a>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-lg overflow-x-auto text-xs font-bold scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab("academic")}
          className={`py-3 px-4 border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === "academic"
              ? "border-[#002060] text-[#002060] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
          <span>Academic &amp; Section Placement</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className={`py-3 px-4 border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === "personal"
              ? "border-[#002060] text-[#002060] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Personal Information</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("address")}
          className={`py-3 px-4 border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === "address"
              ? "border-[#002060] text-[#002060] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Residential Address</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("family")}
          className={`py-3 px-4 border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === "family"
              ? "border-[#002060] text-[#002060] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Parent / Guardian</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`py-3 px-4 border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === "security"
              ? "border-[#002060] text-[#002060] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Account &amp; Security</span>
        </button>
      </div>

      {/* Tab Contents Card */}
      <div className="bg-white rounded-b-xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        {isLoadingData ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-[#002060] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-semibold">Loading official record details...</p>
          </div>
        ) : (
          <>
            {/* 1. ACADEMIC & SECTION TAB */}
            {activeTab === "academic" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                    Current Academic Status &amp; Placement
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official enrollment and section assignment record in Dumalneg National High School.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Current Grade Level
                    </span>
                    <span className="text-base font-extrabold text-slate-900 block">
                      Grade {gradeLevel}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {gradeLevel <= 10 ? "Junior High School" : "Senior High School"}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Track &amp; Curriculum Strand
                    </span>
                    <span className="text-base font-extrabold text-[#002060] block">
                      {strandTrack}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      DepEd Standard Curriculum
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Academic Year &bull; Term
                    </span>
                    <span className="text-base font-extrabold text-slate-900 block">
                      S.Y. {schoolYear || "2026-2027"}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {semester || "Trimester 1"} Active
                    </span>
                  </div>
                </div>

                {/* Section Details Card */}
                {assignedSection ? (
                  <div className="p-5 bg-emerald-50/70 border-2 border-emerald-500 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">
                          Official Class Section Assignment
                        </span>
                        <h4 className="text-lg font-black text-emerald-950 mt-0.5">
                          Section: {assignedSection.name}
                        </h4>
                      </div>
                      <Link
                        href="/section"
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded shadow-xs transition-colors"
                      >
                        Open Class Roster &rarr;
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Class Adviser:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          {assignedSection.adviserName || "Assigned by School Head"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Assigned Classroom:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          {assignedSection.roomNumber || "Academic Building Room"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-sm mt-0.5">
                      !
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-950 text-sm">
                        Section Placement Pending
                      </h4>
                      <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                        Your official class section is currently being organized by the school registrar and administrator. Please check back regularly or visit the Section module.
                      </p>
                      <Link
                        href="/section"
                        className="inline-block mt-2 text-xs font-bold text-amber-900 underline hover:text-amber-950"
                      >
                        Check Section Status &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. PERSONAL INFORMATION TAB */}
            {activeTab === "personal" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                    Learner Personal Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official personal data submitted for DepEd Basic Education Information System (BEIS).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      First Name
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {user.firstName || formData?.firstName || "N/A"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Middle Name
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {user.middleName || formData?.middleName || "(None)"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Last Name
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {user.lastName || formData?.lastName || "N/A"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Learner Reference Number (LRN)
                    </span>
                    <span className="text-sm font-mono font-bold text-[#002060] block mt-0.5">
                      {lrnNumber}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Gender / Sex
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {studentRec?.gender || formData?.gender || "Not specified"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Date of Birth
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {studentRec?.date_of_birth || formData?.dateOfBirth || "On record"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Place of Birth
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {formData?.placeOfBirth || "Dumalneg, Ilocos Norte"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Mother Tongue
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {formData?.motherTongue || "Ilokano"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      IP Community
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {formData?.isIpCommunity ? formData?.ipCommunityName || "Isnag" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. RESIDENTIAL ADDRESS TAB */}
            {activeTab === "address" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                    Residential &amp; Permanent Address
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official residence details on file with the school registrar.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Current Residence
                      </span>
                      <span className="text-[10px] bg-blue-100 text-[#002060] px-2 py-0.5 font-bold rounded">
                        Primary
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Barangay:</span>
                        <span className="font-bold text-slate-800">{studentRec?.barangay || formData?.currentBarangay || "CABARITAN"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Sitio / Street:</span>
                        <span className="font-bold text-slate-800">{formData?.currentSitio || "Poblacion"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Municipality / City:</span>
                        <span className="font-bold text-slate-800">{formData?.currentMunicipality || "DUMALNEG"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Province &bull; Zip:</span>
                        <span className="font-bold text-slate-800">ILOCOS NORTE &bull; 2921</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Contact Details
                      </span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 font-bold rounded">
                        Reachability
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Mobile Contact:</span>
                        <span className="font-bold text-slate-800 font-mono">{studentRec?.contact_number || formData?.contactNumber || "09181234567"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Email Address:</span>
                        <span className="font-bold text-slate-800">{emailAddress}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Country:</span>
                        <span className="font-bold text-slate-800">Philippines</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PARENT & GUARDIAN TAB */}
            {activeTab === "family" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                    Parent &amp; Guardian Information
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official family contacts registered for notifications and emergency contact.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Father Details */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
                        Father's Details
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Full Name:</span>
                        <span className="font-bold text-slate-900">
                          {formData?.fatherFirstName || "JUAN"} {formData?.fatherLastName || "LOZANO"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact Number:</span>
                        <span className="font-bold text-slate-700 font-mono">
                          {formData?.fatherContactNumber || "09181234567"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mother Details */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
                        Mother's Details (Maiden)
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Full Name:</span>
                        <span className="font-bold text-slate-900">
                          {formData?.motherFirstName || "MARIA"} {formData?.motherMaidenLastName || "RAMOS"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact Number:</span>
                        <span className="font-bold text-slate-700 font-mono">
                          {formData?.motherContactNumber || "09201234567"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ACCOUNT & SECURITY TAB */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                    Student Account Credentials &amp; Security
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    DepEd security compliance, session information, and IT Support Desk services.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Account System Identifier
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold uppercase rounded">
                        Active
                      </span>
                    </div>
                    <span className="text-sm font-mono font-bold text-[#002060] block">
                      {studentId}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Unique database identifier assigned to your learner account.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Registered Login Email
                      </span>
                      <span className="text-[10px] bg-blue-100 text-[#002060] px-2 py-0.5 font-bold uppercase rounded">
                        Verified
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 block truncate">
                      {emailAddress}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Used for session login, OTP verification, and official school email updates.
                    </p>
                  </div>
                </div>

                {/* Password Assistance Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#002060] block">
                      Need to update your password or profile information?
                    </span>
                    <p className="text-[11px] text-blue-900 leading-relaxed max-w-xl">
                      For student data privacy, all credential changes and corrections to student information are securely facilitated through the <strong>Dumalneg NHS IT Support Desk</strong> at <code>dumalnext@gmail.com</code>.
                    </p>
                  </div>
                  <a
                    href={itSupportGmailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Contact IT Support</span>
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
