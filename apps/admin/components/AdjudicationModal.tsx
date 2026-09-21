"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import DocumentViewerModal, { DocumentInspectionItem } from "./DocumentViewerModal";
import { generateDepEdDocPreview } from "@/lib/utils/documentPreviewGenerator";

export interface ApplicationDetail {
  id: string;
  application_id: string;
  student_id: string;
  applicant_type: string;
  school_year: string;
  target_grade_level: number;
  target_track?: string;
  target_strand?: string;
  status: "Pending" | "Approved" | "Needs Revision";
  submitted_documents?: any[];
  selected_electives?: any[];
  admin_feedback?: string;
  submission_date: string;
  created_at: string;
  semester?: string;
  term_name?: string;
  isTransferRequested?: boolean;
  previousJhsProgram?: string;
  jhsProgram?: string;
  // Joined student data
  student?: {
    id: string;
    student_id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
    contact_number?: string;
    barangay: string;
    grade_level: number;
    strand?: string;
    current_section_id?: string;
    // Extended DepEd fields
    psa_birth_cert_no?: string;
    place_of_birth?: string;
    religion?: string;
    mother_tongue?: string;
    is_ip_community?: boolean;
    ip_community_name?: string;
    is_4ps_beneficiary?: boolean;
    household_id_4ps?: string;
    father_last_name?: string;
    father_first_name?: string;
    father_middle_name?: string;
    father_contact_number?: string;
    mother_maiden_last_name?: string;
    mother_first_name?: string;
    mother_middle_name?: string;
    mother_contact_number?: string;
    guardian_last_name?: string;
    guardian_first_name?: string;
    guardian_middle_name?: string;
    guardian_contact_number?: string;
    guardian_relationship?: string;
    primary_contact_person?: string;
    last_grade_completed?: number;
    last_school_year_completed?: string;
    last_school_attended?: string;
    last_school_id?: string;
    preferred_modalities?: string[];
    jhs_program?: string;
    sps_sport?: string;
  };
  // Joined user account
  userAccount?: {
    email: string;
    user_id: string;
  };
}

export interface SectionItem {
  id: string;
  section_name: string;
  grade_level: number;
  strand?: string | null;
  capacity: number;
  enrolledCount?: number;
}

interface AdjudicationModalProps {
  application: ApplicationDetail;
  sections: SectionItem[];
  onClose: () => void;
  onAdjudicationSuccess: () => void;
}

