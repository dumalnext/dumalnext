"use client";

import React, { useState, useEffect } from "react";

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
    department: "Office of the Registrar",
  });

  const [itSupportForm, setItSupportForm] = useState({
    email: "",
    fullName: "",
    department: "System Administrator",
  });

  const [submittingRole, setSubmittingRole] = useState<string | null>(null);
  const [lastGeneratedLink, setLastGeneratedLink] = useState<{ email: string; role: string; url: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");

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
        const fullUrl = json.inviteUrl || `${defaultBase}/?token=${json.invitation.token}`;

        setLastGeneratedLink({
          email: json.invitation.email,
          role: json.invitation.role,
          url: fullUrl,
        });
        setStatusMessage({
          type: "success",
          text: `Invitation link generated successfully for ${json.invitation.email}. The recipient can now accept the invite and create their password.`,
        });

        if (role === "teacher") setTeacherForm({ email: "", fullName: "", department: "Junior High School (JHS)" });
        if (role === "admin") setAdminForm({ email: "", fullName: "", department: "Office of the Registrar" });
        if (role === "it_support") setItSupportForm({ email: "", fullName: "", department: "System Administrator" });

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
    if (roleFilter === "all") return true;
    return inv.role === roleFilter;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* DepEd Policy Guideline Banner */}
      <div className="p-4 bg-blue-50 border-2 border-[#002060]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
              [ DEPED POLICY GUIDELINE: ROLE-BASED STAFF INVITATION &amp; ONBOARDING DESK ]
            </span>
            <p className="text-xs text-slate-700 mt-1">
              Zero Self-Registration: Faculty, Administrators, and IT Support accounts are strictly provisioned through verified email invitations. When an invitation link is accepted, the authorized recipient sets their own password and is granted direct role-based portal access.
            </p>
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-3 border-2 text-xs font-bold ${
            statusMessage.type === "success"
              ? "bg-green-50 border-green-600 text-green-900"
              : "bg-red-50 border-red-600 text-red-900"
          }`}
        >
          {statusMessage.type === "success" ? "[ STATUS ]: " : "[ ERROR ]: "}
          {statusMessage.text}
        </div>
      )}

      {/* Prominent Generated Link Display */}
      {lastGeneratedLink && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-600 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-900 uppercase">
              [ ACTIVE INVITATION LINK READY FOR {lastGeneratedLink.email.toUpperCase()} ]
            </span>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-emerald-200 text-emerald-900">
              Role: {lastGeneratedLink.role}
            </span>
          </div>
          <p className="text-xs text-emerald-800">
            Share this secure link with the recipient. They will be directed to create their password and activate their account:
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={lastGeneratedLink.url}
              className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-emerald-400 rounded-none select-all text-slate-900"
            />
            <button
              type="button"
              onClick={() => handleCopyLink(lastGeneratedLink.url, "banner")}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
            >
              {copiedToken === "banner" ? "[ COPIED TO CLIPBOARD ]" : "[ COPY INVITE LINK ]"}
            </button>
            <a
              href={lastGeneratedLink.url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-[#002060] hover:bg-[#001744] text-white text-xs font-bold uppercase tracking-wider text-center shrink-0 transition-colors"
            >
              [ OPEN LINK ]
            </a>
          </div>
        </div>
      )}

      {/* 3 Separated Role Headers / Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* HEADER 1: TEACHER / FACULTY ONBOARDING */}
        <div className="bg-white border-2 border-slate-300 flex flex-col justify-between shadow-xs">
          <div>
            <div className="bg-emerald-800 text-white p-3 border-b-2 border-emerald-950">
              <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-200 block">
                [ 01. FACULTY DESK ]
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide">
                Teacher / Faculty Member
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-600">
                Provisions access to grade submissions, section advisorship, and automated class schedule timelines.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Faculty Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. teacher.name@dnhs.edu.ph"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-emerald-600 focus:outline-none"
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Department / Level
                </label>
                <select
                  value={teacherForm.department}
                  onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-emerald-600 focus:outline-none bg-white"
                >
                  <option value="Junior High School (JHS)">Junior High School (JHS)</option>
                  <option value="Senior High School (SHS)">Senior High School (SHS)</option>
                  <option value="Cross-Level Core">Cross-Level Core</option>
                  <option value="TVL Faculty">TVL Track Faculty</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 pt-0">
            <button
              type="button"
              disabled={submittingRole === "teacher"}
              onClick={() => handleSendInvite("teacher")}
              className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              {submittingRole === "teacher" ? "[ GENERATING INVITE... ]" : "[ + SEND TEACHER INVITE ]"}
            </button>
          </div>
        </div>

        {/* HEADER 2: SCHOOL ADMINISTRATOR ONBOARDING */}
        <div className="bg-white border-2 border-slate-300 flex flex-col justify-between shadow-xs">
          <div>
            <div className="bg-[#002060] text-white p-3 border-b-2 border-[#001744]">
              <span className="text-[10px] font-mono tracking-wider uppercase text-blue-200 block">
                [ 02. ADMINISTRATION DESK ]
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide">
                School Administrator
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-600">
                Provisions access to application adjudication, enrollment controls, section quotas, and deconfliction engines.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Administrator Email *
                </label>
                <input
                  type="email"
                  placeholder="e.g. registrar@dnhs.edu.ph"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-[#002060] focus:outline-none"
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-[#002060] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Administrative Office / Unit
                </label>
                <select
                  value={adminForm.department}
                  onChange={(e) => setAdminForm({ ...adminForm, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-[#002060] focus:outline-none bg-white"
                >
                  <option value="Office of the Registrar">Office of the Registrar</option>
                  <option value="Academic Affairs">Academic Affairs</option>
                  <option value="Principal's Office">Principal's Office</option>
                  <option value="Admissions Committee">Admissions Committee</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 pt-0">
            <button
              type="button"
              disabled={submittingRole === "admin"}
              onClick={() => handleSendInvite("admin")}
              className="w-full py-2.5 px-4 bg-[#002060] hover:bg-[#001744] disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              {submittingRole === "admin" ? "[ GENERATING INVITE... ]" : "[ + SEND ADMIN INVITE ]"}
            </button>
          </div>
        </div>

        {/* HEADER 3: IT SUPPORT DESK ONBOARDING */}
        <div className="bg-white border-2 border-slate-300 flex flex-col justify-between shadow-xs">
          <div>
            <div className="bg-indigo-900 text-white p-3 border-b-2 border-indigo-950">
              <span className="text-[10px] font-mono tracking-wider uppercase text-indigo-200 block">
                [ 03. INFRASTRUCTURE DESK ]
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide">
                IT Support &amp; Systems Desk
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-600">
                Provisions technical access to dynamic trisem calendar dates, physical classroom registries, and system diagnostics.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  IT Personnel Email *
                </label>
                <input
                  type="email"
                  placeholder="e.g. itsupport@dnhs.edu.ph"
                  value={itSupportForm.email}
                  onChange={(e) => setItSupportForm({ ...itSupportForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-indigo-600 focus:outline-none"
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  System Administration Designation
                </label>
                <select
                  value={itSupportForm.department}
                  onChange={(e) => setItSupportForm({ ...itSupportForm, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:border-indigo-600 focus:outline-none bg-white"
                >
                  <option value="System Administrator">System Administrator</option>
                  <option value="Database Operations Specialist">Database Operations Specialist</option>
                  <option value="Network &amp; Security Support">Network &amp; Security Support</option>
                  <option value="IT Operations Desk">IT Operations Desk</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 pt-0">
            <button
              type="button"
              disabled={submittingRole === "it_support"}
              onClick={() => handleSendInvite("it_support")}
              className="w-full py-2.5 px-4 bg-indigo-900 hover:bg-indigo-950 disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              {submittingRole === "it_support" ? "[ GENERATING INVITE... ]" : "[ + SEND IT SUPPORT INVITE ]"}
            </button>
          </div>
        </div>
      </div>

      {/* Invitations Audit Registry & Status Table */}
      <div className="bg-white border-2 border-slate-300 shadow-xs">
        <div className="p-4 border-b-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
              [ ISSUED STAFF INVITATIONS &amp; REGISTRY AUDIT ]
            </h3>
            <p className="text-xs text-slate-500">
              Active, accepted, and revoked staff onboarding invitation records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-600 uppercase">
              Filter:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 bg-white font-mono"
            >
              <option value="all">All Roles ({invitations.length})</option>
              <option value="teacher">Teachers ({invitations.filter((i) => i.role === "teacher").length})</option>
              <option value="admin">Administrators ({invitations.filter((i) => i.role === "admin").length})</option>
              <option value="it_support">IT Support ({invitations.filter((i) => i.role === "it_support").length})</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono uppercase text-slate-500">
            [ Loading staff invitations... ]
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono uppercase text-slate-500">
            No invitations found. Use the forms above to issue staff invitations.
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
                {filteredInvitations.map((inv) => {
                  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
                  let portalBase = "";
                  if (inv.role === "teacher") {
                    portalBase = isLocal ? "http://localhost:3001" : "https://dumalnext-teacher.vercel.app";
                  } else if (inv.role === "admin") {
                    portalBase = isLocal ? "http://localhost:3000" : "https://dumalnext-admin.vercel.app";
                  } else {
                    portalBase = isLocal ? "http://localhost:3003" : "https://dumalnext-it-support.vercel.app";
                  }
                  const inviteUrl = `${portalBase}/?token=${inv.token}`;
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
                                className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 transition-colors cursor-pointer"
                              >
                                {copiedToken === inv.id ? "Copied" : "Copy Link"}
                              </button>
                              <a
                                href={inviteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-[#002060] hover:bg-[#001744] text-white transition-colors"
                              >
                                Open
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRevoke(inv.id, inv.email)}
                                className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 transition-colors cursor-pointer"
                              >
                                Revoke
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
      </div>
    </div>
  );
}
