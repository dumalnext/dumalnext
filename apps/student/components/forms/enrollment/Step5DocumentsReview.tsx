"use client";

import React, { useState } from "react";
import { FullEnrollmentFormData } from "./EnrollmentStepper";
import { compressImage } from "@/lib/utils/image-compressor";
import { useAuth } from "@/lib/auth/authContext";

interface Step5DocumentsReviewProps {
  data: FullEnrollmentFormData;
  onChange: (fields: Partial<FullEnrollmentFormData>) => void;
  onBack: () => void;
}

interface UploadedDocState {
  file: File;
  previewUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  isCompressing: boolean;
}

export default function Step5DocumentsReview({
  data,
  onChange,
  onBack,
}: Step5DocumentsReviewProps) {
  const { user } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  // Document state slots
  const [docs, setDocs] = useState<Record<string, UploadedDocState | null>>({
    birth_certificate: null,
    form_138: null,
    id_picture: null,
    good_moral: null,
    household_4ps: null,
    pwd_id: null,
  });

  const isG7 =
    data.step1.applicantType === "Grade 7" ||
    Number(data.step1.targetGradeLevel) === 7;

  const isG11 =
    data.step1.applicantType === "Grade 11" ||
    Number(data.step1.targetGradeLevel) === 11;

  const isTransferee = data.step1.applicantType === "Transferee";

  // File Upload Handler with HTML5 Canvas Compression (<350KB)
  const handleFileUpload = async (
    docKey: string,
    docType: "birth_certificate" | "form_138" | "id_picture" | "good_moral" | "other",
    file: File | null
  ) => {
    if (!file) return;

    // Set loading indicator for this slot
    setDocs((prev) => ({
      ...prev,
      [docKey]: {
        file,
        previewUrl: "",
        originalSizeKb: Math.round(file.size / 1024),
        compressedSizeKb: 0,
        isCompressing: true,
      },
    }));

    try {
      const originalKb = Math.round(file.size / 1024);
      let finalFile: File = file;
      let finalDataUrl = "";
      let compressedKb = originalKb;

      if (file.type.startsWith("image/")) {
        const result = await compressImage(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.75,
          outputFormat: "image/jpeg",
        });
        finalFile = result.file;
        finalDataUrl = result.dataUrl;
        compressedKb = Math.round(result.compressedSize / 1024);
      } else {
        // PDF or other document
        finalDataUrl = URL.createObjectURL(file);
      }

      setDocs((prev) => ({
        ...prev,
        [docKey]: {
          file: finalFile,
          previewUrl: finalDataUrl,
          originalSizeKb: originalKb,
          compressedSizeKb: compressedKb,
          isCompressing: false,
        },
      }));

      // Update parent formData submittedDocuments array
      const existingDocs = (data.submittedDocuments || []).filter((d) => d.type !== docType);
      const newDocEntry = {
        type: docType,
        fileName: finalFile.name,
        fileUrl: finalDataUrl,
        sizeKb: compressedKb,
      };

      onChange({
        submittedDocuments: [...existingDocs, newDocEntry],
      });

      // Clear any errors for this doc
      if (errors[docKey]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[docKey];
          return next;
        });
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        [docKey]: "Compression failed. Please ensure the file is a valid image (JPG, PNG) or PDF.",
      }));
      setDocs((prev) => ({ ...prev, [docKey]: null }));
    }
  };

  // Remove uploaded document
  const handleRemoveDoc = (
    docKey: string,
    docType: "birth_certificate" | "form_138" | "id_picture" | "good_moral" | "other"
  ) => {
    setDocs((prev) => ({ ...prev, [docKey]: null }));
    const updated = (data.submittedDocuments || []).filter((d) => d.type !== docType);
    onChange({ submittedDocuments: updated });
  };

  // Submission Validation
  const handleSubmitApplication = async () => {
    const newErrors: Record<string, string> = {};

    // 1. Required Document Validations
    if (!docs.birth_certificate) {
      newErrors.birth_certificate =
        "DepEd Mandatory Requirement: PSA Birth Certificate (or Local Civil Registrar / Barangay Certificate) is required.";
    }

    if (!docs.form_138) {
      newErrors.form_138 =
        "DepEd Mandatory Requirement: Learner's Progress Report Card (SF9 / Form 138) from previous school is required.";
    }

    if (!docs.id_picture) {
      newErrors.id_picture =
        "School Requirement: 2x2 or 1x1 Formal ID picture with white background is required.";
    }

    if ((isG11 || isTransferee) && !docs.good_moral) {
      newErrors.good_moral =
        "DepEd Requirement: Certificate of Good Moral Character is required for Senior High School applicants and Transferees.";
    }

    // 2. Data Privacy Act Acceptance
    if (!data.dataPrivacyAccepted) {
      newErrors.dataPrivacy =
        "Mandatory Legal Agreement: You must read and accept the Data Privacy Act of 2012 Certification before official submission.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Proceed with submission
    setIsSubmitting(true);

    try {
      // Generate Official Dumalneg NHS Reference Number
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const generatedRef = `DNHS-2025-${randomSuffix}`;

      // Save to localStorage application registry for local and offline resilience
      const applicationPayload = {
        referenceNumber: generatedRef,
        applicationDate: new Date().toISOString(),
        status: "Pending",
        userId: user?.id || null,
        userAccountId: user?.userId || null,
        accountEmail: user?.email || null,
        lrn: data.lrn,
        fullName: `${data.lastName}, ${data.firstName} ${data.middleName || ""} ${data.extensionName || ""}`.trim(),
        gradeLevel: data.step1.targetGradeLevel,
        applicantType: data.step1.applicantType,
        jhsProgram: data.jhsProgram,
        spsSport: data.spsSport,
        targetTrack: data.targetTrack,
        targetStrand: data.targetStrand,
        primaryContact: data.primaryContactPerson,
        contactNumber:
          data.primaryContactPerson === "Father"
            ? data.fatherContactNumber
            : data.primaryContactPerson === "Mother"
            ? data.motherContactNumber
            : data.guardianContactNumber,
        formData: data,
      };

      if (typeof window !== "undefined") {
        const existingRegistry = JSON.parse(localStorage.getItem("dumalnext_applications") || "[]");
        existingRegistry.unshift(applicationPayload);
        localStorage.setItem("dumalnext_applications", JSON.stringify(existingRegistry));
        localStorage.setItem("dumalnext_last_submitted_ref", generatedRef);
      }

      // Simulate network latency for realism
      await new Promise((res) => setTimeout(res, 800));

      setReferenceNumber(generatedRef);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // RENDER: SUBMITTED CONFIRMATION / ACKNOWLEDGMENT SLIP
  // =========================================================================
  if (isSubmitted) {
    return (
      <div className="bg-white border-2 border-slate-300 p-6 sm:p-10 space-y-8 font-sans">
        {/* Acknowledgment Header */}
        <div className="border-b-2 border-slate-200 pb-5 text-center">
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-[#002060]">
            DEPARTMENT OF EDUCATION &bull; REGION I &bull; DIVISION OF ILOCOS NORTE
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 uppercase tracking-tight">
            Dumalneg National High School
          </h2>
          <div className="text-xs font-semibold text-slate-600 mt-0.5">
            Dumalneg, Ilocos Norte &bull; DepEd School ID: 300017
          </div>
          <div className="mt-3 inline-block bg-[#002060] text-white text-xs font-mono font-bold px-4 py-1 uppercase tracking-wider">
            Official Online Enrollment Acknowledgment Slip
          </div>
        </div>

        {/* Status Banner - Color Coded (Yellow for Pending) with ZERO Emojis */}
        <div className="p-5 bg-amber-50 border-2 border-amber-400 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-3 py-1 border border-amber-400">
              [ STATUS: PENDING REGISTRAR VERIFICATION ]
            </span>
            <span className="text-xs font-mono text-amber-900 font-bold">
              DATE: {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            Your online enrollment application has been successfully submitted to the Dumalneg National High School Registrar. 
            Official documents are currently undergoing evaluation. You will be notified once verified.
          </p>
        </div>

        {/* Reference Code Box */}
        <div className="p-6 bg-slate-50 border-2 border-[#002060] text-center space-y-2">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Official Application Tracking Reference Number
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-[#002060] tracking-widest">
            {referenceNumber}
          </div>
          <p className="text-[11px] text-slate-500">
            Please screenshot or write down this tracking reference number. You may use this number or your 12-digit LRN to check your live application status on the portal.
          </p>
        </div>

        {/* Learner & Enrollment Summary */}
        <div className="border-2 border-slate-300 p-5 space-y-4">
          <div className="text-xs font-bold text-[#002060] uppercase tracking-wider border-b border-slate-200 pb-2">
            [ Official Application Summary ]
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Learner Name</span>
              <span className="font-bold text-slate-900 uppercase">
                {data.lastName}, {data.firstName} {data.middleName || ""} {data.extensionName || ""}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Learner Reference Number (LRN)</span>
              <span className="font-mono font-bold text-slate-900">{data.lrn || "N/A"}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Enrollment Level</span>
              <span className="font-bold text-slate-900">
                Grade {data.step1.targetGradeLevel} ({data.step1.applicantType})
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Curriculum Program / Track</span>
              <span className="font-bold text-slate-900">
                {isG7
                  ? data.jhsProgram === "SPS"
                    ? `Special Program in Sports (SPS: ${data.spsSport || "General"})`
                    : "Regular JHS Curriculum"
                  : `${data.targetTrack} - ${data.targetStrand}`}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Residential Address</span>
              <span className="font-bold text-slate-900 uppercase">
                Brgy. {data.currentBarangay}, {data.currentSitio ? `Sitio ${data.currentSitio}, ` : ""}Dumalneg
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Emergency School Contact</span>
              <span className="font-bold text-slate-900">
                {data.primaryContactPerson} (
                {data.primaryContactPerson === "Father"
                  ? data.fatherContactNumber
                  : data.primaryContactPerson === "Mother"
                  ? data.motherContactNumber
                  : data.guardianContactNumber}
                )
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Linked Student Account</span>
              <span className="font-bold text-[#002060]">
                {user ? `${user.fullName} (${user.email})` : "Guest / Direct Submission"}
              </span>
            </div>
          </div>
        </div>

        {/* Next Steps for Student / Parent */}
        <div className="p-5 bg-slate-50 border-2 border-slate-300 space-y-3">
          <div className="text-xs font-bold text-[#002060] uppercase tracking-wider">
            [ Instructions &amp; Next Steps for Dumalneg NHS Enrollees ]
          </div>
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 leading-relaxed">
            <li>
              <strong>Registrar Evaluation</strong>: The Dumalneg NHS Registrar will review your uploaded credentials (Form 138, PSA Birth Certificate, etc.) within 1 to 2 school business days.
            </li>
            <li>
              <strong>Track Your Application Status</strong>: Visit the <strong>Track Application Status</strong> page on the portal anytime using your Application Tracking Number or 12-digit LRN.
            </li>
            <li>
              <strong>Official DepEd PDF Release</strong>: Once your application is marked as <strong>[ APPROVED &amp; OFFICIALLY ENROLLED ]</strong> by the school administrator, your official accomplished DepEd Enrollment Form (PDF) and Certificate of Enrollment will be immediately unlocked for download.
            </li>
            <li>
              <strong>Hard Copy Requirements</strong>: Bring original hard copies of your Form 138 and PSA Birth Certificate to the Dumalneg NHS Registrar&apos;s Office during the first week of classes for physical civil registry validation.
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t-2 border-slate-200">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-6 py-2.5 bg-white border-2 border-slate-400 text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-100 transition-colors"
          >
            Print Acknowledgment Slip
          </button>
          <a
            href={`/track?ref=${referenceNumber}`}
            className="px-8 py-2.5 bg-[#002060] border-2 border-[#002060] text-xs font-bold text-white uppercase tracking-wider hover:bg-blue-950 transition-colors text-center shadow-xs"
          >
            Track Application Live &rarr;
          </a>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: STEP 5 FORM (DOCUMENTS UPLOAD & ONLINE REVIEW CARD)
  // =========================================================================
  return (
    <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#002060]">
            STEP 05 OF 05
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            DepEd Requirements &bull; Final Submission
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Document Upload &amp; Application Review
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Upload required DepEd credentials using the built-in image compressor (&lt;350KB) and review your encoded information before official submission to the Dumalneg NHS Registrar.
        </p>
      </div>

      {/* Global Error Banner */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-300 space-y-1">
          <p className="text-xs font-bold text-red-800 leading-normal">
            [ Submission Requirement Notice ]: Please resolve the highlighted required items below before submitting your application.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION A: OFFICIAL DOCUMENT UPLOAD SLOTS                                  */}
      {/* ========================================================================= */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            [ Section 9: Official Document Upload (Automated Compressor &lt; 350KB) ]
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            Photos taken from smartphones will be automatically compressed by your browser to ensure fast uploads even on spotty mobile data connections in Dumalneg:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. PSA Birth Certificate */}
          <div className="p-4 bg-white border-2 border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase">
                1. PSA Birth Certificate <span className="text-red-700">*</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">MANDATORY</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Clear photo of Philippine Statistics Authority (PSA) Birth Certificate or Local Civil Registrar (LCR) / Barangay Certification.
            </p>
            {docs.birth_certificate ? (
              <div className="p-3 bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#002060] block truncate max-w-[200px]">
                    {docs.birth_certificate.file.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {docs.birth_certificate.originalSizeKb}KB &rarr; {docs.birth_certificate.compressedSizeKb}KB (Compressed)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc("birth_certificate", "birth_certificate")}
                  className="text-xs text-red-700 font-bold uppercase hover:underline ml-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) =>
                    handleFileUpload("birth_certificate", "birth_certificate", e.target.files?.[0] || null)
                  }
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-[#002060] file:text-white hover:file:bg-blue-950 cursor-pointer border border-slate-300 p-1"
                />
              </div>
            )}
            {errors.birth_certificate && (
              <p className="text-[11px] font-bold text-red-700">{errors.birth_certificate}</p>
            )}
          </div>

          {/* 2. Form 138 / SF9 Report Card */}
          <div className="p-4 bg-white border-2 border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase">
                2. Learner&apos;s Progress Report Card (SF9 / Form 138) <span className="text-red-700">*</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">MANDATORY</span>
            </div>
            <p className="text-[11px] text-slate-600">
              {isG7
                ? "Grade 6 Elementary Progress Report Card indicating learner eligibility for Junior High School."
                : isG11
                ? "Grade 10 Junior High School Report Card indicating eligibility for Senior High School."
                : "Report Card from previous school year completed."}
            </p>
            {docs.form_138 ? (
              <div className="p-3 bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#002060] block truncate max-w-[200px]">
                    {docs.form_138.file.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {docs.form_138.originalSizeKb}KB &rarr; {docs.form_138.compressedSizeKb}KB (Compressed)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc("form_138", "form_138")}
                  className="text-xs text-red-700 font-bold uppercase hover:underline ml-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileUpload("form_138", "form_138", e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-[#002060] file:text-white hover:file:bg-blue-950 cursor-pointer border border-slate-300 p-1"
                />
              </div>
            )}
            {errors.form_138 && (
              <p className="text-[11px] font-bold text-red-700">{errors.form_138}</p>
            )}
          </div>

          {/* 3. 2x2 Official ID Picture */}
          <div className="p-4 bg-white border-2 border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase">
                3. Formal 2x2 or 1x1 ID Picture <span className="text-red-700">*</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">MANDATORY</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Recent passport or 2x2 formal photo with white background and printed name tag of the learner.
            </p>
            {docs.id_picture ? (
              <div className="p-3 bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#002060] block truncate max-w-[200px]">
                    {docs.id_picture.file.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {docs.id_picture.originalSizeKb}KB &rarr; {docs.id_picture.compressedSizeKb}KB (Compressed)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc("id_picture", "id_picture")}
                  className="text-xs text-red-700 font-bold uppercase hover:underline ml-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload("id_picture", "id_picture", e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-[#002060] file:text-white hover:file:bg-blue-950 cursor-pointer border border-slate-300 p-1"
                />
              </div>
            )}
            {errors.id_picture && (
              <p className="text-[11px] font-bold text-red-700">{errors.id_picture}</p>
            )}
          </div>

          {/* 4. Certificate of Good Moral Character */}
          <div className="p-4 bg-white border-2 border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase">
                4. Certificate of Good Moral Character
                {(isG11 || isTransferee) && <span className="text-red-700"> *</span>}
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                {isG11 || isTransferee ? "MANDATORY" : "OPTIONAL FOR G7"}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Certificate issued by previous school certifying good moral standing and disciplinary record.
            </p>
            {docs.good_moral ? (
              <div className="p-3 bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#002060] block truncate max-w-[200px]">
                    {docs.good_moral.file.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {docs.good_moral.originalSizeKb}KB &rarr; {docs.good_moral.compressedSizeKb}KB (Compressed)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc("good_moral", "good_moral")}
                  className="text-xs text-red-700 font-bold uppercase hover:underline ml-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileUpload("good_moral", "good_moral", e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-[#002060] file:text-white hover:file:bg-blue-950 cursor-pointer border border-slate-300 p-1"
                />
              </div>
            )}
            {errors.good_moral && (
              <p className="text-[11px] font-bold text-red-700">{errors.good_moral}</p>
            )}
          </div>

          {/* Conditional 4Ps Household ID Photocopy */}
          {data.is4psBeneficiary && (
            <div className="p-4 bg-white border-2 border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase">
                  5. Pantawid Pamilya (4Ps) Household ID Card
                </label>
                <span className="text-[10px] font-mono text-blue-700 font-bold">4PS BENEFICIARY</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Photocopy or clear photo of DSWD 4Ps ID or Household Pantawid verification passbook.
              </p>
              {docs.household_4ps ? (
                <div className="p-3 bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#002060] block truncate max-w-[200px]">
                      {docs.household_4ps.file.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {docs.household_4ps.originalSizeKb}KB &rarr; {docs.household_4ps.compressedSizeKb}KB (Compressed)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDoc("household_4ps", "other")}
                    className="text-xs text-red-700 font-bold uppercase hover:underline ml-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload("household_4ps", "other", e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-[#002060] file:text-white hover:file:bg-blue-950 cursor-pointer border border-slate-300 p-1"
                  />
                </div>
              )}
            </div>
          )}

          {/* Conditional PWD ID Photocopy */}
          {data.hasPwdId && (
            <div className="p-4 bg-white border-2 border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase">
                  6. Official Persons with Disability (PWD) ID
                </label>
                <span className="text-[10px] font-mono text-blue-700 font-bold">SNED / INCLUSIVE</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Photocopy of Municipal Social Welfare and Development (MSWDO) PWD ID or Clinical Medical Assessment.
              </p>
              {docs.pwd_id ? (
                <div className="p-3 bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#002060] block truncate max-w-[200px]">
                      {docs.pwd_id.file.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {docs.pwd_id.originalSizeKb}KB &rarr; {docs.pwd_id.compressedSizeKb}KB (Compressed)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDoc("pwd_id", "other")}
                    className="text-xs text-red-700 font-bold uppercase hover:underline ml-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload("pwd_id", "other", e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-[#002060] file:text-white hover:file:bg-blue-950 cursor-pointer border border-slate-300 p-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: ONLINE APPLICATION REVIEW CARD (NO PRE-APPROVAL PDF)           */}
      {/* ========================================================================= */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Online Application Review Card ]
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Review all encoded applicant information below. Ensure every entry matches your civil registry and academic records before submitting:
            </p>
          </div>
          <span className="text-[11px] font-mono bg-blue-100 text-[#002060] px-3 py-1 font-bold border border-blue-300 shrink-0">
            PRE-SUBMISSION VERIFICATION
          </span>
        </div>

        {/* Review Card Grid */}
        <div className="space-y-4">
          {/* Card 1: Learner Identity */}
          <div className="p-4 bg-white border border-slate-300 space-y-3">
            <div className="text-xs font-bold text-[#002060] uppercase tracking-wide border-b border-slate-100 pb-1.5">
              1. Learner Civil Registry &amp; Personal Details
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Last Name</span>
                <span className="font-bold text-slate-900 uppercase">{data.lastName || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">First Name</span>
                <span className="font-bold text-slate-900 uppercase">{data.firstName || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Middle Name</span>
                <span className="font-bold text-slate-900 uppercase">{data.middleName || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Extension</span>
                <span className="font-bold text-slate-900 uppercase">{data.extensionName || "None"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">12-Digit LRN</span>
                <span className="font-mono font-bold text-slate-900">{data.lrn || "None (First Time Enrollee)"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Date of Birth / Age</span>
                <span className="font-bold text-slate-900">{data.dateOfBirth || "-"} ({data.age} yrs old)</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Gender</span>
                <span className="font-bold text-slate-900">{data.gender || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Mother Tongue</span>
                <span className="font-bold text-slate-900">{data.motherTongue || "Ilokano"}</span>
              </div>
              {data.isIpCommunity && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">IP Community</span>
                  <span className="font-bold text-blue-900">{data.ipCommunityName || "Isnag"}</span>
                </div>
              )}
              {data.is4psBeneficiary && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">4Ps Household ID</span>
                  <span className="font-mono font-bold text-blue-900">{data.householdId4ps || "Beneficiary"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Academic Classification & Feeder School */}
          <div className="p-4 bg-white border border-slate-300 space-y-3">
            <div className="text-xs font-bold text-[#002060] uppercase tracking-wide border-b border-slate-100 pb-1.5">
              2. Enrollment Placement &amp; Academic Background
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Target Grade Level</span>
                <span className="font-bold text-slate-900">Grade {data.step1.targetGradeLevel}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Applicant Category</span>
                <span className="font-bold text-slate-900">{data.step1.applicantType}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Curricular Program / Track</span>
                <span className="font-bold text-[#002060]">
                  {isG7
                    ? data.jhsProgram === "SPS"
                      ? `Special Program in Sports (SPS: ${data.spsSport || "Selected"})`
                      : "Regular Junior High School Curriculum"
                    : `${data.targetTrack} - ${data.targetStrand} (${data.targetSemester})`}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Last School Attended</span>
                <span className="font-bold text-slate-900 uppercase">
                  {data.step1.lastSchoolAttended || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">DepEd School ID</span>
                <span className="font-mono font-bold text-slate-900">{data.step1.lastSchoolId || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Last S.Y. Completed</span>
                <span className="font-bold text-slate-900">{data.step1.lastSchoolYearCompleted || "-"}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Residential Address */}
          <div className="p-4 bg-white border border-slate-300 space-y-3">
            <div className="text-xs font-bold text-[#002060] uppercase tracking-wide border-b border-slate-100 pb-1.5">
              3. Residential Address
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Barangay</span>
                <span className="font-bold text-slate-900 uppercase">{data.currentBarangay}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Sitio / House No.</span>
                <span className="font-bold text-slate-900 uppercase">
                  {data.currentSitio ? `Sitio ${data.currentSitio}` : data.currentHouseNo || "Poblacion"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Municipality &amp; Province</span>
                <span className="font-bold text-slate-900 uppercase">DUMALNEG, ILOCOS NORTE</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Zip Code</span>
                <span className="font-mono font-bold text-slate-900">2921</span>
              </div>
            </div>
          </div>

          {/* Card 4: Parent & Guardian Information */}
          <div className="p-4 bg-white border border-slate-300 space-y-3">
            <div className="text-xs font-bold text-[#002060] uppercase tracking-wide border-b border-slate-100 pb-1.5">
              4. Parents &amp; Legal Guardian
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Father&apos;s Full Name</span>
                <span className="font-bold text-slate-900 uppercase">
                  {data.fatherLastName === "N/A"
                    ? "N/A (Not Available)"
                    : `${data.fatherLastName || ""}, ${data.fatherFirstName || ""} ${data.fatherMiddleName || ""}`}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">
                  {data.fatherContactNumber || "No mobile specified"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Mother&apos;s Maiden Name</span>
                <span className="font-bold text-slate-900 uppercase">
                  {data.motherMaidenLastName === "N/A"
                    ? "N/A (Not Available)"
                    : `${data.motherMaidenLastName || ""}, ${data.motherFirstName || ""} ${data.motherMiddleName || ""}`}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">
                  {data.motherContactNumber || "No mobile specified"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Legal Guardian</span>
                <span className="font-bold text-slate-900 uppercase">
                  {data.guardianLastName
                    ? `${data.guardianLastName}, ${data.guardianFirstName} (${data.guardianRelationship || "Guardian"})`
                    : "Living with Parents"}
                </span>
                {data.guardianContactNumber && (
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {data.guardianContactNumber}
                  </span>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Primary Emergency Contact Dispatcher</span>
              <span className="font-bold text-[#002060]">
                {data.primaryContactPerson} &bull; Contact Number:{" "}
                {data.primaryContactPerson === "Father"
                  ? data.fatherContactNumber
                  : data.primaryContactPerson === "Mother"
                  ? data.motherContactNumber
                  : data.guardianContactNumber}
              </span>
            </div>
          </div>

          {/* Card 5: SNEd & Modality */}
          <div className="p-4 bg-white border border-slate-300 space-y-3">
            <div className="text-xs font-bold text-[#002060] uppercase tracking-wide border-b border-slate-100 pb-1.5">
              5. Inclusive Education &amp; Preferred Modality
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Special Education (SNEd)</span>
                <span className="font-bold text-slate-900">
                  {data.isSned
                    ? `Yes - ${data.snedCategory}: ${(data.snedDetails || []).join(", ")}`
                    : "No (General Education Learner)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Preferred Emergency Learning Modalities</span>
                <span className="font-bold text-slate-900">
                  {(data.preferredModalities || ["Modular (Print)"]).join(", ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: DATA PRIVACY ACT OF 2012 (RA 10173) & DEPED CERTIFICATION      */}
      {/* ========================================================================= */}
      <div className="p-5 bg-blue-50/70 border-2 border-blue-200 space-y-3">
        <div className="text-xs font-bold text-[#002060] uppercase tracking-wider">
          [ DepEd Sworn Certification &amp; Republic Act No. 10173 (Data Privacy Act of 2012) ]
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          I hereby certify that all information supplied herein is true, complete, and accurate to the best of my knowledge and belief. 
          I understand that any misrepresentation of facts may result in the invalidation of this enrollment application. 
          Furthermore, I authorize the Department of Education, Division of Ilocos Norte, and Dumalneg National High School to collect, 
          record, organize, update, and store the personal and educational data contained in this application in accordance with the 
          Data Privacy Act of 2012 (Republic Act No. 10173) and official DepEd civil registry guidelines.
        </p>

        <label className="flex items-start gap-3 cursor-pointer pt-2 bg-white p-3 border border-blue-300">
          <input
            type="checkbox"
            checked={data.dataPrivacyAccepted}
            onChange={(e) => {
              onChange({ dataPrivacyAccepted: e.target.checked });
              if (errors.dataPrivacy) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.dataPrivacy;
                  return next;
                });
              }
            }}
            className="accent-[#002060] mt-0.5"
          />
          <span className="text-xs font-bold text-slate-900 leading-normal">
            I have read, understood, and accept the DepEd Data Privacy terms. I solemnly certify that all submitted information is authentic.
          </span>
        </label>
        {errors.dataPrivacy && (
          <p className="text-[11px] font-bold text-red-700">{errors.dataPrivacy}</p>
        )}
      </div>

      {/* Notice About Official PDF Release */}
      <div className="p-4 bg-slate-100 border border-slate-300 text-xs text-slate-600 leading-relaxed">
        <strong>Important Official Note</strong>: In accordance with DepEd enrollment verification procedures, 
        your official accomplished DepEd Basic Education Enrollment Form (PDF) will become accessible and downloadable 
        immediately once your application and credentials have been officially verified and <strong>Approved</strong> by the Dumalneg NHS Registrar.
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-6 border-t-2 border-slate-200">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 bg-white border-2 border-slate-400 text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-100 transition-colors"
        >
          &larr; Back to Step 4 (Curriculum &amp; Modality)
        </button>
        <button
          type="button"
          onClick={handleSubmitApplication}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-10 py-3 bg-[#002060] border-2 border-[#002060] text-xs font-bold text-white uppercase tracking-wider hover:bg-blue-950 transition-colors shadow-sm disabled:bg-slate-400 disabled:border-slate-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "[ PROCESSING OFFICIAL SUBMISSION... ]" : "[ SUBMIT ENROLLMENT APPLICATION ]"}
        </button>
      </div>
    </div>
  );
}
