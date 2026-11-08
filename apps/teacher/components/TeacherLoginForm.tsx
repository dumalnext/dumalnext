"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTeacherAuth } from "@/lib/auth/authContext";

interface TeacherInvitation {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  department?: string;
  status: string;
  expiresAt: string;
}

function TeacherLoginFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { login, resendVerification, refreshSession } = useTeacherAuth();

  // Standard Login State
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string>("");
  const [resendStatus, setResendStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Invitation Onboarding State
  const [isCheckingToken, setIsCheckingToken] = useState<boolean>(Boolean(token));
  const [invitation, setInvitation] = useState<TeacherInvitation | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Create Password State (for invited teachers only)
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [department, setDepartment] = useState<string>("Junior High School (JHS)");
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
        const res = await fetch(`/api/invitations?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (res.ok && json.valid && json.invitation) {
          if (json.invitation.role === "teacher") {
            setInvitation(json.invitation);
            if (json.invitation.fullName) setFullName(json.invitation.fullName);
            if (json.invitation.department) setDepartment(json.invitation.department);
          } else {
            setInviteError(`This invitation link is issued for role "${json.invitation.role.toUpperCase()}". Please open the link corresponding to your designated role.`);
          }
        } else {
          setInviteError(json.error || "This faculty invitation link is invalid or has expired.");
        }
      } catch (err: any) {
        setInviteError("Network error validating your invitation link.");
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
      setErrorMsg("Password must be at least 6 characters in length.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    setIsActivating(true);
    setErrorMsg("");

    try {
      const payload = {
        token,
        password: newPassword,
        firstName: fullName.split(" ")[0] || "",
        lastName: fullName.split(" ").slice(1).join(" ") || "",
        department,
      };

      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActivationSuccess("Faculty account created and activated successfully! Entering Faculty Workstation...");
        if (json.cookieName && json.sessionUser) {
          const serialized = encodeURIComponent(JSON.stringify(json.sessionUser));
          document.cookie = `${json.cookieName}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
        }

        setTimeout(async () => {
          await refreshSession();
          window.location.href = "/";
        }, 1200);
      } else {
        setErrorMsg(json.error || "Failed to activate your teacher account.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error activating account.");
    } finally {
      setIsActivating(false);
    }
  };

  // Handle Standard Sign-In
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setResendStatus("");
    setUnconfirmedEmail("");

    if (!identifier.trim()) {
      setErrorMsg("Please enter your authorized Faculty Email or Employee ID.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Please enter your account password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(identifier, password);
      if (!res.success) {
        setErrorMsg(res.error || "Authentication failed. Please verify your credentials.");
        if (res.unconfirmedEmail) {
          setUnconfirmedEmail(res.unconfirmedEmail);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!unconfirmedEmail) return;
    setResendStatus("Sending confirmation link...");
    const res = await resendVerification(unconfirmedEmail);
    if (res.success) {
      setResendStatus(`Verification email resent to ${unconfirmedEmail}. Please check your Gmail inbox or spam folder.`);
    } else {
      setResendStatus(res.error || "Failed to resend confirmation email. Rate limit may apply.");
    }
  };

  // Password Visibility Toggle
  const [showPassword, setShowPassword] = useState<boolean>(false);

  if (isCheckingToken) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] border-t-4 border-t-amber-400 text-center space-y-4 rounded-[4px] shadow-sm animate-pulse" aria-busy="true" aria-label="Verifying Faculty Invitation Clearance">
        <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto" />
        <div className="space-y-2">
          <div className="h-3 w-48 bg-slate-200 rounded mx-auto" />
          <div className="h-5 w-64 bg-slate-200 rounded mx-auto" />
          <div className="h-3 w-56 bg-slate-200 rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN (7 cols): Institutional Hero & Faculty Workstation Features */}
      <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
        {/* Institutional Hero Card */}
        <section className="bg-gradient-to-br from-[#002060] via-[#002b80] to-[#0a1936] text-white border-t-4 border-amber-400 p-6 sm:p-8 rounded-[4px] shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-blue-800/80 pb-5">
            <div className="w-16 h-16 rounded-full border-2 border-amber-400 shrink-0 flex items-center justify-center shadow-sm overflow-hidden">
              <img
                src="/dumalneg-logo.png"
                alt="Dumalneg National High School Seal"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400/20 text-amber-200 border border-amber-300/40 text-[11px] font-bold rounded-[4px] mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                DepEd Region I &bull; Schools Division of Ilocos Norte
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Faculty &amp; Academic Staff Portal
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Access certified teaching schedules, advisory class rosters, and academic credentials.
          </p>

          {/* 3 Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-white/10 border border-white/15 p-3 rounded-[4px] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[4px] bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white leading-tight">
                Teaching Load Schedule
              </h3>
            </div>

            <div className="bg-white/10 border border-white/15 p-3 rounded-[4px] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[4px] bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white leading-tight">
                Advisory Class Masterlist
              </h3>
            </div>

            <div className="bg-white/10 border border-white/15 p-3 rounded-[4px] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[4px] bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white leading-tight">
                30-Hour Load Standard
              </h3>
            </div>
          </div>
        </section>

        {/* Faculty Guidelines Card */}
        <section className="bg-white border border-slate-300 p-5 sm:p-6 rounded-[4px] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#002060] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-bold text-[#002060]">
                Faculty Portal Access Guidelines
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              S.Y. 2026&ndash;2027
            </span>
          </div>
          <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#002060] shrink-0">1.</span>
              <span>
                <strong>Authorized Sign-In:</strong> Use your registered institutional Gmail address or your assigned DepEd Employee ID (e.g., <code className="text-[#002060] font-bold">DNHS-TCH-001</code>).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#002060] shrink-0">2.</span>
              <span>
                <strong>New Faculty Onboarding:</strong> Newly hired teachers receive an official invitation link from IT Support to set their account password.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[#002060] shrink-0">3.</span>
              <span>
                <strong>Live Enrollment Sync:</strong> Advisory section rosters automatically update in real time as the Registrar approves learner enrollments.
              </span>
            </li>
          </ul>
        </section>
      </div>

      {/* RIGHT COLUMN (5 cols): Authentication / Onboarding Card */}
      <div className="lg:col-span-5 order-1 lg:order-2 space-y-4">
        {/* Invalid Token Alert if token was passed but invalid */}
        {inviteError && (
          <div className="p-4 bg-red-50 border-2 border-red-400 text-xs text-red-950 space-y-1 rounded-[4px] shadow-xs">
            <div className="font-bold text-red-900">
              Invitation Verification Notice
            </div>
            <p className="text-red-800 leading-relaxed">{inviteError}</p>
          </div>
        )}

        {/* CASE 1: INVITATION VERIFIED -> SHOW CREATE PASSWORD FORM */}
        {invitation ? (
          <div className="bg-white border-2 border-emerald-700 border-t-4 border-t-amber-400 rounded-[4px] shadow-md overflow-hidden">
            <div className="bg-[#002060] text-white p-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Activate Faculty Account
                </h3>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 rounded-[4px]">
                Teacher Role
              </span>
            </div>

            <div className="p-6 space-y-5">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-400 text-xs text-red-900 font-semibold rounded-[4px]">
                  {errorMsg}
                </div>
              )}

              {activationSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-500 text-xs text-emerald-900 font-semibold rounded-[4px]">
                  {activationSuccess}
                </div>
              )}

              <form onSubmit={handleActivateAccount} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Invited Faculty Email Address
                  </label>
                  <input
                    type="email"
                    value={invitation.email}
                    disabled
                    className="w-full p-2.5 bg-slate-100 border border-slate-300 text-slate-700 cursor-not-allowed select-all rounded-[4px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Full Name (Faculty Member)
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full p-2.5 bg-white border border-slate-300 font-semibold text-slate-900 focus:border-[#002060] outline-none rounded-[4px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Faculty Department / Academic Level
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 font-semibold text-slate-900 focus:border-[#002060] outline-none rounded-[4px]"
                  >
                    <option value="Junior High School (JHS)">Junior High School (JHS)</option>
                    <option value="Senior High School (SHS)">Senior High School (SHS)</option>
                    <option value="Cross-Level Core">Cross-Level Core</option>
                    <option value="TVL Faculty">TVL Track Faculty</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Create New Password <span className="text-red-700">*</span>
                    </label>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowPassword(true);
                      }}
                      onMouseUp={() => setShowPassword(false)}
                      onMouseLeave={() => setShowPassword(false)}
                      onTouchStart={() => setShowPassword(true)}
                      onTouchEnd={() => setShowPassword(false)}
                      onTouchCancel={() => setShowPassword(false)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") setShowPassword(true);
                      }}
                      onKeyUp={(e) => {
                        if (e.key === " " || e.key === "Enter") setShowPassword(false);
                      }}
                      onClick={(e) => e.preventDefault()}
                      className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer select-none"
                      title="Press and hold to view password"
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
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50 rounded-[4px]"
                  >
                    {isActivating ? "Activating Faculty Account..." : "Activate Teacher Account & Sign In"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* CASE 2: NORMAL LOGIN FORM */
          <div className="bg-white border-2 border-[#002060] border-t-4 border-t-amber-400 rounded-[4px] shadow-md overflow-hidden">
            {/* Top Card Header */}
            <div className="bg-[#002060] text-white px-6 py-4 flex items-center justify-between gap-3 border-b border-blue-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[4px] bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">
                  Teacher &amp; Adviser Sign In
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-400 text-xs text-red-950 space-y-2 rounded-[4px]">
                  <div className="font-bold text-red-900">
                    Sign-In Notice: {errorMsg}
                  </div>
                  {unconfirmedEmail && (
                    <div className="pt-2 border-t border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] text-red-900">
                        Did not receive confirmation link for {unconfirmedEmail}?
                      </span>
                      <button
                        type="button"
                        onClick={handleResend}
                        className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 rounded-[4px]"
                      >
                        Resend Verification Email
                      </button>
                    </div>
                  )}
                </div>
              )}

              {resendStatus && (
                <div className="p-3 bg-blue-50 border border-blue-300 text-xs text-blue-950 font-medium rounded-[4px]">
                  {resendStatus}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Faculty Email or DepEd Employee ID <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. faculty@dnhs.edu.ph or DepEd ID"
                    required
                    className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold text-slate-900 focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px] transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Password <span className="text-red-700">*</span>
                    </label>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowPassword(true);
                      }}
                      onMouseUp={() => setShowPassword(false)}
                      onMouseLeave={() => setShowPassword(false)}
                      onTouchStart={() => setShowPassword(true)}
                      onTouchEnd={() => setShowPassword(false)}
                      onTouchCancel={() => setShowPassword(false)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") setShowPassword(true);
                      }}
                      onKeyUp={(e) => {
                        if (e.key === " " || e.key === "Enter") setShowPassword(false);
                      }}
                      onClick={(e) => e.preventDefault()}
                      className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer select-none"
                      title="Press and hold to view password"
                    >
                      {showPassword ? "Hide Password" : "Show Password"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    required
                    className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold text-slate-900 focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px] transition-colors"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#002060] hover:bg-[#001744] text-white text-xs font-bold text-center transition-colors shadow-xs cursor-pointer disabled:opacity-50 rounded-[4px] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-amber-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>{isSubmitting ? "Signing In to Faculty Portal..." : "Sign In to Faculty Workstation"}</span>
                  </button>
                </div>
              </form>


            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeacherLoginForm() {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] border-t-4 border-t-amber-400 text-center space-y-3 rounded-[4px] shadow-sm">
          <span className="text-xs font-bold text-[#002060] block">
            Dumalneg National High School
          </span>
          <p className="text-xs text-slate-500">
            Loading Faculty Workstation...
          </p>
        </div>
      }
    >
      <TeacherLoginFormInner />
    </Suspense>
  );
}
