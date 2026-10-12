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

  if (isCheckingToken) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] text-center space-y-3 font-sans shadow-sm">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
          DUMALNEG NATIONAL HIGH SCHOOL
        </span>
        <h2 className="text-base font-bold text-slate-900 uppercase">
          Verifying Faculty Invitation Clearance...
        </h2>
        <p className="text-xs font-mono text-slate-500">
          Connecting to DepEd System Registry &bull; Please wait.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 font-sans">
      {/* Notice Banner */}
      <div className="bg-white border-l-4 border-[#002060] p-6 shadow-xs border border-slate-200">
        <span className="text-xs font-mono font-bold tracking-widest text-[#002060] uppercase block mb-1">
          PORTAL 02: FACULTY &amp; ACADEMIC STAFF WORKSTATION
        </span>
        <h2 className="text-lg font-bold text-slate-900 uppercase">
          {invitation ? "Faculty Account Onboarding" : "Faculty Member Sign-In"}
        </h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          {invitation
            ? "Your faculty invitation has been verified by IT Support. Create your official password below to activate your account."
            : "Authorized access portal for teaching personnel of Dumalneg National High School. Access your official teaching load schedule, review assigned sections, and inspect real-time student rosters."}
        </p>
      </div>

      {/* Invalid Token Alert if token was passed but invalid */}
      {inviteError && (
        <div className="p-4 bg-red-50 border-2 border-red-500 text-xs text-red-950 space-y-1">
          <div className="font-bold uppercase tracking-wider text-red-900 font-mono">
            [ INVITATION VERIFICATION NOTICE ]
          </div>
          <p>{inviteError}</p>
        </div>
      )}

      {/* CASE 1: INVITATION VERIFIED -> SHOW CREATE PASSWORD FORM */}
      {invitation ? (
        <div className="bg-white p-6 sm:p-8 border-2 border-emerald-700 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">
                [ OFFICIAL INVITATION VERIFIED ]
              </span>
              <h3 className="text-base font-bold text-slate-900 uppercase">
                Create Your Faculty Password
              </h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              Teacher Role
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border-2 border-red-500 text-xs text-red-950 font-bold">
              [ ERROR ]: {errorMsg}
            </div>
          )}

          {activationSuccess && (
            <div className="p-3 bg-green-50 border-2 border-green-600 text-xs text-green-950 font-bold font-mono">
              [ STATUS ]: {activationSuccess}
            </div>
          )}

          <form onSubmit={handleActivateAccount} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 uppercase mb-1">
                Invited Faculty Email Address
              </label>
              <input
                type="email"
                value={invitation.email}
                disabled
                className="w-full p-2.5 bg-slate-100 border border-slate-300 font-mono text-slate-700 cursor-not-allowed select-all"
              />
              <p className="text-[10px] font-mono text-slate-500 mt-1">
                Locked: Account will be bound to this verified email address.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-800 uppercase mb-1">
                Full Name (Faculty Member)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full p-2.5 bg-white border border-slate-300 font-bold text-slate-900 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 uppercase mb-1">
                Faculty Department / Academic Level
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 font-bold text-slate-900 focus:border-emerald-600 outline-none"
              >
                <option value="Junior High School (JHS)">Junior High School (JHS)</option>
                <option value="Senior High School (SHS)">Senior High School (SHS)</option>
                <option value="Cross-Level Core">Cross-Level Core</option>
                <option value="TVL Faculty">TVL Track Faculty</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 uppercase mb-1">
                Create New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter minimum 6 characters"
                className="w-full p-2.5 bg-white border border-slate-300 font-mono text-slate-900 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 uppercase mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full p-2.5 bg-white border border-slate-300 font-mono text-slate-900 focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isActivating || Boolean(activationSuccess)}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isActivating ? "[ ACTIVATING ACCOUNT... ]" : "[ ACTIVATE TEACHER ACCOUNT & LOG IN ]"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* CASE 2: NORMAL LOGIN FORM (WHEN NO INVITE TOKEN IS PRESENT) */
        <div className="bg-white p-6 sm:p-8 border-2 border-[#002060] shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
              SECURE ACCESS AUTHENTICATION
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Faculty Member Credentials
            </h3>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border-2 border-red-500 text-xs text-red-950 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-200 border border-red-400 font-mono text-[10px] uppercase">
                  AUTHENTICATION ERROR
                </span>
                <span>{errorMsg}</span>
              </div>
              {unconfirmedEmail && (
                <div className="pt-2 border-t border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-red-900">
                    Did not receive confirmation link for {unconfirmedEmail}?
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    className="px-3 py-1 bg-red-800 hover:bg-red-900 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                  >
                    Resend Verification Email
                  </button>
                </div>
              )}
            </div>
          )}

          {resendStatus && (
            <div className="p-3 bg-blue-50 border border-blue-400 text-xs text-blue-950 font-mono font-medium">
              {resendStatus}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Faculty Gmail or DepEd Employee ID
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. layttsix@gmail.com or DNHS-TCH-001"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-sm font-mono text-slate-900 focus:border-[#002060] outline-none transition-colors"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Enter your authorized institutional Gmail or your assigned Faculty ID.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Account Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your authorized password"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-[#002060] outline-none transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider text-center transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Authenticating..." : "Authenticate & Enter Faculty Workstation"}
              </button>
            </div>
          </form>

          {/* Authorized Faculty Accounts Information */}
          <div className="pt-4 border-t border-slate-200">
            <span className="text-[11px] font-mono font-bold text-slate-600 uppercase block mb-2">
              PRE-AUTHORIZED FACULTY ACCOUNTS (DUMALNEG NHS):
            </span>
            <div className="space-y-1 text-xs font-mono text-slate-700 bg-slate-50 p-3 border border-slate-200">
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span>layttsix@gmail.com</span>
                <span className="font-bold text-[#002060]">DNHS-TCH-001 (JHS)</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span>laytteight@gmail.com</span>
                <span className="font-bold text-[#002060]">DNHS-TCH-002 (SHS)</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span>layttnine@gmail.com</span>
                <span className="font-bold text-[#002060]">DNHS-TCH-003 (Cross-Level)</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Password: Default password provided upon faculty onboarding (<code className="font-bold">Teacher@2026</code>).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherLoginForm() {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] text-center space-y-3 font-sans">
          <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
            DUMALNEG NATIONAL HIGH SCHOOL
          </span>
          <p className="text-xs font-mono text-slate-500">
            Loading Faculty Workstation...
          </p>
        </div>
      }
    >
      <TeacherLoginFormInner />
    </Suspense>
  );
}
