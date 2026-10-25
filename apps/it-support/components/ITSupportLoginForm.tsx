"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useITSupportAuth } from "@/lib/auth/itSupportAuthContext";
import CustomSelect from "@/components/CustomSelect";

interface ITSupportInvitation {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  department?: string;
  status: string;
  expiresAt: string;
}

function ITSupportLoginFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { login, refreshSession } = useITSupportAuth();

  // Standard Login State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Invitation Onboarding State
  const [isCheckingToken, setIsCheckingToken] = useState<boolean>(Boolean(token));
  const [invitation, setInvitation] = useState<ITSupportInvitation | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Create Password State (for invited IT personnel only)
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [department, setDepartment] = useState<string>("System Administrator");
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
          if (json.invitation.role === "it_support") {
            setInvitation(json.invitation);
            if (json.invitation.fullName) setFullName(json.invitation.fullName);
            if (json.invitation.department) setDepartment(json.invitation.department);
          } else {
            setInviteError(`This invitation link is issued for role "${json.invitation.role.toUpperCase()}". Please open the link corresponding to your designated role.`);
          }
        } else {
          setInviteError(json.error || "This IT Support invitation link is invalid or has expired.");
        }
      } catch (err: any) {
        setInviteError("Network error validating IT Support invitation link.");
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
      setErrorMessage("Password must be at least 6 characters in length.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsActivating(true);
    setErrorMessage("");

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
        setActivationSuccess("IT Support account created and activated! Entering IT Support Console...");
        if (json.cookieName && json.sessionUser) {
          const serialized = encodeURIComponent(JSON.stringify(json.sessionUser));
          document.cookie = `${json.cookieName}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
        }

        setTimeout(async () => {
          await refreshSession();
          window.location.href = json.redirectUrl || "/";
        }, 1200);
      } else {
        setErrorMessage(json.error || "Failed to activate your IT Support account.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error activating account.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const result = await login(identifier, password);
    if (!result.success) {
      setErrorMessage(result.error || "Authentication failed. Access is restricted to authorized IT Support personnel.");
      setIsSubmitting(false);
    }
  };



  if (isCheckingToken) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] text-center font-sans space-y-3 shadow-sm">
        <div className="w-10 h-10 rounded-full border-2 border-[#002060] border-t-amber-400 animate-spin mx-auto" />
        <span className="text-xs font-bold tracking-wider text-[#002060] uppercase block">
          Verifying IT Support Clearance
        </span>
        <p className="text-xs text-slate-500">Authenticating invitation token with Dumalneg NHS Registry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 font-sans">
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
        {/* LEFT COLUMN (7 Cols): Institutional Hero & IT Governance Capabilities */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-6 sm:p-8 border-b-4 border-amber-400">
              <div className="flex items-center gap-4">
                <img
                  src="/dumalneg-logo.png"
                  alt="Dumalneg National High School Seal"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-md border-2 border-amber-400 shrink-0"
                />
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-bold uppercase tracking-widest">
                    IT Support &amp; System Governance
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                    {invitation
                      ? "IT Support Account Onboarding"
                      : "System Administration & Identity Desk"}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100/90">
                    Dumalneg National High School &bull; DepEd Division of Ilocos Norte
                  </p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-5 leading-relaxed">
                {invitation
                  ? "Your IT Support invitation has been verified. Create your security password to activate your system administration clearance."
                  : "Dedicated infrastructure and identity governance portal for Dumalneg National High School. Manage dynamic trisemester academic calendars, register campus classrooms, audit user role permissions, monitor database health, and issue secure staff onboarding invitations."}
              </p>
            </div>

            <div className="p-6 sm:p-8 bg-white space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-[#002060] uppercase tracking-wider block">
                    System Infrastructure Modules
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Enrollment System Governance &amp; Security Controls
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#002060] border border-blue-200 text-[11px] font-semibold">
                  System Admin
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#002060]/40 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 text-[#002060] font-bold text-xs">
                    <span className="w-6 h-6 rounded-md bg-[#002060] text-amber-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      01
                    </span>
                    <span>Dynamic Trisemester Calendar</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Configure active School Years and Trimesters with zero hardcoded dates, broadcasting changes to all portals.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#002060]/40 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 text-[#002060] font-bold text-xs">
                    <span className="w-6 h-6 rounded-md bg-[#002060] text-amber-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      02
                    </span>
                    <span>Classroom &amp; Facility Registry</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Maintain physical room capacities, building assignments, and laboratory classifications for timetable scheduling.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#002060]/40 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 text-[#002060] font-bold text-xs">
                    <span className="w-6 h-6 rounded-md bg-[#002060] text-amber-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      03
                    </span>
                    <span>User Role &amp; Access Auditor</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Audit Student, Teacher, Registrar, and IT Support accounts with Data Privacy Act of 2012 (RA 10173) safeguards.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#002060]/40 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 text-[#002060] font-bold text-xs">
                    <span className="w-6 h-6 rounded-md bg-[#002060] text-amber-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      04
                    </span>
                    <span>Staff Invitations &amp; Onboarding</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Generate and dispatch single-use cryptographic invitation links for new faculty and administrative personnel.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (5 Cols): Authentication / Onboarding Card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] shadow-md overflow-hidden">
            <div className="p-6 sm:p-7 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3.5">
              <div>
                <span className="text-[10px] font-bold text-[#002060] uppercase tracking-wider block">
                  IT Support &amp; System Security
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                  {invitation ? "IT Support Onboarding Setup" : "IT Support Portal Login"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {invitation
                    ? "Create your security password to activate access"
                    : "Sign in with your authorized system administrator credentials"}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-300 border-l-4 border-l-red-600 rounded-lg text-xs font-semibold text-red-900">
                  {errorMessage}
                </div>
              )}

              {activationSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 border-l-4 border-l-emerald-600 rounded-lg text-xs font-semibold text-emerald-950">
                  {activationSuccess}
                </div>
              )}

              {/* CASE 1: INVITATION VERIFIED -> SHOW CREATE PASSWORD FORM */}
              {invitation ? (
                <form onSubmit={handleActivateAccount} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Authorized IT Email
                    </label>
                    <input
                      type="email"
                      value={invitation.email}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-medium cursor-not-allowed select-all"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      System access is permanently bound to this verified email address.
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
                      placeholder="e.g. Alex Rivera"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-900 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Position
                    </label>
                    <CustomSelect
                      fullWidth
                      value={department}
                      onChange={(val) => setDepartment(val)}
                      options={[
                        { value: "IT-support", label: "IT-support", badge: "IT Support" },
                      ]}
                      placeholder="Select Position"
                    />
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
                      Confirm Security Password <span className="text-red-700">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold text-slate-900 focus:border-[#002060] outline-none rounded-[4px] transition-colors"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isActivating || Boolean(activationSuccess)}
                      className="w-full py-3 px-4 rounded-lg bg-[#002060] hover:bg-[#001845] text-white font-bold text-xs tracking-wide transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isActivating ? "Activating Clearance..." : "Activate IT Support Account & Sign In"}
                    </button>
                  </div>
                </form>
              ) : (
                /* CASE 2: NORMAL LOGIN FORM */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Authorized Administrator Email <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      placeholder="e.g. itsupport@dnhs.edu.ph or Gmail"
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
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer select-none"
                      >
                        {showPassword ? "Hide Password" : "Show Password"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your account password"
                      className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold text-slate-900 focus:border-[#002060] outline-none disabled:bg-slate-100 rounded-[4px] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-lg bg-[#002060] hover:bg-[#001845] text-white font-bold text-xs tracking-wide transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{isSubmitting ? "Verifying Credentials..." : "Sign In to IT Support Console"}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>


                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ITSupportLoginForm() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] text-center font-sans space-y-2 shadow-sm">
          <span className="text-xs font-bold tracking-wider text-[#002060] uppercase block">
            IT Support &amp; System Governance
          </span>
          <p className="text-xs text-slate-500">Loading IT Support Authentication Desk...</p>
        </div>
      }
    >
      <ITSupportLoginFormInner />
    </Suspense>
  );
}
