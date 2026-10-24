"use client";

import React, { useState } from "react";

export type ConcernModalMode = "submit" | "track";

interface ConcernReply {
  id: string;
  sender: "it_support" | "student";
  senderName: string;
  message: string;
  createdAt: string;
}

interface StudentConcernModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ConcernModalMode;
  initialCategory?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillLrn?: string;
}

export default function StudentConcernModal({
  isOpen,
  onClose,
  initialMode = "submit",
  initialCategory = "account_help",
  prefillName = "",
  prefillEmail = "",
  prefillLrn = "",
}: StudentConcernModalProps) {
  const [activeTab, setActiveTab] = useState<ConcernModalMode>(initialMode);

  // Submit Form State
  const [studentName, setStudentName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [lrn, setLrn] = useState(prefillLrn);
  const [gradeLevel, setGradeLevel] = useState("Grade 7");
  const [contactNumber, setContactNumber] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    message: string;
  } | null>(null);

  // Tracking State
  const [trackQuery, setTrackQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [foundTickets, setFoundTickets] = useState<any[]>([]);

  // Follow-up Student Reply State
  const [studentReplyText, setStudentReplyText] = useState("");
  const [replyingTicket, setReplyingTicket] = useState<string | null>(null);
  const [isSendingStudentReply, setIsSendingStudentReply] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          email,
          lrn,
          gradeLevel,
          contactNumber,
          category,
          subject: subject || "Student Support Concern",
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request. Please try again.");
      }

      setSubmittedTicket({
        ticketNumber: data.ticketNumber,
        message: data.message || "Your inquiry has been filed with IT Support.",
      });
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred while submitting your concern.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSearch = async (e?: React.FormEvent, explicitQuery?: string) => {
    if (e) e.preventDefault();
    const query = (explicitQuery !== undefined ? explicitQuery : trackQuery).trim();
    if (!query) {
      setSearchError("Please enter your Ticket Number (e.g. TKT-2026-1234) or registered email.");
      return;
    }

    setSearchError("");
    setIsSearching(true);

    try {
      const isEmail = query.includes("@");
      const param = isEmail ? `email=${encodeURIComponent(query)}` : `ticket=${encodeURIComponent(query)}`;
      const res = await fetch(`/api/concerns?${param}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to check ticket status.");
      }

      if (!data.found || !data.allConcerns || data.allConcerns.length === 0) {
        setSearchError("No concerns found matching the provided reference number or email.");
        setFoundTickets([]);
      } else {
        setFoundTickets(data.allConcerns);
      }
    } catch (err: any) {
      setSearchError(err.message || "Unable to retrieve ticket status.");
      setFoundTickets([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendStudentReply = async (ticketNumber: string) => {
    if (!studentReplyText.trim()) return;

    setIsSendingStudentReply(true);
    try {
      const res = await fetch("/api/concerns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketNumber,
          replyMessage: studentReplyText.trim(),
          studentName: studentName || "Student",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send follow-up reply.");
      }

      setStudentReplyText("");
      setReplyingTicket(null);
      await handleTrackSearch(undefined, ticketNumber);
    } catch (err: any) {
      alert(err.message || "Failed to send reply.");
    } finally {
      setIsSendingStudentReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                Dumalneg NHS &bull; Student Helpdesk
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Learner Messages &amp; Concerns
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("submit");
              setSubmittedTicket(null);
            }}
            className={`flex-1 py-3 px-4 text-center cursor-pointer border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === "submit"
                ? "border-[#002060] bg-white text-[#002060]"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Submit a Concern / Inquiry</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("track")}
            className={`flex-1 py-3 px-4 text-center cursor-pointer border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === "track"
                ? "border-[#002060] bg-white text-[#002060]"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Track Concern &amp; Replies</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === "submit" && (
            <div>
              {submittedTicket ? (
                <div className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border-2 border-emerald-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Inquiry Dispatched Successfully
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                      {submittedTicket.message}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 max-w-sm mx-auto">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Your Reference Ticket Number
                    </span>
                    <span className="text-lg font-mono font-extrabold text-[#002060] tracking-wider block mt-1">
                      {submittedTicket.ticketNumber}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Save this ticket number to check IT Support replies anytime.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTrackQuery(submittedTicket.ticketNumber);
                        setActiveTab("track");
                        handleTrackSearch(undefined, submittedTicket.ticketNumber);
                      }}
                      className="px-4 py-2 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-md shadow-xs cursor-pointer"
                    >
                      Track Conversation Now
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-md cursor-pointer"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                <>
                {/* Direct Email Helpdesk Card */}
                <div className="mb-4 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      <span className="text-xs font-bold text-[#002060]">
                        Maaari ka ring direktang mag-email sa IT Support:
                      </span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-300">
                      Official Helpdesk Email
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Kung hindi ka makapag-login o nais mong mag-email mula sa iyong Gmail, i-click ang pindutan sa ibaba upang mag-compose ng email sa <strong>dumalnext@gmail.com</strong>. Awtomatiko itong papasok sa aming IT Support Desk.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="mailto:dumalnext@gmail.com?subject=Password%20Reset%20Request%20-%20Dumalneg%20NHS&body=Pangalan%20ng%20Mag-aaral%3A%0ALRN%20(12-Digit)%3A%0AApelyido%2FRecord%3A%0AMensahe%20ukol%20sa%20Password%20o%20Account%3A%0A"
                      className="px-3 py-1.5 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Mag-email sa dumalnext@gmail.com</span>
                    </a>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Institutional Policy Notice */}
                  <div className="p-3 bg-blue-50 border-l-4 border-[#002060] border border-blue-200 rounded-md text-xs text-slate-700 leading-relaxed space-y-1">
                    <span className="font-bold text-[#002060] block">
                      DepEd Learner Account Security &amp; Privacy Notice
                    </span>
                    <p>
                      Dumalneg NHS adheres to DepEd data governance. Passwords are never visible to IT Support staff and all credentials remain encrypted. Submit your inquiry below and IT Support will review and reply directly to your concern.
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-3 bg-red-50 border-l-4 border-red-600 border border-red-200 text-xs font-bold text-red-900 rounded-md">
                      {submitError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Concern Category <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none"
                        required
                      >
                        <option value="account_help">Password / Account Access Assistance</option>
                        <option value="lrn_profile">LRN / PSA Name Discrepancy</option>
                        <option value="enrollment">Enrollment &amp; Sectioning Inquiry</option>
                        <option value="grades_schedule">Grades &amp; Class Schedule Concern</option>
                        <option value="other">General Technical Assistance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Grade Level
                      </label>
                      <select
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none"
                      >
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11 (Senior High)</option>
                        <option value="Grade 12">Grade 12 (Senior High)</option>
                        <option value="Transferee">Transferee / Returning Learner</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Full Name (PSA / School Record) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g. Juan Dela Cruz"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Registered Email Address <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. learner@gmail.com"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        12-Digit LRN (Learner Reference Number)
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        value={lrn}
                        onChange={(e) => setLrn(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g. 101234567890 (optional)"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-mono rounded-md focus:border-[#002060] focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Contact / Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="e.g. 09171234567 (optional)"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="State your concern in one sentence"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Detailed Concern / Message <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please explain your question or issue in detail..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none resize-none leading-relaxed"
                      required
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-md cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-md shadow-xs disabled:opacity-60 cursor-pointer flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                          <span>Submitting Concern...</span>
                        </>
                      ) : (
                        <span>Submit Concern to IT Support</span>
                      )}
                    </button>
                  </div>
                </form>
                </>
              )}
            </div>
          )}

          {activeTab === "track" && (
            <div className="space-y-4">
              <form onSubmit={(e) => handleTrackSearch(e)} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Enter Ticket Number or Registered Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={trackQuery}
                      onChange={(e) => setTrackQuery(e.target.value)}
                      placeholder="e.g. TKT-2026-1234 or learner@gmail.com"
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-5 py-2.5 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-md shadow-xs disabled:opacity-60 cursor-pointer shrink-0"
                    >
                      {isSearching ? "Searching..." : "Track"}
                    </button>
                  </div>
                </div>
              </form>

              {searchError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-600 border border-red-200 text-xs font-bold text-red-900 rounded-md">
                  {searchError}
                </div>
              )}

              {foundTickets.length > 0 && (
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Found {foundTickets.length} inquiry ticket(s):
                  </span>
                  {foundTickets.map((ticket, idx) => {
                    const isResolved = ticket.status === "RESOLVED";
                    const isPending = ticket.status === "PENDING";
                    const isInProgress = ticket.status === "IN_PROGRESS";
                    const replies: ConcernReply[] = ticket.replies || [];

                    return (
                      <div
                        key={ticket.ticketNumber || idx}
                        className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs space-y-3.5"
                      >
                        {/* Ticket Strip */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-[#002060]">
                              {ticket.ticketNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">&bull;</span>
                            <span className="text-[11px] font-semibold text-slate-700">
                              {ticket.subject}
                            </span>
                          </div>
                          <div>
                            {isResolved && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Resolved
                              </span>
                            )}
                            {isInProgress && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                                In Progress
                              </span>
                            )}
                            {isPending && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                Pending IT Reply
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date info */}
                        <div className="text-xs text-slate-500 flex items-center justify-between">
                          <span>Filed On: {new Date(ticket.createdAt).toLocaleString("en-PH")}</span>
                          {ticket.resolvedAt && (
                            <span className="text-emerald-700 font-semibold">
                              Resolved: {new Date(ticket.resolvedAt).toLocaleString("en-PH")}
                            </span>
                          )}
                        </div>

                        {/* Conversation Replies Stream */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Conversation &amp; Responses
                          </span>

                          {replies.length > 0 ? (
                            <div className="space-y-2.5">
                              {replies.map((rep) => {
                                const isIt = rep.sender === "it_support";
                                return (
                                  <div
                                    key={rep.id}
                                    className={`flex flex-col ${isIt ? "items-start" : "items-end"}`}
                                  >
                                    <span className="text-[10px] font-bold text-slate-500 mb-0.5">
                                      {rep.senderName} &bull; {new Date(rep.createdAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
                                    </span>
                                    <div
                                      className={`rounded-lg px-3 py-2 text-xs leading-relaxed max-w-[90%] whitespace-pre-wrap ${
                                        isIt
                                          ? "bg-[#002060] text-white"
                                          : "bg-white text-slate-800 border border-slate-200"
                                      }`}
                                    >
                                      {rep.message}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              Awaiting reply from IT Support. You will see their response here once submitted.
                            </p>
                          )}
                        </div>

                        {/* Student Follow-Up Reply Box */}
                        {replyingTicket === ticket.ticketNumber ? (
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <textarea
                              rows={2}
                              value={studentReplyText}
                              onChange={(e) => setStudentReplyText(e.target.value)}
                              placeholder="Write a response or follow-up question..."
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-xs outline-none focus:border-[#002060] focus:bg-white resize-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setReplyingTicket(null)}
                                className="px-3 py-1 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendStudentReply(ticket.ticketNumber)}
                                disabled={isSendingStudentReply || !studentReplyText.trim()}
                                className="px-4 py-1 bg-[#002060] text-white text-xs font-bold rounded cursor-pointer disabled:opacity-60"
                              >
                                {isSendingStudentReply ? "Sending..." : "Send Reply"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTicket(ticket.ticketNumber);
                              setStudentReplyText("");
                            }}
                            className="text-xs font-bold text-[#002060] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            <span>Reply to this thread</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
