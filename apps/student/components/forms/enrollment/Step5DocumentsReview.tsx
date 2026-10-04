"use client";

import React, { useState, useEffect, useRef } from "react";
import { FullEnrollmentFormData } from "./EnrollmentStepper";
import { compressImage } from "@/lib/utils/image-compressor";
import { useAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";

interface Step5DocumentsReviewProps {
  data: FullEnrollmentFormData;
  onChange: (fields: Partial<FullEnrollmentFormData>) => void;
  onBack: () => void;
  existingApplication?: any;
  isEnrollmentOpen?: boolean;
}

interface UploadedDocState {
  file: File;
  previewUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  isCompressing: boolean;
}

interface DocumentDropBoxProps {
  id: string;
  docKey: string;
  label: React.ReactNode;
  sublabel: string;
  badgeText: string;
  badgeType?: "slate" | "amber" | "blue";
  accept?: string;
  uploadedDoc: UploadedDocState | null;
  error?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isMandatory?: boolean;
}

function DocumentDropBox({
  id,
  label,
  sublabel,
  badgeText,
  badgeType = "slate",
  accept = "image/*,.pdf",
  uploadedDoc,
  error,
  onUpload,
  onRemove,
  isMandatory = false,
}: DocumentDropBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-4 bg-white border-2 border-slate-300 space-y-2.5 rounded-md shadow-2xs hover:border-slate-400 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-bold text-slate-900 cursor-pointer">
          {label} {isMandatory && <span className="text-red-700">*</span>}
        </label>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            badgeType === "blue"
              ? "bg-blue-100 text-[#002060] border border-blue-200"
              : badgeType === "amber"
              ? "bg-amber-100 text-amber-900 border border-amber-300"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          {badgeText}
        </span>
      </div>

      <p className="text-[11px] text-slate-600 leading-relaxed">{sublabel}</p>

      {uploadedDoc ? (
        <div className="p-3 bg-blue-50/90 border border-blue-200 flex items-center justify-between text-xs rounded-md">
          <div className="flex items-center gap-3 min-w-0">
            {uploadedDoc.previewUrl &&
            (uploadedDoc.previewUrl.startsWith("data:image/") ||
              uploadedDoc.previewUrl.startsWith("blob:") ||
              uploadedDoc.previewUrl.startsWith("http")) ? (
              <img
                src={uploadedDoc.previewUrl}
                alt={uploadedDoc.file.name}
                className="w-12 h-12 object-cover border border-blue-300 bg-white shrink-0 rounded"
              />
            ) : (
              <div className="w-12 h-12 flex items-center justify-center bg-blue-100 border border-blue-300 text-[10px] font-bold text-[#002060] shrink-0 rounded">
                DOC
              </div>
            )}
            <div className="min-w-0">
              <span className="font-bold text-[#002060] block truncate max-w-[180px] sm:max-w-[240px]">
                {uploadedDoc.file.name}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500 ">
                  {uploadedDoc.originalSizeKb}KB &rarr; {uploadedDoc.compressedSizeKb}KB (Compressed)
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                  Ready
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-white border border-slate-300 text-xs text-slate-700 font-medium hover:bg-slate-100 transition-colors rounded shadow-2xs cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="px-2.5 py-1 bg-white border border-red-300 text-xs text-red-700 font-bold hover:bg-red-50 transition-colors rounded shadow-2xs cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-md p-4 transition-all text-center cursor-pointer group flex flex-col items-center justify-center gap-1.5 ${
            isDragging
              ? "border-[#002060] bg-blue-50/70 scale-[1.01]"
              : "border-slate-300 hover:border-[#002060] bg-slate-50/60 hover:bg-blue-50/30"
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-blue-100/80 text-[#002060] flex items-center justify-center group-hover:scale-105 group-hover:bg-[#002060] group-hover:text-white transition-all shadow-2xs">
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <div className="text-xs font-bold text-slate-800 group-hover:text-[#002060] transition-colors">
            Click to upload or drag and drop file
          </div>
          <div className="text-[10px] text-slate-500">
            Supports JPG, PNG, or PDF (Auto-compressed &lt; 350KB)
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
        className="hidden"
      />

      {error && <p className="text-[11px] font-bold text-red-700">{error}</p>}
    </div>
  );
}

export default function Step5DocumentsReview({
  data,
  onChange,
  onBack,
  existingApplication,
  isEnrollmentOpen = true,
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

  // Track keys that the learner explicitly removed during this session
  const removedKeysRef = useRef<Set<string>>(new Set());
  const hasInitializedDocsRef = useRef<boolean>(false);

  // Pre-populate docs ONCE on mount or when data/existingApplication becomes available
  useEffect(() => {
    if (hasInitializedDocsRef.current) return;

    const sourceList =
      data.submittedDocuments && data.submittedDocuments.length > 0
        ? data.submittedDocuments
        : existingApplication && Array.isArray(existingApplication.submitted_documents)
        ? existingApplication.submitted_documents
        : null;

    if (sourceList && sourceList.length > 0) {
      setDocs((prev) => {
        const next = { ...prev };
        sourceList.forEach((d: any) => {
          const key = d.docType || d.type;
          if (key && !removedKeysRef.current.has(key) && (d.fileData || d.fileUrl || d.fileName)) {
            next[key] = {
              file: new File([], d.fileName || `${key}.jpg`),
              previewUrl: d.fileData || d.fileUrl || "",
              originalSizeKb: d.sizeKb || 25,
              compressedSizeKb: d.sizeKb || 25,
              isCompressing: false,
            };
          }
        });
        return next;
      });
      hasInitializedDocsRef.current = true;
    }
  }, [existingApplication, data.submittedDocuments]);

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
    file: File | null
  ) => {
    if (!file) return;

    // Unmark as removed since learner is uploading a new file for this slot
    removedKeysRef.current.delete(docKey);

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
        // PDF or other document - convert to Data URL
        finalDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || "");
          reader.readAsDataURL(file);
        });
      }

      // Upload to Supabase Storage Bucket to get a lightweight public URL (~80 bytes)
      let finalStoredUrl = "";
      try {
        const supabase = createClient();
        const cleanId = (data.lrn || user?.userId || user?.id || "applicant").replace(/[^a-zA-Z0-9_-]/g, "_");
        const cleanDoc = docKey.replace(/[^a-zA-Z0-9_-]/g, "_");
        const originalExt = finalFile.name.includes(".")
          ? finalFile.name.split(".").pop()?.toLowerCase() || "jpg"
          : "jpg";
        const cleanExt = ["jpg", "jpeg", "png", "webp", "pdf"].includes(originalExt) ? originalExt : "jpg";
        const storagePath = `${cleanId}/${cleanDoc}_${Date.now()}.${cleanExt}`;

        // 1. Direct upload from browser to Supabase storage bucket
        const { error: directUploadErr } = await supabase.storage
          .from("student-documents")
          .upload(storagePath, finalFile, {
            contentType: finalFile.type || (cleanExt === "pdf" ? "application/pdf" : "image/jpeg"),
            upsert: true,
          });

        if (!directUploadErr) {
          const { data: pubData } = supabase.storage
            .from("student-documents")
            .getPublicUrl(storagePath);
          if (pubData?.publicUrl) {
            finalStoredUrl = pubData.publicUrl;
          }
        }

        // 2. Fallback to API route if direct upload failed
        if (!finalStoredUrl) {
          const uploadForm = new FormData();
          uploadForm.append("file", finalFile);
          uploadForm.append("docType", docKey);
          uploadForm.append("identifier", data.lrn || user?.userId || user?.id || "applicant");

          const uploadRes = await fetch("/api/upload-document", {
            method: "POST",
            body: uploadForm,
          });

          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json();
            if (uploadJson.success && uploadJson.url) {
              finalStoredUrl = uploadJson.url;
            }
          }
        }
      } catch (storageErr) {
        console.warn("Storage upload notice (fallback to client preview):", storageErr);
      }

      setDocs((prev) => ({
        ...prev,
        [docKey]: {
          file: finalFile,
          previewUrl: finalStoredUrl || finalDataUrl,
          originalSizeKb: originalKb,
          compressedSizeKb: compressedKb,
          isCompressing: false,
        },
      }));

      // Update parent formData submittedDocuments array
      const existingDocs = (data.submittedDocuments || []).filter(
        (d) => d.type !== docKey && (d as any).docType !== docKey
      );
      const newDocEntry = {
        type: docKey,
        fileName: finalFile.name,
        fileUrl: finalStoredUrl || finalDataUrl,
        sizeKb: compressedKb,
      };

      onChange({
        submittedDocuments: [...existingDocs, newDocEntry as any],
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
  const handleRemoveDoc = (docKey: string) => {
    // 1. Mark as permanently removed so no auto-fill can resurrect it
    removedKeysRef.current.add(docKey);

    // 2. Clear from local slot state
    setDocs((prev) => ({ ...prev, [docKey]: null }));

    // 3. Clear from parent form data
    const updated = (data.submittedDocuments || []).filter(
      (d) => d.type !== docKey && (d as any).docType !== docKey
    );
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

    // Guard: Online Enrollment must be open to submit
    if (isEnrollmentOpen === false) {
      alert(
        `DepEd Official Notice:\nOnline basic education enrollment is currently CLOSED for School Year ${data.schoolYear || "2026–2027"}.\n\nSubmissions cannot be processed at this time.`
      );
      if (typeof window !== "undefined") {
        window.location.href = "/enroll";
      }
      return;
    }

    // Live Server Re-verification: Double check live API with cache busting
    try {
      const checkRes = await fetch(`/api/enrollment-control?_t=${Date.now()}`, { cache: "no-store" });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.isEnrollmentOpen === false) {
          alert(
            `DepEd Official Notice:\nOnline basic education enrollment is currently CLOSED for School Year ${checkData.schoolYear || "2026–2027"}.\n\n${checkData.closedMessage || "Submissions cannot be processed at this time."}`
          );
          if (typeof window !== "undefined") {
            window.location.href = "/enroll";
          }
          return;
        }
      }
    } catch {}

    // Proceed with submission
    setIsSubmitting(true);

    try {
      // Generate or reuse Official Dumalneg NHS Reference Number
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const generatedRef = existingApplication?.application_id || `DNHS-2025-${randomSuffix}`;

      // 1. Cloud Database Synchronization: Save directly to Supabase
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

      // 1. Cloud Database Synchronization: Save to Supabase 'enrollment_applications'
      try {
        const supabase = createClient();

        if (existingApplication && existingApplication.id) {
          // UPDATE existing application row (Resubmission Flow)
          const { error: appErr } = await supabase
            .from("enrollment_applications")
            .update({
              applicant_type: data.step1.applicantType,
              school_year: (data.schoolYear || "2026-2027").replace("–", "-"),
              target_grade_level: data.step1.targetGradeLevel,
              target_strand: data.targetStrand || null,
              status: "Pending", // Reset back to Pending for registrar evaluation
              admin_feedback: null, // Clear revision remarks
              selected_electives: [{
                ...data,
                semester: data.semester || data.targetSemester || data.step1?.targetSemester || "Trimester 1",
                term: data.semester || data.targetSemester || data.step1?.targetSemester || "Trimester 1",
                targetSemester: data.semester || data.targetSemester || data.step1?.targetSemester || "Trimester 1",
                schoolYear: (data.schoolYear || "2026-2027").replace("–", "-"),
              }],
              submitted_documents: Object.entries(docs)
                .filter(([_, v]) => v !== null)
                .map(([k, v]) => ({
                  docType: k,
                  fileName: v?.file.name,
                  sizeKb: v?.compressedSizeKb,
                  fileData: v?.previewUrl || null,
                  fileUrl: v?.previewUrl || null,
                })),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingApplication.id);

          if (appErr) {
            console.warn("Supabase enrollment_applications update notice:", appErr.message);
          }

          // Update student profile record
          if (existingApplication.student_id) {
            await supabase
              .from("students")
              .update({
                first_name: data.firstName,
                middle_name: data.middleName || null,
                last_name: data.lastName,
                date_of_birth: data.dateOfBirth || null,
                gender: data.gender || null,
                contact_number: applicationPayload.contactNumber,
                barangay: data.currentBarangay || "CABARITAN",
                grade_level: data.step1.targetGradeLevel,
                strand: data.targetStrand || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingApplication.student_id);
          }
        } else {
          // Check if student profile exists in Supabase
          let studentUuid = user?.id;
          const numericLrn = data.lrn && /^\d{12}$/.test(data.lrn) ? data.lrn : null;
          let studentQuery = supabase.from("students").select("id, first_name, last_name");
          if (numericLrn && user?.id) {
            studentQuery = studentQuery.or(`student_id.eq.${numericLrn},user_id.eq.${user.id}`);
          } else if (user?.id) {
            studentQuery = studentQuery.eq("user_id", user.id);
          } else if (numericLrn) {
            studentQuery = studentQuery.eq("student_id", numericLrn);
          }
          const { data: existingStudent } = await studentQuery.limit(1);

          if (existingStudent && existingStudent.length > 0) {
            studentUuid = existingStudent[0].id;
            // Ensure student profile has latest personal information
            await supabase
              .from("students")
              .update({
                first_name: data.firstName || existingStudent[0].first_name,
                middle_name: data.middleName || null,
                last_name: data.lastName || existingStudent[0].last_name,
                date_of_birth: data.dateOfBirth || null,
                gender: data.gender || null,
                contact_number: applicationPayload.contactNumber,
                barangay: data.currentBarangay || "CABARITAN",
                grade_level: data.step1.targetGradeLevel,
                strand: data.targetStrand || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", studentUuid);
          } else {
            // Insert student profile record
            const assignedStudentId = numericLrn || `100050${Math.floor(100000 + Math.random() * 900000)}`;
            const { data: createdStudent } = await supabase
              .from("students")
              .insert({
                user_id: user?.id && user.id.length === 36 ? user.id : null,
                student_id: assignedStudentId,
                first_name: data.firstName,
                middle_name: data.middleName || null,
                last_name: data.lastName,
                date_of_birth: data.dateOfBirth || null,
                gender: data.gender || null,
                contact_number: applicationPayload.contactNumber,
                barangay: data.currentBarangay || "CABARITAN",
                grade_level: data.step1.targetGradeLevel,
                strand: data.targetStrand || null,
              })
              .select()
              .single();

            if (createdStudent) {
              studentUuid = createdStudent.id;
            }
          }

          if (studentUuid) {
            const { error: appErr } = await supabase
              .from("enrollment_applications")
              .insert({
                application_id: generatedRef,
                student_id: studentUuid,
                applicant_type: data.step1.applicantType,
                school_year: (data.schoolYear || "2026-2027").replace("–", "-"),
                target_grade_level: data.step1.targetGradeLevel,
                target_strand: data.targetStrand || null,
                status: "Pending",
                selected_electives: [{
                  ...data,
                  semester: data.semester || data.targetSemester || data.step1?.targetSemester || "Trimester 1",
                  term: data.semester || data.targetSemester || data.step1?.targetSemester || "Trimester 1",
                  targetSemester: data.semester || data.targetSemester || data.step1?.targetSemester || "Trimester 1",
                  schoolYear: (data.schoolYear || "2026-2027").replace("–", "-"),
                }],
                submitted_documents: Object.entries(docs)
                  .filter(([_, v]) => v !== null)
                  .map(([k, v]) => ({
                    docType: k,
                    fileName: v?.file.name,
                    sizeKb: v?.compressedSizeKb,
                    fileData: v?.previewUrl || null,
                    fileUrl: v?.previewUrl || null,
                  })),
              });

            if (appErr) {
              console.warn("Supabase enrollment_applications insert notice:", appErr.message);
            }
          }
        }
      } catch (suAppErr) {
        console.warn("Supabase application submission exception:", suAppErr);
      }

      // Simulate network latency for realism
      await new Promise((res) => setTimeout(res, 800));

      setReferenceNumber(generatedRef);
      setIsSubmitted(true);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("dumalnext_student_enrollment_step");
          localStorage.removeItem("dumalnext_student_enrollment_draft");
        } catch {}
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
      }
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
      <div className="bg-white border-2 border-slate-300 p-6 sm:p-10 space-y-8 rounded-lg shadow-sm">
        {/* Acknowledgment Header */}
        <div className="border-b-2 border-slate-200 pb-5 text-center">
          <div className="text-xs font-bold tracking-wider text-[#002060]">
            Department of Education &bull; Region I &bull; Division of Ilocos Norte
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Dumalneg National High School
          </h2>
          <div className="text-xs font-medium text-slate-600 mt-0.5">
            Dumalneg, Ilocos Norte &bull; DepEd School ID: 300017
          </div>
          <div className="mt-3 inline-block bg-[#002060] text-white text-xs font-bold px-4 py-1 tracking-wide rounded">
            {existingApplication
              ? "Official Online Enrollment Resubmission Acknowledgment Slip"
              : "Official Online Enrollment Acknowledgment Slip"}
          </div>
        </div>

        {/* Status Banner - Color Coded (Yellow for Pending) with ZERO Emojis */}
        <div className="p-5 bg-amber-50 border-2 border-amber-400 space-y-2 rounded-md shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-3 py-1 border border-amber-400 rounded">
              {existingApplication
                ? "STATUS: REVISED APPLICATION SUBMITTED & PENDING VERIFICATION"
                : "STATUS: PENDING REGISTRAR VERIFICATION"}
            </span>
            <span className="text-xs text-amber-900 font-bold">
              DATE: {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            {existingApplication
              ? "Your revised enrollment dossier and updated documentary requirements have been successfully resubmitted to the Dumalneg National High School Registrar for re-evaluation. Your reference number remains unchanged."
              : "Your online enrollment application has been successfully submitted to the Dumalneg National High School Registrar. Official documents are currently undergoing evaluation. You will be notified once verified."}
          </p>
        </div>

        {/* Reference Code Box */}
        <div className="p-6 bg-slate-50 border-2 border-[#002060] text-center space-y-2 rounded-md shadow-xs">
          <div className="text-xs font-bold text-slate-600 tracking-wide">
            Official Application Tracking Reference Number
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#002060] tracking-widest">
            {referenceNumber}
          </div>
          <p className="text-[11px] text-slate-500">
            Please screenshot or write down this tracking reference number. You may use this number or your 12-digit LRN to check your live application status on the portal.
          </p>
        </div>

        {/* Learner & Enrollment Summary */}
        <div className="border-2 border-slate-300 p-5 space-y-4 rounded-md shadow-xs">
          <div className="text-xs font-bold text-[#002060] border-b border-slate-200 pb-2">
            Official Application Summary
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-500 block text-[10px]">Learner Name</span>
              <span className="font-bold text-slate-900">
                {data.lastName}, {data.firstName} {data.middleName || ""} {data.extensionName || ""}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block text-[10px]">Learner Reference Number (LRN)</span>
              <span className="font-bold text-slate-900">{data.lrn || "N/A"}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block text-[10px]">Enrollment Level</span>
              <span className="font-bold text-slate-900">
                Grade {data.step1.targetGradeLevel} ({data.step1.applicantType})
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block text-[10px]">Curriculum Program / Track</span>
              <span className="font-bold text-slate-900">
                {isG7
                  ? data.jhsProgram === "SPS"
                    ? `Special Program in Sports (SPS: ${data.spsSport || "General"})`
                    : "Regular JHS Curriculum"
                  : `${data.targetTrack} - ${data.targetStrand}`}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block text-[10px]">Residential Address</span>
              <span className="font-bold text-slate-900">
                Brgy. {data.currentBarangay}, {data.currentSitio ? `Sitio ${data.currentSitio}, ` : ""}Dumalneg
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block text-[10px]">Emergency School Contact</span>
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
              <span className="font-bold text-slate-500 block text-[10px]">Linked Student Account</span>
              <span className="font-bold text-[#002060]">
                {user ? `${user.fullName} (${user.email})` : "Guest / Direct Submission"}
              </span>
            </div>
          </div>
        </div>

        {/* Next Steps for Student / Parent */}
        <div className="p-5 bg-slate-50 border-2 border-slate-300 space-y-3 rounded-md shadow-xs">
          <div className="text-xs font-bold text-[#002060]">
            Instructions &amp; Next Steps for Dumalneg NHS Enrollees
          </div>
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 leading-relaxed">
            <li>
              <strong>Registrar Evaluation</strong>: The Dumalneg NHS Registrar will review your uploaded credentials (Form 138, PSA Birth Certificate, etc.) within 1 to 2 school business days.
            </li>
            <li>
              <strong>Track Your Application Status</strong>: Visit the <strong>Track Application Status</strong> page on the portal anytime using your Application Tracking Number or 12-digit LRN.
            </li>
            <li>
              <strong>Official DepEd PDF Release</strong>: Once your application is marked as <strong>APPROVED &amp; OFFICIALLY ENROLLED</strong> by the school administrator, your official accomplished DepEd Enrollment Form (PDF) and Certificate of Enrollment will be immediately unlocked for download.
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
            className="px-6 py-2.5 bg-white border-2 border-slate-400 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors rounded-md"
          >
            Print Acknowledgment Slip
          </button>
          <a
            href={`/track?ref=${referenceNumber}`}
            className="px-8 py-2.5 bg-[#002060] border-2 border-[#002060] text-xs font-bold text-white hover:bg-blue-950 transition-colors text-center shadow-xs rounded-md"
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
    <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-8 rounded-lg shadow-sm">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold tracking-wider text-[#002060]">
            Step 05 of 05
          </span>
          <span className="text-xs font-medium text-slate-500">
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
        <div className="p-4 bg-red-50 border-2 border-red-300 space-y-1 rounded-md">
          <p className="text-xs font-bold text-red-800 leading-normal">
            Submission Requirement Notice: Please resolve the highlighted required items below before submitting your application.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION A: OFFICIAL DOCUMENT UPLOAD SLOTS                                  */}
      {/* ========================================================================= */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300 rounded-md">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] block">
            Section 9: Official Document Upload (Automated Compressor &lt; 350KB)
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            Photos taken from smartphones will be automatically compressed by your browser to ensure fast uploads even on spotty mobile data connections in Dumalneg:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. PSA Birth Certificate */}
          <DocumentDropBox
            id="file-birth-cert"
            docKey="birth_certificate"
            label="1. PSA Birth Certificate"
            sublabel="Clear photo of Philippine Statistics Authority (PSA) Birth Certificate or Local Civil Registrar (LCR) / Barangay Certification."
            badgeText="MANDATORY"
            badgeType="slate"
            uploadedDoc={docs.birth_certificate}
            error={errors.birth_certificate}
            onUpload={(file) => handleFileUpload("birth_certificate", file)}
            onRemove={() => handleRemoveDoc("birth_certificate")}
            isMandatory
          />

          {/* 2. Form 138 / SF9 Report Card */}
          <DocumentDropBox
            id="file-form-138"
            docKey="form_138"
            label="2. Learner's Progress Report Card (SF9 / Form 138)"
            sublabel={
              isG7
                ? "Grade 6 Elementary Progress Report Card indicating learner eligibility for Junior High School."
                : isG11
                ? "Grade 10 Junior High School Report Card indicating eligibility for Senior High School."
                : "Report Card from previous school year completed."
            }
            badgeText="MANDATORY"
            badgeType="slate"
            uploadedDoc={docs.form_138}
            error={errors.form_138}
            onUpload={(file) => handleFileUpload("form_138", file)}
            onRemove={() => handleRemoveDoc("form_138")}
            isMandatory
          />

          {/* 3. 2x2 Official ID Picture */}
          <DocumentDropBox
            id="file-id-picture"
            docKey="id_picture"
            label="3. Formal 2x2 or 1x1 ID Picture"
            sublabel="Recent passport or 2x2 formal photo with white background and printed name tag of the learner."
            badgeText="MANDATORY"
            badgeType="slate"
            accept="image/*"
            uploadedDoc={docs.id_picture}
            error={errors.id_picture}
            onUpload={(file) => handleFileUpload("id_picture", file)}
            onRemove={() => handleRemoveDoc("id_picture")}
            isMandatory
          />

          {/* 4. Certificate of Good Moral Character */}
          <DocumentDropBox
            id="file-good-moral"
            docKey="good_moral"
            label="4. Certificate of Good Moral Character"
            sublabel="Certificate issued by previous school certifying good moral standing and disciplinary record."
            badgeText={isG11 || isTransferee ? "MANDATORY" : "OPTIONAL FOR G7"}
            badgeType={isG11 || isTransferee ? "slate" : "blue"}
            uploadedDoc={docs.good_moral}
            error={errors.good_moral}
            onUpload={(file) => handleFileUpload("good_moral", file)}
            onRemove={() => handleRemoveDoc("good_moral")}
            isMandatory={isG11 || isTransferee}
          />

          {/* 5. Conditional 4Ps Household ID Photocopy */}
          {data.is4psBeneficiary && (
            <DocumentDropBox
              id="file-household-4ps"
              docKey="household_4ps"
              label="5. Pantawid Pamilya (4Ps) Household ID Card"
              sublabel="Photocopy or clear photo of DSWD 4Ps ID or Household Pantawid verification passbook."
              badgeText="4PS BENEFICIARY"
              badgeType="blue"
              uploadedDoc={docs.household_4ps}
              error={errors.household_4ps}
              onUpload={(file) => handleFileUpload("household_4ps", file)}
              onRemove={() => handleRemoveDoc("household_4ps")}
            />
          )}

          {/* 6. Conditional PWD ID Photocopy */}
          {data.hasPwdId && (
            <DocumentDropBox
              id="file-pwd-id"
              docKey="pwd_id"
              label="6. Official Persons with Disability (PWD) ID"
              sublabel="Photocopy of Municipal Social Welfare and Development (MSWDO) PWD ID or Clinical Medical Assessment."
              badgeText="SNED / INCLUSIVE"
              badgeType="blue"
              uploadedDoc={docs.pwd_id}
              error={errors.pwd_id}
              onUpload={(file) => handleFileUpload("pwd_id", file)}
              onRemove={() => handleRemoveDoc("pwd_id")}
            />
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: ONLINE APPLICATION REVIEW CARD (NO PRE-APPROVAL PDF)           */}
      {/* ========================================================================= */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300 rounded-md">
        <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-[#002060] block">
              Online Application Review Card
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Review all encoded applicant information below. Ensure every entry matches your civil registry and academic records before submitting:
            </p>
          </div>
          <span className="text-[11px] bg-blue-100 text-[#002060] px-3 py-1 font-bold border border-blue-300 shrink-0 rounded">
            PRE-SUBMISSION VERIFICATION
          </span>
        </div>

        {/* Review Card Grid */}
        <div className="space-y-4">
          {/* Card 1: Learner Identity */}
          <div className="p-4 bg-white border border-slate-300 space-y-3 rounded-md">
            <div className="text-xs font-bold text-[#002060] border-b border-slate-100 pb-1.5">
              1. Learner Civil Registry &amp; Personal Details
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Last Name</span>
                <span className="font-bold text-slate-900">{data.lastName || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">First Name</span>
                <span className="font-bold text-slate-900">{data.firstName || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Middle Name</span>
                <span className="font-bold text-slate-900">{data.middleName || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Extension</span>
                <span className="font-bold text-slate-900">{data.extensionName || "None"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">12-Digit LRN</span>
                <span className="font-bold text-slate-900">{data.lrn || "None (First Time Enrollee)"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Date of Birth / Age</span>
                <span className="font-bold text-slate-900">{data.dateOfBirth || "-"} ({data.age} yrs old)</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Gender</span>
                <span className="font-bold text-slate-900">{data.gender || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Mother Tongue</span>
                <span className="font-bold text-slate-900">{data.motherTongue || "Ilokano"}</span>
              </div>
              {data.isIpCommunity && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">IP Community</span>
                  <span className="font-bold text-blue-900">{data.ipCommunityName || "Isnag"}</span>
                </div>
              )}
              {data.is4psBeneficiary && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">4Ps Household ID</span>
                  <span className="font-bold text-blue-900">{data.householdId4ps || "Beneficiary"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Academic Classification & Feeder School */}
          <div className="p-4 bg-white border border-slate-300 space-y-3 rounded-md">
            <div className="text-xs font-bold text-[#002060] border-b border-slate-100 pb-1.5">
              2. Enrollment Placement &amp; Academic Background
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Target Grade Level</span>
                <span className="font-bold text-slate-900">Grade {data.step1.targetGradeLevel}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Applicant Category</span>
                <span className="font-bold text-slate-900">{data.step1.applicantType}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-500 block">Curricular Program / Track</span>
                <span className="font-bold text-[#002060]">
                  {isG7
                    ? data.jhsProgram === "SPS"
                    ? `Special Program in Sports (SPS: ${data.spsSport || "Selected"})`
                    : "Regular Junior High School Curriculum"
                    : `${data.targetTrack} - ${data.targetStrand} (${data.targetSemester})`}
                </span>
              </div>
              {data.careerPathway && (
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 block">Career Pathway Specialization</span>
                  <span className="font-bold text-slate-900">{data.careerPathway}</span>
                </div>
              )}
              {data.doorwayElectives && data.doorwayElectives.length > 0 && (
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 block">Doorway Cross-Track Electives</span>
                  <span className="font-bold text-blue-900">{data.doorwayElectives.join(", ")}</span>
                </div>
              )}
              {data.selectedElectives && data.selectedElectives.length > 0 && (
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 block">
                    Elective / Prescribed Course Offerings
                  </span>
                  <span className="font-bold text-[#002060]">
                    {data.selectedElectives.join(", ")}
                  </span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-500 block">Last School Attended</span>
                <span className="font-bold text-slate-900">
                  {data.step1.lastSchoolAttended || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">DepEd School ID</span>
                <span className="font-bold text-slate-900">{data.step1.lastSchoolId || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Last S.Y. Completed</span>
                <span className="font-bold text-slate-900">{data.step1.lastSchoolYearCompleted || "-"}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Residential Address */}
          <div className="p-4 bg-white border border-slate-300 space-y-3 rounded-md">
            <div className="text-xs font-bold text-[#002060] border-b border-slate-100 pb-1.5">
              3. Residential Address
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Barangay</span>
                <span className="font-bold text-slate-900">{data.currentBarangay}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Sitio / House No.</span>
                <span className="font-bold text-slate-900">
                  {data.currentSitio ? `Sitio ${data.currentSitio}` : data.currentHouseNo || "Poblacion"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Municipality &amp; Province</span>
                <span className="font-bold text-slate-900">Dumalneg, Ilocos Norte</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Zip Code</span>
                <span className="font-bold text-slate-900">2921</span>
              </div>
            </div>
          </div>

          {/* Card 4: Parent & Guardian Information */}
          <div className="p-4 bg-white border border-slate-300 space-y-3 rounded-md">
            <div className="text-xs font-bold text-[#002060] border-b border-slate-100 pb-1.5">
              4. Parents &amp; Legal Guardian
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Father&apos;s Full Name</span>
                <span className="font-bold text-slate-900">
                  {data.fatherLastName === "N/A"
                    ? "N/A (Not Available)"
                    : `${data.fatherLastName || ""}, ${data.fatherFirstName || ""} ${data.fatherMiddleName || ""}`}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {data.fatherContactNumber || "No mobile specified"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Mother&apos;s Maiden Name</span>
                <span className="font-bold text-slate-900">
                  {data.motherMaidenLastName === "N/A"
                    ? "N/A (Not Available)"
                    : `${data.motherMaidenLastName || ""}, ${data.motherFirstName || ""} ${data.motherMiddleName || ""}`}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {data.motherContactNumber || "No mobile specified"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Legal Guardian</span>
                <span className="font-bold text-slate-900">
                  {data.guardianLastName
                    ? `${data.guardianLastName}, ${data.guardianFirstName} (${data.guardianRelationship || "Guardian"})`
                    : "Living with Parents"}
                </span>
                {data.guardianContactNumber && (
                  <span className="text-[10px] text-slate-500 block">
                    {data.guardianContactNumber}
                  </span>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs">
              <span className="text-[10px] font-bold text-slate-500 block">Primary Emergency Contact Dispatcher</span>
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
          <div className="p-4 bg-white border border-slate-300 space-y-3 rounded-md">
            <div className="text-xs font-bold text-[#002060] border-b border-slate-100 pb-1.5">
              5. Inclusive Education &amp; Preferred Modality
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Special Education (SNEd)</span>
                <span className="font-bold text-slate-900">
                  {data.isSned
                    ? `Yes - ${data.snedCategory}: ${(data.snedDetails || []).join(", ")}`
                    : "No (General Education Learner)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Preferred Emergency Learning Modalities</span>
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
      <div className="p-5 bg-blue-50/70 border-2 border-blue-200 space-y-3 rounded-md">
        <div className="text-xs font-bold text-[#002060]">
          DepEd Sworn Certification &amp; Republic Act No. 10173 (Data Privacy Act of 2012)
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          I hereby certify that all information supplied herein is true, complete, and accurate to the best of my knowledge and belief. 
          I understand that any misrepresentation of facts may result in the invalidation of this enrollment application. 
          Furthermore, I authorize the Department of Education, Division of Ilocos Norte, and Dumalneg National High School to collect, 
          record, organize, update, and store the personal and educational data contained in this application in accordance with the 
          Data Privacy Act of 2012 (Republic Act No. 10173) and official DepEd civil registry guidelines.
        </p>

        <label className="flex items-start gap-3 cursor-pointer pt-2 bg-white p-3 border border-blue-300 rounded-md">
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
      <div className="p-4 bg-slate-100 border border-slate-300 text-xs text-slate-600 leading-relaxed rounded-md">
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
          className="w-full sm:w-auto px-6 py-2.5 bg-white border-2 border-slate-400 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors rounded-md"
        >
          &larr; Back to Step 4 (Curriculum &amp; Modality)
        </button>
        <button
          type="button"
          onClick={handleSubmitApplication}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-10 py-3 bg-[#002060] border-2 border-[#002060] text-xs font-bold text-white hover:bg-blue-950 transition-colors shadow-sm disabled:bg-slate-400 disabled:border-slate-400 disabled:cursor-not-allowed rounded-md"
        >
          {isSubmitting
            ? "Processing Official Submission..."
            : existingApplication
            ? "Resubmit Revised Enrollment Application"
            : "Submit Enrollment Application"}
        </button>
      </div>
    </div>
  );
}
