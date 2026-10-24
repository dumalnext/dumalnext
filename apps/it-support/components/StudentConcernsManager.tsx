"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useITSupportAuth } from "@/lib/auth/itSupportAuthContext";

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
  source?: "online" | "walk_in";
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  newTemporaryPassword?: string | null;
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

  // Selected Ticket for Details / Modals
  const [selectedConcern, setSelectedConcern] = useState<StudentConcern | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Password Reset Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<StudentConcern | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordNotes, setPasswordNotes] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<{
    email: string;
    newPass: string;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Status & Resolution Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState<StudentConcern | null>(null);
  const [newStatus, setNewStatus] = useState<StudentConcern["status"]>("IN_PROGRESS");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Walk-In / Manual Logging Modal State
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    studentName: "",
    email: "",
    lrn: "",
    gradeLevel: "Grade 7",
    contactNumber: "",
    category: "password_reset",
    subject: "Walk-in Password Reset",
    message: "",
  });
  const [isLoggingWalkIn, setIsLoggingWalkIn] = useState(false);

  // Auto-dismiss status message
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Load Concerns
  const fetchConcerns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/it-support/concerns", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load concerns.");
      setConcerns(data.concerns || []);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to fetch concerns." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConcerns();
  }, []);

  // Filtered & Searched Concerns
  const filteredConcerns = useMemo(() => {
    return concerns.filter((c) => {
      // Status Filter
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      // Category Filter
      if (categoryFilter !== "ALL" && c.category !== categoryFilter) return false;
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.studentName?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchLrn = c.lrn?.toLowerCase().includes(q);
        const matchTicket = c.ticketNumber?.toLowerCase().includes(q);
        const matchSubject = c.subject?.toLowerCase().includes(q);
        const matchNotes = c.resolutionNotes?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchLrn && !matchTicket && !matchSubject && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [concerns, statusFilter, categoryFilter, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = concerns.length;
    const pending = concerns.filter((c) => c.status === "PENDING").length;
    const inProgress = concerns.filter((c) => c.status === "IN_PROGRESS").length;
    const resolved = concerns.filter((c) => c.status === "RESOLVED").length;
    const passwordResets = concerns.filter((c) => c.category === "password_reset").length;
    return { total, pending, inProgress, resolved, passwordResets };
  }, [concerns]);

  // Generate Random Secure Password helper
  const handleGenerateRandomPassword = () => {
    const year = new Date().getFullYear();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `Dumalneg-${year}-${rand}`;
    setNewPassword(generated);
  };

  // Open Password Reset Modal
  const handleOpenPasswordModal = (concern: StudentConcern) => {
    setPasswordTarget(concern);
    setPasswordResetSuccess(null);
    setCopiedPass(false);
    handleGenerateRandomPassword();
    setPasswordNotes(
      `Password reset performed by IT Support (${user?.fullName || "Officer"}). Account restored and verified.`
    );
    setShowPasswordModal(true);
  };

  // Execute Direct Password Reset
  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;

    setIsResettingPassword(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/it-support/concerns/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: passwordTarget.id,
          email: passwordTarget.email,
          newPassword: newPassword.trim(),
          resolvedBy: user?.fullName || "IT Support Officer",
          resolutionNotes: passwordNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reset password in Supabase Auth.");
      }

      setPasswordResetSuccess({
        email: passwordTarget.email,
        newPass: newPassword.trim(),
      });

      setStatusMessage({
        type: "success",
        text: `Student password successfully reset for ${passwordTarget.studentName} (${passwordTarget.email}). Ticket marked as RESOLVED.`,
      });

      fetchConcerns();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to execute password reset." });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Open Status Update Modal
  const handleOpenStatusModal = (concern: StudentConcern) => {
    setStatusTarget(concern);
    setNewStatus(concern.status);
    setResolutionNotes(concern.resolutionNotes || "");
    setShowStatusModal(true);
  };

  // Execute Status Update
  const handleExecuteStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTarget) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch("/api/it-support/concerns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: statusTarget.id,
          status: newStatus,
          resolutionNotes: resolutionNotes.trim(),
          resolvedBy: user?.fullName || "IT Support Officer",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update ticket status.");
      }

      setStatusMessage({
        type: "success",
        text: `Ticket ${statusTarget.ticketNumber} updated to ${newStatus}.`,
      });
      setShowStatusModal(false);
      fetchConcerns();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update ticket." });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete / Archive Concern
  const handleDeleteConcern = async (concern: StudentConcern) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ticket ${concern.ticketNumber} filed by ${concern.studentName}?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/it-support/concerns?id=${concern.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete ticket.");
      }
      setStatusMessage({ type: "success", text: `Ticket ${concern.ticketNumber} has been removed.` });
      fetchConcerns();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to remove ticket." });
    }
  };

  // Log Walk-in Concern
  const handleLogWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingWalkIn(true);

    try {
      const res = await fetch("/api/it-support/concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...walkInForm,
          source: "walk_in",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to log walk-in concern.");
      }

      setStatusMessage({
        type: "success",
        text: `Walk-in concern ticket ${data.ticketNumber} logged successfully.`,
      });
      setShowWalkInModal(false);
      setWalkInForm({
        studentName: "",
        email: "",
        lrn: "",
        gradeLevel: "Grade 7",
        contactNumber: "",
        category: "password_reset",
        subject: "Walk-in Password Reset",
        message: "",
      });
      fetchConcerns();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to record walk-in concern." });
    } finally {
      setIsLoggingWalkIn(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2500);
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
                  Dumalneg NHS &bull; Learner Identity Governance &amp; Support Desk
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Student Concerns &amp; Password Reset Center
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-3xl">
                Review and resolve incoming student inquiries. Under DepEd identity security guidelines, students cannot self-reset passwords directly. IT Support verifies learner identity and resets credentials with a single click.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowWalkInModal(true)}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Log Walk-in Concern</span>
              </button>

              <button
                type="button"
                onClick={fetchConcerns}
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

        {/* Global Notification Banner */}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Concerns
            </span>
            <span className="text-xl font-extrabold text-[#002060] mt-0.5 block">
              {metrics.total}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">All tickets recorded</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-amber-300 bg-amber-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Pending IT Review
            </span>
            <span className="text-xl font-extrabold text-amber-700 mt-0.5 block">
              {metrics.pending}
            </span>
            <span className="text-[10px] text-amber-700 block mt-0.5">Action required</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-purple-200 bg-purple-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
              Password Resets
            </span>
            <span className="text-xl font-extrabold text-purple-700 mt-0.5 block">
              {metrics.passwordResets}
            </span>
            <span className="text-[10px] text-purple-700 block mt-0.5">Account lockouts</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
              In Progress
            </span>
            <span className="text-xl font-extrabold text-blue-700 mt-0.5 block">
              {metrics.inProgress}
            </span>
            <span className="text-[10px] text-blue-600 block mt-0.5">Being processed</span>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Resolved Tickets
            </span>
            <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">
              {metrics.resolved}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Completed tickets</span>
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
              placeholder="Search by student name, email, LRN, ticket number, or subject..."
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
              <option value="password_reset">Password Resets</option>
              <option value="account_access">Account Access</option>
              <option value="lrn_profile">LRN / Profile</option>
              <option value="enrollment">Enrollment &amp; Sectioning</option>
              <option value="grades_schedule">Grades &amp; Schedule</option>
              <option value="other">Other Inquiries</option>
            </select>

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

        {/* Table of Concerns */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#002060] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading student concerns registry...</p>
            </div>
          ) : filteredConcerns.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-sm font-bold text-slate-800">No Student Concerns Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {concerns.length === 0
                  ? "There are currently no student inquiries or password reset requests recorded."
                  : "No concerns match your active filter and search criteria."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket &amp; Date</th>
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4">Category &amp; Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Resolution Info</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredConcerns.map((c) => {
                  const isPasswordReset = c.category === "password_reset";
                  const isPending = c.status === "PENDING";
                  const isResolved = c.status === "RESOLVED";
                  const isInProgress = c.status === "IN_PROGRESS";

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isPending ? "bg-amber-50/20" : ""
                      }`}
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
                        {c.source === "walk_in" && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-200 text-slate-700">
                            Walk-In
                          </span>
                        )}
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
                          {c.contactNumber && (
                            <>
                              <span>&bull;</span>
                              <span>{c.contactNumber}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Category & Subject */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          {isPasswordReset ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 font-bold text-[9px] uppercase tracking-wider rounded">
                              Password Reset
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-bold text-[9px] uppercase tracking-wider rounded">
                              {c.category.replace("_", " ")}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-800 line-clamp-1">
                          {c.subject}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {c.message}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        {isPending && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                            Pending
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
                        {c.status === "CLOSED" && (
                          <span className="px-2.5 py-1 bg-slate-200 text-slate-700 border border-slate-300 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1">
                            Closed
                          </span>
                        )}
                      </td>

                      {/* Resolution Details */}
                      <td className="py-3.5 px-4 align-top text-[11px] max-w-xs">
                        {c.resolvedBy ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block">
                              {c.resolvedBy}
                            </span>
                            {c.resolvedAt && (
                              <span className="text-[10px] text-slate-500 block">
                                {new Date(c.resolvedAt).toLocaleDateString("en-PH")}
                              </span>
                            )}
                            {c.resolutionNotes && (
                              <p className="text-slate-600 line-clamp-2 italic">
                                &quot;{c.resolutionNotes}&quot;
                              </p>
                            )}
                            {c.newTemporaryPassword && (
                              <span className="inline-block mt-1 font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                Password Issued
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No resolution notes yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Direct Password Reset Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordModal(c)}
                            title="Reset student password directly in Supabase"
                            className="px-2.5 py-1.5 bg-[#002060] hover:bg-[#002b80] text-white font-bold rounded text-[11px] cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            <span>Reset Password</span>
                          </button>

                          {/* Status / Notes Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(c)}
                            title="Update ticket status & notes"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedConcern(c);
                              setShowDetailsModal(true);
                            }}
                            title="View full ticket details"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
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

      {/* MODAL 1: DIRECT STUDENT PASSWORD RESET */}
      {showPasswordModal && passwordTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#002060] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-amber-400">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                    IT Support Administrative Override
                  </span>
                  <h3 className="text-base font-bold text-white">Direct Student Password Reset</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Target Student Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Learner Name:</span>
                  <span className="font-bold text-slate-900">{passwordTarget.studentName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Registered Email:</span>
                  <span className="font-mono text-[#002060] font-bold">{passwordTarget.email}</span>
                </div>
                {passwordTarget.lrn && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">DepEd LRN:</span>
                    <span className="font-mono text-slate-800">{passwordTarget.lrn}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Reference Ticket:</span>
                  <span className="font-mono text-slate-700">{passwordTarget.ticketNumber}</span>
                </div>
              </div>

              {passwordResetSuccess ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-lg text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-emerald-950 block">
                      Password Successfully Updated in Supabase
                    </span>
                    <p className="text-xs text-emerald-900">
                      The learner can now sign in using the new temporary password below:
                    </p>

                    <div className="flex items-center justify-between gap-2 bg-white border border-emerald-300 p-2.5 rounded max-w-sm mx-auto">
                      <span className="font-mono text-base font-extrabold text-emerald-900 tracking-wider">
                        {passwordResetSuccess.newPass}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(passwordResetSuccess.newPass)}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded cursor-pointer transition-colors"
                      >
                        {copiedPass ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 text-center leading-relaxed">
                    Ticket <strong className="font-mono text-slate-800">{passwordTarget.ticketNumber}</strong> has been automatically updated with the resolution notes and marked as <strong>RESOLVED</strong>.
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="w-full py-2.5 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Done / Close Window
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExecutePasswordReset} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">
                        New Temporary Password <span className="text-red-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomPassword}
                        className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer"
                      >
                        Generate Random
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="e.g. Dumalneg-2026-X8k9"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 font-mono text-xs font-bold text-slate-900 rounded-md focus:border-[#002060] focus:bg-white outline-none"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Official Resolution Notes
                    </label>
                    <textarea
                      rows={3}
                      value={passwordNotes}
                      onChange={(e) => setPasswordNotes(e.target.value)}
                      placeholder="Notes on identity verification and password dispatch..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] focus:bg-white outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 border-l-4 border-amber-500 text-[11px] text-amber-950 rounded leading-relaxed">
                    <strong>Admin Notice:</strong> This directly overwrites the student password in Supabase Auth via Service Role. The student email will also be marked as confirmed if unverified.
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResettingPassword}
                      className="px-5 py-2 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-60 cursor-pointer flex items-center gap-2"
                    >
                      {isResettingPassword ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                          <span>Resetting Password...</span>
                        </>
                      ) : (
                        <span>Confirm &amp; Reset Password</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TICKET STATUS & NOTES UPDATE */}
      {showStatusModal && statusTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden font-sans">
            <div className="bg-[#002060] text-white p-4 flex items-center justify-between border-b-2 border-amber-400">
              <h3 className="text-sm font-bold">Update Ticket Status &amp; Notes</h3>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleExecuteStatusUpdate} className="p-4 sm:p-5 space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-500 block">Ticket Number:</span>
                <span className="font-mono font-extrabold text-[#002060]">{statusTarget.ticketNumber}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Ticket Status <span className="text-red-600">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-semibold rounded-md focus:border-[#002060] outline-none"
                >
                  <option value="PENDING">PENDING (Awaiting Review)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Under Investigation)</option>
                  <option value="RESOLVED">RESOLVED (Action Complete)</option>
                  <option value="CLOSED">CLOSED (Completed &amp; Closed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Resolution / Investigation Notes
                </label>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="State the resolution steps taken or instructions given to the learner..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs font-medium rounded-md focus:border-[#002060] outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  {isUpdatingStatus ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TICKET DETAILS VIEW */}
      {showDetailsModal && selectedConcern && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden font-sans">
            <div className="bg-[#002060] text-white p-4 flex items-center justify-between border-b-2 border-amber-400">
              <h3 className="text-sm font-bold">Ticket Details: {selectedConcern.ticketNumber}</h3>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium block">Student Name:</span>
                  <span className="font-bold text-slate-900 block">{selectedConcern.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Email:</span>
                  <span className="font-mono text-[#002060] font-bold block">{selectedConcern.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Grade Level:</span>
                  <span className="text-slate-800 block">{selectedConcern.gradeLevel || "Not provided"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">DepEd LRN:</span>
                  <span className="font-mono text-slate-800 block">{selectedConcern.lrn || "None"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Contact Number:</span>
                  <span className="text-slate-800 block">{selectedConcern.contactNumber || "None"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Status:</span>
                  <span className="font-bold text-slate-900 block">{selectedConcern.status}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block mb-1">
                  Subject:
                </span>
                <p className="font-bold text-slate-900 text-sm">{selectedConcern.subject}</p>
              </div>

              <div>
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block mb-1">
                  Message / Description:
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedConcern.message}
                </div>
              </div>

              {selectedConcern.resolutionNotes && (
                <div>
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block mb-1">
                    IT Support Resolution:
                  </span>
                  <div className="bg-emerald-50 border border-emerald-300 rounded p-3 text-emerald-950 whitespace-pre-wrap leading-relaxed">
                    <div className="font-bold text-emerald-900 mb-1">
                      Resolved by: {selectedConcern.resolvedBy || "IT Support"} on{" "}
                      {selectedConcern.resolvedAt ? new Date(selectedConcern.resolvedAt).toLocaleString("en-PH") : "N/A"}
                    </div>
                    {selectedConcern.resolutionNotes}
                  </div>
                </div>
              )}

              {selectedConcern.newTemporaryPassword && (
                <div className="bg-emerald-50 border border-emerald-400 rounded p-3">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase block mb-1">
                    Generated Password:
                  </span>
                  <div className="flex items-center justify-between font-mono font-extrabold text-emerald-900">
                    <span>{selectedConcern.newTemporaryPassword}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedConcern.newTemporaryPassword!)}
                      className="text-xs text-emerald-700 underline cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenPasswordModal(selectedConcern);
                  }}
                  className="px-4 py-2 bg-[#002060] text-white font-bold rounded-lg text-xs"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-lg text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: LOG WALK-IN / IN-PERSON CONCERN */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden font-sans">
            <div className="bg-[#002060] text-white p-4 flex items-center justify-between border-b-2 border-amber-400">
              <h3 className="text-sm font-bold">Log Walk-In Student Concern</h3>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleLogWalkIn} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={walkInForm.category}
                    onChange={(e) => setWalkInForm({ ...walkInForm, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium outline-none"
                  >
                    <option value="password_reset">Password Reset</option>
                    <option value="account_access">Account Access</option>
                    <option value="lrn_profile">LRN / Profile</option>
                    <option value="enrollment">Enrollment</option>
                    <option value="grades_schedule">Grades / Schedule</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Grade Level</label>
                  <select
                    value={walkInForm.gradeLevel}
                    onChange={(e) => setWalkInForm({ ...walkInForm, gradeLevel: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium outline-none"
                  >
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                    <option value="Transferee">Transferee</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Student Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={walkInForm.studentName}
                    onChange={(e) => setWalkInForm({ ...walkInForm, studentName: e.target.value })}
                    placeholder="e.g. Maria Santos"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={walkInForm.email}
                    onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
                    placeholder="e.g. learner@gmail.com"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">12-Digit LRN</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={walkInForm.lrn}
                    onChange={(e) => setWalkInForm({ ...walkInForm, lrn: e.target.value.replace(/\D/g, "") })}
                    placeholder="e.g. 101234567890"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Contact Number</label>
                  <input
                    type="tel"
                    value={walkInForm.contactNumber}
                    onChange={(e) => setWalkInForm({ ...walkInForm, contactNumber: e.target.value })}
                    placeholder="e.g. 09171234567"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Subject</label>
                <input
                  type="text"
                  value={walkInForm.subject}
                  onChange={(e) => setWalkInForm({ ...walkInForm, subject: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Concern Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={walkInForm.message}
                  onChange={(e) => setWalkInForm({ ...walkInForm, message: e.target.value })}
                  placeholder="Details of student inquiry or issue presented at the IT office..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingWalkIn}
                  className="px-5 py-2 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  {isLoggingWalkIn ? "Recording..." : "Record Walk-in Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
