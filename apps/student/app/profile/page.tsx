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
  const { user, isLoading: isAuthLoading, refreshSession } = useAuth();
  const { schoolYear, semester } = useEnrollmentControl();

  const [studentRec, setStudentRec] = useState<any | null>(null);
  const [enrollmentApp, setEnrollmentApp] = useState<any | null>(null);
  const [formData, setFormData] = useState<any | null>(null);
  const [assignedSection, setAssignedSection] = useState<SectionDetails | null>(null);
  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"academic" | "personal" | "address" | "family" | "security">("academic");

  // Security Credentials Modification States (Password & Email)
  const [securityModal, setSecurityModal] = useState<"none" | "password" | "email">("none");
  const [securityStep, setSecurityStep] = useState<1 | 2>(1);
  const [securityLoading, setSecurityLoading] = useState<boolean>(false);
  const [securityError, setSecurityError] = useState<string>("");
  const [securitySuccess, setSecuritySuccess] = useState<string>("");

  // Password Modification Form
  const [passwordOtp, setPasswordOtp] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Email Modification Form
  const [newEmailInput, setNewEmailInput] = useState<string>("");
  const [emailOtp, setEmailOtp] = useState<string>("");

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
            .select("id, application_id, student_id, applicant_type, target_grade_level, target_strand, school_year, status, selected_electives, submitted_documents, created_at")
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
            .select("id, application_id, student_id, applicant_type, target_grade_level, target_strand, school_year, status, selected_electives, submitted_documents, created_at")
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

                // Extract 2x2 Photo from submitted_documents or selected_electives
        let candidatePhoto: string | null = null;
        if (appRecord?.submitted_documents && Array.isArray(appRecord.submitted_documents)) {
          const doc = appRecord.submitted_documents.find((d: any) =>
            (d.docType || d.type || "").toLowerCase().includes("id") ||
            (d.docType || d.type || "").toLowerCase().includes("picture") ||
            (d.docType || d.type || "").toLowerCase().includes("photo") ||
            (d.docType || d.type || "").toLowerCase().includes("2x2")
          );
          if (doc?.fileUrl || doc?.fileData) {
            candidatePhoto = doc.fileUrl || doc.fileData;
          }
        }

        if (!candidatePhoto && formPayload?.submittedDocuments && Array.isArray(formPayload.submittedDocuments)) {
          const doc = formPayload.submittedDocuments.find((d: any) =>
            (d.docType || d.type || "").toLowerCase().includes("id") ||
            (d.docType || d.type || "").toLowerCase().includes("picture") ||
            (d.docType || d.type || "").toLowerCase().includes("photo") ||
            (d.docType || d.type || "").toLowerCase().includes("2x2")
          );
          if (doc?.fileUrl || doc?.fileData) {
            candidatePhoto = doc.fileUrl || doc.fileData;
          }
        }

        if (isMounted) {
          setStudentRec(student);
          setEnrollmentApp(appRecord);
          setFormData(formPayload);
          setAssignedSection(secDetails);
          setIdPhotoUrl(candidatePhoto);
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

  // Helpers for Modals
  const maskEmailAddress = (emailStr: string) => {
    if (!emailStr || !emailStr.includes("@")) return "";
    const [name, domain] = emailStr.split("@");
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}${"*".repeat(Math.max(name.length - 2, 3))}${name[name.length - 1]}@${domain}`;
  };

  const openPasswordModal = () => {
    setSecurityModal("password");
    setSecurityStep(1);
    setSecurityError("");
    setSecuritySuccess("");
    setPasswordOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const openEmailModal = () => {
    setSecurityModal("email");
    setSecurityStep(1);
    setSecurityError("");
    setSecuritySuccess("");
    setNewEmailInput("");
    setEmailOtp("");
  };

  const closeSecurityModal = () => {
    setSecurityModal("none");
    setSecurityStep(1);
    setSecurityError("");
    setSecuritySuccess("");
  };

  // ACTION: Send Password OTP
  const handleSendPasswordOtp = async () => {
    try {
      setSecurityLoading(true);
      setSecurityError("");
      const res = await fetch("/api/profile/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_password_otp",
          userId: user?.id,
          email: user?.email,
          studentName: fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send verification code.");
      }
      setSecurityStep(2);
      setSecuritySuccess(data.message || `The 6-digit verification code has been sent to your email (${maskEmailAddress(user?.email || "")}).`);
    } catch (err: any) {
      setSecurityError(err.message || "An error occurred while sending the code.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // ACTION: Verify OTP & Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordOtp || passwordOtp.trim().length !== 6) {
      setSecurityError("Please enter the complete 6-digit verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setSecurityError("New password must be at least 6 characters in length.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("New password and confirmation do not match.");
      return;
    }

    try {
      setSecurityLoading(true);
      setSecurityError("");

      // 1. Server verification & DB update
      const res = await fetch("/api/profile/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_and_update_password",
          userId: user?.id,
          email: user?.email,
          otp: passwordOtp.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update password.");
      }

      // 2. Client auth update
      const supabase = createClient();
      try {
        await supabase.auth.updateUser({ password: newPassword.trim() });
      } catch (authErr) {
        console.warn("Client auth password update notice:", authErr);
      }

      setSecuritySuccess(data.message || "Password successfully updated!");
      setPasswordOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        closeSecurityModal();
      }, 2000);
    } catch (err: any) {
      setSecurityError(err.message || "An error occurred while updating the password.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // ACTION: Send Email OTP to New Email
  const handleSendEmailOtp = async () => {
    const cleanNew = newEmailInput.trim().toLowerCase();
    if (!cleanNew || !cleanNew.includes("@") || !cleanNew.includes(".")) {
      setSecurityError("Please enter a valid new email address.");
      return;
    }
    if (cleanNew === user?.email?.toLowerCase()) {
      setSecurityError("The new email address cannot be the same as your current email.");
      return;
    }

    try {
      setSecurityLoading(true);
      setSecurityError("");
      const res = await fetch("/api/profile/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email_otp",
          userId: user?.id,
          currentEmail: user?.email,
          newEmail: cleanNew,
          studentName: fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send verification code to the new email.");
      }
      setSecurityStep(2);
      setSecuritySuccess(data.message || `The 6-digit verification code has been sent to ${cleanNew}.`);
    } catch (err: any) {
      setSecurityError(err.message || "An error occurred while sending the code.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // ACTION: Verify OTP & Update Email
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtp || emailOtp.trim().length !== 6) {
      setSecurityError("Please enter the complete 6-digit verification code.");
      return;
    }

    const cleanNew = newEmailInput.trim().toLowerCase();
    try {
      setSecurityLoading(true);
      setSecurityError("");

      // 1. Server validation and database update
      const res = await fetch("/api/profile/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_and_update_email",
          userId: user?.id,
          currentEmail: user?.email,
          newEmail: cleanNew,
          otp: emailOtp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update email address.");
      }

      // 2. Client auth update
      const supabase = createClient();
      try {
        await supabase.auth.updateUser({ email: cleanNew });
      } catch (authErr) {
        console.warn("Client auth email update notice:", authErr);
      }

      // 3. Refresh user session in auth context
      await refreshSession();

      setSecuritySuccess(data.message || `Official login email successfully updated to ${cleanNew}!`);
      setEmailOtp("");
      setNewEmailInput("");
      setTimeout(() => {
        closeSecurityModal();
      }, 2000);
    } catch (err: any) {
      setSecurityError(err.message || "An error occurred while updating the email.");
    } finally {
      setSecurityLoading(false);
    }
  };

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

  // 1-Click IT Support Gmail Link (Fallback / External inquiries)
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
            {/* 2x2 Official Learner Photo from Enrollment or Fallback Initial Circle */}
            {idPhotoUrl ? (
              <div className="shrink-0">
                <img
                  src={idPhotoUrl}
                  alt={fullName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/40 shadow-md bg-white ring-2 ring-white/20"
                />
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center font-black text-xl sm:text-2xl text-white shrink-0 shadow-inner">
                {initials}
              </div>
            )}

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
      <div className="flex border-b border-slate-200 bg-white rounded-t-lg overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap text-xs font-bold touch-pan-x">
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
          <span>Parent &amp; Guardian Details</span>
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
          <span>Account Credentials &amp; Security</span>
        </button>
      </div>

      {/* Tab Contents Card */}
      <div className="bg-white border border-slate-200 rounded-b-xl shadow-xs p-5 sm:p-7 min-h-[400px]">
        {isLoadingData ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#002060] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading Learner Profile Details...</p>
          </div>
        ) : (
          <>
            {/* 1. ACADEMIC & SECTION PLACEMENT TAB */}
            {activeTab === "academic" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                    Official Academic Standing &amp; Placement
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    DepEd curriculum track, grade level, and verified section advisory.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Section Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
                        Class Section Advisory
                      </span>
                      {assignedSection ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold uppercase rounded">
                          Official
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-950 px-2 py-0.5 font-bold uppercase rounded">
                          Unassigned
                        </span>
                      )}
                    </div>

                    {assignedSection ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Section Name:</span>
                          <span className="text-sm font-black text-slate-900">{assignedSection.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Class Adviser:</span>
                            <span className="font-bold text-slate-800">{assignedSection.adviserName || "Assigned by Principal"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Room:</span>
                            <span className="font-bold text-slate-800">{assignedSection.roomNumber || "Main Campus"}</span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Link
                            href="/section"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#002060] hover:text-blue-800 underline cursor-pointer"
                          >
                            <span>View Class Schedule &amp; Section Roster</span>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center space-y-1">
                        <p className="text-xs text-slate-600 font-medium">
                          You are currently not yet assigned to an official class section.
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Section placement will appear automatically upon official registrar approval.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Curriculum & Grade Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
                        DepEd Curriculum Level
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Grade Level:</span>
                        <span className="text-sm font-bold text-slate-900">Grade {gradeLevel}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Curriculum Program / Strand:</span>
                        <span className="font-bold text-slate-800">{strandTrack}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">School Year:</span>
                          <span className="font-bold text-slate-800">{schoolYear || "2026-2027"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Current Term:</span>
                          <span className="font-bold text-slate-800">{semester || "Trimester 1"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PERSONAL INFORMATION TAB */}
            {activeTab === "personal" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                    Learner Demographic Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">

                  </p>
                </div>

                {idPhotoUrl && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={idPhotoUrl}
                        alt="2x2 Official ID"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover border-2 border-[#002060] rounded-lg shadow-xs bg-white"
                      />
                      <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.2 bg-[#002060] text-amber-300 font-black text-[9px] uppercase tracking-wider rounded-md shadow-2xs">
                        2x2 Photo
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Official 2x2 ID Photo
                      </span>
                      <span className="font-bold text-slate-900 block text-sm">
                        Certified Learner Photo On File
                      </span>
                      <p className="text-[11px] text-slate-500">

                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      First Name
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {user.firstName || studentRec?.first_name || "N/A"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Middle Name
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {user.middleName || studentRec?.middle_name || "None / N/A"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Last Name
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {user.lastName || studentRec?.last_name || "N/A"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Gender / Sex
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {studentRec?.gender || formData?.gender || "Not Specified"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Date of Birth
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {studentRec?.date_of_birth || formData?.birthDate || "On file in registrar"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Contact Mobile Number
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-900 mt-0.5 block">
                      {studentRec?.contact_number || formData?.contactNumber || formData?.learnerContact || "09181234567"}
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
                    Official Residential Address
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Home address registered in the Dumalneg NHS learner information system.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <svg className="w-4 h-4 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
                      Municipality of Dumalneg, Ilocos Norte
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Barangay:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {studentRec?.barangay || formData?.barangay || "Cabaritan"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Municipality / City:</span>
                        <span className="font-bold text-slate-800">Dumalneg</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Province / Region:</span>
                        <span className="font-bold text-slate-800">Ilocos Norte (Region I)</span>
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
                        Father&apos;s Details
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
                        Mother&apos;s Details (Maiden)
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

            {/* 5. ACCOUNT & SECURITY TAB (STRICTLY ENGLISH) */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                    Student Account Credentials &amp; Security
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage your login credentials, password, and registered email with secure 6-digit OTP verification directly without contacting IT Support.
                  </p>
                </div>

                {/* Self-Service Credentials Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Registered Login Email */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Registered Login Email
                      </span>
                      <span className="text-[10px] bg-blue-100 text-[#002060] px-2 py-0.5 font-bold uppercase rounded">
                        Verified
                      </span>
                    </div>

                    <div>
                      <span className="text-sm font-bold text-slate-900 block truncate font-mono">
                        {emailAddress}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Used for session authentication, official school announcements, and security verification codes.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">Need to change your email?</span>
                      <button
                        type="button"
                        onClick={openEmailModal}
                        className="px-3 py-1.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Change Email</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Account Password */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Account Password
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold uppercase rounded">
                        Protected
                      </span>
                    </div>

                    <div>
                      <span className="text-sm font-mono tracking-widest font-black text-slate-700 block">
                        &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Protects your student records and portal access in compliance with DepEd security policies.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">Want to change your password?</span>
                      <button
                        type="button"
                        onClick={openPasswordModal}
                        className="px-3 py-1.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Change Password</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* System ID & Session Info */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Learner Account Database ID
                    </span>
                    <span className="text-sm font-mono font-bold text-[#002060] block mt-0.5">
                      {studentId}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 sm:text-right">
                    <span>DepEd Learner Status: </span>
                    <span className="font-bold text-emerald-700">Verified &bull; Active</span>
                  </div>
                </div>

                {/* Explanatory Policy Box (Self-Service vs IT Support) */}
                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
                      Self-Service Security Policy
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Since you are already signed in to your official learner account, <strong>you do not need to contact IT Support</strong> to change your password or email. You can update them directly using the self-service controls above, and a 6-digit verification code will be sent to authorize each update.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    * Notice: Contacting the IT Support Desk (<code>dumalnext@gmail.com</code>) is only required if you forgot your password outside the portal at the login screen.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CHANGE PASSWORD WITH 6-DIGIT OTP (STRICTLY ENGLISH) */}
      {/* ========================================================================= */}
      {securityModal === "password" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border-t-4 border-[#002060] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[#002060] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-sm font-bold tracking-tight">
                  Change Account Password
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSecurityModal}
                disabled={securityLoading}
                className="text-slate-300 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Error Message */}
              {securityError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900 flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{securityError}</span>
                </div>
              )}

              {/* Success Message */}
              {securitySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{securitySuccess}</span>
                </div>
              )}

              {/* STEP 1: Send OTP to current email */}
              {securityStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Security Verification Step
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      To verify that you are the authorized owner of this account, we will send a <strong>6-digit verification code</strong> to your registered email:
                    </p>
                    <p className="font-mono font-bold text-[#002060] bg-white p-2 rounded border border-slate-200 text-center">
                      {maskEmailAddress(emailAddress)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendPasswordOtp}
                    disabled={securityLoading}
                    className="w-full py-2.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {securityLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending 6-Digit Code...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Send 6-Digit Code to Email</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 2: Input 6-Digit OTP & Set New Password */}
              {securityStep === 2 && (
                <form onSubmit={handleUpdatePassword} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={passwordOtp}
                      onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="w-full p-2.5 border-2 border-[#002060] rounded-lg font-mono text-center text-lg tracking-widest font-black text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden"
                      required
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-slate-500">Check your email inbox or spam folder</span>
                      <button
                        type="button"
                        onClick={handleSendPasswordOtp}
                        disabled={securityLoading}
                        className="text-blue-700 font-bold hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>

                  {/* New Password Field */}
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      New Password (Minimum 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 pr-9 border border-slate-300 rounded-lg text-slate-900 text-xs focus:border-[#002060] focus:outline-hidden"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                      >
                        {showNewPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 pr-9 border border-slate-300 rounded-lg text-slate-900 text-xs focus:border-[#002060] focus:outline-hidden"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSecurityStep(1)}
                      disabled={securityLoading}
                      className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={securityLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {securityLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Confirm &amp; Update Password</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHANGE EMAIL WITH 6-DIGIT OTP (STRICTLY ENGLISH) */}
      {/* ========================================================================= */}
      {securityModal === "email" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border-t-4 border-[#002060] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[#002060] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <h3 className="text-sm font-bold tracking-tight">
                  Modify Registered Email Address
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSecurityModal}
                disabled={securityLoading}
                className="text-slate-300 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Error Message */}
              {securityError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900 flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{securityError}</span>
                </div>
              )}

              {/* Success Message */}
              {securitySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{securitySuccess}</span>
                </div>
              )}

              {/* STEP 1: Enter New Email & Request OTP */}
              {securityStep === 1 && (
                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                      Current Registered Email
                    </span>
                    <input
                      type="text"
                      value={emailAddress}
                      disabled
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-mono text-xs cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      New Email Address (e.g. yourname@gmail.com)
                    </label>
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      placeholder="new.email@gmail.com"
                      className="w-full p-2.5 border-2 border-slate-300 focus:border-[#002060] rounded-lg text-slate-900 text-xs focus:outline-hidden"
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      We will send a 6-digit verification code to this new email address to verify ownership before it is linked to your account.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={securityLoading || !newEmailInput.includes("@")}
                    className="w-full py-2.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {securityLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending 6-Digit Code...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Send 6-Digit Code to New Email</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 2: Input 6-Digit OTP Sent to New Email */}
              {securityStep === 2 && (
                <form onSubmit={handleUpdateEmail} className="space-y-3.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                      New Email Address
                    </span>
                    <input
                      type="text"
                      value={newEmailInput}
                      disabled
                      className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="w-full p-2.5 border-2 border-[#002060] rounded-lg font-mono text-center text-lg tracking-widest font-black text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden"
                      required
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-slate-500">Check the inbox of your new email address</span>
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        disabled={securityLoading}
                        className="text-blue-700 font-bold hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSecurityStep(1)}
                      disabled={securityLoading}
                      className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={securityLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {securityLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Verify &amp; Update Email</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