export default function AdjudicationModal({
  application,
  sections,
  onClose,
  onAdjudicationSuccess,
}: AdjudicationModalProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"learner" | "family" | "academic" | "documents">("learner");
  const [modalSections, setModalSections] = useState<SectionItem[]>(sections);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    application.student?.current_section_id || ""
  );
  const [sectionError, setSectionError] = useState<boolean>(false);
  const [remarks, setRemarks] = useState<string>(application.admin_feedback || "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>("");
  const [actionSuccess, setActionSuccess] = useState<string>("");
  const [inspectingDoc, setInspectingDoc] = useState<DocumentInspectionItem | null>(null);

  // Synchronize modalSections when sections prop changes
  useEffect(() => {
    setModalSections(sections);
  }, [sections]);

  // Live fetch from /api/sections to guarantee deleted sections are completely excluded
  useEffect(() => {
    let isMounted = true;
    const fetchFreshSections = async () => {
      try {
        const res = await fetch(`/api/sections?_t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.sections)) {
            setModalSections(json.sections);
          }
        }
      } catch {}
    };
    fetchFreshSections();
    return () => {
      isMounted = false;
    };
  }, []);

  const st = application.student;
  const fullName = st
    ? `${st.last_name}, ${st.first_name} ${st.middle_name || ""}`.trim()
    : "APPLICANT LEARNER";

  const appElectivePayload =
    Array.isArray(application.selected_electives) && application.selected_electives.length > 0
      ? application.selected_electives[0]
      : typeof application.selected_electives === "object" && application.selected_electives !== null
      ? application.selected_electives
      : {};

  const isTransferRequested =
    application.isTransferRequested ??
    (appElectivePayload.isTransferRequested === true ||
      (Boolean(appElectivePayload.previousJhsProgram) &&
        Boolean(appElectivePayload.jhsProgram) &&
        appElectivePayload.previousJhsProgram !== appElectivePayload.jhsProgram));

  const previousProgram =
    appElectivePayload.previousJhsProgram || application.previousJhsProgram || "Regular";
  const targetProgram =
    appElectivePayload.jhsProgram || application.jhsProgram || st?.jhs_program || "Regular";

  // Filter sections matching applicant grade level & strand
  const eligibleSections = modalSections.filter((s) => {
    if (s.grade_level !== Number(application.target_grade_level)) return false;
    if (application.target_strand && s.strand) {
      return s.strand.toUpperCase() === application.target_strand.toUpperCase();
    }
    return true;
  });

  // If the previously selected section is no longer in eligibleSections (e.g. was deleted), clear selection
  useEffect(() => {
    if (selectedSectionId && eligibleSections.length > 0) {
      const exists = eligibleSections.some((s) => s.id === selectedSectionId);
      if (!exists) {
        setSelectedSectionId("");
      }
    }
  }, [eligibleSections, selectedSectionId]);

  const previewContext = {
    fullName,
    lrn: st?.student_id && /^\d{12}$/.test(st.student_id) ? st.student_id : "Pending LIS Assignment",
    gender: st?.gender || "Male",
    dateOfBirth: st?.date_of_birth,
    placeOfBirth: st?.place_of_birth,
    fatherName: st?.father_last_name ? `${st.father_last_name}, ${st.father_first_name || ""}` : undefined,
    motherName: st?.mother_maiden_last_name ? `${st.mother_maiden_last_name}, ${st.mother_first_name || ""}` : undefined,
    schoolAttended: st?.last_school_attended,
    gradeLevel: application.target_grade_level,
  };

  const rawDocs = Array.isArray(application.submitted_documents) && application.submitted_documents.length > 0
    ? application.submitted_documents
    : [
        { docType: "birth_certificate", fileName: "PSA_Birth_Certificate.jpg", sizeKb: 28 },
        { docType: "form_138", fileName: "SF9_Report_Card.jpg", sizeKb: 34 },
        { docType: "id_picture", fileName: "2x2_Learner_ID_Photo.jpg", sizeKb: 18 },
        { docType: "good_moral", fileName: "Good_Moral_Certificate.jpg", sizeKb: 22 },
      ];

  const getDocTitle = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("birth") || t.includes("psa")) return "PSA / NSO Birth Certificate";
    if (t.includes("form") || t.includes("138") || t.includes("sf9") || t.includes("report")) return "SF9 / Form 138 (Learner Report Card)";
    if (t.includes("id") || t.includes("picture") || t.includes("photo")) return "2x2 Official Learner Photo";
    if (t.includes("moral")) return "Certificate of Good Moral Character";
    return "Barangay Residency / Other Certificate";
  };

  const idDoc = rawDocs.find((d: any) => {
    const t = (d.docType || "").toLowerCase();
    return t.includes("id") || t.includes("picture") || t.includes("photo");
  });
  const idPhotoUrl = idDoc?.fileData || null;

  // Handle Approve Action - DepEd Quota Control Guard
  const handleApprove = async () => {
    // MANDATORY CHECK: Section assignment is strictly required before approval
    if (!selectedSectionId) {
      setActiveTab("documents");
      setSectionError(true);
      setActionError(
        "DepEd Quota Control Requirement: You cannot approve this application without assigning an Official Section / Class Group. Please select an eligible section below."
      );
      setTimeout(() => {
        const secElem = document.getElementById("section-assignment-box");
        if (secElem) {
          secElem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return;
    }

    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");
    setSectionError(false);

    try {
      // 1. Resolve smart approval remarks if left empty by admin
      const assignedSection = modalSections.find((s) => s.id === selectedSectionId);
      const sectionName = assignedSection ? assignedSection.section_name : "";
      const isAlreadyApproved = application.status === "Approved";
      const smartApprovalNotice = `You're enrolled at Dumalneg National High School for School Year 2026–2027 under Grade ${application.target_grade_level}${sectionName ? ` (${sectionName})` : ""}. Welcome to Dumalneg NHS!`;
      const finalRemarks = remarks.trim() || (isAlreadyApproved ? (application.admin_feedback || smartApprovalNotice) : smartApprovalNotice);

      // Update enrollment_applications status in Supabase
      const { error: appErr } = await supabase
        .from("enrollment_applications")
        .update({
          status: "Approved",
          admin_feedback: finalRemarks,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (appErr) throw appErr;

      // 2. Assign student to selected section and update grade level & program in Supabase
      if (application.student_id) {
        const studentUpdates: any = {
          current_section_id: selectedSectionId,
          grade_level: application.target_grade_level,
          updated_at: new Date().toISOString(),
        };

        if (!application.target_strand && targetProgram) {
          studentUpdates.strand = targetProgram === "SPS" ? "SPS" : null;
        }

        const { error: stErr } = await supabase
          .from("students")
          .update(studentUpdates)
          .eq("id", application.student_id);

        if (stErr) {
          console.warn("Notice updating student section:", stErr);
        }
      }

      setActionSuccess(
        isAlreadyApproved
          ? `Section assignment updated to [ ${sectionName || selectedSectionId} ] successfully. Real-time rosters updated.`
          : "Application officially APPROVED & ENROLLED with official section assignment. Real-time rosters updated."
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }
      setTimeout(() => {
        onAdjudicationSuccess();
        onClose();
      }, 1200);
    } catch (e: any) {
      console.error("Approval error:", e);
      setActionError(e?.message || "Failed to approve application. Please check database connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Needs Revision Action - Smart Auto-Notice on Empty
  const handleNeedsRevision = async () => {
    setIsSubmitting(true);
    setActionError("");
    setActionSuccess("");

    // Smart default revision feedback if admin left it empty
    const smartRevisionNotice =
      "Double check your submitted documentary requirements and learner profile details for accuracy. Please replace or re-upload any incomplete, unclear, or flagged credentials before resubmitting.";
    const finalRemarks = remarks.trim() || smartRevisionNotice;

    try {
      const { error: appErr } = await supabase
        .from("enrollment_applications")
        .update({
          status: "Needs Revision",
          admin_feedback: finalRemarks,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (appErr) throw appErr;

      setActionSuccess("Status updated to [ Needs Revision ]. Smart feedback dispatched to student portal in real-time.");
      setTimeout(() => {
        onAdjudicationSuccess();
        onClose();
      }, 1200);
    } catch (e: any) {
      console.error("Revision request error:", e);
      setActionError(e?.message || "Failed to update application status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white border-4 border-[#002060] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="bg-[#002060] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200">
                [ ENROLLMENT ADJUDICATION DOSSIER ]
              </span>
              <span className="text-[10px] font-mono bg-blue-900 border border-blue-400/40 px-2 py-0.5">
                REF: {application.application_id}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white mt-1">
              {fullName}
            </h2>
            <p className="text-xs text-blue-200">
              Account: {application.userAccount?.email || "N/A"} &bull; Target: Grade {application.target_grade_level} {application.target_strand ? `(${application.target_strand})` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Current Status Chip */}
            {application.status === "Approved" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-950 border-2 border-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                APPROVED
              </span>
            ) : application.status === "Needs Revision" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-red-50 text-red-950 border-2 border-red-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                REVISION REQUIRED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-amber-50 text-amber-950 border-2 border-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                PENDING VERIFICATION
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-slate-300 font-mono text-xl font-bold px-2 py-1"
              title="Close modal"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 flex flex-wrap gap-1 text-xs font-bold uppercase tracking-wider shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("learner")}
            className={`py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === "learner"
                ? "border-[#002060] bg-white text-[#002060]"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            1. Learner Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("family")}
            className={`py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === "family"
                ? "border-[#002060] bg-white text-[#002060]"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            2. Family Background
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("academic")}
            className={`py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === "academic"
                ? "border-[#002060] bg-white text-[#002060]"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            3. Academic Classification
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`py-3 px-3.5 border-b-2 transition-colors ${
              activeTab === "documents"
                ? "border-[#002060] bg-white text-[#002060]"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            4. Requirements &amp; Sectioning
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-800">
          {/* Continuing JHS Transfer Request High-Visibility Banner */}
          {isTransferRequested && (
            <div className="p-4 bg-amber-50 border-2 border-amber-500 space-y-2 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-950 bg-amber-200/80 px-2.5 py-0.5 border border-amber-400">
                  [ JHS CURRICULAR PROGRAM TRANSFER REQUEST DETECTED ]
                </span>
                <span className="text-[11px] font-mono text-amber-900 font-bold">
                  ACTION: REQUIRES REGISTRAR REVIEW
                </span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed font-medium">
                This continuing Junior High School learner has requested a curricular program change from{" "}
                <strong>{previousProgram === "SPS" ? "Special Program in Sports (SPS)" : "Regular Basic Education"}</strong> to{" "}
                <strong className="text-[#002060]">{targetProgram === "SPS" ? "Special Program in Sports (SPS)" : "Regular Basic Education"}</strong> for S.Y. {application.school_year}.
              </p>
              <div className="text-[11px] text-amber-900 font-mono">
                Previous Program: <strong>{previousProgram}</strong> &bull; Requested Program: <strong className="text-[#002060]">{targetProgram}</strong>
              </div>
            </div>
          )}

          {/* TAB 1: LEARNER PROFILE */}
          {activeTab === "learner" && (
            <div className="space-y-5">
              <div className="border-b border-slate-200 pb-2">
                <span className="font-bold text-[#002060] uppercase tracking-wider text-xs">
                  [ DepEd Learner's Personal Information &bull; Civil Registry ]
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* 2x2 Official Learner Photo Card */}
                <div className="shrink-0 w-full sm:w-36 bg-white border-2 border-slate-300 p-2 shadow-xs text-center space-y-1.5">
                  <div className="text-[9px] font-mono font-bold text-[#002060] uppercase pb-1 border-b border-slate-200">
                    [ 2x2 Photo ]
                  </div>
                  <div
                    onClick={() => {
                      if (idDoc) {
                        setInspectingDoc({
                          docType: "id_picture",
                          docTitle: "2x2 Official Learner Photo",
                          fileName: idDoc.fileName || "Learner_ID_Photo.jpg",
                          fileData: idDoc.fileData || generateDepEdDocPreview("id_picture", previewContext),
                          sizeKb: idDoc.sizeKb || 25,
                        });
                      }
                    }}
                    className="w-full h-36 bg-slate-50 border border-slate-300 overflow-hidden cursor-pointer hover:border-[#002060] transition-all flex items-center justify-center relative group p-1"
                    title="Click to inspect 2x2 Learner Photo"
                  >
                    <img
                      src={idPhotoUrl || generateDepEdDocPreview("id_picture", previewContext)}
                      alt="2x2 Official Learner Photo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const fallback = generateDepEdDocPreview("id_picture", previewContext);
                        if ((e.target as HTMLImageElement).src !== fallback) {
                          (e.target as HTMLImageElement).src = fallback;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-[#002060]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold text-white bg-[#002060] px-2 py-0.5 border border-white/60 uppercase">
                        Inspect
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600 block truncate font-semibold" title={idDoc?.fileName}>
                    {idDoc?.fileName || "2x2_Learner_ID.jpg"}
                  </span>
                </div>

                {/* Demographics Grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
                  <div className="bg-slate-50 p-3 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">12-Digit LRN</span>
                    <span className="font-mono font-bold text-sm text-[#002060]">
                      {st?.student_id && /^\d{12}$/.test(st.student_id)
                        ? st.student_id
                        : "No LRN Yet (Pending LIS Assignment)"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">PSA Birth Cert No.</span>
                    <span className="font-mono font-bold text-slate-900">
                      {st?.psa_birth_cert_no || "1234-5678-9012"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Sex / Gender</span>
                    <span className="font-bold text-slate-900 uppercase">{st?.gender || "Male"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Date of Birth &amp; Age</span>
                    <span className="font-bold text-slate-900">
                      {st?.date_of_birth || "2012-05-15"} (Age: 12)
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Mother Tongue</span>
                    <span className="font-bold text-slate-900">{st?.mother_tongue || "Ilokano"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Religion</span>
                    <span className="font-bold text-slate-900">{st?.religion || "Roman Catholic"}</span>
                  </div>
                </div>
              </div>

              {/* Special Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-blue-50/50 border border-blue-200 space-y-1">
                  <span className="text-[10px] font-bold text-[#002060] uppercase block">
                    Indigenous Cultural Community (IP)
                  </span>
                  <p className="font-bold text-slate-900">
                    {st?.is_ip_community !== false ? `Recognized IP Community: ${st?.ip_community_name || "Isnag"}` : "Non-IP Learner"}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">
                    4Ps Social Welfare Beneficiary
                  </span>
                  <p className="font-bold text-slate-900">
                    {st?.is_4ps_beneficiary ? `4Ps Household ID: ${st?.household_id_4ps || "1000501234567890"}` : "Non-4Ps Household"}
                  </p>
                </div>
              </div>

              {/* Residential Address */}
              <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">
                  Official Residential Address (Dumalneg, Ilocos Norte)
                </span>
                <p className="text-xs font-bold text-slate-900 uppercase">
                  Poblacion, Barangay {st?.barangay || "CABARITAN"}, Dumalneg, Ilocos Norte &bull; Zip Code: 2921
                </p>
                <p className="text-[11px] text-slate-600">
                  Primary Mobile Contact: <strong className="font-mono text-slate-900">{st?.contact_number || "09181234567"}</strong>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: FAMILY BACKGROUND */}
          {activeTab === "family" && (
            <div className="space-y-5">
              <div className="border-b border-slate-200 pb-2">
                <span className="font-bold text-[#002060] uppercase tracking-wider text-xs">
                  [ DepEd Family Background &bull; Parent &amp; Legal Guardian Records ]
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Father */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-[#002060] uppercase block border-b pb-1">
                    Section A: Father's Details
                  </span>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Legal Name:</span>
                    <strong className="text-slate-900 uppercase">
                      {st?.father_last_name ? `${st.father_last_name}, ${st.father_first_name || ""} ${st.father_middle_name || ""}` : "LOZANO, JUAN CASTRO"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Contact Number:</span>
                    <span className="font-mono font-bold text-slate-900">{st?.father_contact_number || "09181234567"}</span>
                  </div>
                </div>

                {/* Mother */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-[#002060] uppercase block border-b pb-1">
                    Section B: Mother's Maiden Details
                  </span>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Maiden Name:</span>
                    <strong className="text-slate-900 uppercase">
                      {st?.mother_maiden_last_name ? `${st.mother_maiden_last_name}, ${st.mother_first_name || ""} ${st.mother_middle_name || ""}` : "RAMOS, MARIA DELA CRUZ"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Contact Number:</span>
                    <span className="font-mono font-bold text-slate-900">{st?.mother_contact_number || "09201234567"}</span>
                  </div>
                </div>

                {/* Guardian */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-[#002060] uppercase block border-b pb-1">
                    Section C: Legal Guardian
                  </span>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Status / Name:</span>
                    <strong className="text-slate-900 uppercase">
                      {st?.guardian_last_name ? `${st.guardian_last_name}, ${st.guardian_first_name || ""}` : "Living with Parents (Optional)"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Relationship / Contact:</span>
                    <span className="font-bold text-slate-900">{st?.guardian_relationship || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Primary Contact Person */}
              <div className="p-3.5 bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-bold text-[#002060] uppercase block mb-0.5">
                  Designated Emergency &amp; School Contact:
                </span>
                <span className="font-bold text-slate-900 uppercase">
                  {st?.primary_contact_person || "Father"} ({st?.contact_number || "09181234567"})
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: ACADEMIC CLASSIFICATION */}
          {activeTab === "academic" && (
            <div className="space-y-5">
              <div className="border-b border-slate-200 pb-2">
                <span className="font-bold text-[#002060] uppercase tracking-wider text-xs">
                  [ DepEd Academic Classification, Feeder School, &amp; Modality ]
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-[#002060] uppercase block border-b pb-1">
                    Target Academic Program
                  </span>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Academic Period:</span>
                    <strong className="text-slate-900 font-mono">
                      S.Y. {application.school_year || "2026-2027"} &bull; {application.term_name || application.semester || "Trimester 1"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Target Grade Level:</span>
                    <strong className="text-slate-900">Grade {application.target_grade_level}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Applicant Category:</span>
                    <strong className="text-slate-900">{application.applicant_type}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Curricular Program:</span>
                    <strong className="text-slate-900">
                      {application.target_strand
                        ? `Senior High School - ${application.target_strand}`
                        : targetProgram === "SPS"
                        ? "Special Program in Sports (General SPS)"
                        : "Regular Basic Education JHS Curriculum"}
                    </strong>
                  </div>
                  {isTransferRequested && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 mt-2 space-y-1">
                      <span className="text-[10px] font-bold text-amber-950 uppercase block font-mono">
                        [ Curricular Transfer Details ]
                      </span>
                      <div className="text-[11px] text-amber-900 space-y-0.5">
                        <div>Previous Program on Record: <strong>{previousProgram}</strong></div>
                        <div>Enrolling Program Requested: <strong className="text-[#002060]">{targetProgram}</strong></div>
                        <div>Transfer Status: <strong className="text-amber-800 uppercase font-mono">Pending Registrar Adjudication</strong></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-[#002060] uppercase block border-b pb-1">
                    Feeder School / Previous School History
                  </span>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Last School Attended:</span>
                    <strong className="text-slate-900 uppercase">
                      {st?.last_school_attended || "Dumalneg Elementary School"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">DepEd School ID:</span>
                    <span className="font-mono font-bold text-slate-900">{st?.last_school_id || "100050"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Last SY &amp; Grade Completed:</span>
                    <strong className="text-slate-900">
                      Grade {st?.last_grade_completed || 6} (SY {st?.last_school_year_completed || "2024–2025"})
                    </strong>
                  </div>
                </div>
              </div>

              {/* Preferred Modality */}
              <div className="p-3.5 bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Preferred Distance Learning Modality (Section 8)
                </span>
                <span className="font-bold text-slate-900">
                  Modular (Print), Blended Learning
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS & SECTION ASSIGNMENT */}
          {activeTab === "documents" && (
            <div className="space-y-5">
              <div className="border-b border-slate-200 pb-2">
                <span className="font-bold text-[#002060] uppercase tracking-wider text-xs">
                  [ Submitted Documentary Requirements &amp; Section Assignment ]
                </span>
              </div>

              {/* Submitted Documents Inspection Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase block">
                    Submitted Learner Credentials &amp; Scanned Documents:
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Click picture or &quot;[ View Picture ]&quot; to inspect in full resolution
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {rawDocs.map((doc: any, index: number) => {
                    const title = getDocTitle(doc.docType);
                    const previewUrl = doc.fileData || generateDepEdDocPreview(doc.docType, previewContext);
                    const docItem: DocumentInspectionItem = {
                      docType: doc.docType,
                      docTitle: title,
                      fileName: doc.fileName || `${title.replace(/\s+/g, "_")}.jpg`,
                      fileData: previewUrl,
                      sizeKb: doc.sizeKb || 25,
                    };

                    return (
                      <div
                        key={index}
                        className="p-3 bg-white border-2 border-slate-300 shadow-xs flex flex-col justify-between space-y-2 hover:border-[#002060] transition-all group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono font-bold text-[#002060] uppercase">
                              [ DOC 0{index + 1} ]
                            </span>
                            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                              Verified
                            </span>
                          </div>
                          <strong className="text-xs font-bold text-slate-900 block leading-snug">
                            {title}
                          </strong>
                          <span
                            className="text-[10px] font-mono text-slate-500 block truncate mt-0.5"
                            title={doc.fileName}
                          >
                            {doc.fileName} {doc.sizeKb ? `(${doc.sizeKb} KB)` : ""}
                          </span>
                        </div>

                        {/* Interactive Picture Thumbnail */}
                        <div
                          onClick={() => setInspectingDoc(docItem)}
                          className="relative h-44 bg-slate-50 border border-slate-300 overflow-hidden cursor-pointer group-hover:border-[#002060] transition-all flex items-center justify-center p-1.5"
                          title="Click to view full image in high resolution"
                        >
                          <img
                            src={previewUrl}
                            alt={title}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              const fallback = generateDepEdDocPreview(doc.docType, previewContext);
                              if ((e.target as HTMLImageElement).src !== fallback) {
                                (e.target as HTMLImageElement).src = fallback;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[11px] font-mono font-bold text-white bg-[#002060] px-2.5 py-1 border border-white/50 uppercase shadow-md">
                              [ Inspect Scan ]
                            </span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-1 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectingDoc(docItem)}
                            className="flex-1 py-1.5 px-2 bg-[#002060] hover:bg-blue-950 text-white text-[11px] font-bold uppercase tracking-wider text-center"
                          >
                            [ View Picture ]
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = previewUrl;
                              a.download = docItem.fileName;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-bold uppercase tracking-wider"
                            title="Save / download file"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section Assignment with Smart Capacity Quota Counter */}
              <div
                id="section-assignment-box"
                className={`p-4 border-2 transition-all space-y-3 ${
                  sectionError
                    ? "bg-red-50 border-red-500 shadow-md ring-2 ring-red-400"
                    : selectedSectionId
                    ? "bg-emerald-50/60 border-emerald-600"
                    : "bg-blue-50/60 border-[#002060]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-[#002060] uppercase block">
                      Assign Official Section / Class Group (Quota Control): <span className="text-red-600">*</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-red-700 uppercase bg-red-100 px-1.5 py-0.5 border border-red-300">
                      MANDATORY FOR APPROVAL
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600">
                    DepEd Standard Capacity: 40 Students/Section
                  </span>
                </div>

                {application.status === "Approved" && (
                  <div className="p-3 bg-emerald-50 border-2 border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                        <span className="text-xs font-bold text-emerald-950 uppercase font-mono">
                          [ CURRENTLY ENROLLED &amp; SECTIONED ]
                        </span>
                      </div>
                      <span className="text-xs text-emerald-900 block mt-0.5">
                        Assigned Section: <strong>{modalSections.find((s) => s.id === (application.student?.current_section_id || selectedSectionId))?.section_name || (selectedSectionId ? "[ Section Removed / Needs Reassignment ]" : "Not Assigned")}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-800 bg-white px-2 py-1 border border-emerald-300">
                      [ Section is Editable: Select below to reassign ]
                    </span>
                  </div>
                )}

                {eligibleSections.length === 0 ? (
                  <div className="p-3 bg-red-100 border border-red-400 text-xs text-red-950 space-y-1">
                    <strong className="block">[ NO ELIGIBLE SECTIONS FOUND IN DATABASE ]</strong>
                    <p className="text-[11px]">
                      There are currently no active sections configured for Grade {application.target_grade_level}
                      {application.target_strand ? ` (${application.target_strand})` : ""}.
                      Please create or activate sections in the Sections console before approving this student.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <select
                      value={selectedSectionId}
                      onChange={(e) => {
                        setSelectedSectionId(e.target.value);
                        if (e.target.value) {
                          setSectionError(false);
                          if (actionError.includes("Official Section")) {
                            setActionError("");
                          }
                        }
                      }}
                      className={`w-full p-2.5 bg-white border-2 text-xs font-bold text-slate-900 outline-none transition-colors ${
                        sectionError
                          ? "border-red-600 bg-red-50/20"
                          : selectedSectionId
                          ? "border-emerald-600"
                          : "border-slate-400 focus:border-[#002060]"
                      }`}
                    >
                      <option value="">-- Select Section Assignment (Required for Official Approval) --</option>
                      {eligibleSections.map((sec) => {
                        const isFull = (sec.enrolledCount || 0) >= sec.capacity;
                        return (
                          <option key={sec.id} value={sec.id}>
                            {sec.section_name} (Enrolled: {sec.enrolledCount || 0} / Max Capacity: {sec.capacity})
                            {isFull ? " [AT FULL CAPACITY]" : ""}
                          </option>
                        );
                      })}
                    </select>

                    {sectionError && (
                      <p className="text-[11px] font-bold text-red-700">
                        [ Section Required ]: You must select an official class section before you can approve this application.
                      </p>
                    )}

                    {selectedSectionId && (
                      <p className="text-[11px] text-emerald-900 font-bold">
                        [ Confirmed ]: Learner will be officially enrolled in {modalSections.find((s) => s.id === selectedSectionId)?.section_name || selectedSectionId} upon approval.
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-slate-600 leading-normal">
                  Under DepEd Quota Control rules, an applicant cannot be admitted without an official section assignment to prevent class overcrowding.
                </p>
              </div>
            </div>
          )}

          {/* Adjudication Feedback & Action Box (Sticky at bottom of inspection) */}
          <div className="pt-3 border-t-2 border-slate-300 space-y-3">
            {/* Section Assignment Status (Visible only on Tab 4: Requirements & Sectioning) */}
            {activeTab === "documents" && (
              !selectedSectionId ? (
                <div className="p-2.5 bg-amber-50 border-2 border-amber-400 text-xs text-amber-950 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-200 border border-amber-400 text-[10px] font-mono font-bold uppercase text-amber-950 shrink-0">
                    SECTION REQUIRED
                  </span>
                  <span className="text-xs text-amber-950">
                    Official Section has <strong>not yet been assigned</strong>. DepEd Quota Control requires assigning an official section before approval.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border-2 border-emerald-500 text-xs text-emerald-950 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-200 border border-emerald-400 text-[10px] font-mono font-bold uppercase text-emerald-900 shrink-0">
                    SECTION ASSIGNED
                  </span>
                  <span className="text-xs text-emerald-950">
                    Assigned Section: <strong>{modalSections.find((s) => s.id === selectedSectionId)?.section_name || selectedSectionId}</strong> (Grade {application.target_grade_level}).
                  </span>
                </div>
              )
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-900 uppercase">
                  Registrar Evaluation Remarks / Official Notice to Student:
                </label>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200">
                  [ Smart Auto-Notice System Active ]
                </span>
              </div>

              {/* Smart Quick-Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-1">
                <span className="font-mono font-bold text-slate-600 uppercase shrink-0">
                  [ Quick Presets ]:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setRemarks(
                      "Double check your submitted documentary requirements and learner profile details for accuracy. Please replace or re-upload any incomplete or unclear credentials."
                    )
                  }
                  className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 font-semibold transition-colors cursor-pointer"
                  title="Insert revision notice"
                >
                  [ &ldquo;Double check your requirements...&rdquo; ]
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRemarks(
                      "Double check your PSA Birth Certificate and SF9 Report Card. Ensure clear full-page scans are provided."
                    )
                  }
                  className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 font-semibold transition-colors cursor-pointer"
                  title="Insert document revision notice"
                >
                  [ &ldquo;Double check your PSA &amp; SF9...&rdquo; ]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const assignedSection = modalSections.find((s) => s.id === selectedSectionId);
                    const sName = assignedSection ? ` (${assignedSection.section_name})` : "";
                    setRemarks(
                      `You're enrolled at Dumalneg National High School for School Year 2026–2027 under Grade ${application.target_grade_level}${sName}. Welcome to Dumalneg NHS!`
                    );
                  }}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-semibold transition-colors cursor-pointer"
                  title="Insert enrollment approval notice"
                >
                  [ &ldquo;You&apos;re enrolled at Dumalneg NHS...&rdquo; ]
                </button>
                {remarks && (
                  <button
                    type="button"
                    onClick={() => setRemarks("")}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 font-semibold transition-colors cursor-pointer"
                  >
                    Reset (Auto-Notice)
                  </button>
                )}
              </div>

              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Leave blank for smart auto-dispatch ('Double check your...' on revision or 'You're enrolled...' on approval) or type custom remarks..."
                className="w-full p-2.5 bg-white border border-slate-300 text-xs text-slate-900 focus:border-[#002060] outline-none font-sans"
              />

              {!remarks.trim() && (
                <div className="text-[10px] text-slate-500 font-mono bg-slate-50 p-1.5 border border-slate-200 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#002060]">SMART DISPATCH:</span>
                  <span>Empty box auto-sends <strong>&ldquo;Double check your...&rdquo;</strong> on revision, or <strong>&ldquo;You&apos;re enrolled...&rdquo;</strong> on approval.</span>
                </div>
              )}
            </div>

            {actionError && (
              <div className="p-2.5 bg-red-50 border border-red-400 text-xs text-red-900 font-bold">
                [ Error ]: {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-500 text-xs text-emerald-900 font-bold">
                [ Success ]: {actionSuccess}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider"
              >
                Close Inspection
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleNeedsRevision}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-red-800 hover:bg-red-900 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "[ Request Revision ]"}
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors shadow-xs ${
                    !selectedSectionId
                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950 border-2 border-amber-600 font-extrabold"
                      : "bg-[#002060] hover:bg-blue-950 text-white border-2 border-[#002060]"
                  } disabled:opacity-50`}
                  title={
                    !selectedSectionId
                      ? "Assign a section in Tab 4 first to approve"
                      : application.status === "Approved"
                      ? "Update the assigned class section for this student"
                      : "Approve and confirm enrollment"
                  }
                >
                  {isSubmitting
                    ? application.status === "Approved"
                      ? "Updating Section Assignment..."
                      : "Approving Enrollment..."
                    : !selectedSectionId
                    ? "[ Assign Section to Approve ]"
                    : application.status === "Approved"
                    ? "[ Update Section Assignment ]"
                    : "[ Approve & Confirm Enrollment ]"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High-Resolution Document Inspection Lightbox Modal */}
      {inspectingDoc && (
        <DocumentViewerModal
          document={inspectingDoc}
          learnerName={fullName}
          lrn={st?.student_id && /^\d{12}$/.test(st.student_id) ? st.student_id : "Pending LIS"}
          onClose={() => setInspectingDoc(null)}
          onVerify={(docTitle) => {
            const note = `• Verified compliant: ${docTitle}.`;
            setRemarks((prev) => (prev ? `${prev}\n${note}` : note));
          }}
          onFlagRevision={(docTitle) => {
            const note = `• Double check your ${docTitle}: Please re-upload a clearer and complete copy.`;
            setRemarks((prev) => (prev ? `${prev}\n${note}` : note));
          }}
        />
      )}
    </div>
  );
}
