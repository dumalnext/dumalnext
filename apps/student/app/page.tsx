"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { downloadDepEdEnrollmentPdf } from "@/lib/utils/depedPdfGenerator";
import { createClient } from "@/lib/supabase/client";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import { isApplicationInTerm, extractTermNumber } from "@/lib/utils/academicTerm";
import SeparatedOtpInput from "@/components/SeparatedOtpInput";
import { AccountCreationTutorial, GradeLevelEnrollmentTutorials } from "@/components/StudentVideoTutorials";
import StudentConcernModal, { ConcernModalMode } from "@/components/StudentConcernModal";
import { PasswordResetModal, IdentityRecoveryModal } from "@/components/CredentialRecoveryModals";
import EmailSetupGuard from "@/components/EmailSetupGuard";
import { CopyChip, PasswordStrengthMeter, triggerPortalToast } from "@/components/ui/PortalUI";

function StudentHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get("tab");
  const noticeQuery = searchParams.get("notice") || searchParams.get("reason");
  const { user, login, register, verifyEmailOtp, resendVerification, logout, refreshSession } = useAuth();
  const { isEnrollmentOpen, schoolYear, semester, termNumber, closedMessage } = useEnrollmentControl();

  // IT Support Student Concerns Modal State
  const [showConcernModal, setShowConcernModal] = useState(false);
  const [concernModalMode, setConcernModalMode] = useState<ConcernModalMode>("submit");
  const [concernCategory, setConcernCategory] = useState("password_reset");
  
  // IT Support Credential Recovery States (Password Reset & Identity Recovery)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetMaskedEmail, setResetMaskedEmail] = useState("");

  const [showIdentityRecoveryModal, setShowIdentityRecoveryModal] = useState(false);
  const [recoveryLrn, setRecoveryLrn] = useState("");

  // Active Tab for Visitors: "signin" | "register"
  const [activeTab, setActiveTab] = useState<"signin" | "register">(
    tabQuery === "register" ? "register" : "signin"
  );

  // Sync tab with URL query parameter
  useEffect(() => {
    if (tabQuery === "register") {
      setActiveTab("register");
    } else if (tabQuery === "signin") {
      setActiveTab("signin");
    }
  }, [tabQuery]);

  // 6-Digit OTP Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resending OTP code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Gmail Verification Required State
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  const handleResendVerification = async () => {
    const target = otpEmail || unconfirmedEmail;
    if (!target) return;
    setIsResending(true);
    setResendStatus("");
    const res = await resendVerification(target);
    if (res.success) {
      setResendCooldown(60);
      setResendStatus("A new 6-digit verification code has been dispatched to your Gmail!");
    } else {
      setResendStatus(res.error || "Failed to resend verification code.");
    }
    setIsResending(false);
  };

  // Sign In Form State (Phase 1: Email First)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  // 1-Click Direct Gmail Forgot Password
  const handleDirectGmailForgotPassword = () => {
    const to = "dumalnext@gmail.com";
    const subject = "Password Reset Request - Dumalneg NHS Student Account";
    const bodyText = [
      "Good day Dumalneg NHS IT Support Desk,",
      "",
      "I would like to request a password reset for my student account at Dumalneg National High School.",
      "",
      "My Account Details:",
      "- Full Name: [Please enter your full name]",
      `- 12-Digit LRN: ${loginEmail && loginEmail.match(/^\d{12}$/) ? loginEmail : "[Please enter your 12-digit LRN]"}`,
      `- Registered Gmail / Email: ${loginEmail && loginEmail.includes("@") ? loginEmail : "[Please enter your registered Gmail]"}`,
      "- Reason / Inquiry: I forgot my password and would like to request an official reset to access the student portal.",
      "",
      "Thank you very much for your assistance!"
    ].join("\r\n");

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    const win = window.open(gmailUrl, "_blank");
    if (!win || win.closed || typeof win.closed === "undefined") {
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [loginStatusText, setLoginStatusText] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Registration Form State (Phase 1: Email First)
  const [regForm, setRegForm] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [regProgress, setRegProgress] = useState(0);
  const [regStatusText, setRegStatusText] = useState("");
  const [regSuccessNotice, setRegSuccessNotice] = useState("");

  // Authenticated User Submitted Application State (Scoped strictly to Active Academic Term)
  const [userApplication, setUserApplication] = useState<any | null>(null);
  const [pastApplications, setPastApplications] = useState<any[]>([]);
  const [assignedSection, setAssignedSection] = useState<{
    name: string;
    gradeLevel?: number | string;
    strand?: string | null;
  } | null>(null);
  const [sectionMode, setSectionMode] = useState<
    "ASSIGNED" | "NOT_ASSIGNED" | "NOT_ASSIGNED_TRANSFEREE" | "ENROLLMENT_REQUIRED"
  >("NOT_ASSIGNED");
  const [activeTermNum, setActiveTermNum] = useState<number>(termNumber || 1);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [dashboardSubjects, setDashboardSubjects] = useState<any[]>([]);
  const [dashboardSchedules, setDashboardSchedules] = useState<any[]>([]);

  const formatTime12h = (timeStr?: string | null): string => {
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
  };

  const formatScheduleTimeRange = (start?: string | null, end?: string | null): string => {
    const s = formatTime12h(start);
    const e = formatTime12h(end);
    if (s && e) return `${s} - ${e}`;
    return s || e || "";
  };

  // Real-Time Automatic Synchronization of Logged-In User's Application & Section (Zero-Refresh)
  useEffect(() => {
    if (!user) {
      setUserApplication(null);
      setPastApplications([]);
      setAssignedSection(null);
      setSectionMode("NOT_ASSIGNED");
      setPhotoUrl(null);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    const fetchApp = async () => {
      try {
        // 0. Resolve active term
        const { data: termsData } = await supabase
          .from("academic_terms")
          .select("schoolYear, termNumber, isActive")
          .order("schoolYear", { ascending: false });

        const activeTerm = (termsData || []).find((t: any) => t.isActive);
        const resolvedTermNum = Number(activeTerm?.termNumber) || Number(termNumber) || extractTermNumber(semester) || 1;
        const resolvedSY = (activeTerm?.schoolYear || schoolYear || "2026-2027").replace(/[–—]/g, "-").trim();

        if (isMounted) {
          setActiveTermNum(resolvedTermNum);
        }

        // 1. Fetch Student Profile with Comprehensive Fallback Matching
        let stQuery = supabase
          .from("students")
          .select("id, user_id, student_id, first_name, last_name, middle_name, current_section_id, grade_level, strand");

        const orFilters: string[] = [];
        if (user.id && user.id.length === 36) orFilters.push(`user_id.eq.${user.id}`);
        if (user.lrn && /^\d{12}$/.test(user.lrn)) orFilters.push(`student_id.eq.${user.lrn}`);
        if (user.userId && user.userId !== user.id) orFilters.push(`student_id.eq.${user.userId}`);
        if (orFilters.length > 0) stQuery = stQuery.or(orFilters.join(","));

        const { data: stData } = await stQuery.limit(1);
        let studentRec = stData && stData.length > 0 ? stData[0] : null;

        // Fallback: Check applications if not found directly
        if (!studentRec) {
          const { data: allApps } = await supabase
            .from("enrollment_applications")
            .select("id, student_id, selected_electives")
            .order("created_at", { ascending: false })
            .limit(20);

          if (allApps && allApps.length > 0) {
            for (const a of allApps) {
              const fd = Array.isArray(a.selected_electives) && a.selected_electives.length > 0
                ? a.selected_electives[0]
                : (typeof a.selected_electives === "object" && a.selected_electives !== null ? a.selected_electives : {});

              const emailInForm = fd.email || fd.learnerEmail;
              const lrnInForm = fd.lrn || fd.learnerLrn;

              if (
                (emailInForm && emailInForm.toLowerCase() === user.email.toLowerCase()) ||
                (lrnInForm && user.lrn && lrnInForm === user.lrn)
              ) {
                if (a.student_id) {
                  const { data: stById } = await supabase
                    .from("students")
                    .select("id, user_id, student_id, first_name, last_name, middle_name, current_section_id, grade_level, strand")
                    .eq("id", a.student_id)
                    .limit(1);

                  if (stById && stById.length > 0) {
                    studentRec = stById[0];
                    if (!studentRec.user_id && user.id) {
                      await supabase.from("students").update({ user_id: user.id }).eq("id", studentRec.id);
                    }
                    break;
                  }
                }
              }
            }
          }
        }

        if (studentRec) {
          const { data: appData } = await supabase
            .from("enrollment_applications")
            .select("id, application_id, student_id, applicant_type, school_year, target_grade_level, target_strand, status, admin_feedback, selected_electives, submitted_documents, submission_date, created_at, updated_at")
            .eq("student_id", studentRec.id)
            .order("created_at", { ascending: false });

          const userApps = appData || [];

          // Extract 2x2 Photo from submitted_documents or selected_electives
          let candidatePhoto: string | null = null;
          const appWithDocs = userApps.find((a: any) => a.submitted_documents && a.submitted_documents.length > 0);
          if (appWithDocs?.submitted_documents && Array.isArray(appWithDocs.submitted_documents)) {
            const doc = appWithDocs.submitted_documents.find((d: any) =>
              (d.docType || d.type || "").toLowerCase().includes("id") ||
              (d.docType || d.type || "").toLowerCase().includes("picture") ||
              (d.docType || d.type || "").toLowerCase().includes("photo") ||
              (d.docType || d.type || "").toLowerCase().includes("2x2")
            );
            if (doc?.fileUrl || doc?.fileData) {
              candidatePhoto = doc.fileUrl || doc.fileData;
            }
          }

          if (!candidatePhoto) {
            for (const a of userApps) {
              const fd = Array.isArray(a.selected_electives) ? a.selected_electives[0] : a.selected_electives;
              const subDocs = fd?.submittedDocuments || [];
              const doc = subDocs.find((d: any) =>
                (d.docType || d.type || "").toLowerCase().includes("id") ||
                (d.docType || d.type || "").toLowerCase().includes("picture") ||
                (d.docType || d.type || "").toLowerCase().includes("photo") ||
                (d.docType || d.type || "").toLowerCase().includes("2x2")
              );
              if (doc?.fileUrl || doc?.fileData) {
                candidatePhoto = doc.fileUrl || doc.fileData;
                break;
              }
            }
          }

          if (!candidatePhoto && user.email) {
            const { data: appsByEmail } = await supabase
              .from("enrollment_applications")
              .select("id, selected_electives, submitted_documents")
              .order("created_at", { ascending: false })
              .limit(10);
            if (appsByEmail) {
              for (const a of appsByEmail) {
                const fd = Array.isArray(a.selected_electives) ? a.selected_electives[0] : a.selected_electives;
                const em = (fd?.email || fd?.learnerEmail || "").toLowerCase();
                if (em === user.email.toLowerCase()) {
                  const subDocs = a.submitted_documents || fd?.submittedDocuments || [];
                  const doc = subDocs.find((d: any) =>
                    (d.docType || d.type || "").toLowerCase().includes("id") ||
                    (d.docType || d.type || "").toLowerCase().includes("picture") ||
                    (d.docType || d.type || "").toLowerCase().includes("photo") ||
                    (d.docType || d.type || "").toLowerCase().includes("2x2")
                  );
                  if (doc?.fileUrl || doc?.fileData) {
                    candidatePhoto = doc.fileUrl || doc.fileData;
                    break;
                  }
                }
              }
            }
          }

          if (isMounted) {
            setPhotoUrl(candidatePhoto);
          }

          // Find application for CURRENT ACTIVE academic term (School Year & Term/Trimester)
          const activeApp = userApps.find((a: any) =>
            isApplicationInTerm(a, resolvedSY, resolvedTermNum)
          );

          const isEnrolledInActiveTerm = !!activeApp;

          const isTransferee =
            (activeApp && (activeApp.applicant_type === "Transferee" || activeApp.selected_electives?.[0]?.applicantType === "Transferee")) ||
            userApps.some((a: any) => a.applicant_type === "Transferee" || a.selected_electives?.[0]?.applicantType === "Transferee");

          // Resolve Section
          let targetSecId = studentRec.current_section_id;
          if (resolvedTermNum >= 2 && !isTransferee && isEnrolledInActiveTerm) {
            if (!targetSecId) {
              const priorApp = userApps.find((a: any) => a.status === "Approved" && ((a as any).section_id || (a as any).assigned_section_id || a.selected_electives?.[0]?.assigned_track_section_id));
              if (priorApp) {
                targetSecId = (priorApp as any).section_id || (priorApp as any).assigned_section_id || (priorApp as any).selected_electives?.[0]?.assigned_track_section_id;
                await supabase.from("students").update({ current_section_id: targetSecId }).eq("id", studentRec.id);
              }
            }
          }

          let secObj = null;
          if (targetSecId) {
            const { data: secData } = await supabase
              .from("sections")
              .select("id, section_name, grade_level, strand")
              .eq("id", targetSecId)
              .limit(1);

            if (secData && secData.length > 0) {
              secObj = {
                name: secData[0].section_name,
                gradeLevel: secData[0].grade_level,
                strand: secData[0].strand,
              };
              if (isMounted) setAssignedSection(secObj);

              const gradeParam = secData[0].grade_level || studentRec.grade_level || activeApp?.target_grade_level || 7;
              const strandParam = secData[0].strand || studentRec.strand || activeApp?.target_strand || "Regular";
              try {
                const [subjRes, schedRes] = await Promise.all([
                  fetch(`/api/subjects?gradeLevel=${gradeParam}&strand=${encodeURIComponent(strandParam)}`).then((r) => r.json()).catch(() => null),
                  fetch(`/api/schedules?sectionId=${secData[0].id}&gradeLevel=${gradeParam}`).then((r) => r.json()).catch(() => null),
                ]);
                if (isMounted) {
                  setDashboardSubjects(subjRes?.success && Array.isArray(subjRes.subjects) ? subjRes.subjects : []);
                  setDashboardSchedules(schedRes?.success && Array.isArray(schedRes.schedules) ? schedRes.schedules : []);
                }
              } catch {
                // Non-blocking schedule preview fetch
              }
            } else {
              if (isMounted) {
                setAssignedSection(null);
                setDashboardSchedules([]);
              }
            }
          } else {
            if (isMounted) {
              setAssignedSection(null);
              setDashboardSchedules([]);
            }
            const fallbackGrade = studentRec.grade_level || activeApp?.target_grade_level;
            const fallbackStrand = studentRec.strand || activeApp?.target_strand || "Regular";
            if (fallbackGrade) {
              try {
                const subjRes = await fetch(`/api/subjects?gradeLevel=${fallbackGrade}&strand=${encodeURIComponent(fallbackStrand)}`).then((r) => r.json()).catch(() => null);
                if (isMounted && subjRes?.success && Array.isArray(subjRes.subjects)) {
                  setDashboardSubjects(subjRes.subjects);
                }
              } catch {}
            }
          }

          // Determine Section Mode
          if (resolvedTermNum === 1) {
            if (isMounted) setSectionMode(secObj ? "ASSIGNED" : "NOT_ASSIGNED");
          } else {
            if (isTransferee) {
              if (isMounted) setSectionMode(secObj ? "ASSIGNED" : "NOT_ASSIGNED_TRANSFEREE");
            } else {
              if (!isEnrolledInActiveTerm) {
                if (isMounted) setSectionMode("ENROLLMENT_REQUIRED");
              } else {
                if (isMounted) setSectionMode(secObj ? "ASSIGNED" : "NOT_ASSIGNED");
              }
            }
          }

          // Active Application mapping
          if (activeApp) {
            const fd = Array.isArray(activeApp.selected_electives) && activeApp.selected_electives.length > 0
              ? activeApp.selected_electives[0]
              : (typeof activeApp.selected_electives === "object" && activeApp.selected_electives !== null ? activeApp.selected_electives : {});

            if (isMounted) {
              setUserApplication({
                id: activeApp.id,
                referenceNumber: activeApp.application_id,
                applicationDate: activeApp.created_at,
                status: activeApp.status,
                fullName: `${user.lastName}, ${user.firstName} ${user.middleName || ""}`.trim(),
                gradeLevel: activeApp.target_grade_level,
                applicantType: activeApp.applicant_type,
                targetTrack: activeApp.target_strand ? "Senior High School" : "Junior High School",
                targetStrand: activeApp.target_strand,
                remarks: activeApp.admin_feedback,
                schoolYear: activeApp.school_year || resolvedSY,
                semester: fd.term_name || fd.termName || fd.semester || fd.term || semester || "Trimester 1",
                formData: fd,
              });
            }
          } else {
            if (isMounted) setUserApplication(null);
          }

          // Filter out past semester/school year applications
          const otherApps = userApps.filter((a: any) => a.id !== activeApp?.id);
          if (isMounted) {
            setPastApplications(
              otherApps.map((oa: any) => {
                const fd = Array.isArray(oa.selected_electives) && oa.selected_electives.length > 0
                  ? oa.selected_electives[0]
                  : (typeof oa.selected_electives === "object" && oa.selected_electives !== null ? oa.selected_electives : {});
                const pastTerm =
                  fd.term_name ||
                  fd.termName ||
                  fd.semester ||
                  fd.term ||
                  fd.targetSemester ||
                  oa.term_name ||
                  oa.semester ||
                  "Trimester 1";
                return {
                  id: oa.id,
                  referenceNumber: oa.application_id,
                  applicationDate: oa.created_at,
                  status: oa.status,
                  gradeLevel: oa.target_grade_level,
                  targetStrand: oa.target_strand,
                  schoolYear: oa.school_year || resolvedSY,
                  semester: pastTerm,
                  remarks: oa.admin_feedback,
                };
              })
            );
          }
          return;
        } else {
          if (user.email) {
            const { data: appsByEmail } = await supabase
              .from("enrollment_applications")
              .select("id, selected_electives, submitted_documents")
              .order("created_at", { ascending: false })
              .limit(10);
            if (appsByEmail) {
              for (const a of appsByEmail) {
                const fd = Array.isArray(a.selected_electives) ? a.selected_electives[0] : a.selected_electives;
                const em = (fd?.email || fd?.learnerEmail || "").toLowerCase();
                if (em === user.email.toLowerCase()) {
                  const subDocs = a.submitted_documents || fd?.submittedDocuments || [];
                  const doc = subDocs.find((d: any) =>
                    (d.docType || d.type || "").toLowerCase().includes("id") ||
                    (d.docType || d.type || "").toLowerCase().includes("picture") ||
                    (d.docType || d.type || "").toLowerCase().includes("photo") ||
                    (d.docType || d.type || "").toLowerCase().includes("2x2")
                  );
                  if (doc?.fileUrl || doc?.fileData) {
                    if (isMounted) setPhotoUrl(doc.fileUrl || doc.fileData);
                    break;
                  }
                }
              }
            }
          }
        }

        if (isMounted) {
          setUserApplication(null);
          setPastApplications([]);
          setAssignedSection(null);
          setSectionMode("NOT_ASSIGNED");
        }
      } catch (e) {
        console.error("Error reading Supabase applications:", e);
        if (isMounted) {
          setUserApplication(null);
          setPastApplications([]);
          setAssignedSection(null);
          setSectionMode("NOT_ASSIGNED");
        }
      }
    };

    // 1. Initial fetch
    fetchApp();

    // 2. Window Focus & Visibility auto-sync
    const onVisibilitySync = () => {
      if (document.visibilityState === "visible") {
        fetchApp();
      }
    };
    window.addEventListener("focus", onVisibilitySync);
    document.addEventListener("visibilitychange", onVisibilitySync);

    // 3. Custom Application/Auth Event listener
    const onDataChanged = () => {
      fetchApp();
    };
    window.addEventListener("dumalnext:data-changed", onDataChanged);

    // 4. Fallback Heartbeat Polling (every 2 minutes, active tab only)
    const heartbeat = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchApp();
      }
    }, 120000);

    // 5. Supabase Realtime Channels: Instant live update on application AND section assignments
    const channel = supabase
      .channel("home-realtime-applications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => {
          fetchApp();
        }
      )
      .subscribe();

    const userChannel = supabase
      .channel("home-realtime-users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          fetchApp();
        }
      )
      .subscribe();

    const studentChannel = supabase
      .channel("home-realtime-students")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchApp();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onVisibilitySync);
      document.removeEventListener("visibilitychange", onVisibilitySync);
      window.removeEventListener("dumalnext:data-changed", onDataChanged);
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
      supabase.removeChannel(studentChannel);
      supabase.removeChannel(userChannel);
    };
  }, [user?.id, user?.lrn, schoolYear, semester, termNumber]);

  // Handle Sign In Submit with System Verification Delay
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail.trim()) {
      setLoginError("Please enter your registered Email Address.");
      return;
    }
    if (!loginPassword) {
      setLoginError("Please enter your account password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginProgress(20);
    setLoginStatusText("Validating student account credentials...");

    try {
      // Realistic Institutional Verification Delay
      await new Promise((resolve) => setTimeout(resolve, 450));
      setLoginProgress(55);
      setLoginStatusText("Verifying credentials with Dumalneg NHS learner database...");

      const res = await login(loginEmail, loginPassword);
      if (!res.success) {
        if (res.status === "password_removed") {
          setResetIdentifier(loginEmail);
          setResetMaskedEmail(res.maskedEmail || "");
          setShowPasswordResetModal(true);
          setLoginError(res.error || "Abiso sa Seguridad: Ang password ng iyong account ay tinanggal ng IT Support.");
          setIsLoggingIn(false);
          setLoginProgress(0);
          return;
        }

        if (res.status === "both_removed") {
          setRecoveryLrn(res.lrn || loginEmail.replace(/\D/g, "").slice(0, 12));
          setShowIdentityRecoveryModal(true);
          setLoginError(res.error || "Naka-lock ang Account: Tinanggal ng IT Support ang email at password.");
          setIsLoggingIn(false);
          setLoginProgress(0);
          return;
        }

        setLoginError(res.error || "Invalid email or password. Please try again.");
        if (res.unconfirmedEmail) {
          setUnconfirmedEmail(res.unconfirmedEmail);
        }
        setIsLoggingIn(false);
        setLoginProgress(0);
        return;
      }

      setLoginProgress(90);
      setLoginStatusText("Credentials verified. Initializing student dashboard session...");
      await new Promise((resolve) => setTimeout(resolve, 450));

      setLoginProgress(100);
      setLoginStatusText("Welcome! Redirecting to Student Console...");
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Successfully authenticated
      setLoginPassword("");
      setRegSuccessNotice("");
      setLoginError("");
      setUnconfirmedEmail("");

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
      router.push("/");
    } finally {
      setIsLoggingIn(false);
      setLoginProgress(0);
      setLoginStatusText("");
    }
  };

  // Handle Registration Submit with System Storage Delay & Redirect to Login/Home
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!regForm.lastName.trim()) newErrors.lastName = "Official Last Name is required.";
    if (!regForm.firstName.trim()) newErrors.firstName = "Official First Name is required.";
    if (!noMiddleName && !regForm.middleName.trim()) {
      newErrors.middleName = "Middle Name is required, or check 'No Middle Name'.";
    }
    if (!regForm.email.trim() || !regForm.email.includes("@")) {
      newErrors.email = "A valid Gmail address is required.";
    }
    if (!regForm.password || regForm.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }
    if (regForm.password !== regForm.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setRegErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsRegistering(true);
    setRegProgress(20);
    setRegStatusText("Validating learner applicant information...");

    try {
      // Step 1: Pre-save verification delay
      await new Promise((resolve) => setTimeout(resolve, 450));
      setRegProgress(55);
      setRegStatusText("Sending official verification link to your Gmail address...");

      const res = await register(
        {
          lastName: regForm.lastName.trim().toUpperCase(),
          firstName: regForm.firstName.trim().toUpperCase(),
          middleName: noMiddleName ? "N/A" : regForm.middleName.trim().toUpperCase(),
          email: regForm.email.trim().toLowerCase(),
          password: regForm.password,
        },
        false
      );

      if (!res.success) {
        setRegErrors({ form: res.error || "Registration failed. Please try again." });
        if ((res as any).unconfirmedEmail) {
          setUnconfirmedEmail((res as any).unconfirmedEmail);
        }
        setIsRegistering(false);
        setRegProgress(0);
        return;
      }

      setRegProgress(85);
      setRegStatusText("6-Digit security code dispatched! Opening verification window...");
      await new Promise((resolve) => setTimeout(resolve, 450));

      setRegProgress(100);
      setRegStatusText("Ready for verification code entry.");
      await new Promise((resolve) => setTimeout(resolve, 200));

      const registeredEmail = regForm.email.trim().toLowerCase();

      // Clear reg form
      setRegForm({
        lastName: "",
        firstName: "",
        middleName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setNoMiddleName(false);

      // Launch 6-Digit OTP Verification Screen
      setOtpEmail(registeredEmail);
      setOtpCode("");
      setOtpError("");
      setOtpSuccess("");
      setResendCooldown(60);
      setShowOtpModal(true);
      setUnconfirmedEmail(registeredEmail);
      setLoginEmail(registeredEmail);
    } finally {
      setIsRegistering(false);
      setRegProgress(0);
      setRegStatusText("");
    }
  };

  // Handle OTP Verification Submit (6-Digit Code)
  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = otpCode.replace(/\D/g, "");
    if (!otpEmail || clean.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const res = await verifyEmailOtp(otpEmail, clean);
      if (res.success) {
        triggerPortalToast("Verification code confirmed! Your learner account is now active.", "success");
        setOtpSuccess("Verification code confirmed! Your learner account is activated.");
        setShowOtpModal(false);
        setUnconfirmedEmail("");
        setLoginEmail(otpEmail);
        router.push("/enroll");
      } else {
        setOtpError(res.error || "Invalid or expired verification code. Please check your Gmail or request a new code.");
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle OTP Resend from Modal
  const handleOtpResend = async () => {
    if (resendCooldown > 0 || !otpEmail) return;
    setIsResending(true);
    setOtpError("");
    setOtpSuccess("");
    const res = await resendVerification(otpEmail);
    if (res.success) {
      setResendCooldown(60);
      setOtpSuccess("A new 6-digit verification code has been dispatched to your Gmail!");
    } else {
      setOtpError(res.error || "Failed to resend verification code. Please try again.");
    }
    setIsResending(false);
  };

  return (
    <div className="w-full space-y-8">
      {/* Access Restriction Notice (When redirected from protected routes) */}
      {noticeQuery === "auth_required" && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 border border-amber-300 shadow-xs rounded-[4px] flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            !
          </div>
          <div>
            <span className="text-xs font-bold text-amber-950 tracking-wide block mb-0.5">
              Student Portal Sign-In Required
            </span>
            <p className="text-xs text-amber-900 leading-relaxed">
              Please <strong>Sign In</strong> to your learner account or <strong>Create a New Account</strong> on the right to access the Online Enrollment Form or track your application status.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW A: AUTHENTICATED STUDENT PORTAL DASHBOARD (2-COLUMN STUDENT SIS)
          ========================================================================= */}
      {user ? (
        !user.email || user.email.trim() === "" ? (
          <EmailSetupGuard
            user={user}
            onEmailSaved={async () => {
              await refreshSession();
            }}
            onLogout={logout}
          />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =====================================================================
              LEFT COLUMN (4 COLS): OFFICIAL DIGITAL STUDENT ID CARD & QUICK LINKS
              ===================================================================== */}
          <div className="lg:col-span-4 space-y-5">
            {/* Official Digital Learner ID Card */}
            <div className="bg-white border border-slate-200/90 rounded-[4px] shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white px-5 py-4 border-b-4 border-amber-400 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">
                    Official Learner Identification
                  </span>
                  <h2 className="text-sm font-extrabold text-white tracking-tight">
                    Digital Student ID Card
                  </h2>
                </div>
                {userApplication?.status === "Approved" ? (
                  <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider rounded-[3px] shrink-0">
                    Enrolled
                  </span>
                ) : userApplication?.status === "Needs Revision" ? (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-[3px] shrink-0">
                    Revision
                  </span>
                ) : userApplication?.status === "Pending" ? (
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider rounded-[3px] shrink-0">
                    Pending
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-white/15 border border-white/30 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-[3px] shrink-0">
                    Active
                  </span>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Photo & Primary Identity */}
                <div className="flex items-center gap-3.5">
                  {photoUrl ? (
                    <div className="shrink-0">
                      <img
                        src={photoUrl}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-16 h-16 rounded-[4px] object-cover border border-slate-300 bg-white shadow-xs"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-[4px] bg-[#002060] text-white border border-blue-900 flex items-center justify-center text-lg font-black shrink-0 shadow-xs">
                      {(user.firstName?.[0] || "S")}{(user.lastName?.[0] || "P")}
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Dumalneg NHS Learner
                    </div>
                    <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug break-words">
                      {user.firstName} {user.middleName ? `${user.middleName[0]}. ` : ""}{user.lastName}
                    </h1>
                    {sectionMode === "ASSIGNED" && assignedSection ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-[3px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        {assignedSection.name}
                      </span>
                    ) : userApplication?.gradeLevel ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold rounded-[3px]">
                        Grade {userApplication.gradeLevel} &bull; Section Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-[3px]">
                        Section Unassigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Official ID Attributes List */}
                <div className="border-t border-slate-200 pt-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-medium">Learner Ref. No. (LRN):</span>
                    {user.lrn && /^\d{12}$/.test(user.lrn) ? (
                      <CopyChip value={user.lrn} label="12-Digit LRN" />
                    ) : (
                      <span className="font-semibold text-slate-700">{userApplication?.lrn || "On File"}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-medium">Account ID:</span>
                    <CopyChip value={user.userId} label="Account ID" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Email:</span>
                    <strong className="text-slate-900 truncate">{user.email}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-medium">Grade Level:</span>
                    <strong className="text-slate-900">
                      {assignedSection?.gradeLevel
                        ? `Grade ${assignedSection.gradeLevel}${assignedSection.strand ? ` (${assignedSection.strand})` : ""}`
                        : userApplication?.gradeLevel
                        ? `Grade ${userApplication.gradeLevel}`
                        : "Basic Education"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-medium">Academic Term:</span>
                    <strong className="text-[#002060]">
                      S.Y. {schoolYear || "2026-2027"} &bull; {semester || "Trimester 1"}
                    </strong>
                  </div>
                </div>

                {/* ID Card Bottom Action */}
                <div className="pt-2 border-t border-slate-200">
                  <Link
                    href="/profile"
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-[#002060] hover:text-white text-slate-800 border border-slate-300 text-xs font-bold rounded-[4px] transition-colors flex items-center justify-between shadow-2xs"
                  >
                    <span>Account &amp; Security Settings</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Student Portal Quick Links Card */}
            <div className="bg-white border border-slate-200/90 rounded-[4px] shadow-sm p-4 space-y-3">
              <div className="border-b border-slate-200 pb-2">
                <span className="text-[10px] font-bold text-[#002060] uppercase tracking-wider block">
                  Academic Services
                </span>
                <h3 className="text-xs font-bold text-slate-900">
                  Student Portal Navigation
                </h3>
              </div>
              <div className="space-y-1.5 text-xs">
                <Link
                  href="/section"
                  className="w-full px-3 py-2 rounded-[4px] bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-[#002060] border border-slate-200 font-bold flex items-center justify-between transition-colors"
                >
                  <span>My Class Section &amp; Roster</span>
                  <span>&rarr;</span>
                </Link>
                <Link
                  href="/enroll"
                  className="w-full px-3 py-2 rounded-[4px] bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-[#002060] border border-slate-200 font-bold flex items-center justify-between transition-colors"
                >
                  <span>Online Enrollment Form</span>
                  <span>&rarr;</span>
                </Link>
                <Link
                  href={userApplication ? `/track?ref=${userApplication.referenceNumber}` : "/track"}
                  className="w-full px-3 py-2 rounded-[4px] bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-[#002060] border border-slate-200 font-bold flex items-center justify-between transition-colors"
                >
                  <span>Track Application Status</span>
                  <span>&rarr;</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setConcernModalMode("submit");
                    setShowConcernModal(true);
                  }}
                  className="w-full px-3 py-2 rounded-[4px] bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-[#002060] border border-slate-200 font-bold flex items-center justify-between transition-colors cursor-pointer text-left"
                >
                  <span>IT Support &amp; Learner Helpdesk</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          </div>

          {/* =====================================================================
              RIGHT COLUMN (8 COLS): ACADEMIC SUMMARY, LIVE TIMETABLE & ENROLLMENT
              ===================================================================== */}
          <div className="lg:col-span-8 space-y-6">
            {/* Top 3 Academic Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* KPI 1: Assigned Section */}
              <div className="bg-white border border-slate-200/90 border-l-4 border-l-[#002060] rounded-[4px] p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Class Section Placement
                </span>
                <div className="text-sm font-extrabold text-slate-900 truncate">
                  {sectionMode === "ASSIGNED" && assignedSection
                    ? assignedSection.name
                    : sectionMode === "ENROLLMENT_REQUIRED"
                    ? "Enrollment Required"
                    : "Pending Placement"}
                </div>
                <div className="text-xs text-slate-600">
                  {sectionMode === "ASSIGNED" && assignedSection
                    ? `Grade ${assignedSection.gradeLevel}${assignedSection.strand ? ` • ${assignedSection.strand}` : ""} Official Roster`
                    : "Awaiting Registrar Sectioning"}
                </div>
              </div>

              {/* KPI 2: Enrollment Status */}
              <div
                className={`bg-white border border-slate-200/90 border-l-4 rounded-[4px] p-4 shadow-xs space-y-1 ${
                  userApplication?.status === "Approved"
                    ? "border-l-emerald-600"
                    : userApplication?.status === "Needs Revision"
                    ? "border-l-red-600"
                    : "border-l-amber-500"
                }`}
              >
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Enrollment Status
                </span>
                <div
                  className={`text-sm font-extrabold truncate ${
                    userApplication?.status === "Approved"
                      ? "text-emerald-800"
                      : userApplication?.status === "Needs Revision"
                      ? "text-red-800"
                      : "text-amber-900"
                  }`}
                >
                  {userApplication
                    ? userApplication.status === "Approved"
                      ? "Approved & Enrolled"
                      : userApplication.status === "Needs Revision"
                      ? "Needs Revision"
                      : "Pending Evaluation"
                    : "Not Yet Enrolled"}
                </div>
                <div className="text-xs text-slate-600">
                  S.Y. {schoolYear || "2026-2027"} &bull; {semester || "Trimester 1"}
                </div>
              </div>

              {/* KPI 3: Application Reference */}
              <div className="bg-white border border-slate-200/90 border-l-4 border-l-amber-400 rounded-[4px] p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Application Reference
                </span>
                <div className="text-sm font-extrabold text-[#002060] truncate">
                  {userApplication ? userApplication.referenceNumber : "No Active Submission"}
                </div>
                <div className="text-xs text-slate-600">
                  {userApplication
                    ? `Submitted ${new Date(userApplication.applicationDate).toLocaleDateString()}`
                    : isEnrollmentOpen
                    ? "Enrollment Window Open"
                    : "Enrollment Window Closed"}
                </div>
              </div>
            </div>

            {/* =================================================================
                LIVE CLASS TIMETABLE & ENROLLED SUBJECTS PREVIEW CARD
                ================================================================= */}
            <div className="bg-white border border-slate-200/90 rounded-[4px] shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-[#002060] uppercase tracking-wider block">
                    Academic Schedule &amp; Curriculum
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {sectionMode === "ASSIGNED" && assignedSection
                      ? `Live Class Timetable & Subjects • ${assignedSection.name}`
                      : "Class Section & Prescribed Subjects Preview"}
                  </h3>
                </div>
                <Link
                  href="/section"
                  className="px-3 py-1.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold rounded-[4px] transition-colors shadow-xs whitespace-nowrap"
                >
                  Open Full Section &amp; Schedule &rarr;
                </Link>
              </div>

              <div className="p-5 space-y-4">
                {/* Section Placement Status Banner inside Schedule Card */}
                {sectionMode === "ASSIGNED" && assignedSection ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-[4px]">
                    <div className="text-xs text-emerald-950">
                      <span className="font-bold uppercase tracking-wider text-emerald-800 mr-2">
                        OFFICIAL PLACEMENT:
                      </span>
                      Assigned to <strong className="underline">{assignedSection.name}</strong> (Grade {assignedSection.gradeLevel}
                      {assignedSection.strand ? ` • ${assignedSection.strand}` : ""})
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-950 text-[10px] font-bold uppercase rounded-[3px] shrink-0 self-start sm:self-center">
                      {activeTermNum >= 2 ? "Automatic Continuing Roster" : "Official Roster"}
                    </span>
                  </div>
                ) : sectionMode === "ENROLLMENT_REQUIRED" ? (
                  <div className="p-3.5 bg-blue-50 border border-[#002060] flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[4px]">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#002060] uppercase">
                        Enrollment Required for Trimester {activeTermNum}
                      </div>
                      <p className="text-xs text-slate-700">
                        Complete your continuing enrollment for S.Y. {schoolYear} to unlock your class section and timetable.
                      </p>
                    </div>
                    <Link
                      href="/enroll"
                      className="px-3 py-1.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold rounded-[4px] shrink-0 whitespace-nowrap"
                    >
                      Complete Enrollment &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[4px]">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-amber-950">
                        {sectionMode === "NOT_ASSIGNED_TRANSFEREE"
                          ? "Transferee Section Placement Pending Evaluation"
                          : "Awaiting Official Class Section Placement"}
                      </div>
                      <p className="text-xs text-amber-800">
                        Your class section and room assignment will appear here automatically once finalized by the Registrar.
                      </p>
                    </div>
                    <Link
                      href="/section"
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-[4px] shrink-0 whitespace-nowrap"
                    >
                      Check Status &rarr;
                    </Link>
                  </div>
                )}

                {/* Live Timetable Table OR Prescribed Subjects Table */}
                {dashboardSchedules.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        Weekly Class Schedule ({dashboardSchedules.length} {dashboardSchedules.length === 1 ? "Class" : "Classes"})
                      </span>
                      <span className="text-slate-500">Live Registrar Timetable</span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-[4px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                            <th className="py-2 px-3">Subject</th>
                            <th className="py-2 px-3">Day</th>
                            <th className="py-2 px-3">Time Window</th>
                            <th className="py-2 px-3">Assigned Faculty</th>
                            <th className="py-2 px-3">Room</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {dashboardSchedules.slice(0, 6).map((sch: any, idx: number) => (
                            <tr key={sch.id || idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-[#002060]">
                                {sch.subject_name || sch.subject_code || "Core Subject"}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {sch.day_of_week || "Mon-Fri"}
                              </td>
                              <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                                {formatScheduleTimeRange(sch.start_time, sch.end_time)}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {sch.teacher_name || "TBA"}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {sch.classroom_name || sch.room || "TBA"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : dashboardSubjects.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        Prescribed Curriculum Subjects ({dashboardSubjects.length})
                      </span>
                      <span className="text-slate-500">DepEd Standard Curriculum</span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-[4px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                            <th className="py-2 px-3">Subject Code</th>
                            <th className="py-2 px-3">Subject Description</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3 text-right">Units</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {dashboardSubjects.slice(0, 6).map((subj: any, idx: number) => (
                            <tr key={subj.id || idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-[#002060]">
                                {subj.subject_code || `SUBJ-0${idx + 1}`}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {subj.subject_name || subj.name}
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px] font-bold uppercase rounded-[3px]">
                                  {subj.subject_type || "Core"}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-700">
                                {subj.units || 1.0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* =================================================================
                SUBMITTED ENROLLMENT APPLICATION / START ENROLLMENT CARD
                ================================================================= */}
            {userApplication ? (
              <div className="p-5 bg-white border border-slate-200/90 space-y-4 rounded-[4px] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">
                      Submitted Enrollment Application (S.Y. {userApplication.schoolYear} &bull; {userApplication.semester})
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-bold text-[#002060]">
                        {userApplication.referenceNumber}
                      </span>
                      <CopyChip value={userApplication.referenceNumber} label="Reference Number" />
                    </div>
                  </div>
                  <div>
                    {userApplication.status === "Approved" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-900 border-2 border-emerald-500 shadow-xs rounded-[4px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 border border-emerald-700 shrink-0" />
                        Status: Approved &amp; Officially Enrolled
                      </span>
                    ) : userApplication.status === "Needs Revision" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-900 border-2 border-red-500 shadow-xs rounded-[4px]">
                        <span className="w-2 h-2 rounded-full bg-red-600 border border-red-700 shrink-0" />
                        Status: Needs Revision / Action Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-900 border-2 border-amber-400 shadow-xs rounded-[4px]">
                        <span className="w-2 h-2 rounded-full bg-amber-500 border border-amber-600 shrink-0" />
                        Status: Pending Registrar Verification
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Learner Name:</span>
                    <strong className="text-slate-900">{userApplication.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Grade &amp; Curriculum:</span>
                    <strong className="text-slate-900">
                      Grade {userApplication.gradeLevel} {userApplication.jhsProgram ? `(${userApplication.jhsProgram})` : ""}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Submission Date:</span>
                    <strong className="text-slate-900 ">
                      {new Date(userApplication.applicationDate).toLocaleDateString()}
                    </strong>
                  </div>
                </div>

                {userApplication.remarks && (
                  <div className="p-3 bg-slate-50 border border-slate-200 text-xs rounded-[4px]">
                    <span className="font-bold text-slate-700 block mb-0.5 tracking-wide">
                      Registrar Notes / Remarks:
                    </span>
                    <p className="text-slate-800">{userApplication.remarks}</p>
                  </div>
                )}

                {/* Actions for Application */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    href={`/track?ref=${userApplication.referenceNumber}`}
                    className="btn-primary text-xs font-bold py-2.5 px-4 rounded-[4px]"
                  >
                    View / Track Application Details
                  </Link>

                  {userApplication.status === "Approved" && (
                    <Link
                      href={`/track?ref=${userApplication.referenceNumber}#timetable`}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1 rounded-[4px]"
                    >
                      View Enrolled Subjects &amp; Timetable &rarr;
                    </Link>
                  )}

                  {userApplication.status === "Needs Revision" && (
                    <Link
                      href="/enroll"
                      className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-xs rounded-[4px]"
                    >
                      Edit &amp; Resubmit Application
                    </Link>
                  )}

                  {userApplication.status === "Approved" && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsDownloadingPdf(true);
                        try {
                          await downloadDepEdEnrollmentPdf(
                            userApplication.formData || {
                              step1: {
                                isGraded: true,
                                applicantType: (userApplication.applicantType as any) || "Grade 7",
                                targetGradeLevel: Number(userApplication.gradeLevel) || 7,
                                jhsProgram: (userApplication.jhsProgram as any) || "Regular",
                                targetSemester: userApplication.semester || "1st Semester",
                                targetTrack: userApplication.targetTrack || "Academic Track",
                                targetStrand: userApplication.targetStrand || "STEM",
                                lastGradeCompleted: 6,
                                lastSchoolYearCompleted: "2024-2025",
                                lastSchoolAttended: "Dumalneg Elementary School",
                                lastSchoolId: "100050",
                              },
                              lrn: userApplication.lrn || "100050123456",
                              psaBirthCertNo: "1234-5678-9012",
                              lastName: user.lastName,
                              firstName: user.firstName,
                              middleName: user.middleName || "DUMALNEG",
                              extensionName: "",
                              dateOfBirth: "2012-05-15",
                              age: 12,
                              gender: "Male",
                              placeOfBirth: "Dumalneg, Ilocos Norte",
                              religion: "Roman Catholic",
                              motherTongue: "Ilokano",
                              contactNumber: "09181234567",
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
                              fatherContactNumber: "09181234567",
                              motherMaidenLastName: "RAMOS",
                              motherFirstName: "MARIA",
                              motherMiddleName: "DELA CRUZ",
                              motherContactNumber: "09201234567",
                              guardianLastName: "",
                              guardianFirstName: "",
                              guardianMiddleName: "",
                              guardianContactNumber: "",
                              guardianRelationship: "",
                              primaryContactPerson: "Father",
                              hasNoGuardian: true,
                              jhsProgram: userApplication.jhsProgram || "Regular",
                              spsSport: userApplication.spsSport || "",
                              targetTrack: userApplication.targetTrack || "",
                              targetStrand: userApplication.targetStrand || "",
                              targetSemester: userApplication.semester || "1st Semester",
                              isSned: false,
                              snedCategory: "None",
                              hasPwdId: false,
                              snedManifestations: [],
                              preferredModalities: ["Modular (Print)", "Blended"],
                              emergencyContactPerson: "Father",
                              emergencyContactNumber: "09181234567",
                              documents: {
                                psaBirthCertificateUrl: "uploaded_psa_cert.jpg",
                                reportCardUrl: "uploaded_form138.jpg",
                                idPictureUrl: "uploaded_2x2.jpg",
                              },
                            }
                          );
                        } finally {
                          setIsDownloadingPdf(false);
                        }
                      }}
                      disabled={isDownloadingPdf}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2.5 transition-colors rounded-[4px]"
                    >
                      {isDownloadingPdf ? "Generating Official PDF..." : "Download Official DepEd Form (PDF)"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* User has not yet submitted an enrollment application for active term */
              <div className={`p-6 border-2 space-y-4 text-center rounded-[4px] shadow-xs ${
                !isEnrollmentOpen ? "bg-red-50/60 border-red-300" : "bg-white border-slate-300"
              }`}>
                <div className="flex items-center justify-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${
                    isEnrollmentOpen ? "bg-emerald-500" : "bg-red-500"
                  }`} />
                  <span className={`text-xs font-bold ${
                    isEnrollmentOpen ? "text-emerald-900" : "text-red-900"
                  }`}>
                    Online Enrollment: {isEnrollmentOpen ? `Open for S.Y. ${schoolYear} • ${semester}` : `Closed for S.Y. ${schoolYear} • ${semester}`}
                  </span>
                </div>

                {(() => {
                  const priorApproved = pastApplications.find((p) => p.status === "Approved");
                  const isJhsContinuing = priorApproved
                    ? Number(priorApproved.gradeLevel) <= 10 || !priorApproved.targetStrand
                    : false;
                  const targetContinuingGrade = priorApproved?.gradeLevel || 7;

                  return (
                    <>
                      <h3 className="text-base font-bold text-slate-900">
                        {isEnrollmentOpen
                          ? priorApproved
                            ? isJhsContinuing
                              ? `Ready to Enroll for S.Y. ${schoolYear} (${semester})? (Continuing JHS Learner)`
                              : `Ready to Enroll for S.Y. ${schoolYear} (${semester})? (Continuing SHS Learner)`
                            : `Ready to Complete Your Basic Education Enrollment for S.Y. ${schoolYear} (${semester})?`
                          : `Basic Education Online Enrollment is Currently Closed`}
                      </h3>

                      <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                        {isEnrollmentOpen
                          ? priorApproved
                            ? isJhsContinuing
                              ? `Your official learner credentials and documentary requirements are certified on file from your previous approved enrollment. As Junior High School (Grades 7-10) follows a prescribed core curriculum, no electives are required. Click below for instant 1-click re-enrollment for ${semester}.`
                              : `Your learner credentials, family background, and official DepEd documents are verified and on file from your previous approved enrollment. Click below to choose your elective subjects and submit enrollment for ${semester}.`
                            : `Your student account is active. Click below to begin filling out the complete enrollment form for School Year ${schoolYear} (${semester}). Please review and double check all learner credentials and documentary requirements.`
                          : (closedMessage || "Online enrollment submission is temporarily closed by the Registrar's Office. You can view the official advisory notice below.")}
                      </p>

                      <div className="pt-2">
                        <Link
                          href="/enroll"
                          className={`inline-block text-xs font-bold py-3 px-8 rounded-[4px] ${
                            isEnrollmentOpen
                              ? "btn-primary"
                              : "bg-red-800 hover:bg-red-900 text-white shadow-xs"
                          }`}
                        >
                          {isEnrollmentOpen
                            ? priorApproved
                              ? isJhsContinuing
                                ? `1-Click Re-Enroll for ${semester} (Grade ${targetContinuingGrade} JHS)`
                                : `Continue Enrollment: Select Electives (S.Y. ${schoolYear} • ${semester})`
                              : `Start Online Enrollment Form (S.Y. ${schoolYear} • ${semester})`
                            : "View Official Enrollment Notice & Advisory"}
                        </Link>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Previous Academic Term Enrollment Records (Continuing Students) */}
            {pastApplications.length > 0 && (
              <div className="p-4 bg-white border border-slate-200/90 space-y-3 rounded-[4px] shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-700">
                    Previous Academic Term Records ({pastApplications.length})
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Archived Term History
                  </span>
                </div>
                <div className="space-y-2">
                  {pastApplications.map((pApp) => (
                    <div
                      key={pApp.id}
                      className="p-3 bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs rounded-[4px]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[#002060]">
                            {pApp.referenceNumber}
                          </span>
                          <span className="text-slate-600">
                            &bull; S.Y. {pApp.schoolYear} ({pApp.semester})
                          </span>
                          <span className="text-slate-500">
                            &bull; Grade {pApp.gradeLevel}
                          </span>
                        </div>
                        {pApp.remarks && (
                          <p className="text-[11px] text-slate-600 mt-1 italic">
                            Registrar Feedback: {pApp.remarks}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-[4px] ${
                            pApp.status === "Approved"
                              ? "bg-emerald-50 text-emerald-900 border border-emerald-400"
                              : pApp.status === "Needs Revision"
                              ? "bg-red-50 text-red-900 border border-red-400"
                              : "bg-amber-50 text-amber-900 border border-amber-400"
                          }`}
                        >
                          {pApp.status}
                        </span>
                        <Link
                          href={`/track?ref=${pApp.referenceNumber}`}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#002060] bg-white border border-slate-300 hover:bg-slate-100 transition-colors rounded-[4px]"
                        >
                          View Record &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Online Enrollment Video Tutorials by Grade Level (0 MB Storage Stream) */}
            <GradeLevelEnrollmentTutorials
              initialGrade={assignedSection?.gradeLevel || pastApplications[0]?.gradeLevel || 7}
              schoolYear={schoolYear}
              semester={semester}
              isEnrollmentOpen={isEnrollmentOpen}
            />
          </div>
        </div>
        )
      ) : (
        /* =========================================================================
           VIEW B: UNAUTHENTICATED STUDENT PORTAL (HERO + SPLIT AUTHENTICATION CARD)
           ========================================================================= */
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN (7 COLS): UNIFIED WELCOME & 4-STEP ENROLLMENT GUIDE */}
            <div className="lg:col-span-7 space-y-5 order-2 lg:order-1">
              {/* Unified Institutional Welcome & 4-Step Roadmap Card */}
              <section className="bg-white border border-slate-200/90 rounded-[4px] shadow-sm overflow-hidden">
                {/* Top Dark Navy Institutional Banner */}
                <div className="bg-gradient-to-br from-[#002060] via-[#002b80] to-[#071739] text-white p-6 sm:p-7 border-b-4 border-amber-400 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-[4px] text-[11px] font-bold uppercase tracking-wider border ${
                        isEnrollmentOpen
                          ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                          : "bg-red-500/20 text-red-200 border-red-400/40"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isEnrollmentOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span>
                        {isEnrollmentOpen
                          ? `Enrollment Open • S.Y. ${schoolYear || "2026-2027"} (${semester || "Trimester 1"})`
                          : `Enrollment Closed • S.Y. ${schoolYear || "2026-2027"}`}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-200 bg-white/10 border border-white/15 px-2.5 py-1 rounded-[4px]">
                      DepEd School ID: 300017
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                      Dumalneg, Ilocos Norte &bull; Junior &amp; Senior High School
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                      Online Basic Education Admission &amp; Continuing Enrollment
                    </h2>
                    <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                      Official learner gateway for incoming Grade 7, Grade 11, transferees, and continuing learners of Dumalneg National High School.
                    </p>
                  </div>
                </div>

                {/* Integrated 4-Step Enrollment Process */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-3">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      How to Enroll Online in 4 Simple Steps
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500">
                      Grades 7–10 (JHS) &amp; Grades 11–12 (SHS)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-[4px] flex items-start gap-3">
                      <div className="w-6 h-6 rounded-[4px] bg-[#002060] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Create Account &amp; Verify Gmail
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          Register with your PSA full name and active Gmail, then enter the 6-digit verification code.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-[4px] flex items-start gap-3">
                      <div className="w-6 h-6 rounded-[4px] bg-[#002060] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Fill Out Enrollment Form
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          Complete the 5-step DepEd form (or 1-click re-enrollment for continuing learners).
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-[4px] flex items-start gap-3">
                      <div className="w-6 h-6 rounded-[4px] bg-[#002060] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Upload School Documents
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          Submit clear copies of your PSA Birth Certificate, SF9 Report Card, and 2x2 ID Picture.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-[4px] flex items-start gap-3">
                      <div className="w-6 h-6 rounded-[4px] bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        4
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Track Status &amp; Class Section
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          View real-time Registrar approval, check your assigned section, and download your DepEd PDF.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Compact Collapsible Video Walkthrough Bar */}
              <AccountCreationTutorial
                onSwitchToRegister={() => {
                  setActiveTab("register");
                  setRegErrors({});
                  setRegSuccessNotice("");
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              />
            </div>

            {/* RIGHT COLUMN (5 COLS): STUDENT PORTAL AUTHENTICATION CARD (3D CARD FLIP) */}
            <div className="lg:col-span-5 order-1 lg:order-2" style={{ perspective: "1400px" }}>
              <div
                className="relative transition-transform duration-700 ease-in-out"
                style={{
                  transformStyle: "preserve-3d",
                  transform: activeTab === "register" ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* -------------------------------------------------------------
                    FRONT FACE: SIGN IN (0deg)
                    ------------------------------------------------------------- */}
                <div
                  className={`w-full bg-white border-2 border-[#002060] shadow-md rounded-[4px] overflow-hidden ${
                    activeTab === "signin"
                      ? "relative z-10 pointer-events-auto"
                      : "absolute inset-x-0 top-0 z-0 pointer-events-none select-none"
                  }`}
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(0deg)",
                  }}
                  inert={activeTab !== "signin" ? true : undefined}
                >
                  <div>
                    {/* Portal Card Institutional Header */}
                    <div className="bg-[#002060] text-white px-5 py-4 border-t-4 border-amber-400 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block">
                          Learner Gateway
                        </span>
                        <h2 className="text-base font-bold text-white tracking-tight">
                          Student Portal Access
                        </h2>
                      </div>
                      <span className="px-2 py-0.5 bg-white/10 border border-white/20 text-[10px] font-bold text-blue-100 rounded-[4px] shrink-0">
                        S.Y. {schoolYear || "2026-2027"}
                      </span>
                    </div>

                    {/* Clean Segmented Tab Switcher: Sign In vs Create Account */}
                    <div className="p-2 bg-slate-100 border-b border-slate-200 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("signin");
                          setLoginError("");
                        }}
                        className="py-2.5 px-3 text-xs font-bold rounded-[4px] transition-all cursor-pointer bg-[#002060] text-white shadow-xs"
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("register");
                          setRegErrors({});
                          setRegSuccessNotice("");
                        }}
                        className="py-2.5 px-3 text-xs font-bold rounded-[4px] transition-all cursor-pointer bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
                      >
                        Create Account
                      </button>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="space-y-5">
                      <div className="border-b border-slate-200 pb-3">
                        <h3 className="text-base font-bold text-slate-900">
                          Sign In to Your Learner Account
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Enter your registered email address and password to continue enrollment or check your application status.
                        </p>
                      </div>

                      {regSuccessNotice && (
                        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-600 border border-emerald-300 shadow-xs rounded-[4px]">
                          <span className="text-xs font-bold text-emerald-950 block mb-0.5">
                            Registration Successful &bull; Verification Sent
                          </span>
                          <p className="text-xs text-emerald-900 leading-relaxed">
                            {regSuccessNotice}
                          </p>
                        </div>
                      )}

                      {/* Gmail Verification Required Notice with 6-Digit Code Entry */}
                      {unconfirmedEmail && (
                        <div className="p-3.5 bg-amber-50 border-l-4 border-amber-500 border border-amber-300 shadow-xs space-y-2.5 rounded-[4px]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
                            <span className="text-xs font-bold text-amber-950">
                              6-Digit Email Verification Required
                            </span>
                          </div>
                          <p className="text-xs text-amber-950 leading-relaxed">
                            A 6-digit confirmation code was sent to <strong className="underline">{unconfirmedEmail}</strong>. Enter the code to activate your student account.
                          </p>
                          <div className="pt-1 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setOtpEmail(unconfirmedEmail);
                                setOtpCode("");
                                setOtpError("");
                                setOtpSuccess("");
                                setShowOtpModal(true);
                              }}
                              className="px-3.5 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs rounded-[4px]"
                            >
                              Enter 6-Digit Code
                            </button>
                            <button
                              type="button"
                              disabled={isResending || resendCooldown > 0}
                              onClick={handleResendVerification}
                              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer rounded-[4px]"
                            >
                              {isResending ? "Resending..." : resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}
                            </button>
                            {resendStatus && (
                              <span className="text-[11px] font-bold text-slate-800 block">
                                {resendStatus}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Real-time Authentication Progress Bar & Status */}
                      {isLoggingIn && (
                        <div className="p-3.5 bg-blue-50 border border-[#002060] shadow-xs space-y-2 rounded-[4px]">
                          <div className="flex items-center justify-between text-xs font-bold text-[#002060]">
                            <span>Signing in to Student Portal...</span>
                            <span>{loginProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 border border-blue-900/20 overflow-hidden rounded-full">
                            <div
                              className="bg-[#002060] h-full transition-all duration-300 ease-out"
                              style={{ width: `${loginProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-700 font-medium">
                            {loginStatusText || "Verifying credentials with Dumalneg NHS learner database..."}
                          </p>
                        </div>
                      )}

                      {loginError && (
                        <div className="p-3 bg-red-50 border-l-4 border-red-600 border border-red-300 rounded-[4px]">
                          <p className="text-xs font-bold text-red-900 leading-normal">
                            {loginError}
                          </p>
                        </div>
                      )}

                      <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="login-email" className="block text-xs font-bold text-slate-800 mb-1.5">
                            Registered Email Address <span className="text-red-700">*</span>
                          </label>
                          <input
                            id="login-email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            spellCheck={false}
                            enterKeyHint="next"
                            value={loginEmail}
                            onChange={(e) => {
                              setLoginEmail(e.target.value);
                              if (loginError) setLoginError("");
                            }}
                            placeholder="e.g. learner@gmail.com or 12-digit LRN"
                            className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px] transition-colors"
                            disabled={isLoggingIn}
                            required
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="current-password" className="block text-xs font-bold text-slate-800">
                              Password <span className="text-red-700">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword((prev) => !prev)}
                              className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer select-none"
                            >
                              {showLoginPassword ? "Hide Password" : "Show Password"}
                            </button>
                          </div>
                          <input
                            id="current-password"
                            name="password"
                            type={showLoginPassword ? "text" : "password"}
                            autoComplete="current-password"
                            enterKeyHint="done"
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              if (loginError) setLoginError("");
                            }}
                            placeholder="Enter your account password"
                            className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px] transition-colors"
                            disabled={isLoggingIn}
                            required
                          />
                        </div>

                        <div className="pt-1">
                          <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="btn-primary w-full text-xs font-bold py-3.5 disabled:opacity-60 disabled:cursor-not-allowed rounded-[4px] shadow-xs"
                          >
                            {isLoggingIn ? "Signing In... Please Wait" : "Sign In to Student Portal"}
                          </button>
                        </div>
                        <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100">
                          <button
                            type="button"
                            onClick={handleDirectGmailForgotPassword}
                            className="font-bold text-[#002060] hover:underline cursor-pointer text-left"
                          >
                            Forgot password? Contact / Email dumalnext@gmail.com
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConcernModalMode("track");
                              setShowConcernModal(true);
                            }}
                            className="text-slate-600 hover:text-slate-900 font-semibold hover:underline cursor-pointer text-[11px] shrink-0"
                          >
                            Track Concern Status &rarr;
                          </button>
                        </div>
                      </form>

                      <div className="pt-3 border-t border-slate-200 text-center">
                        <p className="text-xs text-slate-600">
                          New applicant or first time using the online portal?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("register");
                              setRegErrors({});
                              setRegSuccessNotice("");
                            }}
                            className="font-bold text-[#002060] hover:underline cursor-pointer"
                          >
                            Create a Student Account &rarr;
                          </button>
                        </p>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

                {/* -------------------------------------------------------------
                    BACK FACE: CREATE ACCOUNT (180deg)
                    ------------------------------------------------------------- */}
                <div
                  className={`w-full bg-white border-2 border-[#002060] shadow-md rounded-[4px] overflow-hidden ${
                    activeTab === "register"
                      ? "relative z-10 pointer-events-auto"
                      : "absolute inset-x-0 top-0 z-0 pointer-events-none select-none"
                  }`}
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                  inert={activeTab !== "register" ? true : undefined}
                >
                  <div>
                    {/* Portal Card Institutional Header */}
                    <div className="bg-[#002060] text-white px-5 py-4 border-t-4 border-amber-400 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block">
                          Learner Gateway
                        </span>
                        <h2 className="text-base font-bold text-white tracking-tight">
                          Student Portal Access
                        </h2>
                      </div>
                      <span className="px-2 py-0.5 bg-white/10 border border-white/20 text-[10px] font-bold text-blue-100 rounded-[4px] shrink-0">
                        S.Y. {schoolYear || "2026-2027"}
                      </span>
                    </div>

                    {/* Clean Segmented Tab Switcher: Sign In vs Create Account */}
                    <div className="p-2 bg-slate-100 border-b border-slate-200 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("signin");
                          setLoginError("");
                        }}
                        className="py-2.5 px-3 text-xs font-bold rounded-[4px] transition-all cursor-pointer bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("register");
                          setRegErrors({});
                          setRegSuccessNotice("");
                        }}
                        className="py-2.5 px-3 text-xs font-bold rounded-[4px] transition-all cursor-pointer bg-[#002060] text-white shadow-xs"
                      >
                        Create Account
                      </button>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-3">
                        <h3 className="text-base font-bold text-slate-900">
                          Create Student Applicant Account
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Enter your official PSA name and active Gmail address to start your online enrollment.
                        </p>
                      </div>

                      {/* Real-time Registration Progress Bar & Status */}
                      {isRegistering && (
                        <div className="p-3.5 bg-blue-50 border border-[#002060] shadow-xs space-y-2 rounded-[4px]">
                          <div className="flex items-center justify-between text-xs font-bold text-[#002060]">
                            <span>Registering Student Account...</span>
                            <span>{regProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 border border-blue-900/20 overflow-hidden rounded-full">
                            <div
                              className="bg-[#002060] h-full transition-all duration-300 ease-out"
                              style={{ width: `${regProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-700 font-medium">
                            {regStatusText || "Saving applicant credentials in DepEd Dumalneg NHS registry..."}
                          </p>
                        </div>
                      )}

                      {regErrors.form && (
                        <div className="p-3 bg-red-50 border-l-4 border-red-600 border border-red-300 rounded-[4px]">
                          <p className="text-xs font-bold text-red-900 leading-normal">
                            {regErrors.form}
                          </p>
                        </div>
                      )}

                      <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                        {/* Name Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="signup-last-name" className="block text-xs font-bold text-slate-800 mb-1">
                              Last Name <span className="text-red-700">*</span>
                            </label>
                            <input
                              id="signup-last-name"
                              name="lastName"
                              type="text"
                              autoComplete="family-name"
                              enterKeyHint="next"
                              value={regForm.lastName}
                              onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                              placeholder="e.g. AGCAOILI"
                              className="w-full p-2.5 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px]"
                              disabled={isRegistering}
                              required
                            />
                            {regErrors.lastName && (
                              <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.lastName}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="signup-first-name" className="block text-xs font-bold text-slate-800 mb-1">
                              First Name <span className="text-red-700">*</span>
                            </label>
                            <input
                              id="signup-first-name"
                              name="firstName"
                              type="text"
                              autoComplete="given-name"
                              enterKeyHint="next"
                              value={regForm.firstName}
                              onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                              placeholder="e.g. MARK ANTHONY"
                              className="w-full p-2.5 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px]"
                              disabled={isRegistering}
                              required
                            />
                            {regErrors.firstName && (
                              <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.firstName}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor="signup-middle-name" className="block text-xs font-bold text-slate-800">
                              Middle Name {!noMiddleName && <span className="text-red-700">*</span>}
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={noMiddleName}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setNoMiddleName(checked);
                                  if (checked) {
                                    setRegForm({ ...regForm, middleName: "" });
                                    if (regErrors.middleName) {
                                      setRegErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.middleName;
                                        return next;
                                      });
                                    }
                                  }
                                }}
                                className="accent-[#002060] rounded cursor-pointer"
                                disabled={isRegistering}
                              />
                              <span>No Middle Name</span>
                            </label>
                          </div>
                          <input
                            id="signup-middle-name"
                            name="middleName"
                            type="text"
                            autoComplete="additional-name"
                            enterKeyHint="next"
                            value={noMiddleName ? "N/A" : regForm.middleName}
                            onChange={(e) => {
                              setRegForm({ ...regForm, middleName: e.target.value });
                              if (regErrors.middleName) {
                                setRegErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.middleName;
                                  return next;
                                });
                              }
                            }}
                            placeholder={noMiddleName ? "N/A" : "e.g. CASTRO"}
                            className={`w-full p-2.5 border-2 text-xs font-bold uppercase outline-none rounded-[4px] ${
                              noMiddleName
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-slate-50/70 focus:bg-white border-slate-300 focus:border-[#002060]"
                            }`}
                            disabled={isRegistering || noMiddleName}
                          />
                          {regErrors.middleName && (
                            <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.middleName}</p>
                          )}
                        </div>

                        {/* Email Address */}
                        <div>
                          <label htmlFor="signup-email" className="block text-xs font-bold text-slate-800 mb-1">
                            Active Gmail Address <span className="text-red-700">*</span>
                          </label>
                          <input
                            id="signup-email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            spellCheck={false}
                            enterKeyHint="next"
                            value={regForm.email}
                            onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                            placeholder="mark.agcaoili@gmail.com"
                            className="w-full p-2.5 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px]"
                            disabled={isRegistering}
                            required
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            We will send a 6-digit verification code and application updates to this email.
                          </p>
                          {regErrors.email && (
                            <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.email}</p>
                          )}
                        </div>

                        {/* Passwords */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor="new-password" className="block text-xs font-bold text-slate-800">
                              Create Password <span className="text-red-700">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowRegPassword((prev) => !prev)}
                              className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer select-none"
                            >
                              {showRegPassword ? "Hide Password" : "Show Password"}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <input
                                id="new-password"
                                name="new-password"
                                type={showRegPassword ? "text" : "password"}
                                autoComplete="new-password"
                                enterKeyHint="next"
                                value={regForm.password}
                                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                                placeholder="Min. 6 characters"
                                className="w-full p-2.5 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px]"
                                disabled={isRegistering}
                                required
                              />
                              {regErrors.password && (
                                <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.password}</p>
                              )}
                            </div>

                            <div>
                              <input
                                id="confirm-password"
                                name="confirm-password"
                                aria-label="Confirm Password"
                                type={showRegPassword ? "text" : "password"}
                                autoComplete="new-password"
                                enterKeyHint="done"
                                value={regForm.confirmPassword}
                                onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                placeholder="Confirm password"
                                className="w-full p-2.5 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px]"
                                disabled={isRegistering}
                                required
                              />
                              {regErrors.confirmPassword && (
                                <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.confirmPassword}</p>
                              )}
                            </div>
                          </div>
                          <PasswordStrengthMeter
                            password={regForm.password}
                            confirmPassword={regForm.confirmPassword}
                          />
                        </div>

                        <div className="p-3 bg-blue-50/60 border border-blue-200 text-[11px] text-slate-700 rounded-[4px]">
                          <strong className="text-[#002060] block mb-0.5">
                            Note on LRN &amp; School Documents:
                          </strong>
                          Your 12-digit LRN, PSA Birth Certificate, and SF9 Report Card will be entered in the 5-step enrollment form right after creating your account.
                        </div>

                        <div className="pt-1">
                          <button
                            type="submit"
                            disabled={isRegistering}
                            className="btn-primary w-full text-xs font-bold py-3.5 disabled:opacity-60 disabled:cursor-not-allowed rounded-[4px] shadow-xs"
                          >
                            {isRegistering ? "Creating Account... Please Wait" : "Create Student Account"}
                          </button>
                        </div>
                      </form>

                      <div className="pt-3 border-t border-slate-200 text-center">
                        <p className="text-xs text-slate-600">
                          Already have a registered student account?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("signin");
                              setLoginError("");
                            }}
                            className="font-bold text-[#002060] hover:underline cursor-pointer"
                          >
                            Sign In here &rarr;
                          </button>
                        </p>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Institutional Section: Enrollment Classifications & Documentary Requirements */}
          <section className="bg-white p-6 sm:p-7 border border-slate-200/90 rounded-[4px] shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#002060] block">
                  DepEd Admission Guidelines &amp; Requirements
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Learner Classifications &amp; Documentary Checklist
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                School Year {schoolYear || "2026-2027"} &bull; {semester || "Trimester 1"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <div className="p-5 bg-slate-50/80 border border-slate-200/90 border-t-4 border-t-[#002060] rounded-[4px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-blue-100 text-[#002060] text-[10px] font-bold uppercase tracking-wider rounded-[4px]">
                    Incoming Grade 7
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">Junior High School</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Elementary Completers &amp; JHS Applicants
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Choose between the Regular JHS Curriculum or the Special Program in Sports (SPS). Prepare your 12-digit LRN, PSA Birth Certificate, and Grade 6 SF9 (Form 138).
                </p>
              </div>

              <div className="p-5 bg-slate-50/80 border border-slate-200/90 border-t-4 border-t-amber-500 rounded-[4px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider rounded-[4px]">
                    Grade 11 &amp; Transferees
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">Senior High School</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  SHS Track, Strand &amp; Trimester Electives
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  For Grade 10 completers and transferees. Select your Academic or Tech-Pro pathway, choose trimester electives, and upload your certified SF9 &amp; PSA Birth Certificate.
                </p>
              </div>

              <div className="p-5 bg-slate-50/80 border border-slate-200/90 border-t-4 border-t-emerald-600 rounded-[4px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-bold uppercase tracking-wider rounded-[4px]">
                    Grades 8–10 &amp; Grade 12
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">Continuing Learners</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  1-Click Re-Enrollment &amp; Official DepEd PDF
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Continuing Dumalneg NHS learners have verified records on file for fast re-enrollment, automatic section roster placement, and official 2-page DepEd PDF download.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: 6-DIGIT GMAIL SECURITY CODE VERIFICATION */}
      {/* ========================================================================= */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs ">
          <div className="bg-white border-4 border-[#002060] w-full max-w-md shadow-2xl overflow-hidden rounded-[4px]">
            {/* Modal Header */}
            <div className="bg-[#002060] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-blue-200 block">
                  Security Verification &bull; Step 2 of 2
                </span>
                <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                  Enter 6-Digit Verification Code
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-white hover:text-slate-300 text-2xl font-bold px-2 cursor-pointer"
                title="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                An official 6-digit confirmation code has been dispatched to your Gmail address:
                <strong className="block text-[#002060] text-sm mt-1 break-all bg-blue-50/60 p-2 border border-blue-200 rounded-[4px]">
                  {otpEmail}
                </strong>
              </p>

              {otpSuccess && (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-500 text-emerald-950 text-xs font-bold rounded-[4px]">
                  {otpSuccess}
                </div>
              )}

              {otpError && (
                <div className="p-3 bg-red-50 border-2 border-red-400 text-red-950 text-xs font-bold rounded-[4px]">
                  {otpError}
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 text-center mb-1">
                    Enter Verification Code
                  </label>
                  <SeparatedOtpInput
                    value={otpCode}
                    onChange={(val) => {
                      setOtpCode(val);
                      if (otpError) setOtpError("");
                    }}
                    length={6}
                    hasError={!!otpError}
                    disabled={isVerifyingOtp}
                    autoFocus={true}
                  />
                  <span className="text-[10px] text-slate-500 text-center block mt-1">
                    Please check your Gmail Inbox (or Spam folder) for the verification code.
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.replace(/\D/g, "").length < 6}
                    className="w-full py-3 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer rounded-[4px]"
                  >
                    {isVerifyingOtp ? "Verifying Code..." : "Verify & Activate Account"}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isResending}
                      onClick={handleOtpResend}
                      className="text-xs font-bold text-[#002060] hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer rounded-[4px]"
                    >
                      {resendCooldown > 0
                        ? `Resend Code (${resendCooldown}s)`
                        : isResending
                        ? "Resending..."
                        : "Resend Code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpModal(false);
                        setActiveTab("register");
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Change Email / Back
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}



      {showConcernModal && (
        <StudentConcernModal
          isOpen={showConcernModal}
          onClose={() => setShowConcernModal(false)}
          initialMode={concernModalMode}
          initialCategory={concernCategory}
          prefillName={user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : ""}
          prefillEmail={user?.email || loginEmail || ""}
          prefillLrn={user?.lrn || ""}
        />
      )}

      {/* Password Reset Modal (When Password Removed by IT) */}
      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        initialIdentifier={resetIdentifier || loginEmail}
        initialMaskedEmail={resetMaskedEmail}
        onSuccess={async (ident, newPass) => {
          setLoginEmail(ident);
          setLoginPassword(newPass);
          await login(ident, newPass);
        }}
      />

      {/* Identity Recovery Modal (When Both Email & Password Removed by IT) */}
      <IdentityRecoveryModal
        isOpen={showIdentityRecoveryModal}
        onClose={() => setShowIdentityRecoveryModal(false)}
        initialLrn={recoveryLrn || (loginEmail.length === 12 ? loginEmail : "")}
        onSuccess={async (newEm, newPass) => {
          setLoginEmail(newEm);
          setLoginPassword(newPass);
          await login(newEm, newPass);
        }}
      />
    </div>
  );
}

export default function StudentHomePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Loading Dumalneg NHS Student Portal...
        </div>
      }
    >
      <StudentHomeContent />
    </Suspense>
  );
}

