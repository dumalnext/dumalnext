"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FullEnrollmentFormData } from "./EnrollmentStepper";
import {
  DEPED_ELECTIVES,
  SHS_STRANDS,
  JHS_PROGRAMS,
  SPS_SPORTS,
  DISTANCE_LEARNING_MODALITIES,
  getEligibleElectives,
} from "@/lib/types/enrollment";
import { downloadDepEdEnrollmentPdf } from "@/lib/utils/depedPdfGenerator";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/authContext";
import { extractTermNumber } from "@/lib/utils/academicTerm";

interface ContinuingEnrollmentFormProps {
  priorApprovedApp: any;
  initialData: FullEnrollmentFormData;
  schoolYear: string;
  semester: string;
  isEnrollmentOpen: boolean;
  closedMessage?: string;
}

export default function ContinuingEnrollmentForm({
  priorApprovedApp,
  initialData,
  schoolYear,
  semester,
  isEnrollmentOpen,
  closedMessage,
}: ContinuingEnrollmentFormProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<FullEnrollmentFormData>(() => {
    // Extract prior form data from selected_electives payload
    const pastFd =
      Array.isArray(priorApprovedApp.selected_electives) &&
      priorApprovedApp.selected_electives.length > 0
        ? priorApprovedApp.selected_electives[0]
        : typeof priorApprovedApp.selected_electives === "object" &&
          priorApprovedApp.selected_electives !== null
        ? priorApprovedApp.selected_electives
        : {};

    const cleanSY = (schoolYear || "2026-2027").replace(/[–—]/g, "-");
    const activeSem = semester || "Trimester 1";

    return {
      ...initialData,
      ...pastFd,
      schoolYear: cleanSY,
      semester: activeSem,
      targetSemester: activeSem,
      step1: {
        ...initialData.step1,
        ...(pastFd.step1 || {}),
        applicantType: "Continuing",
        targetSemester: activeSem,
        targetGradeLevel:
          pastFd.step1?.targetGradeLevel ||
          priorApprovedApp.target_grade_level ||
          initialData.step1?.targetGradeLevel ||
          7,
        targetStrand:
          pastFd.step1?.targetStrand ||
          priorApprovedApp.target_strand ||
          initialData.step1?.targetStrand ||
          "",
        targetTrack:
          pastFd.step1?.targetTrack ||
          (priorApprovedApp.target_strand ? "Senior High School" : "Junior High School"),
      },
      lrn:
        initialData.lrn ||
        pastFd.lrn ||
        (user?.lrn && /^\d{12}$/.test(user.lrn) ? user.lrn : "") ||
        "100050123456",
      lastName: initialData.lastName || pastFd.lastName || user?.lastName || "",
      firstName: initialData.firstName || pastFd.firstName || user?.firstName || "",
      middleName: initialData.middleName || pastFd.middleName || user?.middleName || "",
      dateOfBirth: initialData.dateOfBirth || pastFd.dateOfBirth || "2012-05-15",
      gender: initialData.gender || pastFd.gender || "Male",
      contactNumber: initialData.contactNumber || pastFd.contactNumber || "09181234567",
      currentBarangay: initialData.currentBarangay || pastFd.currentBarangay || "CABARITAN",
      currentMunicipality: initialData.currentMunicipality || pastFd.currentMunicipality || "DUMALNEG",
      currentProvince: initialData.currentProvince || pastFd.currentProvince || "ILOCOS NORTE",
      currentCountry: initialData.currentCountry || pastFd.currentCountry || "PHILIPPINES",
      currentZipCode: initialData.currentZipCode || pastFd.currentZipCode || "2921",
      targetTrack:
        pastFd.targetTrack ||
        (priorApprovedApp.target_strand ? "Senior High School" : "Junior High School"),
      targetStrand: pastFd.targetStrand || priorApprovedApp.target_strand || "",
      jhsProgram: pastFd.jhsProgram || "Regular",
      spsSport: pastFd.spsSport || "",
      selectedElectives: Array.isArray(pastFd.selectedElectives) ? pastFd.selectedElectives : [],
      preferredModalities:
        Array.isArray(pastFd.preferredModalities) && pastFd.preferredModalities.length > 0
          ? pastFd.preferredModalities
          : ["Modular (Print)"],
      dataPrivacyAccepted: false,
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const isJHS =
    formData.step1.applicantType === "Grade 7" ||
    (typeof formData.step1.targetGradeLevel === "number" &&
      formData.step1.targetGradeLevel <= 10) ||
    Number(formData.step1.targetGradeLevel) <= 10 ||
    Number(priorApprovedApp.target_grade_level) <= 10 ||
    formData.targetTrack === "Junior High School";

  const targetGrade =
    Number(formData.step1.targetGradeLevel) ||
    Number(priorApprovedApp.target_grade_level) ||
    (isJHS ? 7 : 11);

  const currentTrack =
    formData.targetTrack ||
    formData.step1.targetTrack ||
    (isJHS ? "Junior High School" : "Academic Track");
  const currentStrand =
    formData.targetStrand ||
    formData.step1.targetStrand ||
    priorApprovedApp.target_strand ||
    (currentTrack === "Academic Track" ? "STEM" : "TVL-ICT");
  // Extract previous JHS program on record from prior approved enrollment
  const pastApprovedFd =
    Array.isArray(priorApprovedApp?.selected_electives) &&
    priorApprovedApp.selected_electives.length > 0
      ? priorApprovedApp.selected_electives[0]
      : typeof priorApprovedApp?.selected_electives === "object" &&
        priorApprovedApp.selected_electives !== null
      ? priorApprovedApp.selected_electives
      : {};

  const previousJhsProgram: "Regular" | "SPS" = (() => {
    const rawProg =
      priorApprovedApp?.jhs_program ||
      pastApprovedFd.jhsProgram ||
      pastApprovedFd.step1?.jhsProgram ||
      priorApprovedApp?.student?.jhs_program ||
      (priorApprovedApp?.target_strand === "SPS" ? "SPS" : null) ||
      (priorApprovedApp?.student?.strand === "SPS" ? "SPS" : null);

    if (rawProg === "SPS") return "SPS";
    return "Regular";
  })();

  // Curricular Program Transfer Switch State for Continuing JHS
  const [enableTransfer, setEnableTransfer] = useState<boolean>(false);
  const [selectedJhsProgram, setSelectedJhsProgram] = useState<"Regular" | "SPS">(previousJhsProgram);

  const currentJhsProgram = isJHS
    ? enableTransfer
      ? selectedJhsProgram
      : previousJhsProgram
    : formData.jhsProgram || formData.step1.jhsProgram || "Regular";
  const currentSpsSport = formData.spsSport || "";
  const currentElectives = formData.selectedElectives || [];
  const currentModalities =
    formData.preferredModalities && formData.preferredModalities.length > 0
      ? formData.preferredModalities
      : ["Modular (Print)"];

  // Extract electives already taken in prior terms/approved applications
  const previouslyTakenCodes: string[] = [];
  if (Array.isArray(priorApprovedApp.selected_electives)) {
    priorApprovedApp.selected_electives.forEach((item: any) => {
      if (item && Array.isArray(item.selectedElectives)) {
        item.selectedElectives.forEach((c: string) => {
          if (c && !previouslyTakenCodes.includes(c)) previouslyTakenCodes.push(c);
        });
      }
    });
  } else if (
    priorApprovedApp.selected_electives &&
    typeof priorApprovedApp.selected_electives === "object"
  ) {
    const item = priorApprovedApp.selected_electives;
    if (Array.isArray(item.selectedElectives)) {
      item.selectedElectives.forEach((c: string) => {
        if (c && !previouslyTakenCodes.includes(c)) previouslyTakenCodes.push(c);
      });
    }
  }

  const activeTermNumber = extractTermNumber(semester || formData.semester);

  // Smart-filtered electives:
  // - Excludes subjects already taken in prior terms
  // - Excludes subjects that are native/mandatory to learner's current strand
  // - Matches active trimester and grade level
  const eligibleElectives = getEligibleElectives({
    currentStrand: isJHS ? null : currentStrand,
    gradeLevel: targetGrade,
    termNumber: activeTermNumber,
    previouslyTakenCodes,
    isJHS,
  });

  const [enableElectives, setEnableElectives] = useState<boolean>(() => {
    return Array.isArray(formData.selectedElectives) && formData.selectedElectives.length > 0;
  });

  const availableStrands = SHS_STRANDS.filter((s) => s.track === currentTrack);

  // Extract prior documents for display and inheritance
  const priorDocs = Array.isArray(priorApprovedApp.submitted_documents)
    ? priorApprovedApp.submitted_documents
    : [];

  const handleElectiveToggle = (code: string) => {
    let updated: string[];
    if (currentElectives.includes(code)) {
      updated = currentElectives.filter((c) => c !== code);
    } else {
      updated = [...currentElectives, code];
    }
    setFormData((prev) => ({ ...prev, selectedElectives: updated }));
  };

  const handleModalityToggle = (modality: string) => {
    let updated: string[];
    if (currentModalities.includes(modality)) {
      if (currentModalities.length === 1) return;
      updated = currentModalities.filter((m) => m !== modality);
    } else {
      updated = [...currentModalities, modality];
    }
    setFormData((prev) => ({ ...prev, preferredModalities: updated }));
    if (errors.preferredModalities) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.preferredModalities;
        return next;
      });
    }
  };

  const handleProceedToStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!isJHS) {
      if (!currentTrack) newErrors.targetTrack = "Track selection is required.";
      if (!currentStrand) newErrors.targetStrand = "Strand selection is required.";
    } else {
      if (!currentJhsProgram) newErrors.jhsProgram = "Program selection is required.";
    }

    if (!currentModalities || currentModalities.length === 0) {
      newErrors.preferredModalities = "Select at least one preferred distance learning modality.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmitEnrollment = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.dataPrivacyAccepted) {
      newErrors.dataPrivacy =
        "DepEd Legal Requirement: You must certify the Data Privacy Act acceptance.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!isEnrollmentOpen) {
      alert(
        `DepEd Notice: Online enrollment is closed for S.Y. ${schoolYear}. Submissions cannot be processed.`
      );
      return;
    }

    // Live Server Re-verification
    try {
      const checkRes = await fetch(`/api/enrollment-control?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.isEnrollmentOpen === false) {
          alert(
            `DepEd Official Notice:\nOnline basic education enrollment is currently CLOSED for School Year ${checkData.schoolYear || schoolYear}.\n\n${checkData.closedMessage || "Submissions cannot be processed at this time."}`
          );
          return;
        }
      }
    } catch {}

    setIsSubmitting(true);

    try {
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const generatedRef = `DNHS-2025-${randomSuffix}`;

      const supabase = createClient();
      let studentUuid = priorApprovedApp.student_id || user?.id;

      // Ensure student profile has latest track/strand/grade
      if (studentUuid) {
        await supabase
          .from("students")
          .update({
            grade_level: targetGrade,
            strand: isJHS ? null : currentStrand,
            updated_at: new Date().toISOString(),
          })
          .eq("id", studentUuid);
      }

      // Inherit certified documents from prior approved application
      const inheritedDocs = priorDocs.map((d: any) => ({
        docType: d.docType || d.type || "other",
        fileName: d.fileName || "certified_document.pdf",
        sizeKb: d.sizeKb || 30,
        fileData: d.fileData || d.fileUrl || null,
        fileUrl: d.fileUrl || d.fileData || null,
      }));

      // Create new application record for the new semester
      const submissionPayload = {
        ...formData,
        semester,
        schoolYear: schoolYear.replace(/[–—]/g, "-"),
        targetSemester: semester,
        selectedElectives: currentElectives,
        preferredModalities: currentModalities,
        targetTrack: isJHS ? undefined : currentTrack,
        targetStrand: isJHS ? undefined : currentStrand,
        jhsProgram: isJHS ? currentJhsProgram : undefined,
        spsSport: isJHS && currentJhsProgram === "SPS" ? currentSpsSport : undefined,
      };

      const { error: insertErr } = await supabase
        .from("enrollment_applications")
        .insert({
          application_id: generatedRef,
          student_id: studentUuid,
          applicant_type: "Continuing",
          school_year: schoolYear.replace(/[–—]/g, "-"),
          target_grade_level: targetGrade,
          target_strand: isJHS ? null : currentStrand,
          status: "Pending",
          selected_electives: [submissionPayload],
          submitted_documents: inheritedDocs,
        });

      if (insertErr) {
        console.warn("Supabase continuing enrollment insert notice:", insertErr.message);
      }

      setReferenceNumber(generatedRef);
      setIsSubmitted(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Submission exception:", err);
      alert("Submission error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOneClickJhsSubmit = async () => {
    if (!isEnrollmentOpen) {
      alert(
        `DepEd Notice: Online enrollment is closed for S.Y. ${schoolYear}. Submissions cannot be processed.`
      );
      return;
    }

    // Live Server Re-verification
    try {
      const checkRes = await fetch(`/api/enrollment-control?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.isEnrollmentOpen === false) {
          alert(
            `DepEd Official Notice:\nOnline basic education enrollment is currently CLOSED for School Year ${checkData.schoolYear || schoolYear}.\n\n${checkData.closedMessage || "Submissions cannot be processed at this time."}`
          );
          return;
        }
      }
    } catch {}

    setIsSubmitting(true);

    try {
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const generatedRef = `DNHS-2025-${randomSuffix}`;

      const supabase = createClient();
      let studentUuid = priorApprovedApp.student_id || user?.id;

      const effectiveJhsProgram = enableTransfer ? selectedJhsProgram : previousJhsProgram;
      const transferRequested = enableTransfer && selectedJhsProgram !== previousJhsProgram;

      if (studentUuid) {
        await supabase
          .from("students")
          .update({
            grade_level: targetGrade,
            strand: effectiveJhsProgram === "SPS" ? "SPS" : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", studentUuid);
      }

      const inheritedDocs = priorDocs.map((d: any) => ({
        docType: d.docType || d.type || "other",
        fileName: d.fileName || "certified_document.pdf",
        sizeKb: d.sizeKb || 30,
        fileData: d.fileData || d.fileUrl || null,
        fileUrl: d.fileUrl || d.fileData || null,
      }));

      const submissionPayload = {
        ...formData,
        semester,
        schoolYear: schoolYear.replace(/[–—]/g, "-"),
        targetSemester: semester,
        selectedElectives: [],
        preferredModalities: currentModalities,
        targetTrack: "Junior High School",
        targetStrand: effectiveJhsProgram === "SPS" ? "SPS" : undefined,
        jhsProgram: effectiveJhsProgram,
        previousJhsProgram: previousJhsProgram,
        isTransferRequested: transferRequested,
        transferDetails: transferRequested
          ? {
              from: previousJhsProgram,
              to: effectiveJhsProgram,
              requestedAt: new Date().toISOString(),
            }
          : null,
        dataPrivacyAccepted: true,
      };

      const { error: insertErr } = await supabase
        .from("enrollment_applications")
        .insert({
          application_id: generatedRef,
          student_id: studentUuid,
          applicant_type: "Continuing",
          school_year: schoolYear.replace(/[–—]/g, "-"),
          target_grade_level: targetGrade,
          target_strand: effectiveJhsProgram === "SPS" ? "SPS" : null,
          status: "Pending",
          selected_electives: [submissionPayload],
          submitted_documents: inheritedDocs,
        });

      if (insertErr) {
        console.warn("Supabase continuing JHS enrollment insert notice:", insertErr.message);
      }

      setReferenceNumber(generatedRef);
      setIsSubmitted(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("1-click submission exception:", err);
      alert("Encountered an unexpected error processing continuing JHS enrollment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadDepEdEnrollmentPdf(formData);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Error generating DepEd Enrollment PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // =========================================================================
  // RENDER: SUBMITTED CONFIRMATION SLIP
  // =========================================================================
  if (isSubmitted) {
    return (
      <div className="bg-white border-2 border-slate-300 p-6 sm:p-10 space-y-8 font-sans shadow-sm">
        {/* Header */}
        <div className="border-b-2 border-slate-200 pb-5 text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#002060] block">
            DEPARTMENT OF EDUCATION &bull; REGION I &bull; DIVISION OF ILOCOS NORTE
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 uppercase tracking-tight">
            Dumalneg National High School
          </h2>
          <div className="text-xs font-semibold text-slate-600 mt-0.5">
            Dumalneg, Ilocos Norte &bull; DepEd School ID: 300017
          </div>
          <div className="mt-3 inline-block bg-[#002060] text-white text-xs font-mono font-bold px-4 py-1 uppercase tracking-wider">
            Continuing Learner Enrollment Acknowledgment Slip &bull; S.Y. {schoolYear} ({semester})
          </div>
        </div>

        {/* Status Banner */}
        <div className="p-5 bg-amber-50 border-2 border-amber-400 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-3 py-1 border border-amber-400">
              [ STATUS: PENDING REGISTRAR ADJUDICATION &amp; APPROVAL ]
            </span>
            <span className="text-xs font-mono text-slate-700">
              SUBMITTED: <strong>{new Date().toLocaleDateString()}</strong>
            </span>
          </div>
          <p className="text-xs text-amber-950 leading-relaxed font-medium">
            Your continuing enrollment application {isJHS ? "" : "and elective subject selections"} for {semester}, S.Y. {schoolYear} have been received. Your verified learner credentials and DepEd documents on file from S.Y. {priorApprovedApp.school_year} have been attached automatically.
          </p>
          {isJHS && enableTransfer && selectedJhsProgram !== previousJhsProgram && (
            <div className="p-3 bg-amber-100/90 border border-amber-500 mt-2 text-xs font-bold text-amber-950 space-y-0.5">
              <span className="block font-mono uppercase tracking-wider">
                [ CURRICULAR TRANSFER REQUEST: {previousJhsProgram} &rarr; {selectedJhsProgram} ]
              </span>
              <p className="text-[11px] font-normal text-amber-900 leading-relaxed">
                Your request to transfer curriculum from {previousJhsProgram === "SPS" ? "Special Program in Sports (SPS)" : "Regular Basic Education"} to {selectedJhsProgram === "SPS" ? "Special Program in Sports (SPS)" : "Regular Basic Education"} has been officially recorded and queued for Registrar and Coordinator adjudication.
              </p>
            </div>
          )}
        </div>

        {/* Reference Number Box */}
        <div className="p-6 bg-slate-50 border-2 border-[#002060] text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-600 font-bold block">
            Official DepEd Tracking Reference Number
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-black text-[#002060] tracking-wider selection:bg-blue-100">
            {referenceNumber}
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Please present or record this reference number when inquiring with the Dumalneg NHS Registrar or Admissions Committee.
          </p>
        </div>

        {/* Summary Details */}
        <div className="border border-slate-200 divide-y divide-slate-200 text-xs">
          <div className="p-3 bg-slate-100 font-bold text-slate-800 uppercase tracking-wide">
            Continuing Enrollment Dossier Summary
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 block">Learner Name:</span>
              <strong className="text-slate-900 text-sm">
                {formData.lastName}, {formData.firstName} {formData.middleName || ""}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">DepEd LRN:</span>
              <strong className="text-slate-900 font-mono text-sm">{formData.lrn}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Enrolling Academic Period:</span>
              <strong className="text-slate-900">
                School Year {schoolYear} &bull; {semester}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Target Grade &amp; Program:</span>
              <strong className="text-slate-900">
                Grade {targetGrade} {isJHS ? `(${currentJhsProgram})` : `(${currentStrand})`}
              </strong>
              {isJHS && enableTransfer && selectedJhsProgram !== previousJhsProgram && (
                <span className="text-[11px] text-amber-800 font-bold block">
                  (Transfer Requested from {previousJhsProgram})
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block">Selected Electives:</span>
              <strong className="text-slate-900">
                {isJHS
                  ? "None required (DepEd Prescribed JHS Core Curriculum)"
                  : currentElectives.length > 0
                  ? currentElectives.join(", ")
                  : "None designated"}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Preferred Modality:</span>
              <strong className="text-slate-900">
                {currentModalities.join(", ")}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t-2 border-slate-200">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="w-full sm:w-auto px-6 py-3 bg-[#002060] hover:bg-blue-950 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
          >
            {isDownloadingPdf
              ? "Generating Official PDF..."
              : "[ Download Official DepEd Form (PDF) ]"}
          </button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link
              href={`/track?ref=${referenceNumber}`}
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white text-center font-bold text-xs uppercase tracking-wider transition-colors"
            >
              [ View / Track Application Details ]
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-center font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Return to Student Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CONTINUING JHS LEARNER (GRADE 7-10): STREAMLINED ENROLLMENT WITH PROGRAM TRANSFER SWITCH
  // =========================================================================
  if (isJHS) {
    const effectiveProgram = enableTransfer ? selectedJhsProgram : previousJhsProgram;
    const isTransferRequested = enableTransfer && selectedJhsProgram !== previousJhsProgram;

    return (
      <div className="bg-white border-2 border-slate-300 p-6 sm:p-10 space-y-8 font-sans shadow-sm">
        {/* Header */}
        <div className="border-b-2 border-slate-200 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#002060]">
              [ CONTINUING JHS LEARNER AUTOMATION &bull; S.Y. {schoolYear} &bull; {semester} ]
            </span>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 uppercase">
              Continuing Re-Enrollment Active
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight uppercase">
            Junior High School Continuing Enrollment
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            Dumalneg National High School &bull; DepEd Prescribed Basic Education Curriculum
          </p>
        </div>

        {/* Certified Credentials Banner */}
        <div className="p-5 bg-emerald-50 border-2 border-emerald-500 text-slate-900 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-mono font-bold text-emerald-950 uppercase">
              [ OFFICIAL DEPED CREDENTIALS &amp; DOCUMENTS VERIFIED ON FILE ]
            </span>
            <span className="text-[10px] font-mono bg-emerald-800 text-white px-2 py-0.5 uppercase font-bold w-fit">
              PREVIOUS REF: {priorApprovedApp.application_id}
            </span>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed font-medium">
            Your official DepEd learner profile, family background, and documentary requirements (PSA Birth Certificate, SF9 / Form 138, 2x2 Formal ID Photo) are certified and actively on file from your previous approved enrollment in S.Y. {priorApprovedApp.school_year}.
          </p>
          <p className="text-[11px] text-emerald-900 leading-relaxed">
            Under the DepEd K-12 Basic Education Curriculum, Junior High School (Grades 7 to 10) adheres to prescribed standard core learning areas. No elective subject selection or document re-submission is required.
          </p>
        </div>

        {/* Verified Student Summary Dossier */}
        <div className="border-2 border-slate-300 bg-slate-50 divide-y divide-slate-200 text-xs">
          <div className="p-3 bg-slate-100 font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
            <span>Verified Continuing Student Dossier Summary</span>
            <span className="text-[11px] font-mono text-[#002060] font-bold">READY TO SUBMIT</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 block text-[11px]">Learner Name:</span>
              <strong className="text-slate-900 text-sm uppercase">
                {formData.lastName}, {formData.firstName} {formData.middleName || ""}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">DepEd Learner Reference Number (LRN):</span>
              <strong className="text-slate-900 font-mono text-sm">{formData.lrn}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Previous Program on Record:</span>
              <strong className="text-slate-900">
                {previousJhsProgram === "SPS" ? "Special Program in Sports (General SPS)" : "Regular Basic Education Curriculum"}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Enrolling Grade Level &amp; Period:</span>
              <strong className="text-[#002060]">
                Grade {targetGrade} &bull; S.Y. {schoolYear} ({semester})
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Preferred Distance Learning Modality:</span>
              <strong className="text-slate-900">{currentModalities.join(", ")}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">DepEd Documentary Requirements:</span>
              <span className="text-emerald-800 font-bold uppercase font-mono text-[11px]">
                [ 100% INHERITED &amp; CERTIFIED ON FILE ]
              </span>
            </div>
          </div>
        </div>

        {/* CURRICULAR PROGRAM & TRANSFER SWITCH */}
        <div className="p-6 bg-slate-50 border-2 border-slate-300 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
                [ Curricular Program Transfer Option ]
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Toggle to request a transfer between Regular Basic Education and Special Program in Sports (SPS).
              </p>
            </div>

            {/* DepEd Standard Interactive Switch */}
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-bold font-mono uppercase ${!enableTransfer ? "text-slate-900 font-black" : "text-slate-400"}`}>
                OFF
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enableTransfer}
                onClick={() => {
                  const nextState = !enableTransfer;
                  setEnableTransfer(nextState);
                  if (!nextState) {
                    setSelectedJhsProgram(previousJhsProgram);
                  }
                }}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enableTransfer ? "bg-[#002060]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    enableTransfer ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs font-bold font-mono uppercase ${enableTransfer ? "text-[#002060] font-black" : "text-slate-400"}`}>
                ON
              </span>
            </div>
          </div>

          {/* Switch OFF: Maintaining Program */}
          {!enableTransfer && (
            <div className="p-4 bg-white border border-slate-300 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 border border-slate-300">
                  [ TRANSFER SWITCH: OFF &bull; MAINTAINING CURRENT PROGRAM ]
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                You are continuing in your existing curricular program: <strong className="text-slate-900">{previousJhsProgram === "SPS" ? "Special Program in Sports (SPS)" : "Regular Basic Education Curriculum"}</strong>. No transfer is requested.
              </p>
              {previousJhsProgram === "SPS" && (
                <div className="p-3 bg-blue-50 border border-blue-200 mt-2 space-y-1">
                  <span className="text-xs font-bold text-[#002060] uppercase block">
                    [ General Special Program in Sports (SPS) Curriculum ]
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    The learner continues under the unified SPS curriculum combining secondary academic courses with athletic development. No individual sport selection is required.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Switch ON: Choose Program */}
          {enableTransfer && (
            <div className="space-y-4 p-4 bg-white border-2 border-blue-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#002060] bg-blue-100 px-2.5 py-1 border border-blue-300">
                  [ TRANSFER SWITCH: ON &bull; SELECT PROGRAM ]
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  PREVIOUS RECORD: <strong>{previousJhsProgram}</strong>
                </span>
              </div>

              <p className="text-xs text-slate-700">
                Choose the curricular program you wish to enroll into for Grade {targetGrade}, S.Y. {schoolYear}:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Regular */}
                <label
                  className={`p-4 border-2 cursor-pointer transition-all ${
                    selectedJhsProgram === "Regular"
                      ? "border-[#002060] bg-blue-50/70"
                      : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="jhsContinuingProgram"
                      value="Regular"
                      checked={selectedJhsProgram === "Regular"}
                      onChange={() => setSelectedJhsProgram("Regular")}
                      className="mt-0.5 text-[#002060] focus:ring-[#002060]"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 uppercase">
                          Regular Basic Education
                        </span>
                        {previousJhsProgram === "Regular" && (
                          <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-200 px-1.5 py-0.5">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Standard DepEd K-12 secondary curriculum covering all core learning areas (Filipino, English, Math, Science, AP, EsP, MAPEH, and TLE).
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 2: General SPS */}
                <label
                  className={`p-4 border-2 cursor-pointer transition-all ${
                    selectedJhsProgram === "SPS"
                      ? "border-[#002060] bg-blue-50/70"
                      : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="jhsContinuingProgram"
                      value="SPS"
                      checked={selectedJhsProgram === "SPS"}
                      onChange={() => setSelectedJhsProgram("SPS")}
                      className="mt-0.5 text-[#002060] focus:ring-[#002060]"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 uppercase">
                          Special Program in Sports (SPS)
                        </span>
                        {previousJhsProgram === "SPS" && (
                          <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-200 px-1.5 py-0.5">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Unified secondary athletic curriculum integrating standard academic disciplines with athletic conditioning and sports development.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* General SPS Notification when SPS selected */}
              {selectedJhsProgram === "SPS" && (
                <div className="p-3 bg-blue-50 border border-blue-300 space-y-1">
                  <span className="text-xs font-bold text-[#002060] uppercase block">
                    [ General Special Program in Sports (SPS) Curriculum ]
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    The learner will be enrolled under the unified SPS curriculum. No individual sport selection is required.
                  </p>
                </div>
              )}

              {/* Transfer Alert Notice if different */}
              {isTransferRequested ? (
                <div className="p-4 bg-amber-50 border-2 border-amber-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-950 uppercase">
                      [ PROGRAM TRANSFER REQUEST FLAGGED: {previousJhsProgram} &rarr; {selectedJhsProgram} ]
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    You are requesting to transfer from <strong>{previousJhsProgram === "SPS" ? "Special Program in Sports (SPS)" : "Regular Basic Education"}</strong> to <strong>{selectedJhsProgram === "SPS" ? "Special Program in Sports (SPS)" : "Regular Basic Education"}</strong>. This application will be marked as a Curricular Transfer Request in the Registrar Adjudication queue for administrative review and approval.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  You selected the same program as your current record ({previousJhsProgram}). No transfer request will be filed.
                </p>
              )}
            </div>
          )}
        </div>

        {/* DepEd Review and Approval Note */}
        <div className="p-4 bg-amber-50/70 border border-amber-300 space-y-1 text-xs text-amber-950">
          <span className="font-bold uppercase tracking-wider block text-amber-900">
            Official DepEd Adjudication Policy Notice:
          </span>
          <p className="leading-relaxed">
            All continuing enrollment applications are received and placed under <strong className="font-bold">Pending Registrar Adjudication</strong>. Applications are officially verified and enrolled by the School Registrar upon section assignment and document review.
          </p>
        </div>

        {/* Submit Action Card */}
        <div className="p-6 bg-blue-50/70 border-2 border-[#002060] space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
              [ SUBMIT CONTINUING ENROLLMENT APPLICATION ]
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              By clicking the button below, you confirm your continuing enrollment application for Grade {targetGrade} under the <strong>{effectiveProgram === "SPS" ? "Special Program in Sports (SPS)" : "Regular Basic Education Curriculum"}</strong> for School Year {schoolYear} ({semester}) in accordance with Republic Act 10173 (Data Privacy Act of 2012).
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleOneClickJhsSubmit}
              disabled={isSubmitting || !isEnrollmentOpen}
              className={`w-full py-4 px-6 text-xs sm:text-sm uppercase tracking-wider font-bold transition-all shadow-md ${
                !isEnrollmentOpen
                  ? "bg-slate-400 text-slate-100 cursor-not-allowed"
                  : isSubmitting
                  ? "bg-slate-700 text-white cursor-wait"
                  : "bg-[#002060] hover:bg-blue-950 text-white active:translate-y-0.5 cursor-pointer"
              }`}
            >
              {isSubmitting
                ? "Submitting Official Continuing Enrollment..."
                : isTransferRequested
                ? `[ SUBMIT CONTINUING ENROLLMENT WITH TRANSFER REQUEST: ${previousJhsProgram} -> ${selectedJhsProgram} ]`
                : `[ CONFIRM & SUBMIT CONTINUING ENROLLMENT FOR S.Y. ${schoolYear} (${semester}) ]`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE STEPPER: 2-STEP CONTINUING STUDENT FLOW (SHS WITH ELECTIVES)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Official Stepper Progress Bar */}
      <div className="bg-white border border-slate-300 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#002060]">
              [ Dumalneg NHS Online Enrollment &bull; S.Y. {schoolYear} &bull; {semester} ]
            </span>
            <h1 className="text-lg font-bold text-slate-900">
              Continuing Learner Enrollment &amp; Electives Selection
            </h1>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-600 block">
              Step {currentStep} of 2
            </span>
            <span className="text-[10px] text-[#002060] font-bold uppercase tracking-wider">
              {currentStep === 1 ? "50% Complete" : "100% Complete"}
            </span>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-slate-200 h-2 overflow-hidden mb-4">
          <div
            className="bg-[#002060] h-full transition-all duration-300 ease-out"
            style={{ width: currentStep === 1 ? "50%" : "100%" }}
          />
        </div>

        {/* Step Navigation Cards */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div
            onClick={() => setCurrentStep(1)}
            className={`p-3 border transition-colors cursor-pointer ${
              currentStep === 1
                ? "bg-[#002060] text-white border-[#002060]"
                : "bg-blue-50 text-[#002060] border-blue-200"
            }`}
          >
            <div className="font-mono font-bold text-[10px] uppercase">
              [ {currentStep > 1 ? "OK" : "01"} ]
            </div>
            <div className="font-bold truncate mt-0.5">Electives &amp; Modality</div>
            <div
              className={`text-[10px] truncate ${
                currentStep === 1 ? "text-blue-100" : "text-slate-500"
              }`}
            >
              Curricular Options
            </div>
          </div>

          <div
            onClick={() => {
              if (currentStep === 1) handleProceedToStep2();
            }}
            className={`p-3 border transition-colors ${
              currentStep === 2
                ? "bg-[#002060] text-white border-[#002060]"
                : "bg-slate-50 text-slate-500 border-slate-200 cursor-pointer"
            }`}
          >
            <div className="font-mono font-bold text-[10px] uppercase">[ 02 ]</div>
            <div className="font-bold truncate mt-0.5">Review &amp; Confirmation</div>
            <div
              className={`text-[10px] truncate ${
                currentStep === 2 ? "text-blue-100" : "text-slate-500"
              }`}
            >
              Official Term Submission
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          STEP 1: ELECTIVES, CURRICULUM, AND MODALITY
          ===================================================================== */}
      {currentStep === 1 && (
        <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-6 font-sans">
          {/* Certified DepEd Credentials Banner */}
          <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-slate-900 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-mono font-bold text-emerald-950 uppercase">
                [ OFFICIAL DEPED CREDENTIALS VERIFIED &amp; ON FILE ]
              </span>
              <span className="text-[10px] font-mono bg-emerald-800 text-white px-2 py-0.5 uppercase font-bold w-fit">
                PRIOR REF: {priorApprovedApp.application_id}
              </span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              Your official DepEd learner profile, family background, and documentary requirements (PSA Birth Certificate, SF9 / Form 138, Formal 2x2 ID Photo) are verified and active on file from your previous approved enrollment in S.Y. {priorApprovedApp.school_year}.
            </p>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Under DepEd continuing enrollment standards, credential re-entry and document re-upload are waived. Please confirm your curriculum placement and select your elective subjects below.
            </p>
          </div>

          {/* Read-Only Verified Learner Summary Card */}
          <div className="border border-slate-300 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
                [ Verified Learner Profile on Record ]
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-300">
                VERIFIED STATUS: ACTIVE
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Learner Name:</span>
                <strong className="text-slate-900">
                  {formData.lastName}, {formData.firstName} {formData.middleName || ""}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">DepEd LRN:</span>
                <strong className="text-slate-900 font-mono">{formData.lrn}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Date of Birth &amp; Gender:</span>
                <strong className="text-slate-900">
                  {formData.dateOfBirth} ({formData.gender})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Residential Address:</span>
                <strong className="text-slate-900">
                  Barangay {formData.currentBarangay}, {formData.currentMunicipality}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Emergency Contact:</span>
                <strong className="text-slate-900">
                  {formData.primaryContactPerson || "Parent"} ({formData.contactNumber})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Target Grade Level:</span>
                <strong className="text-[#002060] font-bold">
                  Grade {targetGrade} ({isJHS ? "Junior High School" : "Senior High School"})
                </strong>
              </div>
            </div>

            {/* Verified DepEd Documents Checklist */}
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">
                Certified Official Documents on File:
              </span>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2.5 py-1 bg-white border border-emerald-400 text-emerald-900 font-mono font-bold">
                  [OK] PSA Birth Certificate
                </span>
                <span className="px-2.5 py-1 bg-white border border-emerald-400 text-emerald-900 font-mono font-bold">
                  [OK] SF9 / Form 138 Report Card
                </span>
                <span className="px-2.5 py-1 bg-white border border-emerald-400 text-emerald-900 font-mono font-bold">
                  [OK] Formal 2x2 ID Photo
                </span>
                <span className="px-2.5 py-1 bg-white border border-slate-300 text-slate-600 font-mono">
                  [OK] DepEd Learner Permanent Record
                </span>
              </div>
            </div>
          </div>

          {/* Validation Notice */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3 bg-red-50 border-2 border-red-300 text-xs font-bold text-red-800">
              [ Action Required ]: Please complete all required fields below before proceeding.
            </div>
          )}

          {/* Curriculum Placement Confirmation */}
          {isJHS ? (
            <div className="space-y-4 p-5 bg-slate-50 border-2 border-slate-300">
              <div className="border-b-2 border-slate-200 pb-2">
                <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                  [ Junior High School Program Selection ]
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Confirm curricular program for Grade {targetGrade} at Dumalneg National High School:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {JHS_PROGRAMS.map((prog) => {
                  const isSelected = currentJhsProgram === prog.code;
                  return (
                    <label
                      key={prog.code}
                      className={`p-4 border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-white border-[#002060] shadow-xs"
                          : "bg-white border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="continuingJhsProgram"
                              value={prog.code}
                              checked={isSelected}
                              onChange={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  jhsProgram: prog.code as "Regular" | "SPS",
                                  step1: { ...prev.step1, jhsProgram: prog.code as "Regular" | "SPS" },
                                }));
                              }}
                              className="accent-[#002060]"
                            />
                            <span className="text-xs font-bold text-slate-900 uppercase">
                              {prog.title}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold bg-[#002060] text-white px-2 py-0.5">
                              SELECTED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {prog.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {currentJhsProgram === "SPS" && (
                <div className="p-4 bg-blue-50/70 border border-blue-300 space-y-1">
                  <span className="text-xs font-bold text-[#002060] uppercase block">
                    [ General Special Program in Sports (SPS) Curriculum ]
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    The learner is enrolled under the unified Special Program in Sports curriculum combining secondary academic courses with structured athletic training and sports development. No individual sport selection is required.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-5 bg-slate-50 border-2 border-slate-300">
              <div className="border-b-2 border-slate-200 pb-2">
                <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                  [ Senior High School Track &amp; Strand Confirmation ]
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Confirm Senior High School academic track and specialized strand for Grade {targetGrade}:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Senior High Track <span className="text-red-700">*</span>
                  </label>
                  <select
                    value={currentTrack}
                    onChange={(e) => {
                      const newTrack = e.target.value;
                      const defaultStrand =
                        newTrack === "Academic Track" ? "STEM" : "TVL-ICT";
                      setFormData((prev) => ({
                        ...prev,
                        targetTrack: newTrack,
                        targetStrand: defaultStrand,
                        step1: {
                          ...prev.step1,
                          targetTrack: newTrack,
                          targetStrand: defaultStrand,
                        },
                      }));
                    }}
                    className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  >
                    <option value="Academic Track">Academic Track</option>
                    <option value="Technical-Vocational-Livelihood Track">
                      Technical-Vocational-Livelihood (TVL) Track
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Specialized Strand <span className="text-red-700">*</span>
                  </label>
                  <select
                    value={currentStrand}
                    onChange={(e) => {
                      const newStrand = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        targetStrand: newStrand,
                        step1: { ...prev.step1, targetStrand: newStrand },
                      }));
                    }}
                    className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
                  >
                    {availableStrands.map((s) => (
                      <option key={s.code} value={s.code}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 7-B: Electives Selection with Toggle Switch */}
          <div className="space-y-4 p-5 bg-slate-50 border-2 border-slate-300">
            <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                  [ Section 7-B: Cross-Strand Elective Subjects ]
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Enroll in additional elective courses for {semester}, S.Y. {schoolYear}:
                </p>
              </div>

              {/* Interactive Toggle Switch (DepEd Navy Blue #002060) */}
              <div className="flex items-center gap-3 bg-white p-2 border border-slate-300 self-start sm:self-auto shadow-xs">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Select Electives:
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableElectives}
                  onClick={() => {
                    const next = !enableElectives;
                    setEnableElectives(next);
                    if (!next) {
                      setFormData((prev) => ({ ...prev, selectedElectives: [] }));
                    }
                  }}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none border-2 ${
                    enableElectives
                      ? "bg-[#002060] border-[#002060]"
                      : "bg-slate-200 border-slate-400"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform bg-white transition duration-200 ease-in-out mt-0.5 ${
                      enableElectives ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-mono font-bold uppercase px-2 py-0.5 ${
                    enableElectives
                      ? "bg-[#002060] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {enableElectives ? "ON" : "OFF"}
                </span>
              </div>
            </div>

            {/* CONDITIONAL CONTENT BASED ON SWITCH */}
            {!enableElectives ? (
              <div className="p-4 bg-white border border-slate-300 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block shrink-0" />
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                    [ STANDARD STRAND CURRICULUM ACTIVE: NO ADDITIONAL ELECTIVES ]
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Elective selection is switched OFF. The learner will only be enrolled in the standard mandatory core and specialized subjects for Grade {targetGrade} ({isJHS ? currentJhsProgram : currentStrand}). No cross-strand subjects added.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600">
                  <span className="font-medium">
                    Available elective subjects for {semester} (Filtered to exclude previously completed subjects and native strand subjects):
                  </span>
                  <span className="font-mono font-bold text-[#002060] bg-white px-2 py-0.5 border border-slate-300 w-fit">
                    SELECTED: {currentElectives.length} SUBJECT(S)
                  </span>
                </div>

                {eligibleElectives.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {eligibleElectives.map((elec) => {
                      const isSelected = currentElectives.includes(elec.code);
                      return (
                        <label
                          key={elec.code}
                          className={`p-4 border-2 flex items-start gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-white border-[#002060] shadow-xs"
                              : "bg-white border-slate-300 hover:border-slate-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleElectiveToggle(elec.code)}
                            className="accent-[#002060] mt-1"
                          />
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold ${isSelected ? "text-[#002060]" : "text-slate-900"}`}>
                                {elec.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200">
                                {elec.category}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-[#002060] border border-blue-200">
                                Term {elec.terms?.join(", ") || "All"}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed">
                              {elec.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-300 space-y-1">
                    <span className="text-xs font-mono font-bold text-slate-600 uppercase block">
                      [ NO ADDITIONAL ELECTIVES AVAILABLE FOR THIS TERM ]
                    </span>
                    <p className="text-xs text-slate-500">
                      All cross-strand electives for this term have either been completed in previous terms or are already part of your required strand curriculum ({currentStrand}).
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 8: Distance Learning Modalities */}
          <div className="space-y-4 p-5 bg-slate-50 border-2 border-slate-300">
            <div className="border-b-2 border-slate-200 pb-2">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                [ Section 8: Preferred Distance Learning Modalities ]
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                DepEd Contingency Standard: Select alternative learning delivery modes during severe weather or class suspensions:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {DISTANCE_LEARNING_MODALITIES.map((modality) => {
                const isChecked = currentModalities.includes(modality);
                return (
                  <label
                    key={modality}
                    className={`p-3 border-2 flex items-start gap-3 cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-white border-[#002060] shadow-xs"
                        : "bg-white border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleModalityToggle(modality)}
                      className="accent-[#002060] mt-0.5"
                    />
                    <div className="text-xs">
                      <div className={`font-bold ${isChecked ? "text-[#002060]" : "text-slate-800"}`}>
                        {modality}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.preferredModalities && (
              <p className="text-[11px] font-bold text-red-700">{errors.preferredModalities}</p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-end pt-4 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={handleProceedToStep2}
              className="w-full sm:w-auto px-8 py-3 bg-[#002060] hover:bg-blue-950 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              Proceed to Review &amp; Confirmation (Step 2) &rarr;
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 2: REVIEW & CONFIRMATION
          ===================================================================== */}
      {currentStep === 2 && (
        <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-6 font-sans">
          <div className="border-b-2 border-slate-200 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#002060]">
              STEP 02 OF 02 &bull; FINAL REVIEW &amp; SUBMISSION
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Review Term Registration Details
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Please double check your elective choices and academic placement for {semester}, S.Y. {schoolYear} before completing official submission.
            </p>
          </div>

          {/* Comprehensive Review Card */}
          <div className="border border-slate-300 bg-slate-50 divide-y divide-slate-200 text-xs">
            <div className="p-3 bg-slate-100 font-bold text-slate-800 uppercase tracking-wide flex justify-between items-center">
              <span>Term Enrollment Summary</span>
              <span className="font-mono text-[#002060]">S.Y. {schoolYear} &bull; {semester}</span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block">Learner Full Name:</span>
                <strong className="text-slate-900 text-sm">
                  {formData.lastName}, {formData.firstName} {formData.middleName || ""}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">DepEd Learner Reference Number:</span>
                <strong className="text-slate-900 font-mono text-sm">{formData.lrn}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Curricular Designation:</span>
                <strong className="text-slate-900">
                  Grade {targetGrade} &bull; {isJHS ? (currentJhsProgram === "SPS" ? "Special Program in Sports (General SPS)" : "Regular Basic Education") : `${currentTrack} (${currentStrand})`}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Selected Distance Learning Modalities:</span>
                <strong className="text-slate-900">
                  {currentModalities.join(", ")}
                </strong>
              </div>
            </div>

            {/* Selected Elective Subjects */}
            <div className="p-4 space-y-2">
              <span className="font-bold text-slate-700 uppercase block">
                Selected Elective Subjects:
              </span>
              {currentElectives.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentElectives.map((code) => {
                    const elec = DEPED_ELECTIVES.find((e) => e.code === code);
                    return (
                      <div
                        key={code}
                        className="p-2.5 bg-white border border-slate-300 flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-900 text-xs">
                          {elec?.name || code}
                        </span>
                        <span className="font-mono text-[10px] bg-blue-100 text-[#002060] px-1.5 py-0.5">
                          {elec?.category || "Elective"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 italic">No specific electives selected.</p>
              )}
            </div>

            {/* Inherited Verified Documents */}
            <div className="p-4 space-y-1">
              <span className="font-bold text-slate-700 uppercase block">
                Inherited Documentary Requirements on File:
              </span>
              <p className="text-slate-600 text-[11px]">
                Under DepEd continuing enrollment policy, official documents submitted during your approved enrollment (Ref: {priorApprovedApp.application_id}) are active and automatically attached:
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                <span className="px-2.5 py-0.5 bg-white border border-emerald-400 text-emerald-900 font-mono font-bold">
                  [ATTACHED] PSA Birth Certificate
                </span>
                <span className="px-2.5 py-0.5 bg-white border border-emerald-400 text-emerald-900 font-mono font-bold">
                  [ATTACHED] SF9 / Form 138 Progress Report Card
                </span>
                <span className="px-2.5 py-0.5 bg-white border border-emerald-400 text-emerald-900 font-mono font-bold">
                  [ATTACHED] Formal 2x2 ID Photo
                </span>
              </div>
            </div>
          </div>

          {/* Legal Certification Checkbox */}
          <div className="p-4 bg-slate-50 border-2 border-slate-300 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-800">
              <input
                type="checkbox"
                checked={formData.dataPrivacyAccepted}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dataPrivacyAccepted: e.target.checked }))
                }
                className="accent-[#002060] mt-0.5"
              />
              <span className="leading-relaxed">
                <strong>Data Privacy Act of 2012 Certification:</strong> I hereby certify that the elective preferences and curricular designations provided in this continuing enrollment submission are true, accurate, and correct. I authorize Dumalneg National High School to utilize my official learner credentials on file for School Year {schoolYear} ({semester}) registration and sectioning.
              </span>
            </label>
            {errors.dataPrivacy && (
              <p className="text-[11px] font-bold text-red-700">{errors.dataPrivacy}</p>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="w-full sm:w-auto px-6 py-2.5 bg-white border-2 border-slate-400 text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-100 transition-colors"
            >
              &larr; Back to Electives Selection (Step 1)
            </button>
            <button
              type="button"
              onClick={handleSubmitEnrollment}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 bg-[#002060] hover:bg-blue-950 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting
                ? "Submitting Term Enrollment..."
                : `[ Submit Term Enrollment for ${semester} ]`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
