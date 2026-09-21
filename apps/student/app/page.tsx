"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { downloadDepEdEnrollmentPdf } from "@/lib/utils/depedPdfGenerator";
import { createClient } from "@/lib/supabase/client";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import { isApplicationInTerm } from "@/lib/utils/academicTerm";

function StudentHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get("tab");
  const noticeQuery = searchParams.get("notice") || searchParams.get("reason");
  const { user, login, register, verifyEmailOtp, resendVerification, logout } = useAuth();
  const { isEnrollmentOpen, schoolYear, semester, termNumber, closedMessage } = useEnrollmentControl();

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
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [loginStatusText, setLoginStatusText] = useState("");

  // Registration Form State (Phase 1: Email First)
  const [regForm, setRegForm] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Real-Time Automatic Synchronization of Logged-In User's Application & Section (Zero-Refresh)
  useEffect(() => {
    if (!user) {
      setUserApplication(null);
      setPastApplications([]);
      setAssignedSection(null);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    const fetchApp = async () => {
      try {
        const { data: stData } = await supabase
          .from("students")
          .select("id, current_section_id, grade_level, strand")
          .or(`student_id.eq.${user.lrn || user.userId},user_id.eq.${user.id}`)
          .limit(1);

        if (stData && stData.length > 0) {
          const studentRec = stData[0];

          // Fetch Section if assigned
          if (studentRec.current_section_id) {
            const { data: secData } = await supabase
              .from("sections")
              .select("id, section_name, grade_level, strand")
              .eq("id", studentRec.current_section_id)
              .limit(1);

            if (isMounted) {
              if (secData && secData.length > 0) {
                setAssignedSection({
                  name: secData[0].section_name,
                  gradeLevel: secData[0].grade_level,
                  strand: secData[0].strand,
                });
              } else {
                setAssignedSection(null);
              }
            }
          } else {
            if (isMounted) {
              setAssignedSection(null);
            }
          }

          const { data: appData } = await supabase
            .from("enrollment_applications")
            .select("*")
            .eq("student_id", studentRec.id)
            .order("created_at", { ascending: false });

          if (isMounted && appData) {
            // Find application for CURRENT ACTIVE academic term (School Year & Term/Trimester)
            const activeApp = appData.find((a: any) =>
              isApplicationInTerm(a, schoolYear, termNumber || semester)
            );

            // Filter out past semester/school year applications
            const otherApps = appData.filter((a: any) => a.id !== activeApp?.id);

            if (activeApp) {
              const fd = Array.isArray(activeApp.selected_electives) && activeApp.selected_electives.length > 0
                ? activeApp.selected_electives[0]
                : (typeof activeApp.selected_electives === "object" && activeApp.selected_electives !== null ? activeApp.selected_electives : {});

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
                schoolYear: activeApp.school_year || schoolYear || "2026-2027",
                semester: fd.term_name || fd.termName || fd.semester || fd.term || semester || "Trimester 1",
                formData: fd,
              });
            } else {
              setUserApplication(null);
            }

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
                  schoolYear: oa.school_year || "2026-2027",
                  semester: pastTerm,
                  remarks: oa.admin_feedback,
                };
              })
            );
            return;
          }
        }
        if (isMounted) {
          setUserApplication(null);
          setPastApplications([]);
          setAssignedSection(null);
        }
      } catch (e) {
        console.error("Error reading Supabase applications:", e);
        if (isMounted) {
          setUserApplication(null);
          setPastApplications([]);
          setAssignedSection(null);
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

    // 4. 10-Second Silent Heartbeat Polling
    const heartbeat = setInterval(fetchApp, 10000);

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
          middleName: regForm.middleName.trim().toUpperCase(),
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

  // Handle OTP Verification Submit (Supports both 6-digit and 8-digit codes)
  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = otpCode.replace(/\D/g, "");
    if (!otpEmail || clean.length < 6 || clean.length > 8) {
      setOtpError("Please enter the complete verification code (6 to 8 digits).");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      const res = await verifyEmailOtp(otpEmail, clean);
      if (res.success) {
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
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      {/* DepEd & DNHS Institutional Banner */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
        <span className="text-xs font-bold tracking-widest text-[#002060] uppercase block mb-1">
          [ DepEd Region I &bull; Schools Division of Ilocos Norte &bull; Dumalneg NHS ]
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Basic Education Online Enrollment &amp; Admission Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
          Official admission gateway for Dumalneg National High School (School ID: 300017). 
          Serving incoming Grade 7, Grade 11 (SHS), Transferees, and Returning Learners across Barangays Cabaritan, Kalabakan, Quibel, and San Isidro.
        </p>
      </section>

      {/* Access Restriction Notice (When redirected from protected routes) */}
      {noticeQuery === "auth_required" && (
        <div className="p-4 bg-amber-50 border-2 border-amber-500 shadow-xs">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1">
            [ ACCESS RESTRICTED: AUTHENTICATION REQUIRED ]
          </span>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            You must <strong>Sign In</strong> to your student account or <strong>Create a New Account</strong> below 
            before you can access the Online Enrollment Form or track an existing application.
          </p>
        </div>
      )}

      {/* =========================================================================
          VIEW A: AUTHENTICATED USER CONSOLE (ALREADY SIGNED IN)
          ========================================================================= */}
      {user ? (
        <div className="space-y-6">
          {/* Welcome User Banner */}
          <div className="bg-white border-2 border-[#002060] p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-0.5">
                  [ Authenticated Applicant Account ]
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Welcome back, {user.firstName} {user.lastName}
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Registered Email: <strong className="text-slate-900">{user.email}</strong> &bull; Account ID: <span className="font-mono">{user.userId}</span>
                  {user.lrn && /^\d{12}$/.test(user.lrn) && (
                    <> &bull; DepEd LRN: <span className="font-mono font-bold text-[#002060]">{user.lrn}</span></>
                  )}
                </p>
              </div>
            </div>

            {/* Section Assignment Status Card */}
            {assignedSection ? (
              <div className="p-3.5 sm:p-4 bg-emerald-50 border-2 border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-widest block">
                      [ SECTION ASSIGNED ]
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-200/80 text-emerald-950 font-mono text-[10px] font-bold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                      Official Roster
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-emerald-950 uppercase">
                    Assigned in Section: <span className="underline font-black">{assignedSection.name}</span>
                  </div>
                  <div className="text-xs font-mono text-emerald-800">
                    Grade {assignedSection.gradeLevel} {assignedSection.strand ? `• ${assignedSection.strand}` : ""}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 inline-block uppercase">
                    Official Class Placement
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 sm:p-4 bg-amber-50 border-2 border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-widest block">
                      [ SECTION STATUS ]
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200/80 text-amber-950 font-mono text-[10px] font-bold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                      Pending Placement
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-amber-950">
                    You&apos;re not yet assigned to a section
                  </div>
                  <p className="text-xs text-amber-800">
                    Awaiting official section placement from the school administrator.
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 inline-block uppercase">
                    In Queue for Placement
                  </span>
                </div>
              </div>
            )}

            {/* Application Status Card */}
            {userApplication ? (
              <div className="p-4 sm:p-5 bg-slate-50 border-2 border-slate-300 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">
                      Submitted Enrollment Application (S.Y. {userApplication.schoolYear} &bull; {userApplication.semester})
                    </span>
                    <span className="text-base font-bold font-mono text-[#002060]">
                      {userApplication.referenceNumber}
                    </span>
                  </div>
                  <div>
                    {userApplication.status === "Approved" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border-2 border-emerald-500 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 border border-emerald-700 shrink-0" />
                        [ STATUS: APPROVED &amp; OFFICIALLY ENROLLED ]
                      </span>
                    ) : userApplication.status === "Needs Revision" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-red-50 text-red-900 border-2 border-red-500 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-red-600 border border-red-700 shrink-0" />
                        [ STATUS: NEEDS REVISION / ACTION REQUIRED ]
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border-2 border-amber-400 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500 border border-amber-600 shrink-0" />
                        [ STATUS: PENDING REGISTRAR VERIFICATION ]
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
                    <strong className="text-slate-900 font-mono">
                      {new Date(userApplication.applicationDate).toLocaleDateString()}
                    </strong>
                  </div>
                </div>

                {userApplication.remarks && (
                  <div className="p-3 bg-white border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5 uppercase tracking-wide">
                      Registrar Notes / Remarks:
                    </span>
                    <p className="text-slate-800">{userApplication.remarks}</p>
                  </div>
                )}

                {/* Actions for Application */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    href={`/track?ref=${userApplication.referenceNumber}`}
                    className="btn-primary text-xs uppercase font-bold py-2.5 px-4"
                  >
                    View / Track Application Details
                  </Link>

                  {userApplication.status === "Approved" && (
                    <Link
                      href={`/track?ref=${userApplication.referenceNumber}#timetable`}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider shadow-xs inline-flex items-center gap-1"
                    >
                      [ View Enrolled Subjects &amp; Timetable &rarr; ]
                    </Link>
                  )}

                  {userApplication.status === "Needs Revision" && (
                    <Link
                      href="/enroll"
                      className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold uppercase tracking-wider shadow-xs"
                    >
                      [ Edit &amp; Resubmit Application ]
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
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase px-4 py-2.5 transition-colors"
                    >
                      {isDownloadingPdf ? "Generating Official PDF..." : "Download Official DepEd Form (PDF)"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* User has not yet submitted an enrollment application for active term */
              <div className={`p-6 border space-y-4 text-center ${
                !isEnrollmentOpen ? "bg-red-50/60 border-red-300" : "bg-slate-50 border-slate-300"
              }`}>
                <div className="flex items-center justify-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${
                    isEnrollmentOpen ? "bg-emerald-500" : "bg-red-500"
                  }`} />
                  <span className={`text-xs font-mono font-bold uppercase ${
                    isEnrollmentOpen ? "text-emerald-900" : "text-red-900"
                  }`}>
                    [ ONLINE ENROLLMENT: {isEnrollmentOpen ? `OPEN FOR S.Y. ${schoolYear} • ${semester}` : `CLOSED FOR S.Y. ${schoolYear} • ${semester}`} ]
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
                              ? `Ready to Enroll for S.Y. ${schoolYear} (${semester})? [Continuing JHS Learner]`
                              : `Ready to Enroll for S.Y. ${schoolYear} (${semester})? [Continuing SHS Learner]`
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
                          className={`inline-block text-xs uppercase tracking-wider font-bold py-3 px-8 ${
                            isEnrollmentOpen
                              ? "btn-primary"
                              : "bg-red-800 hover:bg-red-900 text-white shadow-xs"
                          }`}
                        >
                          {isEnrollmentOpen
                            ? priorApproved
                              ? isJhsContinuing
                                ? `[ 1-Click Re-Enroll for ${semester} (Grade ${targetContinuingGrade} JHS) ]`
                                : `Continue Enrollment: Select Electives (S.Y. ${schoolYear} • ${semester})`
                              : `Start Online Enrollment Form (S.Y. ${schoolYear} • ${semester})`
                            : "[ View Official Enrollment Notice & Advisory ]"}
                        </Link>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Previous Academic Term Enrollment Records (Continuing Students) */}
            {pastApplications.length > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-300 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                    [ Previous Academic Term Records ({pastApplications.length}) ]
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Archived Term History
                  </span>
                </div>
                <div className="space-y-2">
                  {pastApplications.map((pApp) => (
                    <div
                      key={pApp.id}
                      className="p-3 bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-[#002060]">
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
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
                          className="px-2.5 py-1 text-[11px] font-bold text-[#002060] bg-slate-100 border border-slate-300 hover:bg-slate-200 transition-colors"
                        >
                          View Record &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
           VIEW B: UNAUTHENTICATED APPLICANT PORTAL (LOGIN OR REGISTER FIRST)
           ========================================================================= */
        <div className="bg-white border-2 border-[#002060] shadow-sm">
          {/* Tab Selector: Sign In vs Create Account */}
          <div className="grid grid-cols-2 border-b-2 border-slate-200 text-center font-bold text-xs uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setLoginError("");
              }}
              className={`py-3.5 sm:py-4 px-2 sm:px-4 text-[11px] sm:text-xs min-h-[44px] transition-colors ${
                activeTab === "signin"
                  ? "bg-[#002060] text-white border-b-2 border-[#002060]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              [ Tab 1: Sign In ]
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setRegErrors({});
                setRegSuccessNotice("");
              }}
              className={`py-3.5 sm:py-4 px-2 sm:px-4 text-[11px] sm:text-xs min-h-[44px] transition-colors ${
                activeTab === "register"
                  ? "bg-[#002060] text-white border-b-2 border-[#002060]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              [ Tab 2: Create Account ]
            </button>
          </div>

          <div className="p-4 sm:p-8">
            {/* -----------------------------------------------------------------
                TAB 1: SIGN IN FORM (PHASE 1: EMAIL FIRST)
                ----------------------------------------------------------------- */}
            {activeTab === "signin" && (
              <div className="max-w-md mx-auto space-y-6">
                <div className="border-b border-slate-200 pb-3 text-center">
                  <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
                    [ Phase 1: Student Account Authentication ]
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    Sign In to Student Portal
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Enter your registered <strong>Email Address</strong> and password to access online enrollment and track records.
                  </p>
                </div>

                {regSuccessNotice && (
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-600 shadow-xs">
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block mb-1">
                      [ REGISTRATION SUCCESSFUL &bull; VERIFICATION LINK SENT ]
                    </span>
                    <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                      {regSuccessNotice}
                    </p>
                  </div>
                )}

                {/* Gmail Verification Required Notice with 6-Digit Code Entry */}
                {unconfirmedEmail && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-600 shadow-xs space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse shrink-0" />
                      <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        [ 6-DIGIT GMAIL VERIFICATION CODE REQUIRED ]
                      </span>
                    </div>
                    <p className="text-xs text-amber-950 leading-relaxed font-medium">
                      A 6-digit confirmation code was dispatched to: <strong className="font-mono underline">{unconfirmedEmail}</strong>.
                      Please enter the 6-digit code to activate your account and access enrollment.
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
                        className="px-3.5 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                      >
                        [ Enter 6-Digit Code ]
                      </button>
                      <button
                        type="button"
                        disabled={isResending || resendCooldown > 0}
                        onClick={handleResendVerification}
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-400 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        {isResending ? "Resending..." : resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "[ Resend Code ]"}
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
                  <div className="p-4 bg-blue-50 border-2 border-[#002060] shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-[#002060]">
                      <span>[ SYSTEM AUTHENTICATING ]</span>
                      <span>{loginProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 border border-blue-900/30 overflow-hidden">
                      <div
                        className="bg-[#002060] h-full transition-all duration-300 ease-out"
                        style={{ width: `${loginProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-800 font-medium">
                      {loginStatusText || "Verifying credentials with Dumalneg NHS learner database..."}
                    </p>
                  </div>
                )}

                {loginError && (
                  <div className="p-3 bg-red-50 border-2 border-red-400">
                    <p className="text-xs font-bold text-red-900 leading-normal">
                      [ AUTHENTICATION ERROR ]: {loginError}
                    </p>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                      Registered Email Address <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        if (loginError) setLoginError("");
                      }}
                      placeholder="e.g. student@example.com"
                      className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none disabled:bg-slate-100"
                      disabled={isLoggingIn}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Enter the email address registered during account creation.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                      Account Password <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (loginError) setLoginError("");
                      }}
                      placeholder="Enter account password"
                      className="w-full p-3 bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none disabled:bg-slate-100"
                      disabled={isLoggingIn}
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="btn-primary w-full text-xs uppercase tracking-wider font-bold py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoggingIn ? "[ AUTHENTICATING... PLEASE WAIT ]" : "Sign In & Proceed to Student Portal"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* -----------------------------------------------------------------
                TAB 2: CREATE ACCOUNT FORM (PHASE 1: EMAIL FIRST)
                ----------------------------------------------------------------- */}
            {activeTab === "register" && (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="border-b border-slate-200 pb-3 text-center">
                  <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
                    [ Phase 1: New Learner Registration ]
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    Create Student Applicant Account
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Register with your official name and <strong>Email Address</strong>. 
                    Your account will track your enrollment submission and link your documents.
                  </p>
                </div>

                {/* Real-time Registration Progress Bar & Status */}
                {isRegistering && (
                  <div className="p-4 bg-blue-50 border-2 border-[#002060] shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-[#002060]">
                      <span>[ SYSTEM REGISTERING APPLICANT ]</span>
                      <span>{regProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 border border-blue-900/30 overflow-hidden">
                      <div
                        className="bg-[#002060] h-full transition-all duration-300 ease-out"
                        style={{ width: `${regProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-800 font-medium">
                      {regStatusText || "Saving applicant credentials in DepEd Dumalneg NHS registry..."}
                    </p>
                  </div>
                )}

                {regErrors.form && (
                  <div className="p-3 bg-red-50 border-2 border-red-400">
                    <p className="text-xs font-bold text-red-900 leading-normal">
                      [ REGISTRATION NOTICE ]: {regErrors.form}
                    </p>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                        Last Name <span className="text-red-700">*</span>
                      </label>
                      <input
                        type="text"
                        value={regForm.lastName}
                        onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                        placeholder="e.g. AGCAOILI"
                        className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none disabled:bg-slate-100"
                        disabled={isRegistering}
                        required
                      />
                      {regErrors.lastName && (
                        <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.lastName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                        First Name <span className="text-red-700">*</span>
                      </label>
                      <input
                        type="text"
                        value={regForm.firstName}
                        onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                        placeholder="e.g. MARK ANTHONY"
                        className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none disabled:bg-slate-100"
                        disabled={isRegistering}
                        required
                      />
                      {regErrors.firstName && (
                        <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        value={regForm.middleName}
                        onChange={(e) => setRegForm({ ...regForm, middleName: e.target.value })}
                        placeholder="e.g. CASTRO"
                        className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none disabled:bg-slate-100"
                        disabled={isRegistering}
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                      Account Email Address <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="e.g. mark.agcaoili@example.com"
                      className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-mono font-bold focus:border-[#002060] outline-none disabled:bg-slate-100"
                      disabled={isRegistering}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Official notifications, application reference numbers, and verification updates will be sent to this email.
                    </p>
                    {regErrors.email && (
                      <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.email}</p>
                    )}
                  </div>

                  {/* Passwords */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                        Security Password <span className="text-red-700">*</span>
                      </label>
                      <input
                        type="password"
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        placeholder="At least 6 characters"
                        className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none disabled:bg-slate-100"
                        disabled={isRegistering}
                        required
                      />
                      {regErrors.password && (
                        <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.password}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                        Confirm Password <span className="text-red-700">*</span>
                      </label>
                      <input
                        type="password"
                        value={regForm.confirmPassword}
                        onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                        placeholder="Re-type password"
                        className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none disabled:bg-slate-100"
                        disabled={isRegistering}
                        required
                      />
                      {regErrors.confirmPassword && (
                        <p className="text-[10px] text-red-700 font-bold mt-1">{regErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                    <strong className="text-slate-800 block mb-0.5 uppercase tracking-wide">
                      [ DepEd Enrollment Notice ]:
                    </strong>
                    Your 12-digit Learner Reference Number (LRN), Dumalneg Elementary School background, and document attachments 
                    (PSA Birth Certificate, Form 138 / SF9 Report Card) will be encoded inside the 5-step enrollment form after registration.
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="btn-primary w-full text-xs uppercase tracking-wider font-bold py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isRegistering ? "[ CREATING ACCOUNT... PLEASE WAIT ]" : "Create Account & Register"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Institutional Services Reference Section */}
      <section className="bg-slate-100 p-6 border border-slate-200">
        <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase mb-3">
          [ Dumalneg National High School Enrollment Services ]
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-4 border border-slate-300">
            <strong className="text-slate-900 block mb-1">1. 5-Step Enrollment Stepper:</strong>
            <p className="text-slate-600">
              Grade 7 &amp; Grade 11 online enrollment with JHS Regular vs SPS programs, feeder school auto-select, and compressed document uploads.
            </p>
          </div>
          <div className="bg-white p-4 border border-slate-300">
            <strong className="text-slate-900 block mb-1">2. Live Application Tracking:</strong>
            <p className="text-slate-600">
              Real-time colored status badges ([ Pending ], [ Approved ], [ Needs Revision ]) with registrar feedback and document re-upload.
            </p>
          </div>
          <div className="bg-white p-4 border border-slate-300">
            <strong className="text-slate-900 block mb-1">3. Official DepEd PDF Form:</strong>
            <p className="text-slate-600">
              Securely generated 2-page DepEd Basic Education Enrollment Form, unlocked automatically upon School Registrar approval.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL: 6-DIGIT GMAIL SECURITY CODE VERIFICATION */}
      {/* ========================================================================= */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white border-4 border-[#002060] w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#002060] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-200 block">
                  [ SECURITY VERIFICATION &bull; STEP 2 OF 2 ]
                </span>
                <h3 className="text-lg font-bold uppercase tracking-tight text-white mt-0.5">
                  Enter 6-Digit Verification Code
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-white hover:text-slate-300 font-mono text-2xl font-bold px-2 cursor-pointer"
                title="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                An official 6-digit confirmation code has been dispatched to your Gmail address:
                <strong className="block text-[#002060] font-mono text-sm mt-1 break-all bg-blue-50/60 p-2 border border-blue-200">
                  {otpEmail}
                </strong>
              </p>

              {otpSuccess && (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-500 text-emerald-950 text-xs font-bold">
                  {otpSuccess}
                </div>
              )}

              {otpError && (
                <div className="p-3 bg-red-50 border-2 border-red-500 text-red-950 text-xs font-bold">
                  {otpError}
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase text-center mb-2">
                    Enter Verification Code (6 to 8 Digits)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                      setOtpCode(val);
                      if (otpError) setOtpError("");
                    }}
                    placeholder="______"
                    className="w-full text-center font-mono font-bold text-2xl sm:text-3xl tracking-[0.25em] p-3 border-2 border-[#002060] bg-blue-50/40 text-[#002060] outline-none placeholder:text-slate-300"
                  />
                  <span className="text-[10px] text-slate-500 text-center block mt-1">
                    Please check your Gmail Inbox (or Spam folder) for the verification code.
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.replace(/\D/g, "").length < 6}
                    className="w-full py-3 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                  >
                    {isVerifyingOtp ? "[ Verifying Code... ]" : "[ Verify & Activate Account ]"}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isResending}
                      onClick={handleOtpResend}
                      className="text-xs font-mono font-bold text-[#002060] hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
                    >
                      {resendCooldown > 0
                        ? `Resend Code (${resendCooldown}s)`
                        : isResending
                        ? "Resending..."
                        : "[ Resend Code ]"}
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
    </div>
  );
}

export default function StudentHomePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          Loading Dumalneg NHS Student Portal...
        </div>
      }
    >
      <StudentHomeContent />
    </Suspense>
  );
}

