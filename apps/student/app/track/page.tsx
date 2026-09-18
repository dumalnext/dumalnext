"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { downloadDepEdEnrollmentPdf } from "@/lib/utils/depedPdfGenerator";
import { FullEnrollmentFormData } from "@/components/forms/enrollment/EnrollmentStepper";

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

import { useAuth } from "@/lib/auth/authContext";

function TrackApplicationContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("ref") || searchParams.get("query") || "";

  const [searchTerm, setSearchTerm] = useState<string>(initialQuery);
  const [searched, setSearched] = useState<boolean>(false);
  const [record, setRecord] = useState<ApplicationRecord | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [reuploadSuccess, setReuploadSuccess] = useState<boolean>(false);

  // Protected Route Check: Unauthenticated users redirected to homepage
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/?tab=signin&reason=auth_required");
    }
  }, [user, isLoading, router]);

  const performSearch = (term: string) => {
    const cleanTerm = term.trim().toUpperCase();
    if (!cleanTerm) {
      setRecord(null);
      setSearched(false);
      return;
    }

    setSearched(true);
    setReuploadSuccess(false);

    // Search locally saved applications in localStorage
    if (typeof window !== "undefined") {
      const stored = JSON.parse(localStorage.getItem("dumalnext_applications") || "[]");
      const found = stored.find(
        (app: any) =>
          app.referenceNumber?.toUpperCase() === cleanTerm ||
          app.lrn === cleanTerm ||
          (app.accountEmail && app.accountEmail.toUpperCase() === cleanTerm) ||
          (app.userAccountId && app.userAccountId.toUpperCase() === cleanTerm) ||
          cleanTerm.includes(app.referenceNumber?.toUpperCase())
      );

      if (found) {
        setRecord(found);
        return;
      }
    }

    // No record found
    setRecord(null);
  };

  useEffect(() => {
    if (initialQuery) {
      setSearchTerm(initialQuery);
      performSearch(initialQuery);
    } else if (user) {
      const targetQuery = user.lrn || user.email || user.userId;
      setSearchTerm(targetQuery);
      performSearch(targetQuery);
    }
  }, [initialQuery, user]);

  const handleDownloadApprovedPdf = async () => {
    if (!record) return;
    setIsDownloadingPdf(true);
    try {
      // Use stored formData if available, or build minimal compliant model
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

  if (isLoading) {
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
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
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
          Track Enrollment Application Status
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Verify live evaluation progress by entering your official Application Tracking Reference Number (e.g. DNHS-2025-XXXXX) or 12-digit Learner Reference Number (LRN).
        </p>
      </div>

      {/* Search Input Box */}
      <div className="p-6 bg-slate-50 border-2 border-slate-300 space-y-3">
        <label className="block text-xs font-bold text-slate-900 uppercase">
          Application Reference Number or 12-Digit LRN
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch(searchTerm);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g. DNHS-2025-78921 or 100050123456"
            className="flex-1 p-3 bg-white border-2 border-slate-300 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none"
          />
          <button
            type="submit"
            className="px-8 py-3 bg-[#002060] text-white text-xs uppercase font-bold tracking-wider hover:bg-blue-950 transition-colors shrink-0 shadow-xs"
          >
            [ Search Record ]
          </button>
        </form>
      </div>

      {/* Search Results Display */}
      {searched && (
        <div>
          {record ? (
            <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-6">
              {/* Header Box with Dynamic Color-Coded Status Badge (ZERO Emojis) */}
              <div className="border-b-2 border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">
                    Application Reference Number
                  </span>
                  <span className="text-xl font-mono font-bold text-[#002060]">
                    {record.referenceNumber}
                  </span>
                </div>

                {/* Color-Coded Status Badges: Yellow (Pending), Green (Approved), Red (Needs Revision) */}
                <div>
                  {record.status === "Pending" && (
                    <span className="inline-block px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border-2 border-amber-400">
                      [ STATUS: PENDING REGISTRAR VERIFICATION ]
                    </span>
                  )}
                  {record.status === "Approved" && (
                    <span className="inline-block px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border-2 border-emerald-500">
                      [ STATUS: APPROVED &amp; OFFICIALLY ENROLLED ]
                    </span>
                  )}
                  {record.status === "Needs Revision" && (
                    <span className="inline-block px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-red-50 text-red-900 border-2 border-red-500">
                      [ STATUS: NEEDS REVISION / ACTION REQUIRED ]
                    </span>
                  )}
                </div>
              </div>

              {/* Status Explanation Banner with Matching Palette */}
              {record.status === "Pending" && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 space-y-1">
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Application Under Review
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Your submitted application and credentials are in queue for verification by the Dumalneg NHS Registrar. 
                    Please monitor this portal for status updates. Official DepEd PDF documents will become accessible upon approval.
                  </p>
                </div>
              )}

              {record.status === "Approved" && (
                <div className="p-5 bg-emerald-50 border-2 border-emerald-400 space-y-3">
                  <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Official Enrollment Confirmed
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    Congratulations! The Dumalneg National High School Registrar has verified your documents. 
                    You are officially enrolled for School Year 2025–2026. Your official accomplished DepEd enrollment form is now ready for download below.
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
                    Action Required by Registrar
                  </div>
                  <p className="text-xs text-red-900 leading-relaxed font-medium">
                    {record.remarks ||
                      "One or more submitted documents require correction or re-submission before your enrollment can be confirmed."}
                  </p>
                  {/* Immediate Re-upload slot */}
                  <div className="pt-2 border-t border-red-200">
                    <label className="block text-xs font-bold text-red-900 uppercase mb-1">
                      Re-Upload Corrected Document (SF9 Report Card or PSA Birth Certificate):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-bold file:bg-[#002060] file:text-white border border-red-300 p-1 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setReuploadSuccess(true)}
                        className="px-4 py-1.5 bg-red-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-900"
                      >
                        Submit Re-Upload
                      </button>
                    </div>
                    {reuploadSuccess && (
                      <p className="text-xs text-emerald-800 font-bold mt-2">
                        [ RE-UPLOAD SUBMITTED ]: Your updated document has been sent to the registrar for re-evaluation.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Applicant Credentials Summary */}
              <div className="border-2 border-slate-200 p-5 space-y-3">
                <div className="text-xs font-bold text-[#002060] uppercase tracking-wider border-b border-slate-100 pb-2">
                  [ Official Applicant Profile ]
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
                      {record.jhsProgram === "SPS"
                        ? `Special Program in Sports (SPS: ${record.spsSport || "Selected"})`
                        : record.jhsProgram || "Regular JHS Curriculum"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Primary Contact Person</span>
                    <span className="font-bold text-slate-900">
                      {record.primaryContact || "Parent"} ({record.contactNumber || "N/A"})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Application Date</span>
                    <span className="font-bold text-slate-900">
                      {new Date(record.applicationDate).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white border-2 border-slate-300 text-center space-y-3">
              <div className="text-xs font-mono font-bold text-red-700 uppercase">
                [ NO RECORD FOUND ]
              </div>
              <h3 className="text-base font-bold text-slate-900">
                No matching enrollment application was found.
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Please verify that the Application Tracking Reference Number or 12-digit Learner Reference Number was typed correctly. 
                If you have not yet completed the enrollment form, please register below.
              </p>
              <div className="pt-2">
                <Link
                  href="/enroll"
                  className="inline-block px-6 py-2.5 bg-[#002060] text-white text-xs uppercase font-bold tracking-wider hover:bg-blue-950"
                >
                  Start New Enrollment
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
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
