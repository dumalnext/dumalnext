"use client";

import React, { useState, useEffect } from "react";
import CustomSelect from "@/components/CustomSelect";

export interface StaffInvitation {
  id: string;
  email: string;
  role: "teacher" | "admin" | "it_support";
  fullName?: string;
  department?: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
  invitedAt: string;
  acceptedAt?: string | null;
  expiresAt: string;
}

export default function StaffInvitationManager() {
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states for the 3 distinct roles
  const [teacherForm, setTeacherForm] = useState({
    email: "",
    fullName: "",
    department: "Junior High School (JHS)",
  });

  const [adminForm, setAdminForm] = useState({
    email: "",
    fullName: "",
    department: "Administrator",
  });

  const [itSupportForm, setItSupportForm] = useState({
    email: "",
    fullName: "",
    department: "IT-support",
  });

  const [submittingRole, setSubmittingRole] = useState<string | null>(null);
  const [lastGeneratedLink, setLastGeneratedLink] = useState<{
    email: string;
    role: string;
    url: string;
    emailSent?: boolean;
    emailError?: string | null;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchQuery]);

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      let res = await fetch(`/api/it-support/invitations?_t=${Date.now()}`, { cache: "no-store" });
      if (res.status === 404) {
        res = await fetch(`/api/invitations?_t=${Date.now()}`, { cache: "no-store" });
      }
      const rawText = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(rawText ? rawText.slice(0, 150) : "Invalid server response");
      }
      if (res.ok && json.success) {
        setInvitations(json.invitations || []);
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to load staff invitations." });
      }
    } catch (err: any) {
      console.error("fetchInvitations error:", err);
      setStatusMessage({ type: "error", text: err.message || "Network error loading staff invitations." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleSendInvite = async (role: "teacher" | "admin" | "it_support") => {
    setStatusMessage(null);
    let formData = teacherForm;
    if (role === "admin") formData = adminForm;
    if (role === "it_support") formData = itSupportForm;

    const email = formData.email.trim();
    if (!email || !email.includes("@")) {
      setStatusMessage({ type: "error", text: "Please provide a valid email address (e.g. user@dnhs.edu.ph or Gmail)." });
      return;
    }

    setSubmittingRole(role);
    try {
      const payload = {
        email,
        role,
        fullName: formData.fullName.trim(),
        department: formData.department.trim(),
      };

      let res = await fetch("/api/it-support/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 404) {
        res = await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const rawText = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(rawText ? rawText.slice(0, 150) : "Invalid server response");
      }

      if (res.ok && json.success) {
        const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
        let defaultBase = "";
        if (json.invitation.role === "teacher") {
          defaultBase = isLocal ? "http://localhost:3001" : "https://dumalnext-teacher.vercel.app";
        } else if (json.invitation.role === "admin") {
          defaultBase = isLocal ? "http://localhost:3000" : "https://dumalnext-admin.vercel.app";
        } else {
          defaultBase = isLocal ? "http://localhost:3003" : "https://dumalnext-it-support.vercel.app";
        }
        const fullUrl = json.inviteUrl || `${defaultBase}/accept-invite?token=${json.invitation.token}`;
        const isEmailSent = !!json.emailSent;

        setLastGeneratedLink({
          email: json.invitation.email,
          role: json.invitation.role,
          url: fullUrl,
          emailSent: isEmailSent,
          emailError: json.emailError || null,
        });

        const targetPortalName =
          json.invitation.role === "teacher"
            ? "Teacher Portal"
            : json.invitation.role === "admin"
            ? "Admin Portal"
            : "IT Support Portal";

        if (isEmailSent) {
          setStatusMessage({
            type: "success",
            text: `Official Supabase invitation email successfully dispatched to ${json.invitation.email}. The recipient can now click "Accept invitation" in their email to access the ${targetPortalName} and set up their password.`,
          });
        } else {
          setStatusMessage({
            type: "success",
            text: `Invitation registered for ${json.invitation.email} (${targetPortalName}). Notice: For automated live email dispatch, ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel Environment Variables. A backup direct link is also available below.`,
          });
        }

        if (role === "teacher") setTeacherForm({ email: "", fullName: "", department: "Junior High School (JHS)" });
        if (role === "admin") setAdminForm({ email: "", fullName: "", department: "Administrator" });
        if (role === "it_support") setItSupportForm({ email: "", fullName: "", department: "IT-support" });

        fetchInvitations();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to generate staff invitation." });
      }
    } catch (err: any) {
      console.error("handleSendInvite error:", err);
      setStatusMessage({ type: "error", text: err.message || "Failed to send invitation." });
    } finally {
      setSubmittingRole(null);
    }
  };

  const handleCopyLink = async (url: string, token: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 3000);
    } catch {
      prompt("Copy invitation link:", url);
    }
  };

  const handleRevoke = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}? The invite link will become invalid immediately.`)) {
      return;
    }

    try {
      let res = await fetch(`/api/it-support/invitations?id=${id}`, {
        method: "DELETE",
      });
      if (res.status === 404) {
        res = await fetch(`/api/invitations?id=${id}`, {
          method: "DELETE",
        });
      }

      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: "success", text: `Invitation for ${email} has been revoked.` });
        fetchInvitations();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to revoke invitation." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error revoking invitation." });
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    if (roleFilter !== "all" && inv.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const email = (inv.email || "").toLowerCase();
    const name = (inv.fullName || "").toLowerCase();
    const dept = (inv.department || "").toLowerCase();
    const role = (inv.role || "").toLowerCase();
    const status = (inv.status || "").toLowerCase();
    return (
      email.includes(q) ||
      name.includes(q) ||
      dept.includes(q) ||
      role.includes(q) ||
      status.includes(q)
    );
  });

  // Pagination Calculations (Limit 10 per page)
  const totalPages = Math.ceil(filteredInvitations.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredInvitations.length);
  const paginatedInvitations = filteredInvitations.slice(startIndex, endIndex);

  const getVisiblePageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(2, safeCurrentPage - delta);
      i <= Math.min(totalPages - 1, safeCurrentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (safeCurrentPage - delta > 2) {
      range.unshift(-1);
    }
    if (safeCurrentPage + delta < totalPages - 1) {
      range.push(-2);
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* DepEd Policy Guideline Banner */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white rounded-xl p-5 sm:p-6 shadow-md border border-[#001744] border-t-4 border-t-amber-400">
        <div className="flex items-start gap-3.5">
          <img
            src="/dumalneg-logo.png"
            alt="Dumalneg NHS Seal"
            className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0 hidden sm:block mt-0.5"
          />
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Faculty, Registrar &amp; IT Support Invitation Console
            </h2>
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-bold ${
            statusMessage.type === "success"
              ? "bg-green-50 border-green-500 text-green-900"
              : "bg-red-50 border-red-500 text-red-900"
          }`}
        >
          {statusMessage.type === "success" ? "Status: " : "Error: "}
          {statusMessage.text}
        </div>
      )}

      {/* Prominent Generated Link / Email Dispatch Display */}
      {lastGeneratedLink && (
        <div
          className={`p-5 rounded-xl border space-y-3 shadow-sm ${
            lastGeneratedLink.emailSent
              ? "bg-emerald-50 border-emerald-500"
              : "bg-blue-50 border-blue-400"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                  lastGeneratedLink.emailSent ? "text-emerald-800" : "text-blue-900"
                }`}
              >
                {lastGeneratedLink.emailSent
                  ? "Official Invitation Dispatched via Supabase Email"
                  : "Staff Invitation Registered in System"}
              </span>
              <h3
                className={`text-sm font-bold mt-0.5 ${
                  lastGeneratedLink.emailSent ? "text-emerald-950" : "text-blue-950"
                }`}
              >
                Recipient: {lastGeneratedLink.email}
              </h3>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${
                lastGeneratedLink.role === "teacher"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : lastGeneratedLink.role === "admin"
                  ? "bg-blue-100 text-[#002060] border-blue-300"
                  : "bg-indigo-100 text-indigo-900 border-indigo-300"
              }`}
            >
              Designated Portal: {lastGeneratedLink.role === "teacher" ? "Teacher" : lastGeneratedLink.role === "admin" ? "Admin" : "IT Support"}
            </span>
          </div>

          {lastGeneratedLink.emailSent ? (
            <div className="p-3 bg-white/90 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-emerald-900">
                Official invitation email has been dispatched to <strong>{lastGeneratedLink.email}</strong>. The recipient can click the button in their email to access the {lastGeneratedLink.role === "teacher" ? "Teacher Portal" : lastGeneratedLink.role === "admin" ? "Admin Portal" : "IT Support Portal"} and set up their password.
              </p>
              <p className="text-[11px] text-emerald-800">
                You may also copy the direct activation link below to send directly to the staff member.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-amber-900">
                Staff invitation created for <strong>{lastGeneratedLink.email}</strong>.
              </p>
              <p className="text-[11px] text-amber-800">
                If the email inbox does not receive the automated message (e.g. Supabase email quota or spam filter), <strong>copy and send the direct activation link below to the staff member</strong>. Clicking it allows them to set their password and activate their account immediately.
              </p>
            </div>
          )}

          {/* Direct Link Section - Always Open */}
          <details
            open={true}
            className="text-xs text-slate-700 pt-1"
          >
            <summary className="cursor-pointer font-bold text-[#002060] hover:underline select-none">
              {lastGeneratedLink.emailSent
                ? "View Backup Direct Activation Link (Optional)"
                : "Direct Staff Activation Link"}
            </summary>
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] text-slate-500">
                This secure direct link can be opened or shared as a backup alternative:
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={lastGeneratedLink.url}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg select-all text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(lastGeneratedLink.url, "banner")}
                  className="px-4 py-2 bg-[#002060] hover:bg-[#001744] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
                >
                  {copiedToken === "banner" ? "Copied to Clipboard" : "Copy Link"}
                </button>
                <a
                  href={lastGeneratedLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider text-center shrink-0 transition-colors"
                >
                  Open
                </a>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* 3 Separated Role Headers / Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* HEADER 1: TEACHER / FACULTY ONBOARDING */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm overflow-hidden hover:border-emerald-300 transition-colors">
          <div>
            <div className="bg-emerald-800 text-white p-4 border-b border-emerald-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-700/80 border border-emerald-600 flex items-center justify-center text-emerald-200 shrink-0">
                  <svg className="w-5 h-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-200 block">
                    01. Faculty Desk
                  </span>
                  <h2 className="text-sm font-bold tracking-wide mt-0.5">
                    Teacher / Faculty Member
                  </h2>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Faculty Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. teacher.name@dnhs.edu.ph"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={teacherForm.fullName}
                  onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Department / Level
                </label>
                <CustomSelect
                  fullWidth
                  value={teacherForm.department}
                  onChange={(val) => setTeacherForm({ ...teacherForm, department: val })}
                  options={[
                    { value: "Junior High School (JHS)", label: "Junior High School (JHS)", badge: "JHS" },
                    { value: "Senior High School (SHS)", label: "Senior High School (SHS)", badge: "SHS" },
                    { value: "Cross-Level Core", label: "Cross-Level Core", badge: "Core" },
                    { value: "TVL Faculty", label: "TVL Track Faculty", badge: "TVL" },
                  ]}
                  placeholder="Select Department / Level"
                />
              </div>
            </div>
          </div>

          <div className="p-4 pt-0">
            <button
              type="button"
              disabled={submittingRole === "teacher"}
              onClick={() => handleSendInvite("teacher")}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>{submittingRole === "teacher" ? "Generating Invite..." : "Send Teacher Invite"}</span>
            </button>
          </div>
        </div>

        {/* HEADER 2: SCHOOL ADMINISTRATOR ONBOARDING */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm overflow-hidden hover:border-blue-300 transition-colors">
          <div>
            <div className="bg-[#002060] text-white p-4 border-b border-[#001744] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#001744]/80 border border-blue-500/40 flex items-center justify-center text-amber-300 shrink-0">
                  <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-amber-300 block">
                    02. Administration Desk
                  </span>
                  <h2 className="text-sm font-bold tracking-wide mt-0.5">
                    School Administrator
                  </h2>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Administrator Email *
                </label>
                <input
                  type="email"
                  placeholder="e.g. registrar@dnhs.edu.ph"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Roberto Mendoza"
                  value={adminForm.fullName}
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Administrative Office / Unit
                </label>
                <CustomSelect
                  fullWidth
                  value={adminForm.department}
                  onChange={(val) => setAdminForm({ ...adminForm, department: val })}
                  options={[
                    { value: "Administrator", label: "Administrator", badge: "Admin" },
                  ]}
                  placeholder="Select Administrator"
                />
              </div>
            </div>
          </div>

          <div className="p-4 pt-0">
            <button
              type="button"
              disabled={submittingRole === "admin"}
              onClick={() => handleSendInvite("admin")}
              className="w-full py-2.5 px-4 rounded-lg bg-[#002060] hover:bg-[#001744] disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>{submittingRole === "admin" ? "Generating Invite..." : "Send Admin Invite"}</span>
            </button>
          </div>
        </div>

        {/* HEADER 3: IT SUPPORT DESK ONBOARDING */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm overflow-hidden hover:border-indigo-300 transition-colors">
          <div>
            <div className="bg-indigo-900 text-white p-4 border-b border-indigo-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-200 shrink-0">
                  <svg className="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-200 block">
                    03. Infrastructure Desk
                  </span>
                  <h2 className="text-sm font-bold tracking-wide mt-0.5">
                    IT Support &amp; Systems Desk
                  </h2>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  IT Personnel Email *
                </label>
                <input
                  type="email"
                  placeholder="e.g. itsupport@dnhs.edu.ph"
                  value={itSupportForm.email}
                  onChange={(e) => setItSupportForm({ ...itSupportForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={itSupportForm.fullName}
                  onChange={(e) => setItSupportForm({ ...itSupportForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Position
                </label>
                <CustomSelect
                  fullWidth
                  value={itSupportForm.department}
                  onChange={(val) => setItSupportForm({ ...itSupportForm, department: val })}
                  options={[
                    { value: "IT-support", label: "IT-support", badge: "IT Support" },
                  ]}
                  placeholder="Select Position"
                />
              </div>
            </div>
          </div>

          <div className="p-4 pt-0">
            <button
              type="button"
              disabled={submittingRole === "it_support"}
              onClick={() => handleSendInvite("it_support")}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-900 hover:bg-indigo-950 disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <svg className="w-4 h-4 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>{submittingRole === "it_support" ? "Generating Invite..." : "Send IT Support Invite"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invitations Audit Registry & Status Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#002060]/10 flex items-center justify-center text-[#002060]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Issued Staff Invitations &amp; Registry Audit
              </h3>
              <p className="text-[11px] text-slate-500">
                Active, accepted, and revoked staff onboarding invitation records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#002060] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full whitespace-nowrap">
              {isLoading ? (
                <span className="inline-block w-12 h-3 bg-blue-200 animate-pulse rounded align-middle" />
              ) : (
                `Total: ${invitations.length} Records`
              )}
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 sm:px-4 sm:py-3 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
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
              placeholder="Search by email, recipient name, role, department, or status..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:border-[#002060] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 uppercase shrink-0">
              Filter:
            </span>
            <CustomSelect
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              options={[
                { value: "all", label: `All Roles (${invitations.length})` },
                { value: "teacher", label: `Teachers (${invitations.filter((i) => i.role === "teacher").length})`, badge: "Faculty" },
                { value: "admin", label: `Administrators (${invitations.filter((i) => i.role === "admin").length})`, badge: "Admin" },
                { value: "it_support", label: `IT Support (${invitations.filter((i) => i.role === "it_support").length})`, badge: "IT" },
              ]}
              align="right"
              className="min-w-[170px]"
            />

            {(searchQuery || roleFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("all");
                }}
                className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}

            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md whitespace-nowrap">
              Showing {filteredInvitations.length === 0 ? 0 : `${startIndex + 1}–${endIndex}`} of {filteredInvitations.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2 animate-pulse" aria-busy="true" aria-label="Loading staff invitations">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-slate-50 rounded w-full border border-slate-100" />
            ))}
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {searchQuery || roleFilter !== "all" ? (
              <div className="space-y-2">
                <p>No invitations match your active filter or search &ldquo;{searchQuery}&rdquo;.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("all");
                  }}
                  className="px-3 py-1.5 bg-[#002060] hover:bg-[#001744] text-white rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Clear Filters &amp; Search
                </button>
              </div>
            ) : (
              "No invitations found. Use the forms above to issue staff invitations."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-mono text-[11px] text-slate-700 uppercase">
                  <th className="p-3">Email &amp; Recipient</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Department / Unit</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date Issued</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedInvitations.map((inv) => {
                  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
                  let portalBase = "";
                  if (inv.role === "teacher") {
                    portalBase = isLocal ? "http://localhost:3001" : "https://dumalnext-teacher.vercel.app";
                  } else if (inv.role === "admin") {
                    portalBase = isLocal ? "http://localhost:3000" : "https://dumalnext-admin.vercel.app";
                  } else {
                    portalBase = isLocal ? "http://localhost:3003" : "https://dumalnext-it-support.vercel.app";
                  }
                  const inviteUrl = `${portalBase}/accept-invite?token=${inv.token}`;
                  const isPending = inv.status === "pending";

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{inv.email}</div>
                        {inv.fullName && (
                          <div className="text-[11px] text-slate-500">{inv.fullName}</div>
                        )}
                      </td>
                      <td className="p-3">
                        {inv.role === "teacher" && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Teacher
                          </span>
                        )}
                        {inv.role === "admin" && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-blue-100 text-[#002060] border border-blue-300">
                            Administrator
                          </span>
                        )}
                        {inv.role === "it_support" && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-indigo-100 text-indigo-900 border border-indigo-300">
                            IT Support
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700">
                        {inv.department || "General"}
                      </td>
                      <td className="p-3">
                        {inv.status === "pending" && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            Pending
                          </span>
                        )}
                        {inv.status === "accepted" && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-green-100 text-green-900 border border-green-300">
                            Accepted
                          </span>
                        )}
                        {inv.status === "revoked" && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-red-100 text-red-900 border border-red-300">
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {new Date(inv.invitedAt).toLocaleDateString()} {new Date(inv.invitedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(inviteUrl, inv.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded transition-colors cursor-pointer"
                              >
                                <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>{copiedToken === inv.id ? "Copied" : "Copy"}</span>
                              </button>
                              <a
                                href={inviteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase bg-[#002060] hover:bg-[#001744] text-white rounded transition-colors"
                              >
                                <svg className="w-3 h-3 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span>Open</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRevoke(inv.id, inv.email)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded transition-colors cursor-pointer"
                              >
                                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Revoke</span>
                              </button>
                            </>
                          )}
                          {!isPending && (
                            <span className="text-[11px] font-mono text-slate-400 uppercase">
                              {inv.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls (Limit 10 per page) */}
        {!isLoading && filteredInvitations.length > PAGE_SIZE && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
            <div className="text-slate-600">
              Page <strong className="text-[#002060]">{safeCurrentPage}</strong> of{" "}
              <strong className="text-[#002060]">{totalPages}</strong> &bull; Showing{" "}
              <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of{" "}
              <strong>{filteredInvitations.length}</strong> invitation(s) (10 per page)
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className={`px-3 py-1.5 border text-xs font-bold uppercase rounded-[4px] transition-colors ${
                  safeCurrentPage <= 1
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-white hover:bg-slate-100 border-slate-300 text-[#002060] cursor-pointer"
                }`}
              >
                Prev
              </button>

              {getVisiblePageNumbers().map((pageNum, idx) => {
                if (pageNum < 0) {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 font-bold">
                      &hellip;
                    </span>
                  );
                }
                const isActive = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    aria-current={isActive ? "page" : undefined}
                    className={`min-w-[32px] px-2.5 py-1.5 border text-xs font-bold rounded-[4px] transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#002060] border-[#002060] text-white"
                        : "bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className={`px-3 py-1.5 border text-xs font-bold uppercase rounded-[4px] transition-colors ${
                  safeCurrentPage >= totalPages
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-white hover:bg-slate-100 border-slate-300 text-[#002060] cursor-pointer"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
