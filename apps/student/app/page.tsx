"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { downloadDepEdEnrollmentPdf } from "@/lib/utils/depedPdfGenerator";
import { createClient } from "@/lib/supabase/client";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";

function StudentHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get("tab");
  const noticeQuery = searchParams.get("notice") || searchParams.get("reason");
  const { user, login, register, logout } = useAuth();
  const { isEnrollmentOpen, schoolYear, closedMessage } = useEnrollmentControl();

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

  // Authenticated User Submitted Application State
  const [userApplication, setUserApplication] = useState<any | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Real-Time Automatic Synchronization of Logged-In User's Application (Zero-Refresh)
  useEffect(() => {
    if (!user) {
      setUserApplication(null);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    const fetchApp = async () => {
      try {
        const { data: stData } = await supabase
          .from("students")
          .select("id")
          .or(`student_id.eq.${user.lrn || user.userId},user_id.eq.${user.id}`)
          .limit(1);

        if (stData && stData.length > 0) {
          const { data: appData } = await supabase
            .from("enrollment_applications")
            .select("*")
            .eq("student_id", stData[0].id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (isMounted && appData && appData.length > 0) {
            const a = appData[0];
            setUserApplication({
              referenceNumber: a.application_id,
              applicationDate: a.created_at,
              status: a.status,
              fullName: `${user.lastName}, ${user.firstName} ${user.middleName || ""}`.trim(),
              gradeLevel: a.target_grade_level,
              applicantType: a.applicant_type,
              targetTrack: a.target_strand ? "Senior High School" : "Junior High School",
              targetStrand: a.target_strand,
              remarks: a.admin_feedback,
              schoolYear: a.school_year || schoolYear || "2026-2027",
            });
            return;
          }
        }
        if (isMounted) {
          setUserApplication(null);
        }
      } catch (e) {
        console.error("Error reading Supabase applications:", e);
        if (isMounted) setUserApplication(null);
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

    // 5. Supabase Realtime Channel: Instant live update on application changes
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

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onVisibilitySync);
      document.removeEventListener("visibilitychange", onVisibilitySync);
      window.removeEventListener("dumalnext:data-changed", onDataChanged);
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.lrn]);

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
      newErrors.email = "A valid email address is required.";
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
      setRegStatusText("Saving applicant credentials in DepEd Dumalneg NHS registry...");

      const res = await register(
        {
          lastName: regForm.lastName.trim().toUpperCase(),
          firstName: regForm.firstName.trim().toUpperCase(),
          middleName: regForm.middleName.trim().toUpperCase(),
          email: regForm.email.trim().toLowerCase(),
          password: regForm.password,
        },
        false // Do not auto-login session so they sign in cleanly from Home
      );

      if (!res.success) {
        setRegErrors({ form: res.error || "Registration failed. Please try again." });
        setIsRegistering(false);
        setRegProgress(0);
        return;
      }

      setRegProgress(85);
      setRegStatusText("Account created successfully! Preparing sign-in console...");
      await new Promise((resolve) => setTimeout(resolve, 450));

      setRegProgress(100);
      setRegStatusText("Redirecting to Student Login...");
      await new Promise((resolve) => setTimeout(resolve, 300));

      const registeredEmail = regForm.email.trim().toLowerCase();
      const applicantFullName = `${regForm.firstName.trim().toUpperCase()} ${regForm.lastName.trim().toUpperCase()}`;

      // Pre-fill email in login form
      setLoginEmail(registeredEmail);
      setLoginPassword("");
      setRegSuccessNotice(
        `Account for [ ${applicantFullName} ] created successfully! Please enter your password to sign in.`
      );

      // Clear reg form
      setRegForm({
        lastName: "",
        firstName: "",
        middleName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      // Switch to Sign In tab and update URL
      setActiveTab("signin");
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/?tab=signin");
      }
    } finally {
      setIsRegistering(false);
      setRegProgress(0);
      setRegStatusText("");
    }
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={logout}
                  className="btn-secondary text-xs uppercase font-bold py-2 px-3 shrink-0"
                >
                  [ Sign Out ]
                </button>
              </div>
            </div>

            {/* Application Status Card */}
            {userApplication ? (
              <div className="p-4 sm:p-5 bg-slate-50 border-2 border-slate-300 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">
                      Submitted Enrollment Application
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
                                targetSemester: "1st Semester",
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
                              targetSemester: "1st Semester",
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
              /* User has not yet submitted an enrollment application */
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
                    [ ONLINE ENROLLMENT: {isEnrollmentOpen ? `OPEN FOR S.Y. ${schoolYear}` : `CLOSED FOR S.Y. ${schoolYear}`} ]
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {isEnrollmentOpen
                    ? `Ready to Complete Your Basic Education Enrollment for S.Y. ${schoolYear}?`
                    : `Basic Education Online Enrollment is Currently Closed`}
                </h3>

                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                  {isEnrollmentOpen
                    ? `Your student account is active. Click below to begin filling out the 5-step official enrollment form for School Year ${schoolYear}. Your registered learner details will be automatically pre-filled.`
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
                      ? `Start 5-Step Online Enrollment Form (S.Y. ${schoolYear})`
                      : "[ View Official Enrollment Notice & Advisory ]"}
                  </Link>
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
                      [ REGISTRATION SUCCESSFUL &bull; ACCOUNT CREATED ]
                    </span>
                    <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                      {regSuccessNotice}
                    </p>
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

