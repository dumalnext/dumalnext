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
        if (json.cookieName && json.sessionUser) {
          const serialized = encodeURIComponent(JSON.stringify(json.sessionUser));
          document.cookie = `${json.cookieName}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
        }

        setSuccessInfo({
          message: "Account created and activated successfully! Redirecting you to your portal...",
          redirectUrl: json.redirectUrl,
        });

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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white border-2 border-slate-300 p-8 text-center space-y-2">
          <span className="font-mono text-xs uppercase font-bold text-[#002060] block">
            [ VERIFYING INVITATION TOKEN... ]
          </span>
          <p className="text-xs text-slate-500">Checking credentials with Dumalneg NHS system registry...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !invitation) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full mx-auto bg-white border-2 border-red-600 shadow-md p-6 sm:p-8 space-y-4">
          <div className="bg-red-800 text-white p-3 text-center">
            <span className="text-[10px] font-mono tracking-wider uppercase text-red-200 block">
              [ ACCESS RESTRICTED ]
            </span>
            <h1 className="text-sm font-bold uppercase tracking-wide">
              Invitation Invalid or Expired
            </h1>
          </div>
          <div className="p-3 bg-red-50 border border-red-300 text-xs text-red-900 leading-relaxed font-sans">
            {errorMessage}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Please contact the Dumalneg National High School IT Support Desk to issue a new onboarding link for your official email address.
          </p>
          <div className="pt-2 border-t border-slate-200 flex justify-center">
            <Link
              href="/"
              className="text-xs font-mono font-bold text-[#002060] hover:underline uppercase"
            >
              &larr; Return to School Portal Home
            </Link>
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
      ? "bg-blue-100 text-[#002060] border-blue-300"
      : "bg-indigo-100 text-indigo-900 border-indigo-300";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-lg w-full mx-auto space-y-6">
        <div className="text-center space-y-1">
          <span className="font-mono text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest block">
            DEPED REGION I &bull; DIVISION OF ILOCOS NORTE &bull; DUMALNEG NHS
          </span>
          <h1 className="text-lg sm:text-xl font-bold uppercase text-[#002060] tracking-tight">
            Official Staff Onboarding &amp; Password Setup
          </h1>
        </div>

        {successInfo && (
          <div className="bg-green-50 border-2 border-green-600 p-4 text-xs font-bold text-green-900 space-y-2">
            <div>[ STATUS: SUCCESS ]</div>
            <div>{successInfo.message}</div>
            <div className="font-mono text-[11px] text-green-700">
              Directing to: {successInfo.redirectUrl}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border-2 border-red-600 p-3 text-xs font-bold text-red-900">
            [ ERROR ]: {errorMessage}
          </div>
        )}

        <div className="bg-white border-2 border-[#002060] shadow-sm">
          <div className="bg-[#002060] text-white p-4">
            <span className="text-[10px] font-mono tracking-wider uppercase text-blue-200 block">
              [ SECURE ONBOARDING INVITATION VERIFIED ]
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-1">
              <span className="text-sm font-bold uppercase tracking-wide">
                Setup Credentials: {roleTitle}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${roleBadgeColor}`}>
                Role: {invitation?.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Authorized Staff Email (Locked)
              </label>
              <input
                type="text"
                readOnly
                value={invitation?.email || ""}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-300 text-slate-700 select-all cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                This account will be permanently tied to this email address.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-[#002060] focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Santos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-[#002060] focus:outline-none uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Department / Academic Office
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-[#002060] focus:outline-none"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Create Account Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-[#002060] focus:outline-none pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 hover:text-slate-800 uppercase px-1 py-0.5"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-[#002060] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting || !!successInfo}
                className="w-full py-3 px-4 bg-[#002060] hover:bg-[#001744] disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting
                  ? "[ ACTIVATING ACCOUNT & LOGGING IN... ]"
                  : "[ CREATE PASSWORD & ACTIVATE PORTAL ACCESS ]"}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-[10px] font-mono uppercase text-slate-500">
          Dumalneg National High School &bull; IT Support &amp; Identity Onboarding System
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-mono text-xs text-[#002060] uppercase">
          [ Loading Onboarding Page... ]
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
