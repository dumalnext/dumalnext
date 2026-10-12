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
  const [adminId, setAdminId] = useState<string>("heartistrichford@gmail.com");
  const [adminPassword, setAdminPassword] = useState<string>("");
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
        setActivationSuccess("Administrator account created and activated successfully! Entering Administration Console...");
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
      <div className="max-w-md mx-auto my-20 p-8 bg-white border-2 border-[#002060] text-center font-sans space-y-2 shadow-xs">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
          AUTHENTICATING ADMINISTRATOR INVITATION
        </span>
        <p className="text-xs text-slate-600">Verifying security token with Dumalneg NHS Registry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 font-sans">
      {/* Notice Banner */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
        <span className="text-xs font-bold tracking-widest text-[#002060] uppercase block mb-1">
          PORTAL 03 &bull; DUMALNEG NATIONAL HIGH SCHOOL &bull; ADMISSIONS
        </span>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 uppercase">
          {invitation ? "Administrator Onboarding & Password Setup" : "School Administration & Enrollment Adjudication Console"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
          {invitation
            ? "Your administrator invitation has been verified by IT Support. Create your official password below to activate your administrative clearance."
            : "Authorized management console for the School Principal, Registrar, and Admissions personnel. Review learner enrollment credentials, inspect submitted PSA documents and report cards, adjudicate application status, manage section quotas, and run schedule deconfliction algorithms."}
        </p>
      </section>

      {/* Invalid Token Alert if token was passed but invalid */}
      {inviteError && (
        <div className="p-4 bg-red-50 border-2 border-red-500 text-xs text-red-950 space-y-1">
          <div className="font-bold uppercase tracking-wider text-red-900 font-mono">
            [ INVITATION VERIFICATION NOTICE ]
          </div>
          <p>{inviteError}</p>
        </div>
      )}

      {/* Main Form and Executive Clearance Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CASE 1: INVITATION VERIFIED -> SHOW CREATE PASSWORD FORM */}
        {invitation ? (
          <div className="bg-white p-6 sm:p-8 border-2 border-[#002060] shadow-sm space-y-5">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#002060] uppercase block">
                  [ OFFICIAL INVITATION VERIFIED ]
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Create Administrator Password
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-blue-100 text-[#002060] border border-blue-300">
                Admin Role
              </span>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border-2 border-red-500 text-xs text-red-950 font-bold">
                [ ERROR ]: {loginError}
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
                  Invited Administrator Email
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
                  Full Name / Personnel Label
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Roberto Mendoza"
                  className="w-full p-2.5 bg-white border border-slate-300 font-bold text-slate-900 focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase mb-1">
                  Administrative Office / Unit
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 font-bold text-slate-900 focus:border-[#002060] outline-none"
                >
                  <option value="Office of the Registrar">Office of the Registrar</option>
                  <option value="Academic Affairs">Academic Affairs</option>
                  <option value="Principal's Office">Principal's Office</option>
                  <option value="Admissions Committee">Admissions Committee</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 uppercase mb-1">
                  Create Master Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter minimum 6 characters"
                  className="w-full p-2.5 bg-white border border-slate-300 font-mono text-slate-900 focus:border-[#002060] outline-none"
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
                  className="w-full p-2.5 bg-white border border-slate-300 font-mono text-slate-900 focus:border-[#002060] outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isActivating || Boolean(activationSuccess)}
                  className="w-full py-3.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isActivating ? "[ ACTIVATING ACCOUNT... ]" : "[ ACTIVATE ADMIN ACCOUNT & LOG IN ]"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* CASE 2: NORMAL LOGIN FORM (WHEN NO INVITE TOKEN IS PRESENT) */
          <div className="bg-white p-6 sm:p-8 border-2 border-[#002060] shadow-sm space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
                OFFICIAL ADMINISTRATOR AUTHENTICATION
              </span>
              <h3 className="text-base font-bold text-slate-900 uppercase">
                Administrative Personnel Sign-In
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Authorized Account: <strong className="text-slate-900">heartistrichford@gmail.com</strong>
              </p>
            </div>

            {/* Progress Bar */}
            {isLoggingIn && (
              <div className="p-4 bg-blue-50 border-2 border-[#002060] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[#002060]">
                  <span>VERIFYING CREDENTIALS</span>
                  <span>{loginProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 border border-blue-900/30 overflow-hidden">
                  <div
                    className="bg-[#002060] h-full transition-all duration-300 ease-out"
                    style={{ width: `${loginProgress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-800 font-medium">
                  {loginStatusText || "Authenticating..."}
                </p>
              </div>
            )}

            {unconfirmedEmail && (
              <div className="p-4 bg-amber-50 border-2 border-amber-600 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    GMAIL VERIFICATION REQUIRED
                  </span>
                </div>
                <p className="text-xs text-amber-950 leading-relaxed font-medium">
                  A verification link was sent to: <strong className="font-mono underline">{unconfirmedEmail}</strong>.
                  Please open your Gmail, check your <strong>Inbox</strong> (or <strong>Spam</strong> folder), and click the confirmation link to activate your administrator account.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={handleResend}
                    className="px-3.5 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
                  >
                    {isResending ? "Resending Link..." : "Resend Verification Link to Gmail"}
                  </button>
                  {resendStatus && (
                    <span className="text-[11px] font-bold text-slate-800 block">
                      {resendStatus}
                    </span>
                  )}
                </div>
              </div>
            )}

            {loginError && (
              <div className="p-3 bg-red-50 border-2 border-red-400 text-xs font-bold text-red-900 leading-normal">
                AUTHENTICATION ERROR: {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Administrator Email <span className="text-red-700">*</span>
                </label>
                <input
                  type="email"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="heartistrichford@gmail.com"
                  className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none disabled:bg-slate-100"
                  disabled={isLoggingIn}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Security Password <span className="text-red-700">*</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full p-3 bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none disabled:bg-slate-100"
                  disabled={isLoggingIn}
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="btn-primary w-full text-xs uppercase tracking-wider font-bold py-3.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoggingIn ? "AUTHENTICATING... PLEASE WAIT" : "Sign In to Administration Console"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Executive Security Clearance Notice */}
        <div className="bg-slate-100 p-6 border border-slate-300 flex flex-col justify-between space-y-4">
          <div className="space-y-3 text-xs">
            <span className="font-mono font-bold text-[#002060] uppercase block">
              DepEd Dumalneg NHS Security Clearance
            </span>
            <p className="text-slate-700 leading-relaxed">
              This portal is strictly restricted to authorized Dumalneg National High School personnel. 
              All admissions adjudication actions, document evaluations, and section assignments are digitally audited.
            </p>

            <div className="p-3 bg-white border border-slate-300 space-y-1">
              <strong className="text-slate-900 block font-bold uppercase">Enrollment Adjudication:</strong>
              <p className="text-slate-600 text-[11px]">
                Real-time queue of basic education applications. Approve or request revision on submitted Form 138 report cards and PSA certificates.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-300 space-y-1">
              <strong className="text-slate-900 block font-bold uppercase">Section Quota Enforcement:</strong>
              <p className="text-slate-600 text-[11px]">
                Enforces standard DepEd capacity (40 students per section) to eliminate classroom oversubscription.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-300 space-y-1">
              <strong className="text-slate-900 block font-bold uppercase">Conflict-Free Timetable Scheduling:</strong>
              <p className="text-slate-600 text-[11px]">
                Evaluates 3D timetable collisions (Teacher loads, Classroom occupancies, and SHS 5-core limits).
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-300 space-y-1">
              <strong className="text-slate-900 block font-bold uppercase">Enrollment Control Room:</strong>
              <p className="text-slate-600 text-[11px]">
                Master switch to toggle online enrollment ON or OFF, configure active School Year, and set institutional advisories.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-slate-500 uppercase">
            Dumalneg NHS &bull; CCIS Capstone Project
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginForm() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto my-20 p-8 bg-white border-2 border-[#002060] text-center font-sans space-y-2 shadow-xs">
          <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
            AUTHENTICATING ADMINISTRATIVE CREDENTIALS
          </span>
          <p className="text-xs text-slate-600">Loading School Administrator Console...</p>
        </div>
      }
    >
      <AdminLoginFormInner />
    </Suspense>
  );
}
