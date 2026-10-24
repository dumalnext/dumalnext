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
      setError("Pakilagay ang isang wastong Gmail o email address.");
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
        setError(data.error || "Hindi maipadala ang verification code. Pakisubukang muli.");
      } else {
        setOtpSent(true);
        setCooldown(60);
        setSuccessMsg(data.message || `Ang 6-digit verification code ay naipadala sa ${cleanEmail}.`);
      }
    } catch {
      setError("Nagkaroon ng problema sa koneksyon. Pakisubukang muli.");
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
      setError("Pakilagay ang 6-digit verification code mula sa iyong email.");
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
        setError(data.error || "Hindi ma-verify ang 6-digit code. Pakisuri ang email.");
      } else {
        setSuccessMsg(data.message || "Matagumpay na nai-link ang iyong bagong email address!");
        setTimeout(() => {
          onEmailSaved(cleanEmail);
        }, 1000);
      }
    } catch {
      setError("Nagkaroon ng aberya sa pagsave ng email. Pakisubukang muli.");
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
          Kailangan ng Aksyon: Walang Nakakabit na Email Address
        </h1>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          Tinanggal o na-reset ng IT Support ang email address ng iyong account. Upang ma-secure ang iyong account at makatanggap ng DepEd enrollment updates at 6-digit verification codes, mangyaring ilagay ang iyong aktibong email address ngayon.
        </p>
      </div>

      {/* Account Identity Card */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
        <div className="flex justify-between items-center text-slate-600">
          <span>Pangalan ng Mag-aaral:</span>
          <strong className="text-slate-900">{user.fullName}</strong>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Learner Reference Number (LRN):</span>
          <strong className="text-slate-900">{user.lrn || user.userId}</strong>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Status ng Email:</span>
          <span className="text-amber-700 font-bold">Walang Nakakabit (Tinanggal ng IT)</span>
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
            Bagong Email Address (Gmail) <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. learner.bagongemail@gmail.com"
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
              {isSendingOtp ? "Ipinapadala..." : cooldown > 0 ? `${cooldown}s` : otpSent ? "Resend OTP" : "Ipadala ang OTP"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Magpapadala ang sistema ng 6-digit verification code upang masigurong ikaw ang may-ari ng email na ito.
          </p>
        </div>

        {otpSent && (
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 text-center">
                Ipasok ang 6-Digit Code na ipinadala sa {newEmail}
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
              {isSaving ? "Inia-apply ang Bagong Email..." : "I-verify at I-save ang Bagong Email Address"}
            </button>
          </div>
        )}
      </form>

      {/* Logout fallback */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Nais munang lumabas?
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
        >
          Mag-Sign Out
        </button>
      </div>
    </div>
  );
}
