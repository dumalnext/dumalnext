"use client";

import React, { useState, useEffect } from "react";
import { StudentUser } from "@/lib/auth/authContext";
import SeparatedOtpInput from "./SeparatedOtpInput";

export interface EmailSetupGuardProps {
  user: StudentUser;
  onEmailSaved: (newEmail: string) => void;
  onLogout: () => void;
}

export default function EmailSetupGuard({
  user,
  onEmailSaved,
  onLogout,
}: EmailSetupGuardProps) {
  const [newEmail, setNewEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid Gmail or email address.");
      return;
    }
    setError("");
    setSuccessMsg("");
    setIsSendingOtp(true);

    try {
      const res = await fetch("/api/auth/credential-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_email_otp", newEmail: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Unable to send verification code. Please try again.");
      } else {
        setOtpSent(true);
        setCooldown(60);
        setSuccessMsg(data.message || `A 6-digit verification code has been sent to ${cleanEmail}.`);
      }
    } catch {
      setError("Network connection issue. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!otpCode || otpCode.length < 6) {
      setError("Please enter the 6-digit verification code from your email.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/credential-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_email_otp_and_save",
          userId: user.id,
          newEmail: cleanEmail,
          otp: otpCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Unable to verify 6-digit code. Please check your email.");
      } else {
        setSuccessMsg(data.message || "Your new email address has been linked successfully!");
        setTimeout(() => {
          onEmailSaved(cleanEmail);
        }, 1000);
      }
    } catch {
      setError("An error occurred while saving your email. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8 p-6 sm:p-8 bg-white border-2 border-amber-400 rounded-xl shadow-lg space-y-6">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-bold rounded uppercase tracking-wider">
            Required Security Action
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            Dumalneg NHS Learner Account
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
          Action Required: No Linked Email Address
        </h1>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          Your account email address was reset by IT Support. To secure your account and receive DepEd enrollment updates and verification codes, please link your active email address now.
        </p>
      </div>

      {/* Account Identity Card */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
        <div className="flex justify-between items-center text-slate-600">
          <span>Student Name:</span>
          <strong className="text-slate-900">{user.fullName}</strong>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Learner Reference Number (LRN):</span>
          <strong className="text-slate-900">{user.lrn || user.userId}</strong>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Email Status:</span>
          <span className="text-amber-700 font-bold">Not Linked (Reset by IT)</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-900 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleVerifyAndSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            New Email Address (Gmail) <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. student.email@gmail.com"
              disabled={otpSent}
              className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#002060] focus:bg-white outline-none disabled:bg-slate-100"
              required
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isSendingOtp || cooldown > 0}
              className="px-4 py-2.5 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-lg disabled:opacity-60 whitespace-nowrap cursor-pointer transition-colors"
            >
              {isSendingOtp ? "Sending..." : cooldown > 0 ? `${cooldown}s` : otpSent ? "Resend OTP" : "Send OTP"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            The system will dispatch a 6-digit verification code to confirm that you own this email address.
          </p>
        </div>

        {otpSent && (
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 text-center">
                Enter the 6-Digit Verification Code sent to {newEmail}
              </label>
              <SeparatedOtpInput
                value={otpCode}
                onChange={setOtpCode}
                length={6}
                disabled={isSaving}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || otpCode.length < 6}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isSaving ? "Applying New Email..." : "Verify & Save New Email Address"}
            </button>
          </div>
        )}
      </form>

      {/* Logout fallback */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Need to sign out?
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
