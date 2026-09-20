"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Step1ApplicantType, { Step1Data } from "./Step1ApplicantType";
import Step2LearnerProfile from "./Step2LearnerProfile";
import Step3FamilyBackground from "./Step3FamilyBackground";
import Step4CurriculumModality from "./Step4CurriculumModality";
import Step5DocumentsReview from "./Step5DocumentsReview";
import { downloadDepEdEnrollmentPdf } from "@/lib/utils/depedPdfGenerator";
import { useAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";

export interface FullEnrollmentFormData {
  // Step 1: Classification
  step1: Step1Data;

  // Step 2: Learner Details
  lrn: string;
  psaBirthCertNo: string;
  lastName: string;
  firstName: string;
  middleName: string;
  extensionName: string;
  dateOfBirth: string;
  age: number | "";
  gender: "Male" | "Female" | "";
  placeOfBirth: string;
  religion: string;
  motherTongue: string;
  contactNumber: string;

  // IP & 4Ps
  isIpCommunity: boolean;
  ipCommunityName: string;
  is4psBeneficiary: boolean;
  householdId4ps: string;

  // Address
  currentHouseNo: string;
  currentSitio: string;
  currentBarangay: string;
  currentMunicipality: string;
  currentProvince: string;
  currentCountry: string;
  currentZipCode: string;
  isPermanentSameAsCurrent: boolean;
  permanentHouseNo: string;
  permanentSitio: string;
  permanentBarangay: string;
  permanentMunicipality: string;
  permanentProvince: string;
  permanentCountry: string;
  permanentZipCode: string;

  // Step 3: Family / Guardian
  fatherLastName: string;
  fatherFirstName: string;
  fatherMiddleName: string;
  fatherContactNumber: string;
  motherMaidenLastName: string;
  motherFirstName: string;
  motherMiddleName: string;
  motherContactNumber: string;
  guardianLastName: string;
  guardianFirstName: string;
  guardianMiddleName: string;
  guardianContactNumber: string;
  guardianRelationship?: string;
  primaryContactPerson?: "Father" | "Mother" | "Guardian";

  // Step 4: Curriculum (JHS / SHS), SNEd, & Modalities
  isSned: boolean;
  snedCategory: "Diagnosis" | "Manifestations" | "";
  snedDetails: string[];
  hasPwdId: boolean;
  jhsProgram?: "Regular" | "SPS";
  spsSport?: string;
  targetSemester: string;
  targetTrack: string;
  targetStrand: string;
  selectedElectives: string[];
  preferredModalities: string[];

  // Step 5: Documents & Agreements
  submittedDocuments: {
    type: "birth_certificate" | "form_138" | "id_picture" | "good_moral" | "household_4ps" | "pwd_id" | "other" | string;
    fileName: string;
    fileUrl: string;
    sizeKb: number;
  }[];
  dataPrivacyAccepted: boolean;
  schoolYear?: string;
  semester?: string;
}

const initialFormData: FullEnrollmentFormData = {
  schoolYear: "2026-2027",
  semester: "Trimester 1",
  step1: {
    isGraded: true,
    applicantType: "",
    targetGradeLevel: "",
    jhsProgram: "Regular",
    targetSemester: "Trimester 1",
    targetTrack: "Academic Track",
    targetStrand: "",
    lastGradeCompleted: "",
    lastSchoolYearCompleted: "",
    lastSchoolAttended: "",
    lastSchoolId: "",
  },
  lrn: "",
  psaBirthCertNo: "",
  lastName: "",
  firstName: "",
  middleName: "",
  extensionName: "",
  dateOfBirth: "",
  age: "",
  gender: "",
  placeOfBirth: "",
  religion: "",
  motherTongue: "Ilokano",
  contactNumber: "",
  isIpCommunity: false,
  ipCommunityName: "",
  is4psBeneficiary: false,
  householdId4ps: "",
  currentHouseNo: "",
  currentSitio: "",
  currentBarangay: "CABARITAN",
  currentMunicipality: "DUMALNEG",
  currentProvince: "ILOCOS NORTE",
  currentCountry: "PHILIPPINES",
  currentZipCode: "2921",
  isPermanentSameAsCurrent: true,
  permanentHouseNo: "",
  permanentSitio: "",
  permanentBarangay: "CABARITAN",
  permanentMunicipality: "DUMALNEG",
  permanentProvince: "ILOCOS NORTE",
  permanentCountry: "PHILIPPINES",
  permanentZipCode: "2921",
  fatherLastName: "",
  fatherFirstName: "",
  fatherMiddleName: "",
  fatherContactNumber: "",
  motherMaidenLastName: "",
  motherFirstName: "",
  motherMiddleName: "",
  motherContactNumber: "",
  guardianLastName: "",
  guardianFirstName: "",
  guardianMiddleName: "",
  guardianContactNumber: "",
  guardianRelationship: "",
  primaryContactPerson: "Father",
  isSned: false,
  snedCategory: "",
  snedDetails: [],
  hasPwdId: false,
  jhsProgram: "Regular",
  spsSport: "",
  targetSemester: "1st Semester",
  targetTrack: "Academic Track",
  targetStrand: "",
  selectedElectives: [],
  preferredModalities: ["Modular (Print)"],
  submittedDocuments: [],
  dataPrivacyAccepted: false,
};

const STEP_LABELS = [
  { step: 1, label: "Classification", sublabel: "Learner Category" },
  { step: 2, label: "Learner Profile", sublabel: "Personal & Address" },
  { step: 3, label: "Family Background", sublabel: "Parent & Guardian" },
  { step: 4, label: "Curriculum & Modality", sublabel: "Program, SNEd & Mode" },
  { step: 5, label: "Documents & Submit", sublabel: "Compression & Review" },
];

export default function EnrollmentStepper({
  schoolYear = "2026-2027",
  semester = "Trimester 1",
  isEnrollmentOpen = true,
  closedMessage,
}: {
  schoolYear?: string;
  semester?: string;
  isEnrollmentOpen?: boolean;
  closedMessage?: string;
}) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<FullEnrollmentFormData>(() => {
    const cleanSY = (schoolYear || "2026-2027").replace("–", "-");
    const activeSem = semester || "Trimester 1";
    return {
      ...initialFormData,
      schoolYear: cleanSY,
      semester: activeSem,
      targetSemester: activeSem,
      step1: {
        ...initialFormData.step1,
        targetSemester: activeSem,
      },
    };
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [existingApp, setExistingApp] = useState<any | null>(null);
  const [isCheckingApp, setIsCheckingApp] = useState<boolean>(false);

  // Auto pre-fill basic account names if student is logged in and sync schoolYear and semester
  useEffect(() => {
    const cleanSY = (schoolYear || "2026-2027").replace("–", "-");
    const activeSem = semester || "Trimester 1";

    if (user) {
      setFormData((prev) => ({
        ...prev,
        schoolYear: cleanSY || prev.schoolYear || "2026-2027",
        semester: activeSem || prev.semester || "Trimester 1",
        targetSemester: activeSem || prev.targetSemester || "Trimester 1",
        step1: {
          ...prev.step1,
          targetSemester: activeSem || prev.step1?.targetSemester || "Trimester 1",
        },
        lastName: prev.lastName || user.lastName,
        firstName: prev.firstName || user.firstName,
        middleName: prev.middleName || user.middleName || "",
        lrn: prev.lrn || (user.lrn && /^\d{12}$/.test(user.lrn) ? user.lrn : ""),
      }));
    } else if (schoolYear || semester) {
      setFormData((prev) => ({
        ...prev,
        schoolYear: cleanSY || prev.schoolYear || "2026-2027",
        semester: activeSem || prev.semester || "Trimester 1",
        targetSemester: activeSem || prev.targetSemester || "Trimester 1",
        step1: {
          ...prev.step1,
          targetSemester: activeSem || prev.step1?.targetSemester || "Trimester 1",
        },
      }));
    }
  }, [user, schoolYear, semester]);

  // Check if student already has an active enrollment application in Supabase
  useEffect(() => {
    if (!user) {
      setIsCheckingApp(false);
      return;
    }

    let isMounted = true;

    const checkExistingApplication = async () => {
      setIsCheckingApp(true);
      try {
        const supabase = createClient();

        // 1. Locate student record
        const { data: stList } = await supabase
          .from("students")
          .select("*")
          .or(`student_id.eq.${user.lrn || user.userId},user_id.eq.${user.id}`)
          .limit(1);

        let appData: any = null;
        let studentRecord: any = null;

        if (stList && stList.length > 0) {
          studentRecord = stList[0];
          const { data: appRows } = await supabase
            .from("enrollment_applications")
            .select("*")
            .eq("student_id", studentRecord.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (appRows && appRows.length > 0) {
            appData = appRows[0];
          }
        }

        if (!isMounted) return;

        if (appData) {
          setExistingApp(appData);

          // If "Needs Revision", pre-fill the entire formData so the student can edit EVERYTHING!
          if (appData.status === "Needs Revision") {
            const docsArray = Array.isArray(appData.submitted_documents)
              ? appData.submitted_documents.map((d: any) => ({
                  type: d.docType || "other",
                  fileName: d.fileName || "document.jpg",
                  fileUrl: d.fileData || "",
                  sizeKb: d.sizeKb || 25,
                }))
              : [];

            setFormData((prev) => ({
              ...prev,
              step1: {
                ...prev.step1,
                applicantType: appData.applicant_type || prev.step1.applicantType || "Grade 7",
                targetGradeLevel: Number(appData.target_grade_level) || prev.step1.targetGradeLevel || 7,
                targetStrand: appData.target_strand || prev.step1.targetStrand || "",
                targetTrack: appData.target_strand ? "Senior High School" : "Junior High School",
              },
              lrn: (studentRecord?.student_id && /^\d{12}$/.test(studentRecord.student_id))
                ? studentRecord.student_id
                : (user.lrn && /^\d{12}$/.test(user.lrn))
                ? user.lrn
                : (prev.lrn && /^\d{12}$/.test(prev.lrn) ? prev.lrn : ""),
              lastName: studentRecord?.last_name || user.lastName || prev.lastName,
              firstName: studentRecord?.first_name || user.firstName || prev.firstName,
              middleName: studentRecord?.middle_name || user.middleName || prev.middleName,
              gender: studentRecord?.gender || prev.gender || "Male",
              dateOfBirth: studentRecord?.date_of_birth || prev.dateOfBirth || "2012-05-15",
              contactNumber: studentRecord?.contact_number || prev.contactNumber || "09181234567",
              currentBarangay: studentRecord?.barangay || prev.currentBarangay || "CABARITAN",
              targetStrand: appData.target_strand || prev.targetStrand || "",
              targetTrack: appData.target_strand ? "Senior High School" : "Junior High School",
              submittedDocuments: docsArray,
              dataPrivacyAccepted: true,
            }));
          }
        }
      } catch (err) {
        console.warn("Notice checking existing application:", err);
      } finally {
        if (isMounted) setIsCheckingApp(false);
      }
    };

    checkExistingApplication();

    // Listen for data changes
    const handleDataChanged = () => {
      checkExistingApplication();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("dumalnext:data-changed", handleDataChanged);
    }

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("dumalnext:data-changed", handleDataChanged);
      }
    };
  }, [user]);

  const handleStep1Change = (fields: Partial<Step1Data>) => {
    setFormData((prev) => ({
      ...prev,
      step1: { ...prev.step1, ...fields },
      ...(fields.jhsProgram !== undefined ? { jhsProgram: fields.jhsProgram } : {}),
      ...(fields.targetTrack !== undefined ? { targetTrack: fields.targetTrack } : {}),
      ...(fields.targetStrand !== undefined ? { targetStrand: fields.targetStrand } : {}),
      ...(fields.targetSemester !== undefined ? { targetSemester: fields.targetSemester } : {}),
    }));
  };

  const handleFormDataChange = (fields: Partial<FullEnrollmentFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...fields,
    }));
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadDepEdEnrollmentPdf(formData);
    } catch (err) {
      console.error("Failed to generate DepEd Enrollment PDF:", err);
      alert("Error generating PDF. Please ensure all required fields are filled.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  // 1.5. Lockout State: Online Enrollment is Closed
  if (!isEnrollmentOpen) {
    return (
      <div className="bg-white border-2 border-red-500 p-6 sm:p-10 text-center space-y-6 font-sans shadow-sm">
        <div className="border-b-2 border-red-200 pb-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#002060] block">
            DEPARTMENT OF EDUCATION &bull; REGION I &bull; DUMALNEG NHS
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 uppercase tracking-tight">
            Online Basic Education Enrollment is Currently Closed
          </h2>
          <div className="text-xs font-mono text-slate-500 mt-1">
            SCHOOL YEAR: <strong className="text-[#002060] text-sm">{schoolYear}</strong>
          </div>
        </div>

        <div className="p-5 bg-red-50 border-2 border-red-400 text-left space-y-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shrink-0" />
            <span className="text-xs font-mono font-bold text-red-950 uppercase">
              [ DEPED OFFICIAL NOTICE: SUBMISSION SYSTEM TEMPORARILY LOCKED ]
            </span>
          </div>
          <p className="text-xs text-red-900 leading-relaxed whitespace-pre-line">
            {closedMessage || "Online basic education enrollment is currently closed by the Registrar's Office. Please await official announcements regarding enrollment schedules."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-[#002060] hover:bg-blue-950 text-white font-bold text-xs uppercase tracking-wider shadow-xs"
          >
            Return to Student Home
          </Link>
          <Link
            href="/track"
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs uppercase tracking-wider"
          >
            Track Existing Application
          </Link>
        </div>
      </div>
    );
  }

  // 2. Lockout State: Pending Verification (One-time submission rule)
  if (existingApp && existingApp.status === "Pending") {
    return (
      <div className="bg-white border-2 border-slate-300 p-6 sm:p-10 text-center space-y-6 font-sans shadow-sm">
        <div className="border-b-2 border-slate-200 pb-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#002060] block">
            DUMALNEG NATIONAL HIGH SCHOOL &bull; ADMISSIONS COMMITTEE
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 uppercase tracking-tight">
            Enrollment Application Already Submitted
          </h2>
          <div className="text-xs font-mono text-slate-500 mt-1">
            OFFICIAL REFERENCE NUMBER: <strong className="text-[#002060] text-sm">{existingApp.application_id}</strong>
          </div>
        </div>

        <div className="p-5 bg-amber-50 border-2 border-amber-300 text-left space-y-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
            <span className="text-xs font-mono font-bold text-amber-950 uppercase">
              [ SUBMISSION LOCKED: PENDING REGISTRAR VERIFICATION ]
            </span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            You have already submitted an official enrollment application for School Year {schoolYear}. Under DepEd Basic Education enrollment guidelines, each learner is permitted only one (1) active application at a time.
          </p>
          <p className="text-xs text-amber-900 leading-relaxed">
            Your application is currently queued for evaluation by the Dumalneg NHS Registrar. If any correction or re-submission is necessary, the registrar will unlock your dossier for revision.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={`/track?ref=${existingApp.application_id}`}
            className="w-full sm:w-auto px-6 py-3 bg-[#002060] hover:bg-blue-950 text-white font-bold text-xs uppercase tracking-wider shadow-xs"
          >
            [ Track Application Status &rarr; ]
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs uppercase tracking-wider"
          >
            Return to Student Home
          </Link>
        </div>
      </div>
    );
  }

  // 3. Lockout State: Officially Approved & Enrolled
  if (existingApp && existingApp.status === "Approved") {
    return (
      <div className="bg-white border-2 border-slate-300 p-6 sm:p-10 text-center space-y-6 font-sans shadow-sm">
        <div className="border-b-2 border-slate-200 pb-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#002060] block">
            DEPARTMENT OF EDUCATION &bull; REGION I
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 uppercase tracking-tight">
            Official Enrollment Confirmed
          </h2>
          <div className="text-xs font-mono text-slate-500 mt-1">
            OFFICIAL REFERENCE: <strong className="text-[#002060] text-sm">{existingApp.application_id}</strong>
          </div>
        </div>

        <div className="p-5 bg-emerald-50 border-2 border-emerald-400 text-left space-y-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shrink-0" />
            <span className="text-xs font-mono font-bold text-emerald-950 uppercase">
              [ STATUS: APPROVED &amp; OFFICIALLY ENROLLED ]
            </span>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed">
            Congratulations! You are officially enrolled at Dumalneg National High School for School Year {schoolYear}. Your section assignment has been established and your official accomplished DepEd registration slip is ready.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={`/track?ref=${existingApp.application_id}`}
            className="w-full sm:w-auto px-6 py-3 bg-[#002060] hover:bg-blue-950 text-white font-bold text-xs uppercase tracking-wider shadow-xs"
          >
            [ View Enrollment Slip &amp; Section Assignment &rarr; ]
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs uppercase tracking-wider"
          >
            Return to Student Home
          </Link>
        </div>
      </div>
    );
  }

  // 4. Active Enrollment Form (New Applicant or Revision Flow)
  return (
    <div className="space-y-6">
      {/* Revision Notice Banner if Admin returned application */}
      {existingApp?.status === "Needs Revision" && (
        <div className="p-4 bg-red-50 border-2 border-red-500 text-slate-900 space-y-2 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-mono font-bold text-red-950 uppercase">
              [ REGISTRAR NOTICE: APPLICATION DOSSIER RETURNED FOR REVISION ]
            </span>
            <span className="text-[10px] font-mono bg-red-800 text-white px-2 py-0.5 uppercase font-bold w-fit">
              REF: {existingApp.application_id}
            </span>
          </div>
          <div className="bg-white/90 p-3 border border-red-300 space-y-1">
            <span className="text-[10px] font-bold uppercase text-red-950 block">
              Official Evaluation Feedback from Registrar:
            </span>
            <p className="text-xs text-red-900 font-bold leading-relaxed">
              &ldquo;{existingApp.admin_feedback || "Please review and correct your details and documentary requirements before resubmission."}&rdquo;
            </p>
          </div>
          <p className="text-[11px] text-red-900 leading-relaxed">
            All 5 enrollment steps below are unlocked and pre-filled with your data. You may edit any field across all steps, change your track or modality, and replace or re-upload scanned documents on Step 5.
          </p>
        </div>
      )}

      {/* Authenticated Applicant Status Banner */}
      {user ? (
        <div className="p-3 bg-blue-50 border border-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-slate-700">
            Authenticated Applicant Account: <strong>{user.fullName}</strong> ({user.email})
          </span>
          <span className="font-mono text-[#002060] font-bold text-[11px] bg-white px-2.5 py-0.5 border border-blue-300 shrink-0">
            LINKED ACCOUNT: {user.userId}
          </span>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-amber-900">
            You are currently filling out this enrollment form as a Guest. To link this submission to your personal student account for easier tracking, please sign in or register.
          </span>
          <div className="flex gap-2 shrink-0">
            <a href="/login" className="font-bold text-[#002060] hover:underline uppercase text-[11px]">
              Sign In
            </a>
            <span>&bull;</span>
            <a href="/register" className="font-bold text-[#002060] hover:underline uppercase text-[11px]">
              Register Account
            </a>
          </div>
        </div>
      )}

      {/* Official Stepper Progress Bar (Zero Emoji / Zero Icon) */}
      <div className="bg-white border border-slate-300 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#002060]">
              [ Dumalneg NHS Online Enrollment &bull; S.Y. {formData.schoolYear || schoolYear} &bull; {formData.semester || semester} ]
            </span>
            <h1 className="text-lg font-bold text-slate-900">
              Basic Education Enrollment Form
            </h1>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-600 block">
              Step {currentStep} of 5
            </span>
            <span className="text-[10px] text-[#002060] font-bold uppercase tracking-wider">
              {Math.round((currentStep / 5) * 100)}% Complete
            </span>
          </div>
        </div>

        {/* Smart Linear Progress Bar (Universal for all devices) */}
        <div className="w-full bg-slate-200 h-2 overflow-hidden mb-4">
          <div
            className="bg-[#002060] h-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>

        {/* MOBILE VIEW (< sm): Clean Compact Step Navigation Pills */}
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 border border-slate-200">
            <span className="font-bold text-[#002060] uppercase text-[11px]">
              Active: {STEP_LABELS[currentStep - 1].label}
            </span>
            <span className="text-[10px] text-slate-500">
              {STEP_LABELS[currentStep - 1].sublabel}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {STEP_LABELS.map((item) => {
              const isActive = currentStep === item.step;
              const isDone = currentStep > item.step;

              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => {
                    if (existingApp?.status === "Needs Revision" || item.step < currentStep) {
                      setCurrentStep(item.step);
                    }
                  }}
                  disabled={existingApp?.status !== "Needs Revision" && item.step > currentStep}
                  className={`py-2 text-center text-xs font-mono font-bold border transition-all ${
                    isActive
                      ? "bg-[#002060] text-white border-[#002060] shadow-xs"
                      : isDone || existingApp?.status === "Needs Revision"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-400 cursor-pointer"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  }`}
                >
                  0{item.step}
                </button>
              );
            })}
          </div>
        </div>

        {/* TABLET & DESKTOP VIEW (>= sm): Full 5-Card Step Grid */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-2 text-xs">
          {STEP_LABELS.map((item) => {
            const isActive = currentStep === item.step;
            const isDone = currentStep > item.step;

            return (
              <div
                key={item.step}
                onClick={() => {
                  if (existingApp?.status === "Needs Revision" || item.step < currentStep) {
                    setCurrentStep(item.step);
                  }
                }}
                className={`p-2.5 border transition-colors ${
                  isActive
                    ? "bg-[#002060] text-white border-[#002060]"
                    : isDone || existingApp?.status === "Needs Revision"
                    ? "bg-blue-50 text-[#002060] border-blue-200 cursor-pointer"
                    : "bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed"
                }`}
              >
                <div className="font-mono font-bold text-[10px] uppercase">
                  [ {isDone ? "OK" : `0${item.step}`} ]
                </div>
                <div className="font-bold truncate mt-0.5">{item.label}</div>
                <div
                  className={`text-[10px] truncate ${
                    isActive ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {item.sublabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Step Content */}
      <div>
        {currentStep === 1 && (
          <Step1ApplicantType
            data={formData.step1}
            schoolYear={schoolYear}
            onChange={handleStep1Change}
            onNext={nextStep}
          />
        )}

        {currentStep === 2 && (
          <Step2LearnerProfile
            data={formData}
            onChange={handleFormDataChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 3 && (
          <Step3FamilyBackground
            data={formData}
            onChange={handleFormDataChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 4 && (
          <Step4CurriculumModality
            data={formData}
            onChange={handleFormDataChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 5 && (
          <Step5DocumentsReview
            data={{ ...formData, schoolYear }}
            isEnrollmentOpen={isEnrollmentOpen}
            onChange={handleFormDataChange}
            onBack={prevStep}
            existingApplication={existingApp}
          />
        )}
      </div>
    </div>
  );
}
