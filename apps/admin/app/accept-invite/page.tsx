"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface InvitationData {
  id: string;
  email: string;
  role: "teacher" | "admin" | "it_support";
  fullName?: string;
  department?: string;
  status: string;
  expiresAt: string;
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ message: string; redirectUrl: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorMessage("No invitation token provided. Please open the link sent by your IT Support administrator.");
      return;
    }

    const validateToken = async () => {
      try {
        let res = await fetch(`/api/it-support/invitations?token=${encodeURIComponent(token)}`);
        if (res.status === 404) {
          res = await fetch(`/api/invitations?token=${encodeURIComponent(token)}`);
        }

        const json = await res.json();
        if (json.valid && json.invitation) {
          setInvitation(json.invitation);
          if (json.invitation.fullName) {
            const parts = json.invitation.fullName.split(" ");
            setFirstName(parts[0] || "");
            setLastName(parts.slice(1).join(" ") || "");
          }
          if (json.invitation.department) {
            setDepartment(json.invitation.department);
          } else {
            if (json.invitation.role === "teacher") setDepartment("Junior High School (JHS)");
            else if (json.invitation.role === "admin") setDepartment("Office of the Registrar");
            else setDepartment("System Administrator");
          }
        } else {
          setErrorMessage(json.error || "This invitation link is invalid or has expired.");
        }
      } catch (err: any) {
        setErrorMessage("Network error validating your invitation link.");
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invitation) return;

    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters in length.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        token,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        department: department.trim(),
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

      if (json.success) {
        // Set client session cookie if returned
        if (json.cookieName && json.sessionUser) {
          const serialized = encodeURIComponent(JSON.stringify(json.sessionUser));
          document.cookie = `${json.cookieName}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
        }

        setSuccessInfo({
          message: "Account created and activated successfully! Redirecting you to your portal...",
          redirectUrl: json.redirectUrl,
        });

        // Redirect after 1.5 seconds
        setTimeout(() => {
          window.location.href = json.redirectUrl;
        }, 1500);
      } else {
        setErrorMessage(json.error || "Failed to activate your account.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error activating account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] p-8 text-center space-y-3 shadow-sm max-w-md w-full">
          <div className="w-10 h-10 rounded-full border-2 border-[#002060] border-t-amber-400 animate-spin mx-auto" />
          <span className="text-xs uppercase font-bold text-[#002060] tracking-wider block">
            Verifying Invitation Token
          </span>
          <p className="text-xs text-slate-500">Checking credentials with Dumalneg NHS system registry...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !invitation) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full mx-auto bg-white rounded-xl border border-slate-200 border-t-4 border-t-red-600 shadow-md overflow-hidden">
          <div className="bg-red-800 text-white p-5 text-center">
            <span className="text-[10px] font-bold tracking-widest uppercase text-red-200 block">
              Access Restricted
            </span>
            <h1 className="text-base font-extrabold tracking-wide mt-0.5">
              Invitation Invalid or Expired
            </h1>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 leading-relaxed">
              {errorMessage}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please contact the Dumalneg National High School IT Support Desk to issue a new onboarding link for your official email address.
            </p>
            <div className="pt-3 border-t border-slate-200 flex justify-center">
              <Link
                href="/"
                className="text-xs font-bold text-[#002060] hover:underline flex items-center gap-1"
              >
                <span>&larr; Return to School Portal Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roleTitle =
    invitation?.role === "teacher"
      ? "Teacher / Faculty Member"
      : invitation?.role === "admin"
      ? "School Administrator"
      : "IT Support Desk";

  const roleBadgeColor =
    invitation?.role === "teacher"
      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
      : invitation?.role === "admin"
      ? "bg-amber-400/20 text-amber-200 border-amber-300/40"
      : "bg-indigo-100 text-indigo-900 border-indigo-300";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-lg w-full mx-auto space-y-6">
        {/* DepEd Region I Official Strip */}
        <div className="text-center space-y-2">
          <img
            src="/dumalneg-logo.png"
            alt="Dumalneg National High School Seal"
            className="w-16 h-16 rounded-full object-cover bg-white p-1 shadow-md border-2 border-amber-400 mx-auto"
          />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            DepEd Region I &bull; Division of Ilocos Norte &bull; Dumalneg NHS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002060] tracking-tight">
            Official Staff Onboarding &amp; Password Setup
          </h1>
        </div>

        {/* Success Banner */}
        {successInfo && (
          <div className="bg-emerald-50 border border-emerald-300 border-l-4 border-l-emerald-600 rounded-lg p-4 text-xs font-semibold text-emerald-950 space-y-1.5 shadow-xs">
            <div className="font-bold uppercase tracking-wider text-emerald-800">Account Activated</div>
            <div>{successInfo.message}</div>
            <div className="text-[11px] text-emerald-700">
              Redirecting to: {successInfo.redirectUrl}
            </div>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-300 border-l-4 border-l-red-600 rounded-lg p-3.5 text-xs font-semibold text-red-900">
            {errorMessage}
          </div>
        )}

        {/* Onboarding Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-5 border-b-4 border-amber-400">
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300 block">
              Secure Onboarding Invitation Verified
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
              <span className="text-base font-extrabold tracking-tight">
                Setup Credentials: {roleTitle}
              </span>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase border rounded-full ${roleBadgeColor}`}>
                Role: {invitation?.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
            {/* Email Address (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Authorized Staff Email (Locked)
              </label>
              <input
                type="text"
                readOnly
                value={invitation?.email || ""}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-medium select-all cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                This account will be permanently tied to this verified email address.
              </span>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Santos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Department / Academic Office
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-3.5 pt-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Create Account Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 hover:text-[#002060] px-1.5 py-0.5 cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Password <span className="text-red-600">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting || !!successInfo}
                className="w-full py-3 px-4 rounded-lg bg-[#002060] hover:bg-[#001744] disabled:bg-slate-400 text-white text-xs font-bold tracking-wide transition-colors cursor-pointer shadow-sm"
              >
                {isSubmitting
                  ? "Activating Account & Signing In..."
                  : "Create Password & Activate Portal Access"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500">
          Dumalneg National High School &bull; Identity &amp; Access Onboarding
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-xs font-semibold text-[#002060]">
          Loading Staff Onboarding Page...
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
