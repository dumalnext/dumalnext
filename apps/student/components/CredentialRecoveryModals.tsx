"use client";

import React, { useState, useEffect } from "react";
import SeparatedOtpInput from "./SeparatedOtpInput";

// -----------------------------------------------------------------------------
// MODAL 1: Password Reset Modal (Kapag PASSWORD lamang ang tinanggal ng IT)
// -----------------------------------------------------------------------------
export interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  initialMaskedEmail?: string;
  onSuccess: (identifier: string, newPassword: string) => void;
}

export function PasswordResetModal({
  isOpen,
  onClose,
  initialIdentifier = "",
  initialMaskedEmail = "",
  onSuccess,
}: PasswordResetModalProps) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [maskedEmail, setMaskedEmail] = useState(initialMaskedEmail);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (initialIdentifier) setIdentifier(initialIdentifier);
    if (initialMaskedEmail) setMaskedEmail(initialMaskedEmail);
  }, [initialIdentifier, initialMaskedEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    if (!identifier.trim()) {
      setError("Pakilagay ang iyong rehistradong Email Address o 12-digit LRN.");
      return;
    }
    setError("");
    setSuccessMsg("");
    setIsSendingOtp(true);

    try {
      const res = await fetch("/api/auth/credential-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_password_otp", identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Hindi maipadala ang verification code. Pakisubukang muli.");
      } else {
        setOtpSent(true);
        if (data.maskedEmail) setMaskedEmail(data.maskedEmail);
        setSuccessMsg(data.message || "Naipadala na ang 6-digit verification code sa iyong email.");
        setCooldown(60);
      }
    } catch {
      setError("Nagkaroon ng aberya sa koneksyon. Pakisubukang muli.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!otpCode || otpCode.length < 6) {
      setError("Pakilagay ang kumpletong 6-digit verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Ang bagong password ay dapat hindi bababa sa 6 na karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Hindi magkatugma ang Bagong Password at Kumpirmasyon.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/credential-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_password_otp_and_reset",
          identifier: identifier.trim(),
          otp: otpCode.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Hindi ma-update ang password. Pakisuri ang 6-digit code.");
      } else {
        setSuccessMsg(data.message || "Matagumpay na naitakda ang iyong bagong password!");
        setTimeout(() => {
          onSuccess(identifier.trim(), newPassword.trim());
          onClose();
        }, 1000);
      }
    } catch {
      setError("Nagkaroon ng problema sa network. Pakisubukang muli.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-amber-500 max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded uppercase">
                Abiso sa Seguridad
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Dumalneg NHS
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Na-reset ng IT ang Password
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Informative Note */}
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 space-y-1">
          <p className="font-bold">
            Proteksyon sa Data Privacy:
          </p>
          <p className="leading-relaxed text-[11px] text-amber-900">
            Ang dating password ng iyong account ay tinanggal ng IT Support. Hindi kailanman nakikita ng IT Support ang iyong password. Mangyaring humiling ng 6-digit verification code upang makapagtakda ka ng sarili mong bagong password.
          </p>
        </div>

        {/* Error / Success Alerts */}
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

        {/* Step 1: Identifier & OTP Request */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address o 12-Digit LRN <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. learner@gmail.com o 100050123456"
              disabled={otpSent}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#002060] focus:bg-white outline-none disabled:bg-slate-100"
            />
            {maskedEmail && (
              <p className="text-[11px] text-slate-500 mt-1">
                Padadalhan ng verification code: <strong>{maskedEmail}</strong>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={isSendingOtp || cooldown > 0}
            className="w-full py-2 px-3 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-lg disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>
              {isSendingOtp
                ? "Ipinapadala ang Code..."
                : cooldown > 0
                ? `Maghintay ng ${cooldown}s bago mag-resend`
                : otpSent
                ? "Ipadalang Muli ang 6-Digit Code"
                : "Ipadala ang 6-Digit Verification Code"}
            </span>
          </button>
        </div>

        {/* Step 2: OTP Verification & Set New Password */}
        {otpSent && (
          <form onSubmit={handleResetPassword} className="space-y-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                Ipasok ang 6-Digit Verification Code mula sa iyong Gmail
              </label>
              <SeparatedOtpInput
                value={otpCode}
                onChange={setOtpCode}
                length={6}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Bagong Password <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-[10px] font-bold text-[#002060] hover:underline cursor-pointer"
                >
                  {showPassword ? "Itago" : "Ipakita"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Hindi bababa sa 6 na karakter"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#002060] focus:bg-white outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kumpirmahin ang Bagong Password <span className="text-red-600">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulitin ang bagong password"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#002060] focus:bg-white outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otpCode.length < 6}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isSubmitting ? "Ipinoproseso ang Bagong Password..." : "I-save ang Bagong Password at Mag-Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MODAL 2: Identity Recovery Modal (Kapag PAREHONG EMAIL AT PASSWORD ang tinanggal)
// -----------------------------------------------------------------------------
export interface IdentityRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLrn?: string;
  onSuccess: (newEmail: string, newPassword: string) => void;
}

export function IdentityRecoveryModal({
  isOpen,
  onClose,
  initialLrn = "",
  onSuccess,
}: IdentityRecoveryModalProps) {
  // Step 1 State: Identity Verification
  const [lrn, setLrn] = useState(initialLrn);
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [studentName, setStudentName] = useState("");

  // Step 2 State: Set New Email and Password
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (initialLrn) setLrn(initialLrn);
  }, [initialLrn]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  // Step 1: Verify Identity against school records
  const handleVerifyIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanLrn = lrn.replace(/\D/g, "").slice(0, 12);
    if (!cleanLrn || cleanLrn.length !== 12) {
      setError("Kailangan ang wastong 12-digit Learner Reference Number (LRN).");
      return;
    }
    if (!lastName.trim() && !birthDate) {
      setError("Pakilagay ang iyong Apelyido o Petsa ng Kapanganakan (Birthdate).");
      return;
    }

    setIsVerifyingIdentity(true);
    try {
      const res = await fetch("/api/auth/credential-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_identity",
          lrn: cleanLrn,
          lastName: lastName.trim(),
          birthDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Hindi nagtutugma ang mga impormasyon sa rekord ng paaralan.");
      } else {
        setIsVerified(true);
        setStudentName(data.studentName || "Mag-aaral");
        setSuccessMsg(data.message || `Kumpirmado ang pagkakakilanlan: ${data.studentName}`);
      }
    } catch {
      setError("Nagkaroon ng aberya sa pagsusuri ng rekord. Pakisubukang muli.");
    } finally {
      setIsVerifyingIdentity(false);
    }
  };

  // Step 2a: Send OTP to new email
  const handleSendEmailOtp = async () => {
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Pakilagay ang isang wastong Gmail o email address.");
      return;
    }
    setError("");
    setSuccessMsg("");
    setIsSendingEmailOtp(true);

    try {
      const res = await fetch("/api/auth/credential-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_email_otp", newEmail: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Hindi maipadala ang verification code sa bagong email.");
      } else {
        setEmailOtpSent(true);
        setCooldown(60);
        setSuccessMsg(data.message || `Ang 6-digit code ay naipadala sa ${cleanEmail}.`);
      }
    } catch {
      setError("Nagkaroon ng problema sa network. Pakisubukang muli.");
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Step 2b: Complete recovery (Save new email & password)
  const handleCompleteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanLrn = lrn.replace(/\D/g, "").slice(0, 12);
    const cleanEmail = newEmail.trim().toLowerCase();

    if (!emailOtp || emailOtp.length < 6) {
      setError("Pakilagay ang 6-digit verification code mula sa iyong bagong email.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Ang bagong password ay dapat hindi bababa sa 6 na karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Hindi magkatugma ang Bagong Password at Kumpirmasyon.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/credential-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_identity_recovery",
          lrn: cleanLrn,
          birthDate,
          lastName: lastName.trim(),
          newEmail: cleanEmail,
          emailOtp: emailOtp.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Hindi makumpleto ang pag-recover ng account.");
      } else {
        setSuccessMsg(data.message || "Matagumpay na na-activate ang iyong bagong email at password!");
        setTimeout(() => {
          onSuccess(cleanEmail, newPassword.trim());
          onClose();
        }, 1200);
      }
    } catch {
      setError("Nagkaroon ng aberya sa koneksyon. Pakisubukang muli.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-red-600 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-100 text-red-900 border border-red-300 text-[10px] font-bold rounded uppercase">
                Identity Verification
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Self-Service Recovery
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Pagbawi ng Kredensyal gamit ang LRN
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Informative Note */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-950 space-y-1">
          <p className="font-bold">
            Mensahe mula sa IT Support:
          </p>
          <p className="leading-relaxed text-[11px] text-red-900">
            Tinanggal ng IT Support ang email at password ng account na ito. Upang mapatunayan na ikaw ang tunay na may-ari ng account, mangyaring patunayan ang iyong pagkakakilanlan gamit ang iyong 12-digit LRN at Apelyido o Petsa ng Kapanganakan.
          </p>
        </div>

        {/* Error / Success Alerts */}
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

        {/* STEP 1: Identity Verification Form */}
        {!isVerified ? (
          <form onSubmit={handleVerifyIdentity} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                12-Digit DepEd LRN <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                maxLength={12}
                value={lrn}
                onChange={(e) => setLrn(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 100050123456"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold tracking-wider focus:border-[#002060] focus:bg-white outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Apelyido (Last Name) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value.toUpperCase())}
                  placeholder="e.g. DELA CRUZ"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#002060] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Petsa ng Kapanganakan (Birthdate)
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#002060] focus:bg-white outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifyingIdentity || lrn.length !== 12}
              className="w-full py-2.5 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isVerifyingIdentity ? "Sinusuri ang Rekord sa DepEd Database..." : "Patunayan ang Pagkakakilanlan"}
            </button>
          </form>
        ) : (
          /* STEP 2: Setup New Email and New Password */
          <form onSubmit={handleCompleteRecovery} className="space-y-3.5">
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 font-semibold flex items-center justify-between">
              <div>
                <span>Kumpirmadong Rekord: <strong>{studentName}</strong></span>
                <span className="block text-[11px] text-emerald-800">LRN: {lrn}</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded">
                Verified
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bagong Email Address (Gmail) <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. bago.email@gmail.com"
                  disabled={emailOtpSent}
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#002060] focus:bg-white outline-none disabled:bg-slate-100"
                  required
                />
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={isSendingEmailOtp || cooldown > 0}
                  className="px-3 py-2 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-lg disabled:opacity-60 whitespace-nowrap cursor-pointer"
                >
                  {isSendingEmailOtp ? "Dispatched..." : cooldown > 0 ? `${cooldown}s` : emailOtpSent ? "Resend" : "Send OTP"}
                </button>
              </div>
            </div>

            {emailOtpSent && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                    6-Digit Verification Code mula sa bagong Gmail
                  </label>
                  <SeparatedOtpInput
                    value={emailOtp}
                    onChange={setEmailOtp}
                    length={6}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Bagong Password <span className="text-red-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="text-[10px] font-bold text-[#002060] hover:underline cursor-pointer"
                      >
                        {showPassword ? "Itago" : "Ipakita"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#002060] focus:bg-white outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kumpirmahin <span className="text-red-600">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulitin ang password"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#002060] focus:bg-white outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || emailOtp.length < 6}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isSubmitting ? "Inia-activate ang Account..." : "I-save at I-activate ang Account"}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
