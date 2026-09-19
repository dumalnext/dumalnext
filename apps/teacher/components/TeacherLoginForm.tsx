"use client";

import React, { useState } from "react";
import { useTeacherAuth } from "@/lib/auth/authContext";

export default function TeacherLoginForm() {
  const { login, resendVerification } = useTeacherAuth();
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string>("");
  const [resendStatus, setResendStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
      setResendStatus(`Verification email resent to [ ${unconfirmedEmail} ]. Please check your Gmail inbox or spam folder.`);
    } else {
      setResendStatus(res.error || "Failed to resend confirmation email. Rate limit may apply.");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Notice Banner */}
      <div className="bg-white border-l-4 border-[#002060] p-6 shadow-xs border border-slate-200">
        <span className="text-xs font-mono font-bold tracking-widest text-[#002060] uppercase block mb-1">
          [ PORTAL 02: FACULTY &amp; ACADEMIC STAFF WORKSTATION ]
        </span>
        <h2 className="text-lg font-bold text-slate-900 uppercase">
          Faculty Member Sign-In
        </h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          Authorized access portal for teaching personnel of Dumalneg National High School.
          Access your official teaching load schedule, review assigned sections, and inspect real-time student rosters.
        </p>
      </div>

      {/* Login Box */}
      <div className="bg-white p-6 sm:p-8 border-2 border-[#002060] shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
            [ SECURE ACCESS AUTHENTICATION ]
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Faculty Member Credentials
          </h3>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border-2 border-red-500 text-xs text-red-950 space-y-2">
            <div className="font-bold flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-200 border border-red-400 font-mono text-[10px] uppercase">
                [ AUTHENTICATION ERROR ]
              </span>
              <span>{errorMsg}</span>
            </div>
            {unconfirmedEmail && (
              <div className="pt-2 border-t border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] text-red-900">
                  Did not receive confirmation link for [ {unconfirmedEmail} ]?
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  className="px-3 py-1 bg-red-800 hover:bg-red-900 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                >
                  [ Resend Verification Email ]
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
              {isSubmitting ? "[ Authenticating... ]" : "[ Authenticate & Enter Faculty Workstation ]"}
            </button>
          </div>
        </form>

        {/* Authorized Faculty Accounts Information */}
        <div className="pt-4 border-t border-slate-200">
          <span className="text-[11px] font-mono font-bold text-slate-600 uppercase block mb-2">
            [ PRE-AUTHORIZED FACULTY ACCOUNTS (DUMALNEG NHS) ]:
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
            Password: Default password provided upon faculty onboarding (<code className="font-bold">Teacher@2026</code>). Confirmation email sent to your Gmail inbox.
          </p>
        </div>
      </div>
    </div>
  );
}
