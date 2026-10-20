"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminAuth } from "@/lib/auth/authContext";

interface AdminInvitation {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  department?: string;
  status: string;
  expiresAt: string;
}

function AdminLoginFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { login, resendVerification, refreshSession } = useAdminAuth();

  // Standard Login State
  const [adminId, setAdminId] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string>("");
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginProgress, setLoginProgress] = useState<number>(0);
  const [loginStatusText, setLoginStatusText] = useState<string>("");

  // Invitation Onboarding State
  const [isCheckingToken, setIsCheckingToken] = useState<boolean>(Boolean(token));
  const [invitation, setInvitation] = useState<AdminInvitation | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Create Password State (for invited admins only)
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [department, setDepartment] = useState<string>("Office of the Registrar");
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Validate Token if present in query params
  useEffect(() => {
    if (!token) {
      setIsCheckingToken(false);
      return;
    }

    const validateToken = async () => {
      setIsCheckingToken(true);
      try {
        let res = await fetch(`/api/it-support/invitations?token=${encodeURIComponent(token)}`);
        if (res.status === 404) {
          res = await fetch(`/api/invitations?token=${encodeURIComponent(token)}`);
        }
        const json = await res.json();
        if (res.ok && json.valid && json.invitation) {
          if (json.invitation.role === "admin") {
            setInvitation(json.invitation);
            if (json.invitation.fullName) setFullName(json.invitation.fullName);
            if (json.invitation.department) setDepartment(json.invitation.department);
          } else {
            setInviteError(`This invitation link is issued for role "${json.invitation.role.toUpperCase()}". Please access your respective portal.`);
          }
        } else {
          setInviteError(json.error || "This administrator invitation link is invalid or has expired.");
        }
      } catch (err: any) {
        setInviteError("Network error validating administrator invitation link.");
      } finally {
        setIsCheckingToken(false);
      }
    };

    validateToken();
  }, [token]);

  // Handle Create Password & Activate Account
  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invitation) return;

    if (!newPassword || newPassword.length < 6) {
      setLoginError("Password must be at least 6 characters in length.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLoginError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsActivating(true);
    setLoginError("");

    try {
      const payload = {
        token,
        password: newPassword,
        firstName: fullName.split(" ")[0] || "",
        lastName: fullName.split(" ").slice(1).join(" ") || "",
        department,
      };

      let res = await fetch("/api/it-support/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 404) {
        res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (res.ok && json.success) {
        setActivationSuccess("Administrator account created and activated! Entering Administration Console...");
        if (json.cookieName && json.sessionUser) {
          const serialized = encodeURIComponent(JSON.stringify(json.sessionUser));
          document.cookie = `${json.cookieName}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
        }

        setTimeout(async () => {
          await refreshSession();
          window.location.href = json.redirectUrl || "/adjudication";
        }, 1200);
      } else {
        setLoginError(json.error || "Failed to activate your administrator account.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Network error activating account.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleResend = async () => {
    if (!unconfirmedEmail) return;
    setIsResending(true);
    setResendStatus("");
    const res = await resendVerification(unconfirmedEmail);
    if (res.success) {
      setResendStatus("Verification link resent! Please check your administrator Gmail inbox (and Spam folder).");
    } else {
      setResendStatus(res.error || "Failed to resend verification link.");
    }
    setIsResending(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!adminId.trim() || !adminPassword) {
      setLoginError("Please enter your Administrator Email and security password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginProgress(20);
    setLoginStatusText("Connecting to Dumalneg NHS Security Realm...");

    try {
      await new Promise((res) => setTimeout(res, 400));
      setLoginProgress(55);
      setLoginStatusText("Verifying administrative role permissions with Supabase database...");

      const res = await login(adminId, adminPassword);
      if (!res.success) {
        setLoginError(res.error || "Invalid administrator credentials.");
        if (res.unconfirmedEmail) {
          setUnconfirmedEmail(res.unconfirmedEmail);
        }
        setIsLoggingIn(false);
        setLoginProgress(0);
        return;
      }

      setLoginProgress(90);
      setLoginStatusText("Access granted. Initializing School Administrator Console...");
      await new Promise((res) => setTimeout(res, 350));

      setLoginProgress(100);
      setLoginStatusText("Welcome, Administrator!");
      await new Promise((res) => setTimeout(res, 200));
    } finally {
      setIsLoggingIn(false);
      setLoginProgress(0);
      setLoginStatusText("");
    }
  };

  if (isCheckingToken) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] text-center font-sans space-y-3 shadow-sm">
        <div className="w-10 h-10 rounded-full border-2 border-[#002060] border-t-amber-400 animate-spin mx-auto" />
        <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
          Verifying Administrator Invitation
        </span>
        <p className="text-xs text-slate-600">
          Checking security token with Dumalneg NHS Registry...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* Invalid Token Alert if token was passed but invalid */}
      {inviteError && (
        <div className="p-4 bg-red-50 border border-red-300 border-l-4 border-l-red-600 rounded-lg text-xs text-red-950 space-y-1 shadow-xs">
          <div className="font-bold uppercase tracking-wider text-red-900">
            Invitation Verification Notice
          </div>
          <p>{inviteError}</p>
        </div>
      )}

      {/* 2-Column Split Enrollment System Login Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (7 Cols): Institutional Hero & Registrar Capabilities */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Welcome Card */}
          <section className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-6 sm:p-8 border-b-4 border-amber-400">
              <div className="flex items-center gap-4">
                <img
                  src="/dumalneg-logo.png"
                  alt="Dumalneg National High School Seal"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-white p-1 shadow-md border-2 border-amber-400 shrink-0"
                />
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-bold uppercase tracking-widest">
                    Office of the School Registrar &amp; Admissions
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                    {invitation
                      ? "Administrator Account Onboarding"
                      : "Enrollment Adjudication & Registrar Console"}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100/90">
                    Dumalneg National High School &bull; DepEd Division of Ilocos Norte
                  </p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-5 leading-relaxed">
                {invitation
                  ? "Your official Registrar & Administrator invitation has been verified by IT Support. Set up your security password to activate your administrative access."
                  : "Authorized management workspace for the School Principal, Registrar, and Admissions Committee. Evaluate learner applications, inspect PSA birth certificates and SF9 report cards, manage section capacities, and resolve master timetable conflicts."}
              </p>
            </div>

            {/* 4 Core Registrar Modules Grid */}
            <div className="p-6 sm:p-8 bg-white space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-[#002060] uppercase tracking-wider block">
                    Registrar &amp; Admissions Modules
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Integrated Enrollment Administration Tools
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#002060] border border-blue-200 text-[11px] font-semibold">
                  Audited Access
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#002060]/40 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 text-[#002060] font-bold text-xs">
                    <span className="w-6 h-6 rounded-md bg-[#002060] text-amber-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      01
                    </span>
                    <span>Enrollment Adjudication Queue</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Inspect submitted PSA birth certificates and Form 138 report cards side-by-side, approve applications, or request document revisions.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#002060]/40 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 text-[#002060] font-bold text-xs">
                    <span className="w-6 h-6 rounded-md bg-[#002060] text-amber-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      02
                    </span>
                    <span>Section Quotas &amp; Capacity</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Enforce DepEd standard section ceilings (40 learners per class) across Junior High School and Senior High School tracks.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#002060]/40 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 text-[#002060] font-bold text-xs">
                    <span className="w-6 h-6 rounded-md bg-[#002060] text-amber-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      03
                    </span>
                    <span>3D Schedule Deconfliction</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Automatically detect and prevent teacher double-booking, classroom collisions, and SHS subject overload.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#002060]/40 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 text-[#002060] font-bold text-xs">
                    <span className="w-6 h-6 rounded-md bg-[#002060] text-amber-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      04
                    </span>
                    <span>Enrollment Control Room</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Toggle online student registration windows open or closed, configure active School Year parameters, and broadcast advisories.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-950">
                <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="leading-relaxed">
                  <strong className="font-bold">Security Audit Notice:</strong> All enrollment approvals, section capacity overrides, and status transitions are logged under your Registrar account.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (5 Cols): Sticky Authentication / Onboarding Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-6">
          {invitation ? (
            /* CASE 1: INVITATION VERIFIED -> SHOW CREATE PASSWORD FORM */
            <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] shadow-md overflow-hidden">
              <div className="p-6 sm:p-7 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Official Invitation Verified
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Create Registrar Password
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-blue-100 text-[#002060] border border-blue-200 rounded-full">
                  Admin Role
                </span>
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                {loginError && (
                  <div className="p-3.5 bg-red-50 border border-red-300 border-l-4 border-l-red-600 rounded-lg text-xs text-red-900 font-medium">
                    {loginError}
                  </div>
                )}

                {activationSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 border-l-4 border-l-emerald-600 rounded-lg text-xs text-emerald-950 font-semibold">
                    {activationSuccess}
                  </div>
                )}

                <form onSubmit={handleActivateAccount} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Invited Administrator Email
                    </label>
                    <input
                      type="email"
                      value={invitation.email}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-medium cursor-not-allowed select-all"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Account is permanently bound to this verified email address.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Full Name / Personnel Title
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Roberto Mendoza"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-900 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Administrative Office / Unit
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-900 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 outline-none transition-all"
                    >
                      <option value="Office of the Registrar">Office of the Registrar</option>
                      <option value="Academic Affairs">Academic Affairs</option>
                      <option value="Principal's Office">Principal&apos;s Office</option>
                      <option value="Admissions Committee">Admissions Committee</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Create Security Password <span className="text-red-700">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer select-none"
                      >
                        {showPassword ? "Hide Password" : "Show Password"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter minimum 6 characters"
                      className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold text-slate-900 focus:border-[#002060] outline-none rounded-[4px] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Confirm Password <span className="text-red-700">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold text-slate-900 focus:border-[#002060] outline-none rounded-[4px] transition-colors"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isActivating || Boolean(activationSuccess)}
                      className="w-full py-3 px-4 rounded-lg bg-[#002060] hover:bg-[#001744] text-white text-xs font-bold tracking-wide transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isActivating ? "Activating Account..." : "Activate Admin Account & Sign In"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* CASE 2: NORMAL LOGIN FORM */
            <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] shadow-md overflow-hidden">
              <div className="p-6 sm:p-7 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3.5">
                <div>
                  <span className="text-[10px] font-bold text-[#002060] uppercase tracking-wider block">
                    Registrar &amp; Admissions Sign-In
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                    Administrator Portal Login
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sign in with your authorized DepEd Registrar credentials
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                {/* Progress Bar */}
                {isLoggingIn && (
                  <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#002060]">
                      <span>Verifying Administrative Credentials...</span>
                      <span>{loginProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#002060] h-full transition-all duration-300 ease-out"
                        style={{ width: `${loginProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-700 font-medium">
                      {loginStatusText || "Authenticating..."}
                    </p>
                  </div>
                )}

                {unconfirmedEmail && (
                  <div className="p-4 bg-amber-50 border border-amber-300 border-l-4 border-l-amber-500 rounded-lg space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse shrink-0" />
                      <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                        Email Verification Required
                      </span>
                    </div>
                    <p className="text-xs text-amber-950 leading-relaxed">
                      A verification link was sent to <strong className="underline">{unconfirmedEmail}</strong>.
                      Please check your Gmail Inbox or Spam folder and click the confirmation link to activate your account.
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isResending}
                        onClick={handleResend}
                        className="px-3.5 py-2 rounded-md bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold tracking-wide transition-colors disabled:opacity-60 cursor-pointer shadow-2xs"
                      >
                        {isResending ? "Resending Link..." : "Resend Verification Email"}
                      </button>
                      {resendStatus && (
                        <span className="text-[11px] font-semibold text-slate-800 block">
                          {resendStatus}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {loginError && (
                  <div className="p-3.5 bg-red-50 border border-red-300 border-l-4 border-l-red-600 rounded-lg text-xs font-semibold text-red-900 leading-normal">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Administrator Email Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                      placeholder="e.g. registrar@dnhs.edu.ph or Gmail"
                      className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold text-slate-900 focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px] transition-colors"
                      disabled={isLoggingIn}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Security Password <span className="text-red-700">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer select-none"
                      >
                        {showPassword ? "Hide Password" : "Show Password"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter your account password"
                      className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold text-slate-900 focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px] transition-colors"
                      disabled={isLoggingIn}
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-3 px-4 rounded-lg bg-[#002060] hover:bg-[#001744] text-white text-xs font-bold tracking-wide transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{isLoggingIn ? "Signing In to Console..." : "Sign In to Administration Console"}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </form>


              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginForm() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] text-center font-sans space-y-2 shadow-sm">
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            Loading Administrator Console
          </span>
          <p className="text-xs text-slate-600">Preparing Registrar authentication workspace...</p>
        </div>
      }
    >
      <AdminLoginFormInner />
    </Suspense>
  );
}
