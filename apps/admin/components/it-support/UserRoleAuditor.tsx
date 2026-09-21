"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SystemUser {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  userRole: "student" | "teacher" | "admin" | "it_support";
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
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Viewing user credentials modal state
  const [viewingUser, setViewingUser] = useState<SystemUser | null>(null);

  // Deletion modal state
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    email: "",
    password: "password123",
    userRole: "teacher",
    department: "CROSS_LEVEL",
  });

  const fetchUsers = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/it-support/users");
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
      .channel("admin-it-users-realtime-listener")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
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

    // 3. 5-Second Silent Heartbeat Polling
    const heartbeat = setInterval(() => {
      fetchUsers(true);
    }, 5000);

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
      const res = await fetch("/api/it-support/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: "success",
          text: `User ${formData.userId} provisioned successfully with role ${formData.userRole}.`,
        });
        setIsModalOpen(false);
        setFormData({
          userId: "",
          fullName: "",
          email: "",
          password: "password123",
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
        `/api/it-support/users?id=${userToDelete.id}&email=${encodeURIComponent(userToDelete.email)}`,
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
    const matchesSearch =
      u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="p-4 bg-blue-50 border-2 border-[#002060]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
                [ Role-Based Access Control (RBAC) &amp; Credential Directory ]
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Cloud Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1">
              Manages the four institutional actor types (Student, Teacher, School Administrator, IT Support). Synchronized in real-time with Supabase database.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#002060] hover:bg-[#001845] text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
          >
            [ + Provision User Account ]
          </button>
        </div>
      </div>

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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setSelectedRole("all")}
          className={`p-3 border-2 text-left transition-all ${
            selectedRole === "all" ? "bg-[#002060] text-white border-[#002060]" : "bg-white border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span className={`text-[10px] font-mono uppercase block ${selectedRole === "all" ? "text-blue-200" : "text-slate-500"}`}>
            All Accounts
          </span>
          <div className="text-lg font-black mt-0.5">{counts.all}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("student")}
          className={`p-3 border-2 text-left transition-all ${
            selectedRole === "student" ? "bg-[#002060] text-white border-[#002060]" : "bg-white border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span className={`text-[10px] font-mono uppercase block ${selectedRole === "student" ? "text-blue-200" : "text-slate-500"}`}>
            Learners (Students)
          </span>
          <div className="text-lg font-black mt-0.5">{counts.student}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("teacher")}
          className={`p-3 border-2 text-left transition-all ${
            selectedRole === "teacher" ? "bg-[#002060] text-white border-[#002060]" : "bg-white border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span className={`text-[10px] font-mono uppercase block ${selectedRole === "teacher" ? "text-blue-200" : "text-slate-500"}`}>
            Faculty (Teachers)
          </span>
          <div className="text-lg font-black mt-0.5">{counts.teacher}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("admin")}
          className={`p-3 border-2 text-left transition-all ${
            selectedRole === "admin" ? "bg-[#002060] text-white border-[#002060]" : "bg-white border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span className={`text-[10px] font-mono uppercase block ${selectedRole === "admin" ? "text-blue-200" : "text-slate-500"}`}>
            Administrators
          </span>
          <div className="text-lg font-black mt-0.5">{counts.admin}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("it_support")}
          className={`p-3 border-2 text-left transition-all ${
            selectedRole === "it_support" ? "bg-[#002060] text-white border-[#002060]" : "bg-white border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span className={`text-[10px] font-mono uppercase block ${selectedRole === "it_support" ? "text-blue-200" : "text-slate-500"}`}>
            IT Support
          </span>
          <div className="text-lg font-black mt-0.5">{counts.it_support}</div>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by Full Name, User ID (e.g. DNHS-...), or Email Address..."
          className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
        />
      </div>

      <div className="bg-white border-2 border-slate-300">
        <div className="px-5 py-3 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Registered Users Directory &bull; Dumalneg National High School
          </h3>
          <span className="text-[11px] font-mono font-bold text-slate-600">
            DISPLAYING: {filteredUsers.length} OF {users.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500 uppercase">
            [ Loading User Directory from PostgreSQL Database... ]
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600">
            No matching user records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-mono text-[11px] uppercase text-slate-700">
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
                        <div className="font-bold text-slate-900 uppercase">
                          {user.fullName || "DNHS USER"}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">{user.email}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 border font-mono font-bold text-[10px] uppercase ${badgeClass}`}>
                          {user.userRole}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 uppercase">
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
                          onClick={() => setViewingUser(user)}
                          className="px-3 py-1 text-[10px] font-mono font-bold uppercase border-2 border-[#002060] bg-blue-50 text-[#002060] hover:bg-[#002060] hover:text-white transition-colors cursor-pointer"
                        >
                          [ View ]
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
          <div className="bg-white border-4 border-[#002060] max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            {/* Header */}
            <div className="border-b-2 border-slate-200 pb-3 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#002060] uppercase tracking-widest block">
                  [ DNHS Credential &amp; Profile Dossier ]
                </span>
                <h3 className="text-lg font-black text-slate-900 uppercase mt-0.5">
                  {viewingUser.fullName || viewingUser.userId}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-slate-600 font-bold">{viewingUser.userId}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-xs text-slate-600">{viewingUser.email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-xs font-mono font-bold text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
              >
                [ CLOSE X ]
              </button>
            </div>

            {/* Primary System Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 border border-slate-200">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Assigned Role</span>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 border font-mono font-bold text-[11px] uppercase ${
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
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Registration Timestamp</span>
                <span className="font-mono text-slate-800 font-bold mt-1 block">
                  {new Date(viewingUser.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Official Login Email</span>
                <span className="font-mono text-slate-900 font-bold mt-1 block">
                  {viewingUser.email}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">System Access Level</span>
                <span className="font-mono text-slate-800 font-bold mt-1 block">
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
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#002060] border-b pb-1">
                  Learner Academic &amp; Enrollment Dossier
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Learner Reference Number (LRN)</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.lrn || "Not Assigned"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Grade Level</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.gradeLevel || "Unassigned"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Curriculum Track / Strand</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.strand || "Core Curriculum"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Assigned Section</span>
                    <span className="font-bold text-[#002060] mt-1 block">
                      {viewingUser.details?.sectionName || "Unassigned"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Barangay Residence</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.barangay || "N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Contact Number</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.contactNumber || "None Provided"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {viewingUser.userRole === "teacher" && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#002060] border-b pb-1">
                  Faculty Credentials &amp; Department Dossier
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Faculty Identifier</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.teacherId || viewingUser.userId}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Assigned Department</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.department === "JHS" && "Junior High School Faculty"}
                      {viewingUser.details?.department === "SHS" && "Senior High School Faculty"}
                      {viewingUser.details?.department === "CROSS_LEVEL" && "Cross-Level (JHS & SHS)"}
                      {!["JHS", "SHS", "CROSS_LEVEL"].includes(viewingUser.details?.department || "") && (viewingUser.details?.department || "General Faculty")}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Official Faculty Email</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.facultyEmail || viewingUser.email}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {viewingUser.userRole === "admin" && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#002060] border-b pb-1">
                  Administrative Officer Dossier
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Administrator ID</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.adminId || viewingUser.userId}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Department / Office</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.department || "Academic Affairs & Registrar"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {viewingUser.userRole === "it_support" && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#002060] border-b pb-1">
                  IT Systems Desk Dossier
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">IT Personnel Identifier</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.itsupportId || viewingUser.userId}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Designated Role</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {viewingUser.details?.systemRole || "System Administrator"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer with Delete Button (sa baba nito) */}
            <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                {viewingUser.email.toLowerCase() === "dumalnext@gmail.com" ? (
                  <span className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 font-mono text-[10px] font-bold uppercase">
                    [ MASTER IT ACCOUNT - PROTECTED AGAINST DELETION ]
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUserToDelete(viewingUser)}
                    className="px-4 py-2 border-2 border-red-600 bg-red-50 hover:bg-red-700 text-red-700 hover:text-white font-mono font-bold text-xs uppercase transition-colors cursor-pointer"
                  >
                    [ Delete Account ]
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-5 py-2 border-2 border-slate-300 text-xs font-bold uppercase hover:bg-slate-100 transition-colors w-full sm:w-auto text-center cursor-pointer"
              >
                [ Close ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-red-600 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="border-b-2 border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-red-700 uppercase tracking-widest block">
                  SECURITY CONFIRMATION &bull; SUPABASE SYNC
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Confirm Account Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="text-xs font-mono font-bold text-slate-500 hover:text-slate-800"
              >
                [ CLOSE X ]
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
              <p>
                Are you sure you want to permanently delete the following account from Supabase?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 space-y-1">
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
                className="px-4 py-2 border border-slate-300 text-xs font-bold uppercase hover:bg-slate-100 transition-colors"
              >
                [ Cancel ]
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                {isDeleting ? "[ Deleting... ]" : "[ Yes, Delete Account ]"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision New User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-[#002060] max-w-md w-full p-6 space-y-4">
            <div className="border-b-2 border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#002060] uppercase tracking-widest block">
                  IT SUPPORT SECURITY PROVISIONING
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Provision New Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-mono font-bold text-slate-500 hover:text-slate-800"
              >
                [ CLOSE X ]
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  User Role Classification <span className="text-red-700">*</span>
                </label>
                <select
                  value={formData.userRole}
                  onChange={(e) => {
                    const role = e.target.value;
                    let prefix = "DNHS-TCH";
                    if (role === "admin") prefix = "DNHS-ADM";
                    if (role === "student") prefix = "DNHS-STU";
                    if (role === "it_support") prefix = "DNHS-IT";
                    setFormData({
                      ...formData,
                      userRole: role,
                      userId: `${prefix}-${Math.floor(100 + Math.random() * 900)}`,
                    });
                  }}
                  className="w-full p-2.5 bg-white border-2 border-slate-300 font-bold focus:border-[#002060] outline-none"
                >
                  <option value="teacher">Teacher (Faculty Member)</option>
                  <option value="admin">School Administrator (Registrar)</option>
                  <option value="it_support">IT Support Staff</option>
                  <option value="student">Student (Learner)</option>
                </select>
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
                  className="w-full p-2.5 bg-white border-2 border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
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
                  className="w-full p-2.5 bg-white border-2 border-slate-300 font-bold focus:border-[#002060] outline-none"
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
                  className="w-full p-2.5 bg-white border-2 border-slate-300 font-bold focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Initial Password <span className="text-red-700">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 bg-white border-2 border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
                />
              </div>

              {formData.userRole === "teacher" && (
                <div>
                  <label className="block font-bold uppercase text-slate-800 mb-1">
                    Faculty Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2.5 bg-white border-2 border-slate-300 font-bold focus:border-[#002060] outline-none"
                  >
                    <option value="CROSS_LEVEL">CROSS_LEVEL (JHS &amp; SHS)</option>
                    <option value="JHS">Junior High School</option>
                    <option value="SHS">Senior High School</option>
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-bold uppercase hover:bg-slate-100 transition-colors"
                >
                  [ Cancel ]
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#002060] hover:bg-[#001845] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                >
                  {isSubmitting ? "[ Provisioning... ]" : "[ Save Account ]"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
