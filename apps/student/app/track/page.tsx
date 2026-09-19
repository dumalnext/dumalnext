"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { downloadDepEdEnrollmentPdf } from "@/lib/utils/depedPdfGenerator";
import { FullEnrollmentFormData } from "@/components/forms/enrollment/EnrollmentStepper";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/authContext";

interface ApplicationRecord {
  referenceNumber: string;
  applicationDate: string;
  status: "Pending" | "Approved" | "Needs Revision";
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
  formData?: FullEnrollmentFormData;
}

function TrackApplicationContent() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("ref") || searchParams.get("query") || "";

  const [record, setRecord] = useState<ApplicationRecord | null>(null);
  const [isFetchingRecord, setIsFetchingRecord] = useState<boolean>(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const hasLoadedOnceRef = useRef<boolean>(false);

  // Protected Route Check: Unauthenticated visitors redirected to sign in
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/?tab=signin&reason=auth_required");
    }
  }, [user, isAuthLoading, router]);

  // Helper to map Supabase database record into ApplicationRecord model
  const mapSupabaseToRecord = (suApp: any, studentRecord: any): ApplicationRecord => {
    const fullName = studentRecord
      ? `${studentRecord.last_name}, ${studentRecord.first_name} ${studentRecord.middle_name || ""}`.trim()
      : (user ? `${user.lastName}, ${user.firstName}` : "STUDENT APPLICANT");

    return {
      referenceNumber: suApp.application_id,
      applicationDate: suApp.created_at,
      status: suApp.status || "Pending",
      lrn: studentRecord?.student_id || user?.lrn || "N/A",
      fullName,
      gradeLevel: suApp.target_grade_level || 7,
      applicantType: suApp.applicant_type || "Grade 7",
      jhsProgram: "Regular",
      targetTrack: suApp.target_strand ? "Senior High School" : "Junior High School",
      targetStrand: suApp.target_strand || "",
      remarks: suApp.admin_feedback,
      primaryContact: "Parent / Guardian",
      contactNumber: studentRecord?.contact_number || "09181234567",
      formData: {
        step1: {
          isGraded: true,
          applicantType: suApp.applicant_type || "Grade 7",
          targetGradeLevel: Number(suApp.target_grade_level) || 7,
          jhsProgram: "Regular",
          targetSemester: "1st Semester",
          targetTrack: suApp.target_strand ? "Senior High School" : "Junior High School",
          targetStrand: suApp.target_strand || "",
          lastGradeCompleted: (Number(suApp.target_grade_level) || 7) - 1,
          lastSchoolYearCompleted: "2024-2025",
          lastSchoolAttended: "Dumalneg Elementary School",
          lastSchoolId: "100050",
        },
        lrn: studentRecord?.student_id || user?.lrn || "100050123456",
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

            setRecord(mapSupabaseToRecord(appData[0], stProfile?.[0] || null));
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
          const { data: appData } = await supabase
            .from("enrollment_applications")
            .select("*")
            .eq("student_id", studentRecord.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (isMounted && appData && appData.length > 0) {
            setRecord(mapSupabaseToRecord(appData[0], studentRecord));
            hasLoadedOnceRef.current = true;
            setIsFetchingRecord(false);
            return;
          }
        }

        // No record submitted yet
        if (isMounted) {
          setRecord(null);
          hasLoadedOnceRef.current = true;
          setIsFetchingRecord(false);
        }
      } catch (err) {
        console.error("Error auto-fetching application record:", err);
        if (isMounted) {
          setRecord(null);
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

    // 4. 10-Second Silent Heartbeat Polling
    const heartbeat = setInterval(() => {
      fetchRecord(true);
    }, 10000);

    // 5. Supabase Realtime Channel: Instant push on enrollment_applications changes
    const channel = supabase
      .channel("track-realtime-applications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
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
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.lrn, initialQuery]);

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
      {isFetchingRecord ? (
        <div className="p-12 bg-white border-2 border-slate-300 text-center space-y-3">
          <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
            [ RETRIEVING ENROLLMENT APPLICATION RECORD ]
          </span>
          <p className="text-sm text-slate-700">
            Querying Dumalneg NHS Supabase Cloud Database...
          </p>
        </div>
      ) : record ? (
        /* =========================================================================
           SCENARIO 1: ENROLLMENT APPLICATION FOUND (AUTOMATIC LIVE TRACKING CARD)
           ========================================================================= */
        <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Header with Reference Number and Status Badge */}
          <div className="border-b-2 border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block">
                Official Application Reference Number
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
              <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                Congratulations! The Dumalneg National High School Registrar has approved your application and verified your credentials for School Year 2025–2026. Your official accomplished DepEd enrollment form is ready for download below.
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
                <span className="font-mono font-bold text-slate-900">{record.lrn}</span>
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
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">School Year</span>
                <span className="font-bold text-slate-900">2025–2026</span>
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
            However, you have not yet completed and submitted the 5-step online basic education enrollment form for School Year 2025–2026.
          </p>
          <div className="pt-2">
            <Link
              href="/enroll"
              className="inline-block px-8 py-3 bg-[#002060] text-white text-xs uppercase font-bold tracking-wider hover:bg-blue-950 transition-colors shadow-xs"
            >
              Start 5-Step Online Enrollment Form
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
