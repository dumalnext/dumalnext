"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { downloadDepEdEnrollmentPdf } from "@/lib/utils/depedPdfGenerator";
import { FullEnrollmentFormData } from "@/components/forms/enrollment/EnrollmentStepper";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/authContext";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import { isApplicationInTerm } from "@/lib/utils/academicTerm";

interface ApplicationRecord {
  id?: string;
  referenceNumber: string;
  applicationDate: string;
  status: "Pending" | "Approved" | "Needs Revision";
  schoolYear?: string;
  semester?: string;
  rawApp?: any;
  lrn: string;
  fullName: string;
  gradeLevel: number | string;
  applicantType: string;
  jhsProgram?: string;
  spsSport?: string;
  targetTrack?: string;
  targetStrand?: string;
  primaryContact?: string;
  contactNumber?: string;
  remarks?: string;
  sectionId?: string;
  sectionName?: string;
  adviserName?: string;
  room?: string;
  formData?: FullEnrollmentFormData;
}

function TrackApplicationContent() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("ref") || searchParams.get("query") || "";
  const { isEnrollmentOpen, schoolYear, semester, termNumber } = useEnrollmentControl();

  const [record, setRecord] = useState<ApplicationRecord | null>(null);
  const [allRecords, setAllRecords] = useState<ApplicationRecord[]>([]);
  const [isFetchingRecord, setIsFetchingRecord] = useState<boolean>(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const hasLoadedOnceRef = useRef<boolean>(false);

  // Timetable & Prescribed Subjects States
  const [timetableSchedules, setTimetableSchedules] = useState<any[]>([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState<any[]>([]);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState<boolean>(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("All");

  const filteredTimetable = React.useMemo(() => {
    if (selectedDayFilter === "All") {
      return timetableSchedules;
    }
    return timetableSchedules.filter(
      (s: any) => s.day_of_week?.toLowerCase() === selectedDayFilter.toLowerCase()
    );
  }, [timetableSchedules, selectedDayFilter]);

  // Protected Route Check: Unauthenticated visitors redirected to sign in
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/?tab=signin&reason=auth_required");
    }
  }, [user, isAuthLoading, router]);

  // Helper to map Supabase database record into ApplicationRecord model
  const mapSupabaseToRecord = (
    suApp: any,
    studentRecord: any,
    sectionInfo?: { sectionId?: string; sectionName?: string; adviserName?: string; room?: string }
  ): ApplicationRecord => {
    const fullName = studentRecord
      ? `${studentRecord.last_name}, ${studentRecord.first_name} ${studentRecord.middle_name || ""}`.trim()
      : (user ? `${user.lastName}, ${user.firstName}` : "STUDENT APPLICANT");

    const fd = Array.isArray(suApp.selected_electives) && suApp.selected_electives.length > 0
      ? suApp.selected_electives[0]
      : (typeof suApp.selected_electives === "object" && suApp.selected_electives !== null ? suApp.selected_electives : {});
    const cleanSY = suApp.school_year || fd.schoolYear || "2026-2027";
    const appSem = fd.term_name || fd.termName || fd.semester || fd.term || fd.targetSemester || suApp.term_name || suApp.semester || "Trimester 1";
    const jhsProg = fd.jhsProgram || suApp.jhs_program || (suApp.target_strand === "SPS" ? "SPS" : "Regular");

    return {
      id: suApp.id,
      referenceNumber: suApp.application_id,
      applicationDate: suApp.created_at,
      status: suApp.status || "Pending",
      schoolYear: cleanSY,
      semester: appSem,
      rawApp: suApp,
      lrn: (studentRecord?.student_id && /^\d{12}$/.test(studentRecord.student_id))
        ? studentRecord.student_id
        : (user?.lrn && /^\d{12}$/.test(user.lrn))
        ? user.lrn
        : "Pending LIS Assignment",
      fullName,
      gradeLevel: suApp.target_grade_level || 7,
      applicantType: suApp.applicant_type || "Grade 7",
      jhsProgram: jhsProg,
      targetTrack: suApp.target_strand ? "Senior High School" : "Junior High School",
      targetStrand: suApp.target_strand || "",
      remarks: suApp.admin_feedback,
      sectionId: sectionInfo?.sectionId,
      sectionName: sectionInfo?.sectionName,
      adviserName: sectionInfo?.adviserName,
      room: sectionInfo?.room,
      primaryContact: "Parent / Guardian",
      contactNumber: studentRecord?.contact_number || "09181234567",
      formData: {
        step1: {
          isGraded: true,
          applicantType: suApp.applicant_type || "Grade 7",
          targetGradeLevel: Number(suApp.target_grade_level) || 7,
          jhsProgram: jhsProg as any,
          targetSemester: appSem,
          targetTrack: suApp.target_strand ? "Senior High School" : "Junior High School",
          targetStrand: suApp.target_strand || "",
          lastGradeCompleted: (Number(suApp.target_grade_level) || 7) - 1,
          lastSchoolYearCompleted: cleanSY,
          lastSchoolAttended: "Dumalneg Elementary School",
          lastSchoolId: "100050",
        },
        lrn: (studentRecord?.student_id && /^\d{12}$/.test(studentRecord.student_id))
          ? studentRecord.student_id
          : (user?.lrn && /^\d{12}$/.test(user.lrn))
          ? user.lrn
          : "",
        psaBirthCertNo: "1234-5678-9012",
        lastName: studentRecord?.last_name || user?.lastName || "STUDENT",
        firstName: studentRecord?.first_name || user?.firstName || "APPLICANT",
        middleName: studentRecord?.middle_name || user?.middleName || "",
        extensionName: "",
        dateOfBirth: studentRecord?.date_of_birth || "2012-05-15",
        age: 12,
        gender: (studentRecord?.gender as any) || "Male",
        placeOfBirth: "Dumalneg, Ilocos Norte",
        religion: "Roman Catholic",
        motherTongue: "Ilokano",
        contactNumber: studentRecord?.contact_number || "09181234567",
        isIpCommunity: true,
        ipCommunityName: "Isnag",
        is4psBeneficiary: false,
        householdId4ps: "",
        currentHouseNo: "",
        currentSitio: "Poblacion",
        currentBarangay: studentRecord?.barangay || "CABARITAN",
        currentMunicipality: "DUMALNEG",
        currentProvince: "ILOCOS NORTE",
        currentCountry: "PHILIPPINES",
        currentZipCode: "2921",
        isPermanentSameAsCurrent: true,
        permanentHouseNo: "",
        permanentSitio: "Poblacion",
        permanentBarangay: studentRecord?.barangay || "CABARITAN",
        permanentMunicipality: "DUMALNEG",
        permanentProvince: "ILOCOS NORTE",
        permanentCountry: "PHILIPPINES",
        permanentZipCode: "2921",
        fatherLastName: "LOZANO",
        fatherFirstName: "JUAN",
        fatherMiddleName: "",
        fatherContactNumber: "09181234567",
        motherMaidenLastName: "RAMOS",
        motherFirstName: "MARIA",
        motherMiddleName: "",
        motherContactNumber: "09201234567",
        guardianLastName: "",
        guardianFirstName: "",
        guardianMiddleName: "",
        guardianContactNumber: "",
        guardianRelationship: "",
        primaryContactPerson: "Father",
        jhsProgram: "Regular",
        spsSport: "",
        targetTrack: suApp.target_strand ? "Senior High School" : "Junior High School",
        targetStrand: suApp.target_strand || "",
        selectedElectives: [],
        targetSemester: "1st Semester",
        isSned: false,
        snedCategory: "",
        snedDetails: [],
        hasPwdId: false,
        preferredModalities: ["Modular (Print)", "Blended"],
        submittedDocuments: Array.isArray(suApp.submitted_documents)
          ? suApp.submitted_documents.map((d: any) => ({
              type: d.docType || "other",
              fileName: d.fileName || "document.jpg",
              fileUrl: d.fileData || "",
              sizeKb: d.sizeKb || 0,
            }))
          : [],
        dataPrivacyAccepted: true,
      },
    };
  };

  // Real-Time Automatic Loading & Sync of Logged-In Student's Application (Zero-Refresh)
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const supabase = createClient();

    const fetchRecord = async (silent: boolean = false) => {
      // Only display the loading card if this is the very first load and not silent
      if (!silent && !hasLoadedOnceRef.current) {
        setIsFetchingRecord(true);
      }

      try {
        // Helper to fetch section info if student has current_section_id
        const fetchSectionInfo = async (currentSectionId?: string | null) => {
          if (!currentSectionId) return undefined;
          const { data: secData } = await supabase
            .from("sections")
            .select("id, section_name, adviser_name, room")
            .eq("id", currentSectionId)
            .limit(1);
          if (secData && secData.length > 0) {
            return {
              sectionId: secData[0].id,
              sectionName: secData[0].section_name,
              adviserName: secData[0].adviser_name,
              room: secData[0].room,
            };
          }
          return undefined;
        };

        // If a specific reference is passed in query, prioritize it
        if (initialQuery.trim()) {
          const cleanRef = initialQuery.trim().toUpperCase();
          const { data: appData } = await supabase
            .from("enrollment_applications")
            .select("*")
            .eq("application_id", cleanRef)
            .limit(1);

          if (isMounted && appData && appData.length > 0) {
            const { data: stProfile } = await supabase
              .from("students")
              .select("*")
              .eq("id", appData[0].student_id)
              .limit(1);

            const studentObj = stProfile?.[0] || null;
            const targetSecId = studentObj?.current_section_id || appData[0]?.section_id || appData[0]?.assigned_section_id;
            const secInfo = await fetchSectionInfo(targetSecId);

            setRecord(mapSupabaseToRecord(appData[0], studentObj, secInfo));
            hasLoadedOnceRef.current = true;
            setIsFetchingRecord(false);
            return;
          }
        }

        // Automatic Single-Account Tracking: Query by authenticated student's profile
        const { data: stList } = await supabase
          .from("students")
          .select("*")
          .or(`student_id.eq.${user.lrn || user.userId},user_id.eq.${user.id}`)
          .limit(1);

        if (stList && stList.length > 0) {
          const studentRecord = stList[0];
          const appRes = await supabase
            .from("enrollment_applications")
            .select("*")
            .eq("student_id", studentRecord.id)
            .order("created_at", { ascending: false });

          const appData = appRes.data;
          const targetSecId = studentRecord.current_section_id || (appData?.[0]?.section_id) || (appData?.[0]?.assigned_section_id);
          const secInfo = await fetchSectionInfo(targetSecId);

          if (isMounted && appData && appData.length > 0) {
            const mappedRecords = appData.map((a: any) =>
              mapSupabaseToRecord(a, studentRecord, secInfo)
            );
            setAllRecords(mappedRecords);

            // Find application for CURRENT ACTIVE academic term
            const activeTermRecord = mappedRecords.find((r: ApplicationRecord) =>
              isApplicationInTerm(r.rawApp, schoolYear, termNumber || semester)
            );

            // If an explicit query parameter was provided, try matching that first
            if (initialQuery.trim()) {
              const matchedQuery = mappedRecords.find(
                (r: ApplicationRecord) =>
                  r.referenceNumber.toUpperCase() === initialQuery.trim().toUpperCase()
              );
              if (matchedQuery) {
                setRecord(matchedQuery);
                hasLoadedOnceRef.current = true;
                setIsFetchingRecord(false);
                return;
              }
            }

            setRecord(activeTermRecord || mappedRecords[0]);
            hasLoadedOnceRef.current = true;
            setIsFetchingRecord(false);
            return;
          }
        }

        // No record submitted yet
        if (isMounted) {
          setRecord(null);
          setAllRecords([]);
          hasLoadedOnceRef.current = true;
          setIsFetchingRecord(false);
        }
      } catch (err) {
        console.error("Error auto-fetching application record:", err);
        if (isMounted) {
          setRecord(null);
          setAllRecords([]);
          hasLoadedOnceRef.current = true;
          setIsFetchingRecord(false);
        }
      }
    };

    // 1. Initial fetch (silent if already loaded once)
    fetchRecord(hasLoadedOnceRef.current);

    // 2. Window Focus & Visibility sync (silent)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchRecord(true);
      }
    };
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Custom Application/Data Changed event (silent)
    const handleDataChanged = () => {
      fetchRecord(true);
    };
    window.addEventListener("dumalnext:data-changed", handleDataChanged);
    window.addEventListener("dumalnext:teacher-data-changed", handleDataChanged);
    window.addEventListener("dumalnext:admin-data-changed", handleDataChanged);

    // 4. 10-Second Silent Heartbeat Polling
    const heartbeat = setInterval(() => {
      fetchRecord(true);
    }, 10000);

    // 5. Supabase Realtime Channel: Instant push on enrollment_applications, sections, and teachers changes
    const channel = supabase
      .channel("track-realtime-applications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => {
          fetchRecord(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sections" },
        () => {
          fetchRecord(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => {
          fetchRecord(true);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("dumalnext:data-changed", handleDataChanged);
      window.removeEventListener("dumalnext:teacher-data-changed", handleDataChanged);
      window.removeEventListener("dumalnext:admin-data-changed", handleDataChanged);
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.lrn, initialQuery, schoolYear, semester, termNumber]);

  // Fetch Enrolled Subjects & Timetable Schedules for the active record
  useEffect(() => {
    if (!record) {
      setTimetableSchedules([]);
      setEnrolledSubjects([]);
      return;
    }

    let isMounted = true;
    setIsLoadingTimetable(true);

    const loadSubjectsAndTimetable = async () => {
      try {
        // 1. Fetch Subjects for Student's Grade Level and Strand/Program
        const gradeParam = record.gradeLevel || 7;
        const strandParam = record.targetStrand || (record.jhsProgram === "SPS" ? "SPS" : "Regular");
        const subjectsUrl = `/api/subjects?gradeLevel=${gradeParam}&strand=${encodeURIComponent(strandParam)}`;

        const subjPromise = fetch(subjectsUrl)
          .then((res) => res.json())
          .then((data) => (data.success && Array.isArray(data.subjects) ? data.subjects : []))
          .catch(() => []);

        // 2. Fetch Timetable Schedules for Student's Assigned Section (or grade level fallback)
        let schedUrl = `/api/schedules?gradeLevel=${gradeParam}`;
        if (record.sectionId) {
          schedUrl = `/api/schedules?sectionId=${record.sectionId}`;
        }

        const schedPromise = fetch(schedUrl)
          .then((res) => res.json())
          .then((data) => (data.success && Array.isArray(data.schedules) ? data.schedules : []))
          .catch(() => []);

        const [fetchedSubjects, fetchedSchedules] = await Promise.all([subjPromise, schedPromise]);

        if (isMounted) {
          setEnrolledSubjects(fetchedSubjects);
          setTimetableSchedules(fetchedSchedules);
          setIsLoadingTimetable(false);
        }
      } catch (err) {
        console.error("Error loading subjects and timetable:", err);
        if (isMounted) {
          setIsLoadingTimetable(false);
        }
      }
    };

    loadSubjectsAndTimetable();

    return () => {
      isMounted = false;
    };
  }, [record?.referenceNumber, record?.sectionId, record?.gradeLevel, record?.targetStrand, record?.jhsProgram]);

  const handleDownloadApprovedPdf = async () => {
    if (!record) return;
    setIsDownloadingPdf(true);
    try {
      const downloadData: FullEnrollmentFormData = record.formData || {
        step1: {
          isGraded: true,
          applicantType: (record.applicantType as any) || "Grade 7",
          targetGradeLevel: Number(record.gradeLevel) || 7,
          jhsProgram: (record.jhsProgram as any) || "Regular",
          targetSemester: "1st Semester",
          targetTrack: record.targetTrack || "Academic Track",
          targetStrand: record.targetStrand || "STEM",
          lastGradeCompleted: 6,
          lastSchoolYearCompleted: "2024-2025",
          lastSchoolAttended: "Dumalneg Elementary School",
          lastSchoolId: "100050",
        },
        lrn: record.lrn,
        psaBirthCertNo: "1234-5678-9012",
        lastName: record.fullName.split(",")[0] || "STUDENT",
        firstName: record.fullName.split(",")[1]?.trim().split(" ")[0] || "ENROLLEE",
        middleName: "DUMALNEG",
        extensionName: "",
        dateOfBirth: "2012-05-15",
        age: 12,
        gender: "Male",
        placeOfBirth: "Dumalneg, Ilocos Norte",
        religion: "Roman Catholic",
        motherTongue: "Ilokano",
        contactNumber: record.contactNumber || "09181234567",
        isIpCommunity: true,
        ipCommunityName: "Isnag",
        is4psBeneficiary: false,
        householdId4ps: "",
        currentHouseNo: "",
        currentSitio: "Poblacion",
        currentBarangay: "CABARITAN",
        currentMunicipality: "DUMALNEG",
        currentProvince: "ILOCOS NORTE",
        currentCountry: "PHILIPPINES",
        currentZipCode: "2921",
        isPermanentSameAsCurrent: true,
        permanentHouseNo: "",
        permanentSitio: "Poblacion",
        permanentBarangay: "CABARITAN",
        permanentMunicipality: "DUMALNEG",
        permanentProvince: "ILOCOS NORTE",
        permanentCountry: "PHILIPPINES",
        permanentZipCode: "2921",
        fatherLastName: "LOZANO",
        fatherFirstName: "JUAN",
        fatherMiddleName: "CASTRO",
        fatherContactNumber: record.contactNumber || "09181234567",
        motherMaidenLastName: "RAMOS",
        motherFirstName: "MARIA",
        motherMiddleName: "DELA CRUZ",
        motherContactNumber: "09201234567",
        guardianLastName: "",
        guardianFirstName: "",
        guardianMiddleName: "",
        guardianContactNumber: "",
        guardianRelationship: "",
        primaryContactPerson: (record.primaryContact as any) || "Father",
        isSned: false,
        snedCategory: "",
        snedDetails: [],
        hasPwdId: false,
        jhsProgram: (record.jhsProgram as any) || "Regular",
        spsSport: record.spsSport || "",
        targetSemester: "1st Semester",
        targetTrack: record.targetTrack || "Academic Track",
        targetStrand: record.targetStrand || "STEM",
        selectedElectives: [],
        preferredModalities: ["Modular (Print)"],
        submittedDocuments: [],
        dataPrivacyAccepted: true,
      };

      await downloadDepEdEnrollmentPdf(
        downloadData,
        `Official_DepEd_Form_${record.referenceNumber}.pdf`
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white border-2 border-slate-300 text-center font-sans">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
          [ AUTHENTICATING APPLICANT SESSION ]
        </span>
        <p className="text-sm font-bold text-slate-800">
          Verifying authorized student credentials...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-amber-50 border-2 border-amber-400 text-center font-sans space-y-3">
        <span className="text-xs font-bold text-amber-900 uppercase block">
          [ ACCESS RESTRICTED: AUTHENTICATION REQUIRED ]
        </span>
        <p className="text-xs text-amber-800">
          You must create an account or sign in before tracking your enrollment status. Redirecting to sign in...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Page Title & Navigation */}
      <div className="border-b-2 border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#002060]">
            DUMALNEG NATIONAL HIGH SCHOOL &bull; STUDENT PORTAL
          </span>
          <Link
            href="/"
            className="text-xs text-[#002060] font-bold uppercase hover:underline"
          >
            &larr; Back to Portal Home
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          My Enrollment Application Status
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Real-time registrar evaluation updates for registered learner:{" "}
          <strong className="text-slate-900 uppercase">
            {user.firstName} {user.lastName}
          </strong>{" "}
          ({user.email}).
        </p>
      </div>

      {/* Main Content Area */}
      {isFetchingRecord && !record ? (
        <div className="p-8 bg-white border-2 border-slate-200 text-center">
          <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : record ? (
        /* =========================================================================
           SCENARIO 1: ENROLLMENT APPLICATION FOUND (AUTOMATIC LIVE TRACKING CARD)
           ========================================================================= */
        <div className="space-y-4">
          {/* Active Academic Term Enrollment Open Advisory */}
          {!allRecords.some((r) => isApplicationInTerm(r.rawApp, schoolYear, termNumber || semester)) && isEnrollmentOpen && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-950 uppercase block mb-0.5">
                  [ NEW ACADEMIC TERM: S.Y. {schoolYear} &bull; {semester} ENROLLMENT IS OPEN ]
                </span>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  You are currently reviewing your previous term application record. Online Enrollment for School Year {schoolYear} ({semester}) is now officially open!
                </p>
              </div>
              <Link
                href="/enroll"
                className="btn-primary text-xs uppercase font-bold py-2.5 px-5 shrink-0 text-center"
              >
                Enroll Now for {semester} &rarr;
              </Link>
            </div>
          )}

          {/* Multi-Term Application Selector (When learner has records across semesters) */}
          {allRecords.length > 1 && (
            <div className="p-3 bg-white border border-slate-300 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold text-slate-600 uppercase shrink-0">
                [ Term Records ]:
              </span>
              {allRecords.map((rec) => {
                const isSelected = record?.referenceNumber === rec.referenceNumber;
                return (
                  <button
                    key={rec.referenceNumber}
                    type="button"
                    onClick={() => setRecord(rec)}
                    className={`px-3 py-1.5 font-mono text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-[#002060] text-white border-[#002060] shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {rec.referenceNumber} &bull; S.Y. {rec.schoolYear} ({rec.semester}) [{rec.status}]
                  </button>
                );
              })}
            </div>
          )}

          <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Header with Reference Number and Status Badge */}
            <div className="border-b-2 border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">
                  Official Application Reference Number &bull; S.Y. {record.schoolYear} ({record.semester})
                </span>
                <span className="text-2xl font-mono font-bold text-[#002060]">
                  {record.referenceNumber}
                </span>
              </div>

            {/* Institutional Status Badges (Color-coded, Zero Emojis) */}
            <div>
              {record.status === "Pending" && (
                <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border-2 border-amber-400 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600 inline-block shrink-0" />
                  [ STATUS: PENDING REGISTRAR VERIFICATION ]
                </span>
              )}
              {record.status === "Approved" && (
                <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border-2 border-emerald-500 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-emerald-700 inline-block shrink-0" />
                  [ STATUS: APPROVED &amp; OFFICIALLY ENROLLED ]
                </span>
              )}
              {record.status === "Needs Revision" && (
                <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-red-50 text-red-900 border-2 border-red-500 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-red-700 inline-block shrink-0" />
                  [ STATUS: NEEDS REVISION / ACTION REQUIRED ]
                </span>
              )}
            </div>
          </div>

          {/* Status Context Banner */}
          {record.status === "Pending" && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 space-y-1">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Application Under Registrar Evaluation
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Your submitted basic education application and documentary requirements have been received and are currently queued for verification by the Dumalneg NHS Registrar. Official DepEd PDF documents will become accessible once your enrollment is confirmed.
              </p>
            </div>
          )}

          {record.status === "Approved" && (
            <div className="p-5 bg-emerald-50 border-2 border-emerald-400 space-y-3">
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Official Enrollment Confirmed
              </div>
              <p className="text-xs text-emerald-950 leading-relaxed font-bold">
                {record.remarks ||
                  "You're enrolled at Dumalneg National High School for School Year 2025–2026. Welcome to your official class section!"}
              </p>

              {/* Assigned Section and Class Adviser Information */}
              <div className="p-3.5 bg-white border border-emerald-300 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">
                    [ ASSIGNED CLASS SECTION ]
                  </span>
                  <span className="text-sm font-bold text-slate-900 uppercase">
                    {record.sectionName || "Section Assignment Pending"}
                  </span>
                  {record.room && (
                    <span className="text-[11px] text-slate-600 block">
                      Room: {record.room}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">
                    [ CLASS ADVISER / TEACHER ]
                  </span>
                  <span className="text-sm font-bold text-[#002060] uppercase">
                    {record.adviserName || "Adviser to be Assigned"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                The Dumalneg National High School Registrar has approved your application, verified your credentials, and assigned your official class section. Your official accomplished DepEd enrollment form is ready for download below.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadApprovedPdf}
                  disabled={isDownloadingPdf}
                  className="px-6 py-3 bg-[#002060] text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-950 transition-colors shadow-xs"
                >
                  {isDownloadingPdf
                    ? "[ GENERATING OFFICIAL DEPED PDF... ]"
                    : "[ DOWNLOAD ACCOMPLISHED DEPED FORM (PDF) ]"}
                </button>
              </div>
            </div>
          )}

          {record.status === "Needs Revision" && (
            <div className="p-5 bg-red-50 border-2 border-red-400 space-y-3">
              <div className="text-xs font-bold text-red-900 uppercase tracking-wider">
                Registrar Feedback &amp; Action Required
              </div>
              <p className="text-xs text-red-900 leading-relaxed font-medium">
                {record.remarks ||
                  "One or more submitted documents require correction or re-submission before your enrollment can be confirmed."}
              </p>
              <div className="pt-3 border-t border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-red-950 uppercase block">
                    Complete Application Dossier Unlocked
                  </span>
                  <span className="text-[11px] text-red-800 block mt-0.5">
                    Your complete enrollment application is now editable. Proceed to the enrollment form to update your information and documentary requirements.
                  </span>
                </div>
                <Link
                  href="/enroll"
                  className="px-5 py-2.5 bg-[#002060] hover:bg-blue-950 text-white font-bold text-xs uppercase tracking-wider shadow-xs shrink-0 inline-flex items-center gap-1.5"
                >
                  [ Edit &amp; Resubmit Application &rarr; ]
                </Link>
              </div>
            </div>
          )}

          {/* Official Applicant Details Summary Table */}
          <div className="border-2 border-slate-200 p-5 space-y-4">
            <div className="text-xs font-bold text-[#002060] uppercase tracking-wider border-b border-slate-200 pb-2">
              [ Official Enrollment Application Details ]
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Learner Full Name</span>
                <span className="font-bold text-slate-900 uppercase">{record.fullName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">12-Digit LRN</span>
                <span className="font-mono font-bold text-slate-900">
                  {/^\d{12}$/.test(record.lrn) ? record.lrn : "Pending LIS Assignment (No LRN Yet)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Grade Level &amp; Type</span>
                <span className="font-bold text-slate-900">
                  Grade {record.gradeLevel} ({record.applicantType})
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Curriculum Program</span>
                <span className="font-bold text-slate-900">
                  {record.targetStrand
                    ? `Senior High School (${record.targetStrand})`
                    : "Regular Junior High School Curriculum"}
                </span>
              </div>
              {record.sectionName && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Assigned Section</span>
                  <span className="font-bold text-slate-900 uppercase">{record.sectionName}</span>
                </div>
              )}
              {record.adviserName && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Class Adviser</span>
                  <span className="font-bold text-[#002060] uppercase">{record.adviserName}</span>
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">School Year &bull; Term</span>
                <span className="font-bold text-slate-900">{record.schoolYear || "2026-2027"} ({record.semester || "Trimester 1"})</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Submission Date</span>
                <span className="font-bold text-slate-900">
                  {new Date(record.applicationDate).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
             SECTION: OFFICIAL ENROLLED SUBJECTS & PRESCRIBED DEPED LEARNING AREAS
             ========================================================================= */}
          <div className="border-2 border-slate-300 bg-white p-6 sm:p-8 space-y-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
                  [ OFFICIAL ENROLLED SUBJECTS &bull; PRESCRIBED DEPED LEARNING AREAS ]
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Curricular learning areas designated for Grade {record.gradeLevel}{" "}
                  {record.targetStrand
                    ? `(${record.targetStrand})`
                    : `(${record.jhsProgram === "SPS" ? "Special Program in Sports" : "Regular JHS Curriculum"})`}
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 border border-slate-300">
                {enrolledSubjects.length} Subject Units Registered
              </span>
            </div>

            {isLoadingTimetable && enrolledSubjects.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading official enrolled subjects...
              </div>
            ) : enrolledSubjects.length === 0 ? (
              <div className="p-5 bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center font-mono">
                [ No prescribed course subjects registered for this grade level ]
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-mono font-bold text-[11px] uppercase">
                      <th className="p-2.5">Subject Code</th>
                      <th className="p-2.5">Learning Area / Course Title</th>
                      <th className="p-2.5">Classification</th>
                      <th className="p-2.5">Grade Level</th>
                      <th className="p-2.5">Curriculum / Program</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {enrolledSubjects.map((subj: any) => (
                      <tr key={subj.id || subj.subject_code} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-[#002060]">
                          {subj.subject_code}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {subj.subject_name}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                              subj.subject_type === "Core"
                                ? "bg-blue-50 text-blue-900 border border-blue-300"
                                : subj.subject_type === "Specialized"
                                ? "bg-purple-50 text-purple-900 border border-purple-300"
                                : subj.subject_type === "Applied"
                                ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                                : "bg-amber-50 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {subj.subject_type || "Core"}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-700 font-medium">
                          Grade {subj.grade_level}
                        </td>
                        <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                          {subj.strand || "Regular"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* =========================================================================
             SECTION: OFFICIAL CLASS TIMETABLE & WEEKLY SCHEDULE
             ========================================================================= */}
          <div id="timetable" className="border-2 border-slate-300 bg-white p-6 sm:p-8 space-y-5 shadow-sm scroll-mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
                  [ OFFICIAL CLASS TIMETABLE &bull; WEEKLY SCHEDULE ]
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Class timetable periods, assigned subject teachers, and classroom locations.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-[#002060] text-white px-2.5 py-1 uppercase">
                  {record.sectionName || "Section Pending"}
                </span>
                {record.room && (
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-1 border border-slate-300 uppercase">
                    Room {record.room}
                  </span>
                )}
              </div>
            </div>

            {/* Day of Week Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
                const isDayActive = selectedDayFilter.toLowerCase() === day.toLowerCase();
                const dayCount =
                  day === "All"
                    ? timetableSchedules.length
                    : timetableSchedules.filter((s: any) => s.day_of_week?.toLowerCase() === day.toLowerCase()).length;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayFilter(day)}
                    className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      isDayActive
                        ? "bg-[#002060] text-white border-[#002060] shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {day.toUpperCase()} ({dayCount})
                  </button>
                );
              })}
            </div>

            {isLoadingTimetable && timetableSchedules.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading section timetable periods...
              </div>
            ) : filteredTimetable.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-300 text-center space-y-2">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase block">
                  [ TIMETABLE STATUS: SCHEDULE UNDER PREPARATION &bull; DECONFLICTION GUARD ACTIVE ]
                </span>
                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                  The weekly timetable periods for this section are currently being finalized by the school administration and registrar. 
                  Enrolled subjects and learning areas above are officially registered.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTimetable.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3.5 border-2 border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#002060] transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-block px-2.5 py-1 text-[11px] font-mono font-bold bg-[#002060] text-white uppercase tracking-wider">
                        {item.day_of_week} &bull; {item.start_time} - {item.end_time}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                        {item.subject_code}
                      </span>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-900 leading-tight">
                        {item.subject_name}
                      </div>
                      <div className="text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
                        <span>
                          <strong className="text-slate-700">Teacher:</strong>{" "}
                          {item.teacher_name || record.adviserName || "Assigned Faculty"}
                        </span>
                        <span>
                          <strong className="text-slate-700">Classroom:</strong>{" "}
                          {item.classroom_name || (record.room ? `Room ${record.room}` : "Standard Classroom")}
                          {item.building ? ` (${item.building})` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        /* =========================================================================
           SCENARIO 2: NO APPLICATION SUBMITTED YET FOR THIS ACCOUNT
           ========================================================================= */
        <div className="p-8 bg-white border-2 border-slate-300 text-center space-y-4 shadow-sm">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
            [ APPLICATION STATUS: NOT YET SUBMITTED ]
          </span>
          <h2 className="text-lg font-bold text-slate-900">
            No Submitted Enrollment Application Found
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Your learner account (<strong className="text-slate-900">{user.email}</strong>) is active and verified. 
            However, you have not yet completed and submitted the online basic education enrollment form for School Year {schoolYear} ({semester}).
          </p>
          <div className="pt-2">
            <Link
              href="/enroll"
              className="inline-block px-8 py-3 bg-[#002060] text-white text-xs uppercase font-bold tracking-wider hover:bg-blue-950 transition-colors shadow-xs"
            >
              Start Online Enrollment Form ({semester})
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
         OFFICIAL STATUS EVALUATION LEGEND (GREEN, YELLOW, RED)
         ========================================================================= */}
      <section className="bg-white border-2 border-slate-300 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
          <div>
            <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
              [ STATUS LEGEND &bull; GABAY SA MGA KULAY NG KATAYUAN ]
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Opisyal na panuntunan ng DepEd Dumalneg NHS Registrar para sa pagsusuri ng enrollment:
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase bg-slate-100 px-2.5 py-1 border border-slate-300">
            3 Standard DepEd Indicators
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Green Legend Card */}
          <div className="p-4 bg-emerald-50/70 border-2 border-emerald-500 flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shrink-0 border border-emerald-700 shadow-xs" />
              <span className="text-xs font-mono font-bold text-emerald-950 uppercase tracking-wider">
                [ Green: Approved ]
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-900 block">
                Opisyal Nang Naka-Enroll
              </span>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Naaprubahan na ng Registrar ang aplikasyon at kumpleto ang mga rekisito. Handa na at maaaring i-download ang opisyal na accomplished DepEd Enrollment Form (PDF).
              </p>
            </div>
          </div>

          {/* Yellow / Amber Legend Card */}
          <div className="p-4 bg-amber-50/70 border-2 border-amber-400 flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0 border border-amber-600 shadow-xs" />
              <span className="text-xs font-mono font-bold text-amber-950 uppercase tracking-wider">
                [ Yellow: Pending ]
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-900 block">
                Kasalukuyang Sinusuri
              </span>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Natanggap na ang aplikasyon at nakapila sa pagsusuri ng Registrar. Hinihintay ang beripikasyon ng mga isinumiteng detalye at dokumento.
              </p>
            </div>
          </div>

          {/* Red Legend Card */}
          <div className="p-4 bg-red-50/70 border-2 border-red-500 flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 shrink-0 border border-red-700 shadow-xs" />
              <span className="text-xs font-mono font-bold text-red-950 uppercase tracking-wider">
                [ Red: Needs Revision ]
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-red-900 block">
                May Kailangang Iwasto
              </span>
              <p className="text-[11px] text-red-900 leading-relaxed">
                May nakitang kakulangan o malabong dokumento (hal. PSA Birth Certificate o SF9 Report Card). Kailangang mag-upload ng tamang kopya upang maaprubahan.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function TrackApplicationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          Loading application tracking interface...
        </div>
      }
    >
      <TrackApplicationContent />
    </Suspense>
  );
}
