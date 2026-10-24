"use client";

import React, { useState, useEffect } from "react";

interface StudentPasswordResetContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmailOrLrn?: string;
  onTrackTicket?: (ticketNumber: string) => void;
}

export default function StudentPasswordResetContactModal({
  isOpen,
  onClose,
  initialEmailOrLrn = "",
  onTrackTicket,
}: StudentPasswordResetContactModalProps) {
  const [fullName, setFullName] = useState("");
  const [lrn, setLrn] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState(
    "Nakalimutan ko po ang aking password at nais ko po itong ma-reset upang makapasok sa portal."
  );

  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    ticketNumber: string;
    message: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Initialize fields based on login input parameter
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = (initialEmailOrLrn || "").trim();
    if (/^\d{12}$/.test(trimmed)) {
      setLrn(trimmed);
    } else if (trimmed.includes("@")) {
      setEmail(trimmed);
    }
    setSubmitSuccess(null);
    setSubmitError("");
    setCopySuccess(false);
  }, [isOpen, initialEmailOrLrn]);

  if (!isOpen) return null;

  // Build the pre-formatted email letter with explicit CRLF
  const constructMessageText = (crlf: boolean = true) => {
    const nl = crlf ? "\r\n" : "\n";
    return [
      "Magandang araw po Dumalneg NHS IT Support Desk,",
      "",
      "Nais ko po sanang mag-request ng password reset para sa aking student account sa Dumalneg National High School.",
      "",
      "Mga Detalye ng Aking Account:",
      `- Buong Pangalan: ${fullName.trim() || "[Pakilagay ang iyong pangalan]"}`,
      `- 12-Digit LRN: ${lrn.trim() || "[Pakilagay ang 12-digit LRN]"}`,
      `- Rehistradong Email / Gmail: ${email.trim() || "[Pakilagay ang iyong Gmail]"}`,
      `- Dahilan / Concern: ${reason.trim()}`,
      "",
      "Maraming salamat po sa inyong tulong!",
    ].join(nl);
  };

  const emailSubject = "Password Reset Request - Dumalneg NHS Student Account";
  const rawBodyText = constructMessageText(true);
  const encodedSubject = encodeURIComponent(emailSubject);
  const encodedBody = encodeURIComponent(rawBodyText);

  // Gmail Web direct compose URL (works across Chrome Android, iOS, Windows, Mac)
  const gmailWebComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=dumalnext@gmail.com&su=${encodedSubject}&body=${encodedBody}`;

  // Standard RFC mailto URL with CRLF encoding
  const mailtoUrl = `mailto:dumalnext@gmail.com?subject=${encodedSubject}&body=${encodedBody}`;

  // Direct submit to IT Support desk
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!fullName.trim()) {
      setSubmitError("Pakilagay po ang inyong buong pangalan.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setSubmitError("Pakilagay po ang inyong wastong email address.");
      return;
    }

    setIsSubmittingDirect(true);
    try {
      const res = await fetch("/api/concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: fullName.trim(),
          email: email.trim().toLowerCase(),
          lrn: lrn.trim().replace(/\D/g, "").slice(0, 12),
          category: "password_reset",
          subject: emailSubject,
          message: constructMessageText(false),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Nabigong maipadala ang request. Pakisubukang muli.");
      }

      setSubmitSuccess({
        ticketNumber: data.ticketNumber,
        message: data.message || "Naisumite na ang inyong kahilingan sa IT Support Desk.",
      });
    } catch (err: any) {
      setSubmitError(err.message || "May naganap na error habang ipinapadala ang request.");
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(rawBodyText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch {
      // Fallback copy
      const textArea = document.createElement("textarea");
      textArea.value = rawBodyText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#002060] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                Dumalneg NHS &bull; IT Support Desk
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Password Reset Assistance
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {submitSuccess ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Matagumpay na Naisumite ang Request!
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Nakatanggap na ang aming IT Support Desk ng iyong kahilingan para sa password reset.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg max-w-sm mx-auto">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Reference Ticket Number
                </span>
                <span className="text-lg font-extrabold text-[#002060] font-mono block mt-0.5">
                  #{submitSuccess.ticketNumber}
                </span>
                <span className="text-[11px] text-slate-600 block mt-1">
                  I-save ang reference number na ito para sa pag-check ng status.
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                {onTrackTicket && (
                  <button
                    type="button"
                    onClick={() => {
                      onTrackTicket(submitSuccess.ticketNumber);
                      onClose();
                    }}
                    className="py-2.5 px-4 bg-[#002060] hover:bg-[#001845] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    I-track ang Status ng Ticket
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Isara
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Notification Banner */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-950">
                    Nais mag-reset ng password sa Dumalneg NHS Account?
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Maaari mong direktang i-submit ang iyong detalye dito sa portal o ipadala bilang email sa <span className="font-bold text-[#002060]">dumalnext@gmail.com</span>. Reresolbahin ito agad ng IT Support.
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                  <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{submitError}</span>
                </div>
              )}

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Buong Pangalan ng Mag-aaral (Full Name) *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Halimbawa: Juan P. Dela Cruz"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      12-Digit LRN (Kung mayroon)
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={lrn}
                      onChange={(e) => setLrn(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="12-digit LRN"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Rehistradong Gmail / Email Address *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Halimbawa: student@gmail.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Karagdagang Dahilan o Paliwanag
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
                  />
                </div>
              </div>

              {/* Message Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Binuong Mensahe para sa IT Support:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>{copySuccess ? "Nakopya na!" : "Kopyahin ang Mensahe"}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {rawBodyText}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                {/* Method 1: Instant In-App Submit */}
                <button
                  type="button"
                  onClick={handleDirectSubmit}
                  disabled={isSubmittingDirect}
                  className="w-full py-2.5 px-4 bg-[#002060] hover:bg-[#001845] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDirect ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Ipinapadala sa IT Support Desk...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>I-submit Agad sa IT Support Desk (Dito sa Portal)</span>
                    </>
                  )}
                </button>

                {/* Method 2 & 3: Email Client Triggers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={gmailWebComposeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Buksan sa Gmail (Web / App)</span>
                  </a>

                  <a
                    href={mailtoUrl}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Default Mail Client</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
