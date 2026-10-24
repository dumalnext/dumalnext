"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useITSupportAuth } from "@/lib/auth/itSupportAuthContext";

export interface ConcernReply {
  id: string;
  sender: "it_support" | "student";
  senderName: string;
  message: string;
  createdAt: string;
}

export interface StudentConcern {
  id: string;
  ticketNumber: string;
  studentName: string;
  email: string;
  lrn?: string;
  gradeLevel?: string;
  contactNumber?: string;
  category: "password_reset" | "account_access" | "lrn_profile" | "enrollment" | "grades_schedule" | "other";
  subject: string;
  message: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  replies?: ConcernReply[];
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
}

export default function StudentConcernsManager() {
  const { user } = useITSupportAuth();

  const [concerns, setConcerns] = useState<StudentConcern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Selected Ticket for Viewing & Replying
  const [activeConcern, setActiveConcern] = useState<StudentConcern | null>(null);
  const [replyText, setReplyText] = useState("");
  const [modalStatus, setModalStatus] = useState<StudentConcern["status"]>("IN_PROGRESS");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Gmail Ingest / Sync Modal State
  const [showGmailSyncModal, setShowGmailSyncModal] = useState(false);
  const [gmailSyncTab, setGmailSyncTab] = useState<"manual" | "guide">("manual");
  const [ingestEmailFrom, setIngestEmailFrom] = useState("");
  const [ingestEmailSubject, setIngestEmailSubject] = useState("Password Reset Request - Dumalneg NHS Student Account");
  const [ingestEmailBody, setIngestEmailBody] = useState("");
  const [isIngestingEmail, setIsIngestingEmail] = useState(false);
  const [ingestFeedback, setIngestFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);

  // Auto-dismiss status banner
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Fetch Concerns from Database
  const fetchConcerns = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/it-support/concerns", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load concerns.");
      setConcerns(data.concerns || []);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to load student concerns." });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConcerns();
  }, []);

  // Sync activeConcern when concerns update
  useEffect(() => {
    if (activeConcern) {
      const fresh = concerns.find((c) => c.id === activeConcern.id);
      if (fresh) {
        setActiveConcern(fresh);
        setModalStatus(fresh.status);
      }
    }
  }, [concerns]);

  // Filtered & Searched Concerns
  const filteredConcerns = useMemo(() => {
    return concerns.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && c.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.studentName?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchLrn = c.lrn?.toLowerCase().includes(q);
        const matchTicket = c.ticketNumber?.toLowerCase().includes(q);
        const matchSubject = c.subject?.toLowerCase().includes(q);
        const matchMessage = c.message?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchLrn && !matchTicket && !matchSubject && !matchMessage) {
          return false;
        }
      }
      return true;
    });
  }, [concerns, statusFilter, categoryFilter, searchQuery]);

  // Metrics Summary
  const metrics = useMemo(() => {
    const total = concerns.length;
    const pending = concerns.filter((c) => c.status === "PENDING").length;
    const inProgress = concerns.filter((c) => c.status === "IN_PROGRESS").length;
    const resolved = concerns.filter((c) => c.status === "RESOLVED").length;
    const withReplies = concerns.filter((c) => (c.replies?.length || 0) > 0).length;
    return { total, pending, inProgress, resolved, withReplies };
  }, [concerns]);

  // Ingest Email from Gmail (Manual Ingest)
  const handleIngestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestEmailFrom.trim() || !ingestEmailFrom.includes("@")) {
      setIngestFeedback({ type: "error", text: "Pakilagay po ang email address ng nag-send mula sa Gmail." });
      return;
    }
    setIsIngestingEmail(true);
    setIngestFeedback(null);
    try {
      const res = await fetch("/api/concerns/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: ingestEmailFrom.trim().toLowerCase(),
          to: "dumalnext@gmail.com",
          subject: ingestEmailSubject.trim() || "Password Reset Request",
          text: ingestEmailBody.trim() || "(Walang mensahe na kalakip)",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Nabigong i-load ang email.");
      }
      setIngestFeedback({
        type: "success",
        text: `Matagumpay na na-ingest ang email bilang ticket #${data.ticketNumber}! Kasalukuyan itong nakalagay sa listahan ng concerns.`,
      });
      setIngestEmailFrom("");
      setIngestEmailBody("");
      await fetchConcerns(true);
    } catch (err: any) {
      setIngestFeedback({ type: "error", text: err.message || "Error habang nag-iingest ng email." });
    } finally {
      setIsIngestingEmail(false);
    }
  };

  // Open Conversation Modal
  const handleOpenConcern = (concern: StudentConcern) => {
    setActiveConcern(concern);
    setModalStatus(concern.status);
    setReplyText("");
  };

  // Send Reply to Student
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConcern || !replyText.trim()) return;

    setIsSendingReply(true);
    setStatusMessage(null);

    try {
      const officerName = user?.fullName || "IT Support Officer";
      const res = await fetch("/api/it-support/concerns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeConcern.id,
          status: modalStatus,
          replyMessage: replyText.trim(),
          resolvedBy: officerName,
          senderName: officerName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send reply to student.");
      }

      setStatusMessage({
        type: "success",
        text: `Reply dispatched to ticket ${activeConcern.ticketNumber} (${activeConcern.studentName}).`,
      });

      setReplyText("");
      await fetchConcerns(true);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to dispatch reply." });
    } finally {
      setIsSendingReply(false);
    }
  };

  // Quick Status Change from Modal
  const handleQuickStatusChange = async (newStatus: StudentConcern["status"]) => {
    if (!activeConcern) return;
    setIsUpdatingStatus(true);
    try {
      const officerName = user?.fullName || "IT Support Officer";
      const res = await fetch("/api/it-support/concerns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeConcern.id,
          status: newStatus,
          resolvedBy: officerName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update status.");
      setModalStatus(newStatus);
      setStatusMessage({ type: "success", text: `Ticket ${activeConcern.ticketNumber} marked as ${newStatus}.` });
      await fetchConcerns(true);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update status." });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete / Archive Concern
  const handleDeleteConcern = async (concern: StudentConcern) => {
    const confirm = window.confirm(
      `Are you sure you want to delete ticket ${concern.ticketNumber} filed by ${concern.studentName}?`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/it-support/concerns?id=${concern.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete ticket.");
      setStatusMessage({ type: "success", text: `Ticket ${concern.ticketNumber} has been removed.` });
      if (activeConcern?.id === concern.id) {
        setActiveConcern(null);
      }
      fetchConcerns(true);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to remove ticket." });
    }
  };

  // Quick Preset Replies
  const insertPresetReply = (text: string) => {
    setReplyText((prev) => (prev ? `${prev}\n${text}` : text));
  };

  return (
    <div className="space-y-6">
      {/* DepEd Region I Institutional Header & Banner */}
      <div className="bg-white border-2 border-[#002060] rounded-xl shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white px-5 py-5 sm:px-8 sm:py-6 border-b-4 border-amber-400">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                  Dumalneg NHS &bull; Learner Messages &amp; Support Inquiries Desk
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Student Messages &amp; Concerns
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-3xl">
                Review student inquiries, track support messages, and reply directly to learner concerns. Note: Account modifications, password removal, and credential edits are managed in <strong>User Accounts &amp; Roles</strong>.
              </p>
            </div>

            {/* Refresh Action */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchConcerns(false)}
                disabled={isLoading}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <svg
                  className={`w-4 h-4 shrink-0 ${isLoading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-4 border-b flex items-center justify-between text-xs font-bold ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-red-50 text-red-900 border-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusMessage.type === "success" ? "bg-emerald-600" : "bg-red-600"}`} />
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Messages
            </span>
            <span className="text-xl font-extrabold text-[#002060] mt-0.5 block">
              {metrics.total}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">All tickets logged</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-amber-300 bg-amber-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Pending IT Reply
            </span>
            <span className="text-xl font-extrabold text-amber-700 mt-0.5 block">
              {metrics.pending}
            </span>
            <span className="text-[10px] text-amber-700 block mt-0.5">Needs reply</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
              In Progress
            </span>
            <span className="text-xl font-extrabold text-blue-700 mt-0.5 block">
              {metrics.inProgress}
            </span>
            <span className="text-[10px] text-blue-600 block mt-0.5">Active conversation</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Resolved
            </span>
            <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">
              {metrics.resolved}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Completed inquiries</span>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 sm:p-6 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, email, LRN, ticket number, or message text..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:border-[#002060] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter concerns by status"
              className="py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#002060] outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved Only</option>
              <option value="CLOSED">Closed Only</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter concerns by category"
              className="py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#002060] outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="password_reset">Password Inquiries</option>
              <option value="account_access">Account Access</option>
              <option value="lrn_profile">LRN / Profile</option>
              <option value="enrollment">Enrollment &amp; Sectioning</option>
              <option value="grades_schedule">Grades &amp; Schedule</option>
              <option value="other">Other Inquiries</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setIngestFeedback(null);
                setShowGmailSyncModal(true);
              }}
              className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Sync / Ingest Gmail</span>
            </button>

            {(searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setCategoryFilter("ALL");
                }}
                className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Concerns Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#002060] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading student messages and inquiries...</p>
            </div>
          ) : filteredConcerns.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="text-sm font-bold text-slate-800">No Student Messages Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {concerns.length === 0
                  ? "There are currently no student inquiries or messages recorded."
                  : "No messages match your active filter and search criteria."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket &amp; Date</th>
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4">Inquiry / Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Conversation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredConcerns.map((c) => {
                  const norm = (c.status || "").toUpperCase();
                  const isPending = norm === "PENDING";
                  const isResolved = norm === "RESOLVED";
                  const isInProgress = norm === "IN_PROGRESS";
                  const replyCount = c.replies?.length || 0;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        isPending ? "bg-amber-50/20" : ""
                      }`}
                      onClick={() => handleOpenConcern(c)}
                    >
                      {/* Ticket & Date */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span className="font-mono font-extrabold text-[#002060] block">
                          {c.ticketNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {new Date(c.createdAt).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      {/* Student Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900 leading-tight">
                          {c.studentName}
                        </div>
                        <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                          {c.email}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                          {c.gradeLevel && <span>{c.gradeLevel}</span>}
                          {c.lrn && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono">LRN: {c.lrn}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Subject & Message */}
                      <td className="py-3.5 px-4 align-top max-w-sm">
                        <span className="font-bold text-slate-900 block truncate">
                          {c.subject}
                        </span>
                        <p className="text-slate-600 line-clamp-2 mt-0.5 leading-relaxed text-[11px]">
                          {c.message}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        {isPending && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                            Pending Reply
                          </span>
                        )}
                        {isInProgress && (
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            In Progress
                          </span>
                        )}
                        {isResolved && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Resolved
                          </span>
                        )}
                        {norm === "CLOSED" && (
                          <span className="px-2.5 py-1 bg-slate-200 text-slate-700 border border-slate-300 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1">
                            Closed
                          </span>
                        )}
                      </td>

                      {/* Conversation Summary */}
                      <td className="py-3.5 px-4 align-top text-[11px]">
                        {replyCount > 0 ? (
                          <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                            <svg className="w-3.5 h-3.5 text-blue-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No replies yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenConcern(c)}
                            className="px-3 py-1.5 bg-[#002060] hover:bg-[#002b80] text-white font-bold rounded text-[11px] cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            <span>View &amp; Reply</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteConcern(c)}
                            title="Delete concern record"
                            className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-700 rounded cursor-pointer transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CONVERSATION & REPLY MODAL */}
      {activeConcern && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#002060] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-amber-400 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                  <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-300">
                      {activeConcern.ticketNumber}
                    </span>
                    <span className="text-[10px] text-blue-200 uppercase tracking-wider">
                      &bull; {activeConcern.studentName}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white truncate max-w-md">
                    {activeConcern.subject}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveConcern(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {/* Modal Subheader & Status Switcher */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                <span>Email: <strong className="text-slate-800">{activeConcern.email}</strong></span>
                {activeConcern.lrn && (
                  <span>LRN: <strong className="text-slate-800 font-mono">{activeConcern.lrn}</strong></span>
                )}
                {activeConcern.gradeLevel && (
                  <span>Grade: <strong className="text-slate-800">{activeConcern.gradeLevel}</strong></span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Status:</span>
                <select
                  value={modalStatus}
                  onChange={(e) => handleQuickStatusChange(e.target.value as any)}
                  disabled={isUpdatingStatus}
                  className="py-1 px-2.5 bg-white border border-slate-300 rounded font-bold text-xs text-[#002060] outline-none"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>

            {/* Scrollable Conversation Stream */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-100/60">
              {/* Original Student Inquiry Card */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                      {activeConcern.studentName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-xs leading-none">
                        {activeConcern.studentName}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Initial Concern &bull; {new Date(activeConcern.createdAt).toLocaleString("en-PH")}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded">
                    {activeConcern.category.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {activeConcern.message}
                </p>
              </div>

              {/* Replies Stream */}
              {activeConcern.replies && activeConcern.replies.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200/60 px-3 py-1 rounded-full">
                      Conversation Thread
                    </span>
                  </div>

                  {activeConcern.replies.map((reply) => {
                    const isIt = reply.sender === "it_support";
                    return (
                      <div
                        key={reply.id}
                        className={`flex flex-col ${isIt ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className={`text-[10px] font-bold ${isIt ? "text-[#002060]" : "text-slate-600"}`}>
                            {reply.senderName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            &bull; {new Date(reply.createdAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                            isIt
                              ? "bg-[#002060] text-white rounded-br-xs"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                          }`}
                        >
                          {reply.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  No replies sent yet. Use the composer below to send an official response to the student.
                </div>
              )}
            </div>

            {/* Quick Reply Presets & Input Composer */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-2.5">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => insertPresetReply("Good day! We have reviewed your account in User Accounts & Roles. Your credentials have been successfully updated.")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded cursor-pointer transition-colors"
                >
                  Credentials Updated
                </button>
                <button
                  type="button"
                  onClick={() => insertPresetReply("Good day! Your previous password has been removed for security. Please log in using the 6-digit OTP code sent to your email to create a new password.")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded cursor-pointer transition-colors"
                >
                  Password Removed
                </button>
                <button
                  type="button"
                  onClick={() => insertPresetReply("Your inquiry is currently being evaluated with the School Registrar. We will provide updates once verified.")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded cursor-pointer transition-colors"
                >
                  Under Review
                </button>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] text-blue-900 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg mb-2">
                    <svg className="w-3.5 h-3.5 text-blue-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>
                      <strong>2-Way Email Sync:</strong> Ang tugon na ito ay awtomatikong ipapadala sa Gmail ng estudyante (<strong>{activeConcern.email}</strong>) mula sa <strong>dumalnext@gmail.com</strong>.
                    </span>
                  </div>
                  <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type official response to the student..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:border-[#002060] outline-none resize-none leading-relaxed"
                  required
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalStatus === "RESOLVED"}
                        onChange={(e) => setModalStatus(e.target.checked ? "RESOLVED" : "IN_PROGRESS")}
                        className="rounded text-[#002060] focus:ring-0"
                      />
                      <span>Mark ticket as RESOLVED with this reply</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveConcern(null)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingReply || !replyText.trim()}
                      className="px-5 py-2 bg-[#002060] hover:bg-[#002b80] text-white font-bold text-xs rounded-lg shadow-xs disabled:opacity-60 cursor-pointer flex items-center gap-2"
                    >
                      {isSendingReply ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                          <span>Sending Reply...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span>Send Reply to Student</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Ingest & Auto-Sync Modal */}
      {showGmailSyncModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#002060] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-amber-400">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                    Gmail Integration &bull; dumalnext@gmail.com
                  </span>
                  <h2 className="text-base font-bold text-white">
                    Sync &amp; Ingest Inbound Student Emails
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGmailSyncModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                type="button"
                onClick={() => setGmailSyncTab("manual")}
                className={`flex-1 py-2.5 px-3 text-center cursor-pointer border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  gmailSyncTab === "manual"
                    ? "border-[#002060] bg-white text-[#002060]"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>I-paste ang Email (Quick Ingest)</span>
              </button>
              <button
                type="button"
                onClick={() => setGmailSyncTab("guide")}
                className={`flex-1 py-2.5 px-3 text-center cursor-pointer border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  gmailSyncTab === "guide"
                    ? "border-[#002060] bg-white text-[#002060]"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Automated Forwarding Setup</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {gmailSyncTab === "manual" ? (
                <form onSubmit={handleIngestEmail} className="space-y-3.5">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                    Kung may natanggap kang bagong email sa <span className="font-bold text-[#002060]">dumalnext@gmail.com</span>, kopyahin at i-paste ito rito upang agad na maging opisyal na ticket sa Dumalneg NHS system!
                  </div>

                  {ingestFeedback && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                        ingestFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{ingestFeedback.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Sender Email (Email ng Mag-aaral) *
                    </label>
                    <input
                      type="email"
                      required
                      value={ingestEmailFrom}
                      onChange={(e) => setIngestEmailFrom(e.target.value)}
                      placeholder="Halimbawa: student@gmail.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-[#002060] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={ingestEmailSubject}
                      onChange={(e) => setIngestEmailSubject(e.target.value)}
                      placeholder="Subject ng email"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-[#002060] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nilalaman ng Email (Message Body)
                    </label>
                    <textarea
                      rows={5}
                      value={ingestEmailBody}
                      onChange={(e) => setIngestEmailBody(e.target.value)}
                      placeholder="I-paste dito ang mensahe na natanggap mula sa student..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:border-[#002060] outline-none leading-relaxed"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGmailSyncModal(false)}
                      className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Kanselahin
                    </button>
                    <button
                      type="submit"
                      disabled={isIngestingEmail}
                      className="py-2 px-4 bg-[#002060] hover:bg-[#001845] text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isIngestingEmail ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                          <span>Nag-iingest...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>I-proseso at I-load sa Concerns</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 font-medium">
                    Nais mo bang <strong>awtomatikong</strong> pumasok sa Concerns desk ang bawat email na matanggap sa <span className="font-bold text-[#002060]">dumalnext@gmail.com</span> nang hindi na kailangang mag-copy-paste?
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Mabilisang 3-Step Setup sa Google Apps Script:
                    </h4>
                    <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-slate-700">
                      <li>
                        Mag-log in sa account ng <strong>dumalnext@gmail.com</strong> at buksan ang{" "}
                        <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-700 font-bold underline">
                          script.google.com
                        </a>.
                      </li>
                      <li>I-click ang <strong>New Project</strong> at i-paste ang code sa ibaba:</li>
                    </ol>
                  </div>

                  <div className="relative">
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48 leading-relaxed">
{`function forwardDumalnegEmails() {
  var threads = GmailApp.search('is:unread to:dumalnext@gmail.com');
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      if (msg.isUnread()) {
        var payload = {
          from: msg.getFrom(),
          to: msg.getTo(),
          subject: msg.getSubject(),
          text: msg.getPlainBody() || msg.getBody()
        };
        var options = {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };
        UrlFetchApp.fetch('https://dumalnext-it-support.vercel.app/api/concerns/inbound', options);
        msg.markRead();
      }
    }
  }
}`}
                    </pre>
                    <button
                      type="button"
                      onClick={async () => {
                        const scriptText = `function forwardDumalnegEmails() {
  var threads = GmailApp.search('is:unread to:dumalnext@gmail.com');
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      if (msg.isUnread()) {
        var payload = {
          from: msg.getFrom(),
          to: msg.getTo(),
          subject: msg.getSubject(),
          text: msg.getPlainBody() || msg.getBody()
        };
        var options = {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };
        UrlFetchApp.fetch('https://dumalnext-it-support.vercel.app/api/concerns/inbound', options);
        msg.markRead();
      }
    }
  }
}`;
                        await navigator.clipboard.writeText(scriptText);
                        setScriptCopied(true);
                        setTimeout(() => setScriptCopied(false), 3000);
                      }}
                      className="absolute top-2 right-2 py-1 px-2.5 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      {scriptCopied ? "Nakopya na!" : "Kopyahin ang Script"}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-700">
                    <p>
                      3. Sa kaliwang menu ng Google Apps Script, i-click ang <strong>Triggers (hugis orasan)</strong> &rarr; <strong>Add Trigger</strong>.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li>Choose function: <strong>forwardDumalnegEmails</strong></li>
                      <li>Select event source: <strong>Time-driven</strong></li>
                      <li>Type of time based trigger: <strong>Minutes timer</strong> &rarr; <strong>Every 1 minute</strong></li>
                    </ul>
                    <p className="text-emerald-700 font-bold pt-1">
                      Awtomatiko nang papasok sa Concerns Desk ang bawat matatanggap na email sa loob ng 60 segundo!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
