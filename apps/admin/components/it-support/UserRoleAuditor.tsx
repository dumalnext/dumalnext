"use client";

import React, { useState, useEffect } from "react";

export interface SystemUser {
  id: string;
  userId: string;
  email: string;
  userRole: "student" | "teacher" | "admin" | "it_support";
  createdAt: string;
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

  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    email: "",
    password: "password123",
    userRole: "teacher",
    department: "CROSS_LEVEL",
  });

  const fetchUsers = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
        setStatusMessage({ type: "success", text: `User ${formData.userId} provisioned successfully with role ${formData.userRole}.` });
        setIsModalOpen(false);
        setFormData({
          userId: "",
          fullName: "",
          email: "",
          password: "password123",
          userRole: "teacher",
          department: "CROSS_LEVEL",
        });
        fetchUsers();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to provision user." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Error submitting user provisioning." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRole === "all" || u.userRole === selectedRole;
    const matchesSearch =
      u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Policy Banner */}
      <div className="p-4 bg-blue-50 border-2 border-[#002060]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
              [ Role-Based Access Control (RBAC) &amp; Credential Directory ]
            </span>
            <p className="text-xs text-slate-700 mt-1">
              Manages the four institutional actor types (Student, Teacher, School Administrator, IT Support). Enforces database-level Row-Level Security (RLS).
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

      {/* Role Counts Strip */}
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

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by User ID (e.g. DNHS-...) or Email Address..."
          className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
        />
      </div>

      {/* Users Table */}
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
                  <th className="p-3">Official Email</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Access Level</th>
                  <th className="p-3">Registration Date</th>
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
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#002060]">{user.userId}</td>
                      <td className="p-3 font-medium text-slate-900">{user.email}</td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Provision User Account */}
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
                    let defaultPrefix = "DNHS-TCH-001";
                    if (role === "admin") defaultPrefix = "DNHS-ADM-002";
                    if (role === "it_support") defaultPrefix = "DNHS-IT-002";
                    if (role === "student") defaultPrefix = "2026-0001";
                    setFormData({ ...formData, userRole: role, userId: defaultPrefix });
                  }}
                  className="w-full p-2 border-2 border-slate-300 font-bold focus:border-[#002060] outline-none"
                >
                  <option value="teacher">Faculty Member (Teacher)</option>
                  <option value="admin">School Administrator (Registrar/Principal)</option>
                  <option value="it_support">IT Support / System Administrator</option>
                  <option value="student">Student Learner</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  DNHS Identifier (User ID) <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                  placeholder="e.g. DNHS-TCH-001"
                  className="w-full p-2 border-2 border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Full Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full p-2 border-2 border-slate-300 font-bold focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Official Email Address <span className="text-red-700">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="e.g. juan.delacruz@deped.gov.ph"
                  className="w-full p-2 border-2 border-slate-300 focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2 border border-slate-300 focus:border-[#002060] outline-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border-2 border-slate-300 text-slate-700 font-bold uppercase hover:bg-slate-100"
                >
                  [ Cancel ]
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002060] text-white font-bold uppercase hover:bg-[#001845] disabled:opacity-50"
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
