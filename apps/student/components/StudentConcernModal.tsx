"use client";

import React, { useState } from "react";

export type ConcernModalMode = "submit" | "track";

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
  initialCategory = "password_reset",
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
  const [copiedPass, setCopiedPass] = useState(false);

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
          subject: subject || (category === "password_reset" ? "Password Reset Request" : "Student Inquiry"),
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request. Please try again.");
      }

      setSubmittedTicket({
        ticketNumber: data.ticketNumber,
        message: data.message || "Your request has been filed with IT Support.",
      });
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred while submitting your concern.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = trackQuery.trim();
    if (!query) {
      setSearchError("Please enter your Ticket Number (e.g. TKT-2026-1234) or registered email.");
      return;
    }

    setSearchError("");
    setIsSearching(true);
    setFoundTickets([]);

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
      } else {
        setFoundTickets(data.allConcerns);
      }
    } catch (err: any) {
      setSearchError(err.message || "Unable to retrieve ticket status.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyPassword = (pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                Dumalneg NHS &bull; Student Helpdesk
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                IT Support &amp; Learner Concerns
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
            <span>File a Concern / Reset Password</span>
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
            <span>Track Ticket Status</span>
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
                      Concern Ticket Dispatched Successfully
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
                      Please copy or screenshot this ticket number to track progress.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTrackQuery(submittedTicket.ticketNumber);
                        setActiveTab("track");
                        handleTrackSearch(new Event("submit") as any);
                      }}
                      className="px-4 py-2 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-md shadow-xs cursor-pointer"
                    >
                      Track This Ticket Now
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Institutional Policy Notice */}
                  <div className="p-3 bg-blue-50 border-l-4 border-[#002060] border border-blue-200 rounded-md text-xs text-slate-700 leading-relaxed space-y-1">
                    <span className="font-bold text-[#002060] block">
                      DepEd Learner Account Security &amp; Password Policy
                    </span>
                    <p>
                      To safeguard learner privacy and protect academic records, self-service password reset is disabled. All password resets and credential adjustments are verified and performed directly by Dumalneg NHS IT Support.
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
                        <option value="password_reset">Password Reset / Account Recovery</option>
                        <option value="account_access">Account Access / Login Lockout</option>
                        <option value="lrn_profile">LRN / PSA Name Discrepancy</option>
                        <option value="enrollment">Enrollment &amp; Sectioning Inquiry</option>
                        <option value="grades_schedule">Grades &amp; Class Schedule Concern</option>
                        <option value="other">Other System Assistance</option>
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
                      Brief Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={category === "password_reset" ? "Request for password reset" : "State your concern in one sentence"}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Detailed Concern / Reason for Request <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe why you need a password reset or provide details of the issue you encountered..."
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
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <span>Submit Concern to IT Support</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "track" && (
            <div className="space-y-4">
              <form onSubmit={handleTrackSearch} className="space-y-3">
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
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Found {foundTickets.length} ticket(s):
                  </span>
                  {foundTickets.map((ticket, idx) => {
                    const isResolved = ticket.status === "RESOLVED";
                    const isPending = ticket.status === "PENDING";
                    const isInProgress = ticket.status === "IN_PROGRESS";

                    return (
                      <div
                        key={ticket.ticketNumber || idx}
                        className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-[#002060]">
                              {ticket.ticketNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">&bull;</span>
                            <span className="text-[11px] font-semibold text-slate-600">
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
                                Pending IT Review
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Filed On:</span>
                            <span className="font-semibold text-slate-700">
                              {new Date(ticket.createdAt).toLocaleString("en-PH")}
                            </span>
                          </div>
                          {ticket.resolvedAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Resolved On:</span>
                              <span className="font-semibold text-emerald-700">
                                {new Date(ticket.resolvedAt).toLocaleString("en-PH")}
                              </span>
                            </div>
                          )}
                          {ticket.resolvedBy && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Assigned Officer:</span>
                              <span className="font-semibold text-slate-800">{ticket.resolvedBy}</span>
                            </div>
                          )}
                        </div>

                        {ticket.resolutionNotes && (
                          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs">
                            <span className="font-bold text-slate-800 block mb-0.5">
                              IT Support Resolution Notes:
                            </span>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {ticket.resolutionNotes}
                            </p>
                          </div>
                        )}

                        {ticket.newTemporaryPassword && (
                          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                                New Temporary Password Issued
                              </span>
                              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded">
                                Ready to Use
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 bg-white border border-emerald-300 p-2 rounded">
                              <span className="font-mono text-sm font-extrabold text-emerald-900 tracking-wider">
                                {ticket.newTemporaryPassword}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(ticket.newTemporaryPassword)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded cursor-pointer transition-colors"
                              >
                                {copiedPass ? "Copied!" : "Copy"}
                              </button>
                            </div>
                            <p className="text-[11px] text-emerald-900 leading-normal">
                              Use this password to log in to the Student Portal. Please keep it safe.
                            </p>
                          </div>
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
