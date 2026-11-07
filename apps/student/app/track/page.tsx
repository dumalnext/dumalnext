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
import { CopyChip, PageCardSkeleton, EmptyStateCard, PrintPageButton } from "@/components/ui/PortalUI";

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

/**
 * Convert 24-hour military time (e.g. "07:30", "13:00", "15:30:00") into 12-hour AM/PM format (e.g. "7:30 AM", "1:00 PM", "3:30 PM").
 */
function formatTo12Hour(timeStr?: string | null): string {
  if (!timeStr) return "";
  const cleaned = timeStr.trim();
  if (/am|pm/i.test(cleaned)) return cleaned;

  const parts = cleaned.split(":");
  if (parts.length === 0) return cleaned;

  const rawHour = parseInt(parts[0], 10);
  if (isNaN(rawHour)) return cleaned;

  const minutes = parts.length > 1 ? parts[1].slice(0, 2) : "00";
  const period = rawHour >= 12 ? "PM" : "AM";
  const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;

  return `${hour12}:${minutes} ${period}`;
}

function formatTimeRange(start?: string | null, end?: string | null): string {
  const formattedStart = formatTo12Hour(start);
  const formattedEnd = formatTo12Hour(end);
  if (formattedStart && formattedEnd) {
    return `${formattedStart} - ${formattedEnd}`;
  }
  return formattedStart || formattedEnd || "";
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
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("Monday");
  const [activeScheduleTab, setActiveScheduleTab] = useState<"timetable" | "subjects">("timetable");

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
    const jhsProg = "Regular";

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
            .select("id, section_name")
            .eq("id", currentSectionId)
            .limit(1);
          if (secData && secData.length > 0) {
            let room: string | undefined = undefined;
            let adviserName: string | undefined = undefined;
            try {
              const { data: sysData } = await supabase
                .from("system_settings")
                .select("value")
                .eq("key", "sections_config")
                .maybeSingle();
              if (sysData?.value?.customSections && Array.isArray(sysData.value.customSections)) {
                const match = sysData.value.customSections.find((c: any) => c.id === currentSectionId);
                if (match) {
                  room = match.room || undefined;
                  adviserName = match.adviser_name || undefined;
                }
              }
            } catch {}

            return {
              sectionId: secData[0].id,
              sectionName: secData[0].section_name,
              adviserName,
              room,
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

    // 4. Fallback Heartbeat Polling (every 2 minutes, active tab only)
    const heartbeat = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchRecord(true);
      }
    }, 120000);

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
        const strandParam = record.targetStrand || "Regular";
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
      <div className="max-w-4xl mx-auto">
        <PageCardSkeleton title="Verifying authorized student session and application records..." rows={3} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-amber-50 border-2 border-amber-400 text-center space-y-3 rounded-[4px] shadow-sm">
        <span className="text-xs font-bold text-amber-900 block">
          Access Restricted: Authentication Required
        </span>
        <p className="text-xs text-amber-800">
          You must create an account or sign in before tracking your enrollment status. Redirecting to sign in...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Institutional Enrollment System Header Banner */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white border-t-4 border-amber-400 p-5 sm:p-6 rounded-[4px] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full border-2 border-amber-400 shrink-0 flex items-center justify-center shadow-xs overflow-hidden">
            <img
              src="/dumalneg-logo.png"
              alt="Dumalneg NHS Official Seal"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-amber-300">
              <span>Dumalneg National High School</span>
              <span className="text-blue-300">&bull;</span>
              <span>Application Status Tracker</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              My Enrollment Application Status
            </h1>
            <p className="text-xs text-blue-100 mt-0.5">
              <strong className="text-white">{user.firstName} {user.lastName}</strong> ({user.email})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
          {record && <PrintPageButton label="Print Status & Schedule" />}
          <Link
            href="/"
            className="no-print px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold rounded-[4px] transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-amber-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Portal Home</span>
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      {isFetchingRecord && !record ? (
        <PageCardSkeleton title="Loading your official enrollment application and subject schedule..." rows={3} />
      ) : record ? (
        /* =========================================================================
           SCENARIO 1: ENROLLMENT APPLICATION FOUND (AUTOMATIC LIVE TRACKING CARD)
           ========================================================================= */
        <div className="space-y-4">
          {/* Active Academic Term Enrollment Open Advisory */}
          {!allRecords.some((r) => isApplicationInTerm(r.rawApp, schoolYear, termNumber || semester)) && isEnrollmentOpen && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs rounded-[4px]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    S.Y. {schoolYear} &bull; {semester} Enrollment is Open
                  </span>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Viewing previous term record. Submit your continuing enrollment for {semester}.
                  </p>
                </div>
              </div>
              <Link
                href="/enroll"
                className="btn-primary text-xs font-bold py-2 px-4 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-[4px]"
              >
                <span>Enroll Now for {semester}</span>
                <svg className="w-3.5 h-3.5 text-amber-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {/* Multi-Term Application Selector */}
          {allRecords.length > 1 && (
            <div className="p-3 bg-white border border-slate-300 flex flex-wrap items-center gap-2 text-xs rounded-[4px]">
              <span className="font-bold text-slate-600 shrink-0">
                Term Records:
              </span>
              {allRecords.map((rec) => {
                const isSelected = record?.referenceNumber === rec.referenceNumber;
                return (
                  <button
                    key={rec.referenceNumber}
                    type="button"
                    onClick={() => setRecord(rec)}
                    className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer shrink-0 rounded-[4px] ${
                      isSelected
                        ? "bg-[#002060] text-white border-[#002060] shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {rec.referenceNumber} &bull; S.Y. {rec.schoolYear} ({rec.semester}) ({rec.status})
                  </button>
                );
              })}
            </div>
          )}

          {/* UNIFIED APPLICATION DOSSIER & STATUS CARD */}
          <div className="bg-white border border-slate-200/90 p-5 sm:p-6 space-y-5 shadow-sm rounded-[4px]">
            {/* Top Row: Reference Number & Status Pill */}
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#002060]/10 border border-[#002060]/20 text-[#002060] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Application Reference &bull; S.Y. {record.schoolYear} ({record.semester})
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-[#002060] tracking-tight">
                      {record.referenceNumber}
                    </span>
                    <CopyChip value={record.referenceNumber} label="Reference Number" />
                  </div>
                </div>
              </div>

              <div>
                {record.status === "Pending" && (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold bg-amber-50 text-amber-900 border border-amber-400 shadow-2xs rounded-[4px]">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />
                    Status: Pending Verification
                  </span>
                )}
                {record.status === "Approved" && (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-500 shadow-2xs rounded-[4px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0" />
                    Status: Approved &amp; Enrolled
                  </span>
                )}
                {record.status === "Needs Revision" && (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold bg-red-50 text-red-900 border border-red-500 shadow-2xs rounded-[4px]">
                    <span className="w-2 h-2 rounded-full bg-red-600 inline-block shrink-0" />
                    Status: Needs Revision
                  </span>
                )}
              </div>
            </div>

            {/* Compact Status Callout + Primary Action */}
            {record.status === "Pending" && (
              <div className="p-4 bg-amber-50/80 border border-amber-300 flex items-center gap-3 rounded-[4px]">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-950 block">
                    Under School Administrator Evaluation
                  </span>
                  <span className="text-[11px] text-amber-900">
                    Your application and documents are queued for verification. Official DepEd PDF forms unlock upon approval.
                  </span>
                </div>
              </div>
            )}

            {record.status === "Approved" && (
              <div className="p-4 bg-emerald-50/90 border border-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[4px]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Official Enrollment Confirmed
                    </span>
                    <span className="text-[11px] text-emerald-900 font-medium">
                      {record.remarks || `Enrolled at Dumalneg NHS for S.Y. ${record.schoolYear || "2026-2027"}.`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadApprovedPdf}
                  disabled={isDownloadingPdf}
                  className="px-4 py-2.5 bg-[#002060] text-white text-xs font-bold hover:bg-blue-950 transition-colors shadow-xs rounded-[4px] inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-amber-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>
                    {isDownloadingPdf
                      ? "Generating PDF..."
                      : "Download DepEd Form (PDF)"}
                  </span>
                </button>
              </div>
            )}

            {record.status === "Needs Revision" && (
              <div className="p-4 bg-red-50 border border-red-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[4px]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-950 block">
                      Administrator Feedback &bull; Action Required
                    </span>
                    <span className="text-[11px] text-red-900">
                      {record.remarks || "One or more submitted details or documents require correction before approval."}
                    </span>
                  </div>
                </div>
                <Link
                  href="/enroll"
                  className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white font-bold text-xs shadow-xs shrink-0 inline-flex items-center gap-1.5 rounded-[4px]"
                >
                  <span>Edit &amp; Resubmit</span>
                </Link>
              </div>
            )}

            {/* Consolidated 4-Column Learner & Placement Dossier Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Learner Full Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block truncate">{record.fullName}</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">12-Digit DepEd LRN</span>
                {/^d{12}$/.test(record.lrn) ? (
                  <div className="mt-0.5">
                    <CopyChip value={record.lrn} label="12-Digit LRN" />
                  </div>
                ) : (
                  <span className="font-bold text-slate-900 mt-0.5 block">Pending LIS Assignment</span>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grade Level &amp; Type</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  Grade {record.gradeLevel} &bull;{" "}
                  {/grade/i.test(record.applicantType || "")
                    ? "Regular Learner"
                    : record.applicantType || "Regular"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Curriculum Program</span>
                <span className="font-bold text-slate-900 mt-0.5 block truncate">
                  {Number(record.gradeLevel) >= 11 && record.targetStrand && record.targetStrand !== "Regular"
                    ? `SHS (${record.targetStrand})`
                    : "Junior High School (Regular)"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Class Section</span>
                <span className="font-bold text-[#002060] mt-0.5 block truncate">
                  {record.sectionName || "Pending Placement"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class Adviser</span>
                <span className="font-bold text-slate-900 mt-0.5 block truncate">
                  {record.adviserName || "To Be Designated"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Classroom</span>
                <span className="font-bold text-slate-900 mt-0.5 block truncate">
                  {record.room
                    ? /^room\b/i.test(record.room.trim())
                      ? record.room.trim()
                      : `Room ${record.room.trim()}`
                    : "Main Academic Wing"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Submitted</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {new Date(record.applicationDate).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
             UNIFIED ACADEMIC TIMETABLE & ENROLLED SUBJECTS CARD (TABBED & COMPACT)
             ========================================================================= */}
          <div id="timetable" className="border border-slate-200/90 bg-white p-5 sm:p-6 space-y-4 shadow-sm scroll-mt-6 rounded-[4px]">
            {/* Top Bar: Switcher Tabs + Section/Room Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-[5px] border border-slate-200 self-start">
                <button
                  type="button"
                  onClick={() => setActiveScheduleTab("timetable")}
                  className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeScheduleTab === "timetable"
                      ? "bg-[#002060] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Weekly Class Timetable ({timetableSchedules.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveScheduleTab("subjects")}
                  className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeScheduleTab === "subjects"
                      ? "bg-[#002060] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Enrolled Subjects ({enrolledSubjects.length})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold bg-[#002060] text-white px-2.5 py-1 uppercase rounded-[4px]">
                  {record.sectionName || "Section Pending"}
                </span>
                {record.room && (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 border border-slate-300 rounded-[4px]">
                    {/^room\b/i.test(record.room.trim()) ? record.room.trim() : `Room ${record.room.trim()}`}
                  </span>
                )}
              </div>
            </div>

            {/* TAB 1: WEEKLY CLASS TIMETABLE (COMPACT TABLE) */}
            {activeScheduleTab === "timetable" ? (
              <div className="space-y-3">
                {/* Day of Week Filter Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "All"].map((day) => {
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
                          className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer rounded-[4px] ${
                            isDayActive
                              ? "bg-[#002060] text-white border-[#002060] shadow-2xs"
                              : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {day === "All" ? `All Days (${dayCount})` : `${day} (${dayCount})`}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Showing {filteredTimetable.length} {filteredTimetable.length === 1 ? "period" : "periods"}
                  </span>
                </div>

                {isLoadingTimetable && timetableSchedules.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading section timetable periods...
                  </div>
                ) : filteredTimetable.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 text-center space-y-1 rounded-[4px]">
                    <span className="text-xs font-bold text-slate-700 block">
                      Schedule Under Preparation
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Weekly timetable periods for this section are being finalized by the registrar.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-[4px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[11px]">
                          {selectedDayFilter === "All" && <th className="py-2.5 px-3">Day</th>}
                          <th className="py-2.5 px-3">Time Window</th>
                          <th className="py-2.5 px-3">Subject &amp; Code</th>
                          <th className="py-2.5 px-3">Assigned Faculty</th>
                          <th className="py-2.5 px-3">Classroom</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredTimetable.map((item: any, idx: number) => {
                          const rawRoom = item.classroom_name || record.room || "Room 101";
                          const cleanRoom = /^room\b/i.test(String(rawRoom).trim())
                            ? String(rawRoom).trim()
                            : `Room ${String(rawRoom).trim()}`;

                          return (
                            <tr key={item.id || idx} className="hover:bg-blue-50/40 transition-colors">
                              {selectedDayFilter === "All" && (
                                <td className="py-2.5 px-3 font-bold text-[#002060] whitespace-nowrap">
                                  {item.day_of_week}
                                </td>
                              )}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-block px-2 py-0.5 text-[11px] font-bold bg-[#002060]/10 text-[#002060] rounded-[3px]">
                                  {formatTimeRange(item.start_time, item.end_time)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{item.subject_name}</span>
                                  {item.subject_code && (
                                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 border border-slate-200 rounded-[3px]">
                                      {item.subject_code}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 font-medium">
                                {item.teacher_name || record.adviserName || "Assigned Faculty"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {cleanRoom}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: OFFICIAL ENROLLED SUBJECTS */
              <div>
                {isLoadingTimetable && enrolledSubjects.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <div className="w-5 h-5 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading official enrolled subjects...
                  </div>
                ) : enrolledSubjects.length === 0 ? (
                  <div className="p-5 bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center rounded-[4px]">
                    No prescribed course subjects registered for this grade level
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-[4px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[11px]">
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
                                className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-[4px] ${
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
                            <td className="p-2.5 text-slate-600 text-[11px]">
                              {subj.strand || "Regular"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
           SCENARIO 2: NO APPLICATION SUBMITTED YET (ILLUSTRATED EMPTY STATE)
           ========================================================================= */
        <EmptyStateCard
          badge="Application Status • Not Yet Submitted"
          title="No Submitted Enrollment Application Found"
          description={`Your learner account (${user.email}) is active and verified, but no enrollment application has been submitted yet for School Year ${schoolYear} (${semester}).`}
          actionLabel={`Start Online Enrollment Form (${semester})`}
          actionHref="/enroll"
          secondaryLabel="Return to Dashboard"
          secondaryHref="/"
        />
      )}

      {/* =========================================================================
         OFFICIAL STATUS EVALUATION LEGEND (CLEAN ENGLISH & SOFT BORDERS)
         ========================================================================= */}
      <section className="no-print bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-xs rounded-[4px]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#002060]/10 text-[#002060] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-[#002060] tracking-wide block">
              Application Status Guide
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2.5 py-1 border border-slate-200 rounded-[4px]">
            3 Status Levels
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-300 flex items-center gap-3 rounded-[4px]">
            <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-emerald-950 block">Approved</span>
              <span className="text-[11px] text-emerald-800">Verified &bull; PDF Form &amp; Section Ready</span>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/60 border border-amber-300 flex items-center gap-3 rounded-[4px]">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <div>
              <span className="text-xs font-bold text-amber-950 block">Pending</span>
              <span className="text-[11px] text-amber-800">Queued for Administrator Review</span>
            </div>
          </div>

          <div className="p-3.5 bg-red-50/60 border border-red-300 flex items-center gap-3 rounded-[4px]">
            <span className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-red-950 block">Needs Revision</span>
              <span className="text-[11px] text-red-800">Action Required &bull; Form Unlocked</span>
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
        <div className="p-8 text-center text-xs text-slate-500">
          Loading application tracking interface...
        </div>
      }
    >
      <TrackApplicationContent />
    </Suspense>
  );
}
