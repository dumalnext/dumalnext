"use client";

import React, { useState, useEffect } from "react";
import CustomSelect from "@/components/CustomSelect";
import { createClient } from "@/lib/supabase/client";

export interface SystemUser {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  userRole: "student" | "teacher" | "admin" | "it_support";
  photoUrl?: string | null;
  createdAt: string;
  details?: {
    lrn?: string;
    gradeLevel?: string;
    strand?: string;
    sectionName?: string;
    barangay?: string;
    gender?: string;
    contactNumber?: string;
    dateOfBirth?: string;
    teacherId?: string;
    department?: string;
    facultyEmail?: string;
    adminId?: string;
    itsupportId?: string;
    systemRole?: string;
  };
}

export default function UserRoleAuditor() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [counts, setCounts] = useState({ all: 0, student: 0, teacher: 0, admin: 0, it_support: 0 });
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  // Credential Security Controls Modal Box State
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [isEditingLrn, setIsEditingLrn] = useState(false);
  const [editLrn, setEditLrn] = useState("");
  const [isSavingLrn, setIsSavingLrn] = useState(false);
  const [isRemovingLrn, setIsRemovingLrn] = useState(false);
  const [isRemovingEmail, setIsRemovingEmail] = useState(false);
  const [isRemovingPassword, setIsRemovingPassword] = useState(false);
  const [credentialNotice, setCredentialNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleOpenDossier = (target: SystemUser) => {
    setViewingUser(target);
    setShowCredentialModal(false);
    setIsEditingLrn(false);
    setCredentialNotice(null);
    setEditLrn(target.details?.lrn && target.details.lrn !== "Not assigned" ? target.details.lrn : "");
  };

  const handleSaveLrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingUser) return;
    const cleanLrn = editLrn.replace(/\D/g, "").slice(0, 12);
    if (cleanLrn.length !== 12) {
      setCredentialNotice({ type: "error", text: "LRN must be exactly 12 numeric digits." });
      return;
    }
    setIsSavingLrn(true);
    setCredentialNotice(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: viewingUser.id,
          action: "modify_details",
          newLrn: cleanLrn,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update LRN.");

      setCredentialNotice({ type: "success", text: `LRN successfully updated to ${cleanLrn}. Synced across portals in real time.` });
      setIsEditingLrn(false);
      setViewingUser((prev) =>
        prev
          ? {
              ...prev,
              userId: prev.userRole === "student" ? cleanLrn : prev.userId,
              details: {
                ...prev.details,
                lrn: cleanLrn,
              },
            }
          : null
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:users-changed"));
      }
      fetchUsers(true);
    } catch (err: any) {
      setCredentialNotice({ type: "error", text: err.message || "Failed to save LRN." });
    } finally {
      setIsSavingLrn(false);
    }
  };

  const handleRemoveLrn = async () => {
    if (!viewingUser) return;
    const confirm = window.confirm(`Remove LRN from ${viewingUser.fullName}'s record? This change will synchronize in real time across all portals.`);
    if (!confirm) return;

    setIsRemovingLrn(true);
    setCredentialNotice(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: viewingUser.id,
          action: "remove_lrn",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to remove LRN.");

      setCredentialNotice({ type: "success", text: "LRN removed from account. Updated in real time across all portals." });
      setEditLrn("");
      setIsEditingLrn(false);
      setViewingUser((prev) =>
        prev
          ? {
              ...prev,
              details: {
                ...prev.details,
                lrn: "Not assigned",
              },
            }
          : null
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:users-changed"));
      }
      fetchUsers(true);
    } catch (err: any) {
      setCredentialNotice({ type: "error", text: err.message || "Failed to remove LRN." });
    } finally {
      setIsRemovingLrn(false);
    }
  };

  const handleRemoveEmail = async () => {
    if (!viewingUser) return;
    const confirm = window.confirm(`Remove registered email (${viewingUser.email}) from this account? This will synchronize across all systems in real time.`);
    if (!confirm) return;

    setIsRemovingEmail(true);
    setCredentialNotice(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: viewingUser.id,
          action: "remove_email",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to remove email.");

      setCredentialNotice({ type: "success", text: "Email address removed. Updated across all portals in real time." });
      setViewingUser((prev) =>
        prev
          ? {
              ...prev,
              email: "",
            }
          : null
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:users-changed"));
      }
      fetchUsers(true);
    } catch (err: any) {
      setCredentialNotice({ type: "error", text: err.message || "Failed to remove email." });
    } finally {
      setIsRemovingEmail(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!viewingUser) return;
    const confirm = window.confirm(`Remove password for ${viewingUser.fullName}? For security, IT Support NEVER views passwords. The password will be immediately invalidated and removed from Supabase Auth.`);
    if (!confirm) return;

    setIsRemovingPassword(true);
    setCredentialNotice(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: viewingUser.id,
          action: "remove_password",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to remove password.");

      setCredentialNotice({
        type: "success",
        text: "Password successfully removed & invalidated in Supabase Auth. For student security, no password was shown. The student must verify via OTP to set a new password.",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:users-changed"));
      }
      fetchUsers(true);
    } catch (err: any) {
      setCredentialNotice({ type: "error", text: err.message || "Failed to remove password." });
    } finally {
      setIsRemovingPassword(false);
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Viewing user credentials modal state
  const [viewingUser, setViewingUser] = useState<SystemUser | null>(null);

  // Photo enlargement lightbox state
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ src: string; name: string } | null>(null);

  // Deletion modal state
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [provisionedLink, setProvisionedLink] = useState<{ email: string; url: string; role: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    email: "",
    userRole: "teacher",
    department: "CROSS_LEVEL",
  });

  const fetchUsers = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.users || []);
        setCounts(json.counts || { all: 0, student: 0, teacher: 0, admin: 0, it_support: 0 });
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to load system users." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Network error fetching users." });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Real-Time Auto-Sync: Listens to PostgreSQL changes and focus events
  useEffect(() => {
    fetchUsers(false);

    const supabase = createClient();

    // 1. Supabase Realtime Channel for instant reflection on INSERT, UPDATE, and DELETE
    const channel = supabase
      .channel("it-users-realtime-listener")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          fetchUsers(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchUsers(true);
        }
      )
      .subscribe();

    // 2. Window Focus & Visibility Change: triggers sync when switching back from Supabase dashboard
    const handleVisibilitySync = () => {
      if (document.visibilityState === "visible") {
        fetchUsers(true);
      }
    };
    window.addEventListener("focus", handleVisibilitySync);
    document.addEventListener("visibilitychange", handleVisibilitySync);

    // 3. Fallback Heartbeat Polling (every 2 minutes, active tab only)
    const heartbeat = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchUsers(true);
      }
    }, 120000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleVisibilitySync);
      document.removeEventListener("visibilitychange", handleVisibilitySync);
      clearInterval(heartbeat);
    };
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: "success",
          text: `User ${formData.userId} provisioned successfully with role ${formData.userRole}. An onboarding invitation link has been generated for ${formData.email}.`,
        });
        if (json.inviteUrl) {
          setProvisionedLink({
            email: formData.email,
            url: json.inviteUrl,
            role: formData.userRole,
          });
        }
        setIsModalOpen(false);
        setFormData({
          userId: "",
          fullName: "",
          email: "",
          userRole: "teacher",
          department: "CROSS_LEVEL",
        });
        fetchUsers(true);
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to provision user." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Error submitting user provisioning." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/users?id=${userToDelete.id}&email=${encodeURIComponent(userToDelete.email)}`,
        {
          method: "DELETE",
        }
      );
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: "success",
          text: `Account ${userToDelete.email} (${userToDelete.userId}) was deleted successfully from Supabase.`,
        });
        setUserToDelete(null);
        setViewingUser(null);
        await fetchUsers(true);
      } else {
        setStatusMessage({
          type: "error",
          text: json.error || "Failed to delete account from Supabase.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: "Network error deleting account.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRole === "all" || u.userRole === selectedRole;
    const effectiveQuery = (activeSearch || searchQuery).trim().toLowerCase();
    const matchesSearch =
      !effectiveQuery ||
      u.userId.toLowerCase().includes(effectiveQuery) ||
      u.email.toLowerCase().includes(effectiveQuery) ||
      (u.fullName && u.fullName.toLowerCase().includes(effectiveQuery)) ||
      (u.details?.lrn && u.details.lrn.toLowerCase().includes(effectiveQuery)) ||
      (u.details?.facultyEmail && u.details.facultyEmail.toLowerCase().includes(effectiveQuery));
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white rounded-xl p-5 sm:p-6 shadow-md border border-[#001744] border-t-4 border-t-amber-400">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <img
              src="/dumalneg-logo.png"
              alt="Dumalneg NHS Seal"
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0 hidden sm:block mt-0.5"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
                  Role-Based Access Control (RBAC) &amp; Credential Directory
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Cloud Sync Active
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-0.5">
                Institutional Accounts &amp; Role Permissions
              </h2>
              <p className="text-xs text-blue-100 mt-1 max-w-2xl">
                Manages the four institutional actor types (Student, Teacher, School Administrator, IT Support). Synchronized in real-time with Supabase database.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            + Provision User Account
          </button>
        </div>
      </div>

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

      {provisionedLink && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-500 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
              Onboarding Invitation Link Ready for {provisionedLink.email}
            </span>
            <button
              type="button"
              onClick={() => setProvisionedLink(null)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 px-2 py-0.5 rounded hover:bg-emerald-100 cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-emerald-900">
            Initial password field has been removed. Share this secure link with the recipient so they can create their own password:
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={provisionedLink.url}
              className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-emerald-400 rounded-lg select-all text-slate-900"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(provisionedLink.url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 3000);
                } catch {
                  prompt("Copy invite link:", provisionedLink.url);
                }
              }}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer"
            >
              {copiedLink ? "Copied to Clipboard" : "Copy Invite Link"}
            </button>
            <a
              href={provisionedLink.url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-[#002060] hover:bg-blue-950 text-white rounded-lg text-xs font-bold uppercase tracking-wider text-center shrink-0"
            >
              Open Login / Create Password
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setSelectedRole("all")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedRole === "all" ? "bg-[#002060] text-white border-[#002060] shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50 shadow-xs"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedRole === "all" ? "text-amber-300" : "text-slate-500"}`}>
            All Accounts
          </span>
          <div className="text-lg font-black mt-0.5">{counts.all}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("student")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedRole === "student" ? "bg-[#002060] text-white border-[#002060] shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50 shadow-xs"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedRole === "student" ? "text-amber-300" : "text-slate-500"}`}>
            Learners (Students)
          </span>
          <div className="text-lg font-black mt-0.5">{counts.student}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("teacher")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedRole === "teacher" ? "bg-[#002060] text-white border-[#002060] shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50 shadow-xs"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedRole === "teacher" ? "text-amber-300" : "text-slate-500"}`}>
            Faculty (Teachers)
          </span>
          <div className="text-lg font-black mt-0.5">{counts.teacher}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("admin")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedRole === "admin" ? "bg-[#002060] text-white border-[#002060] shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50 shadow-xs"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedRole === "admin" ? "text-amber-300" : "text-slate-500"}`}>
            Administrators
          </span>
          <div className="text-lg font-black mt-0.5">{counts.admin}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("it_support")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedRole === "it_support" ? "bg-[#002060] text-white border-[#002060] shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50 shadow-xs"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedRole === "it_support" ? "text-amber-300" : "text-slate-500"}`}>
            IT Support
          </span>
          <div className="text-lg font-black mt-0.5">{counts.it_support}</div>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setActiveSearch(searchQuery.trim());
              }
            }}
            placeholder="Search by 12-Digit LRN, Student / Staff Name, or Gmail Address..."
            className="w-full p-2.5 pl-9 bg-white rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#002060] outline-none shadow-xs"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="button"
          onClick={() => setActiveSearch(searchQuery.trim())}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#002060] hover:bg-[#002b80] active:bg-[#001744] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search</span>
        </button>
        {(searchQuery || activeSearch) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setActiveSearch("");
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Registered Users Directory &bull; Dumalneg National High School
          </h3>
          <span className="text-[11px] font-bold text-[#002060] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
            Displaying {filteredUsers.length} of {users.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-500">
            Loading user directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600">
            No matching user records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-[11px] uppercase text-slate-700">
                  <th className="p-3">DNHS User ID</th>
                  <th className="p-3">Full Name / Account Holder</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Access Level</th>
                  <th className="p-3">Registration Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => {
                  let badgeClass = "bg-slate-100 text-slate-800 border-slate-300";
                  if (user.userRole === "admin") badgeClass = "bg-purple-100 text-purple-900 border-purple-300";
                  if (user.userRole === "teacher") badgeClass = "bg-blue-100 text-blue-900 border-blue-300";
                  if (user.userRole === "student") badgeClass = "bg-green-100 text-green-900 border-green-300";
                  if (user.userRole === "it_support") badgeClass = "bg-amber-100 text-amber-900 border-amber-300";

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#002060]">{user.userId}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => {
                              if (user.photoUrl) setEnlargedPhoto({ src: user.photoUrl, name: user.fullName || user.userId });
                            }}
                            className={`w-9 h-9 rounded-full border-2 border-[#002060] bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center ${
                              user.photoUrl ? "cursor-zoom-in hover:opacity-90 ring-2 ring-blue-300/50" : ""
                            }`}
                            title={user.photoUrl ? "Click to view photo" : "No photo uploaded"}
                          >
                            {user.photoUrl ? (
                              <img
                                src={user.photoUrl}
                                alt={user.fullName || "User"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#002060] text-white flex items-center justify-center font-mono font-bold text-xs">
                                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 uppercase truncate">
                              {user.fullName || "DNHS USER"}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded border font-bold text-[10px] uppercase ${badgeClass}`}>
                          {user.userRole}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-600">
                        {user.userRole === "admin" && "Adjudication & Timetables"}
                        {user.userRole === "teacher" && "Class Rosters & Schedules"}
                        {user.userRole === "student" && "Remote Enrollment & Status"}
                        {user.userRole === "it_support" && "System Calendar & Facilities"}
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDossier(user)}
                          className="px-3 py-1 rounded text-[11px] font-bold border border-[#002060] bg-blue-50 text-[#002060] hover:bg-[#002060] hover:text-white transition-colors cursor-pointer"
                        >
                          View Dossier
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View User Credentials & Profile Dossier Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            {/* Header with 2x2 Photo Card */}
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* 2x2 Photo Box */}
                <div className="relative group shrink-0">
                  <div
                    onClick={() => {
                      if (viewingUser.photoUrl) {
                        setEnlargedPhoto({
                          src: viewingUser.photoUrl,
                          name: viewingUser.fullName || viewingUser.userId,
                        });
                      }
                    }}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-[#002060] bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center ${
                      viewingUser.photoUrl ? "cursor-zoom-in hover:brightness-95 ring-2 ring-blue-300" : ""
                    }`}
                    title={viewingUser.photoUrl ? "Click to enlarge 2x2 photo" : "No 2x2 photo on file"}
                  >
                    {viewingUser.photoUrl ? (
                      <img
                        src={viewingUser.photoUrl}
                        alt={viewingUser.fullName || "Official Photo"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-1 text-center">
                        <svg className="w-8 h-8 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                          No 2x2 Photo
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-[9px] font-bold text-[#002060] uppercase block">
                      {viewingUser.photoUrl ? "2x2 ID Photo" : "Official Avatar"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#002060] uppercase tracking-widest block">
                    DNHS Credential &amp; Profile Dossier
                  </span>
                  <h3 className="text-lg font-black text-slate-900 uppercase mt-0.5">
                    {viewingUser.fullName || viewingUser.userId}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      {viewingUser.userId}
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-xs text-slate-600 font-medium">{viewingUser.email}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded hover:bg-slate-100 cursor-pointer self-start sm:self-center"
              >
                Close
              </button>
            </div>

            {/* Primary System Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase text-slate-500 block font-bold">Assigned Role</span>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded border font-bold text-[11px] uppercase ${
                    viewingUser.userRole === "admin" ? "bg-purple-100 text-purple-900 border-purple-300" :
                    viewingUser.userRole === "teacher" ? "bg-blue-100 text-blue-900 border-blue-300" :
                    viewingUser.userRole === "student" ? "bg-green-100 text-green-900 border-green-300" :
                    "bg-amber-100 text-amber-900 border-amber-300"
                  }`}>
                    {viewingUser.userRole}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-500 block font-bold">Registration Timestamp</span>
                <span className="font-mono text-slate-800 font-bold mt-1 block">
                  {new Date(viewingUser.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-500 block font-bold">Official Login Email</span>
                <span className="font-mono text-slate-900 font-bold mt-1 block">
                  {viewingUser.email}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-500 block font-bold">System Access Level</span>
                <span className="text-slate-800 font-bold mt-1 block">
                  {viewingUser.userRole === "admin" && "Adjudication & Timetables"}
                  {viewingUser.userRole === "teacher" && "Class Rosters & Schedules"}
                  {viewingUser.userRole === "student" && "Remote Enrollment & Status"}
                  {viewingUser.userRole === "it_support" && "System Calendar & Facilities"}
                </span>
              </div>
            </div>

            {/* Role-Specific Institutional Credentials */}
            {viewingUser.userRole === "student" && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#002060] border-b pb-1">
                  Learner Academic &amp; Enrollment Dossier
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Learner Reference Number (LRN)</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.lrn || "Not Assigned"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Grade Level</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.gradeLevel || "Unassigned"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Curriculum Track / Strand</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.strand || "Core Curriculum"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Assigned Section</span>
                    <span className="font-bold text-[#002060] mt-1 block">
                      {viewingUser.details?.sectionName || "Unassigned"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Barangay Residence</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.barangay || "N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Contact Number</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.contactNumber || "None Provided"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {viewingUser.userRole === "teacher" && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#002060] border-b pb-1">
                  Faculty Credentials &amp; Department Dossier
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Faculty Identifier</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.teacherId || viewingUser.userId}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Assigned Department</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.department === "JHS" && "Junior High School Faculty"}
                      {viewingUser.details?.department === "SHS" && "Senior High School Faculty"}
                      {viewingUser.details?.department === "CROSS_LEVEL" && "Cross-Level (JHS & SHS)"}
                      {!["JHS", "SHS", "CROSS_LEVEL"].includes(viewingUser.details?.department || "") && (viewingUser.details?.department || "General Faculty")}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Official Faculty Email</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.facultyEmail || viewingUser.email}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {viewingUser.userRole === "admin" && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#002060] border-b pb-1">
                  Administrative Officer Dossier
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Administrator ID</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.adminId || viewingUser.userId}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Department / Office</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.department || "Academic Affairs & Registrar"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {viewingUser.userRole === "it_support" && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#002060] border-b pb-1">
                  IT Systems Desk Dossier
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">IT Personnel Identifier</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.itsupportId || viewingUser.userId}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold">Designated Role</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.systemRole || "System Administrator"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer with Delete and One Credential Security Controls Button */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Delete Account Button */}
                {viewingUser.email.toLowerCase() === "dumalnext@gmail.com" ? (
                  <span className="px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-300 text-amber-900 text-[10px] font-bold uppercase">
                    Master IT Account - Protected
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUserToDelete(viewingUser)}
                    className="px-4 py-2 rounded-lg border border-red-600 bg-red-50 hover:bg-red-700 text-red-700 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Delete Account
                  </button>
                )}

                {/* 2. THE SINGLE BUTTON TO OPEN CREDENTIAL SECURITY CONTROLS */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCredentialModal(true);
                    setEditLrn(viewingUser.details?.lrn && viewingUser.details.lrn !== "Not assigned" ? viewingUser.details.lrn : "");
                    setIsEditingLrn(false);
                    setCredentialNotice(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#002060] bg-blue-50 hover:bg-[#002060] text-[#002060] hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Manage Credentials &amp; Security</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-5 py-2 rounded-lg border border-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors w-full sm:w-auto text-center cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL BOX: LRN (MODIFY/REMOVE), EMAIL (REMOVE), PASSWORD (REMOVE) */}
      {showCredentialModal && viewingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-amber-400">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                    Account Credential Controls
                  </span>
                  <h3 className="text-base font-bold text-white truncate max-w-sm">
                    {viewingUser.fullName}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCredentialModal(false)}
                className="text-white/70 hover:text-white cursor-pointer text-xl leading-none px-2"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Real-time synchronization banner */}
              <div className="p-3 bg-blue-50 border-l-4 border-[#002060] border border-blue-200 rounded-lg text-[11px] text-slate-700 leading-relaxed">
                <span className="font-bold text-[#002060] block mb-0.5">
                  Real-Time Synchronization Active
                </span>
                Any modifications or removals made here take effect immediately in Supabase and sync live to Student Portal, Teacher Rosters, Admin, and IT Support.
              </div>

              {credentialNotice && (
                <div
                  className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between ${
                    credentialNotice.type === "success"
                      ? "bg-emerald-50 text-emerald-950 border border-emerald-300"
                      : "bg-red-50 text-red-950 border border-red-300"
                  }`}
                >
                  <span>{credentialNotice.text}</span>
                  <button
                    type="button"
                    onClick={() => setCredentialNotice(null)}
                    className="text-slate-500 hover:text-slate-800 cursor-pointer ml-2"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* 1. LRN SECTION (MODIFY / REMOVE) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    LRN (Learner Reference Number)
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                    12 Digits
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current LRN:</span>
                    <span className="font-mono text-sm font-extrabold text-[#002060]">
                      {viewingUser.details?.lrn && viewingUser.details.lrn !== "Not assigned"
                        ? viewingUser.details.lrn
                        : "None / Not Assigned"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingLrn((prev) => !prev);
                        setEditLrn(viewingUser.details?.lrn && viewingUser.details.lrn !== "Not assigned" ? viewingUser.details.lrn : "");
                      }}
                      className="px-3 py-1.5 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded cursor-pointer transition-colors"
                    >
                      {isEditingLrn ? "Cancel" : "Modify LRN"}
                    </button>

                    {viewingUser.details?.lrn && viewingUser.details.lrn !== "Not assigned" && (
                      <button
                        type="button"
                        onClick={handleRemoveLrn}
                        disabled={isRemovingLrn}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded cursor-pointer transition-colors disabled:opacity-60"
                      >
                        {isRemovingLrn ? "Removing..." : "Remove LRN"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Modify LRN Form */}
                {isEditingLrn && (
                  <form onSubmit={handleSaveLrn} className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg space-y-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-800">
                      Enter 12-Digit LRN:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={12}
                        value={editLrn}
                        onChange={(e) => setEditLrn(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g. 101234567890"
                        className="flex-1 p-2 bg-white border border-slate-300 rounded text-xs font-mono font-bold focus:border-[#002060] outline-none"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isSavingLrn || editLrn.length !== 12}
                        className="px-4 py-2 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSavingLrn ? "Saving..." : "Save LRN"}
                      </button>
                    </div>
                    {editLrn && editLrn.length < 12 && (
                      <span className="text-[10px] text-amber-700 font-semibold block">
                        Must be exactly 12 digits ({editLrn.length}/12 entered)
                      </span>
                    )}
                  </form>
                )}
              </div>

              {/* 2. EMAIL SECTION (REMOVE ONLY) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Registered Email Address
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium italic">
                    Learner Self-Service
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current Email:</span>
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {viewingUser.email || "No email registered"}
                    </span>
                  </div>

                  <div>
                    {viewingUser.email ? (
                      <button
                        type="button"
                        onClick={handleRemoveEmail}
                        disabled={isRemovingEmail}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded cursor-pointer transition-colors disabled:opacity-60"
                      >
                        {isRemovingEmail ? "Removing..." : "Remove Email"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No email linked</span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Notice: Email modification is managed directly by learners. IT Support may only remove an erroneous email from this record.
                </p>
              </div>

              {/* 3. PASSWORD SECTION (REMOVE ONLY - INVISIBLE TO IT SUPPORT) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Account Password Security
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    Encrypted
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Password Status:</span>
                    <span className="font-mono text-xs font-bold text-slate-700 tracking-widest">
                      ● ● ● ● ● ● ● ● (Protected)
                    </span>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleRemovePassword}
                      disabled={isRemovingPassword}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-400 text-xs font-bold rounded cursor-pointer transition-colors disabled:opacity-60 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>{isRemovingPassword ? "Removing..." : "Remove Password"}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Security Policy: Passwords are NEVER revealed to IT Support. Removing the password instantly wipes and revokes access in Supabase Auth. The student must verify via 6-digit OTP code to create a new password.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCredentialModal(false)}
                className="px-5 py-2 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Done / Back to Dossier
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Account Deletion Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-red-600 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest block">
                  Security Confirmation &bull; Supabase Sync
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Account Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
              <p>
                Are you sure you want to permanently delete the following account from Supabase?
              </p>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200 space-y-1">
                <div>
                  <strong className="text-slate-900">Email:</strong> {userToDelete.email}
                </div>
                <div>
                  <strong className="text-slate-900">User ID:</strong> {userToDelete.userId}
                </div>
                <div>
                  <strong className="text-slate-900">Role:</strong> {userToDelete.userRole.toUpperCase()}
                </div>
              </div>
              <p className="text-[11px] text-red-800 font-bold">
                This action will delete their profile from the Supabase database and revoke access.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision New User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#002060] uppercase tracking-widest block">
                  IT Support Security Provisioning
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Provision New Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  User Role Classification <span className="text-red-700">*</span>
                </label>
                <CustomSelect
                  fullWidth
                  value={formData.userRole}
                  onChange={(val) => {
                    const role = val;
                    let prefix = "DNHS-TCH";
                    if (role === "admin") prefix = "DNHS-ADM";
                    if (role === "student") prefix = "DNHS-STU";
                    if (role === "it_support") prefix = "DNHS-IT";
                    setFormData({
                      ...formData,
                      userRole: role as any,
                      userId: `${prefix}-${Math.floor(100 + Math.random() * 900)}`,
                    });
                  }}
                  options={[
                    { value: "teacher", label: "Teacher (Faculty Member)", badge: "Faculty" },
                    { value: "admin", label: "School Administrator (Registrar)", badge: "Admin" },
                    { value: "it_support", label: "IT Support Staff", badge: "IT" },
                    { value: "student", label: "Student (Learner)", badge: "Student" },
                  ]}
                  placeholder="Select User Role"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  DNHS User Identifier <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DNHS-TCH-004"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full p-2.5 bg-white rounded-lg border border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Full Name / Personnel Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 bg-white rounded-lg border border-slate-300 font-bold focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Official Email Address <span className="text-red-700">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. faculty.member@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 bg-white rounded-lg border border-slate-300 font-bold focus:border-[#002060] outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-[11px] text-[#002060]">
                <strong className="block uppercase font-bold">Zero Initial Password Policy:</strong>
                <span>IT Support does not set passwords. Saving this account will generate a secure onboarding invitation link for the user to create their own password upon first visit.</span>
              </div>

              {formData.userRole === "teacher" && (
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Faculty Department
                  </label>
                  <CustomSelect
                    fullWidth
                    value={formData.department}
                    onChange={(val) => setFormData({ ...formData, department: val })}
                    options={[
                      { value: "CROSS_LEVEL", label: "CROSS_LEVEL (JHS & SHS)", badge: "All" },
                      { value: "JHS", label: "Junior High School", badge: "JHS" },
                      { value: "SHS", label: "Senior High School", badge: "SHS" },
                    ]}
                    placeholder="Select Department"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#002060] hover:bg-[#001845] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Provisioning..." : "+ Save & Issue Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged Photo Inspection Lightbox */}
      {enlargedPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] max-w-lg w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <span className="text-[10px] font-bold text-[#002060] uppercase tracking-widest block">
                  2x2 Official Learner / Personnel Photo
                </span>
                <h4 className="text-sm font-black uppercase text-slate-900">{enlargedPhoto.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setEnlargedPhoto(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="flex items-center justify-center bg-slate-900/5 p-3 rounded-lg border border-slate-200">
              <img
                src={enlargedPhoto.src}
                alt={enlargedPhoto.name}
                className="max-h-96 max-w-full object-contain shadow-md border-4 border-white rounded"
              />
            </div>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setEnlargedPhoto(null)}
                className="px-5 py-2 rounded-lg bg-[#002060] text-white text-xs font-bold cursor-pointer hover:bg-[#001845] transition-colors"
              >
                Close Photo Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
