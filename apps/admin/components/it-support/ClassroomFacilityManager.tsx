"use client";

import React, { useState, useEffect } from "react";
import CustomSelect from "@/components/CustomSelect";

export interface Classroom {
  id: string;
  classroomId: string;
  roomName: string;
  building: string;
  capacity: number;
}

const PRESET_BUILDINGS = [
  "Main Academic Building",
  "Science Building",
  "IT Building",
  "IT & Computer Building",
  "Vocational Building",
  "Vocational & TVL Building",
  "Senior High School Complex",
];

export default function ClassroomFacilityManager() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Classroom | null>(null);

  // Modern Confirmation Modal state for deletion
  const [deletingRoom, setDeletingRoom] = useState<Classroom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination State (10 data per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [formData, setFormData] = useState({
    classroomId: "",
    roomName: "",
    building: "Main Academic Building",
    capacity: 40,
  });

  const fetchClassrooms = async () => {
    setIsLoading(true);
    try {
      let res = await fetch(`/api/classrooms?_t=${Date.now()}`, { cache: "no-store" });
      if (res.status === 404) {
        res = await fetch(`/api/it-support/classrooms?_t=${Date.now()}`, { cache: "no-store" });
      }
      const rawText = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(rawText ? rawText.slice(0, 150) : "Invalid server response");
      }
      if (res.ok && json.success) {
        setClassrooms(json.classrooms || []);
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to load classrooms." });
      }
    } catch (err: any) {
      console.error("fetchClassrooms error:", err);
      setStatusMessage({ type: "error", text: err.message || "Network error loading classrooms." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const openAddModal = () => {
    setEditingRoom(null);
    setFormData({
      classroomId: "",
      roomName: "",
      building: "Main Academic Building",
      capacity: 40,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (room: Classroom) => {
    setEditingRoom(room);
    setFormData({
      classroomId: room.classroomId,
      roomName: room.roomName,
      building: room.building || "Main Academic Building",
      capacity: room.capacity || 40,
    });
    setIsModalOpen(true);
  };

  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        id: editingRoom ? editingRoom.id : undefined,
      };
      let res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 404) {
        res = await fetch("/api/it-support/classrooms", {
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
        setStatusMessage({
          type: "success",
          text: editingRoom
            ? `Classroom ${formData.classroomId} updated successfully.`
            : `Classroom ${formData.classroomId} registered successfully.`,
        });
        setIsModalOpen(false);
        setEditingRoom(null);
        setFormData({ classroomId: "", roomName: "", building: "Main Academic Building", capacity: 40 });
        fetchClassrooms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to save classroom." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error saving classroom facility." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!deletingRoom) return;
    setIsDeleting(true);
    const { id, classroomId: code } = deletingRoom;
    try {
      let res = await fetch(`/api/classrooms?id=${id}`, {
        method: "DELETE",
      });
      if (res.status === 404) {
        res = await fetch(`/api/it-support/classrooms?id=${id}`, {
          method: "DELETE",
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
        setStatusMessage({ type: "success", text: `Classroom ${code} removed.` });
        setDeletingRoom(null);
        fetchClassrooms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to delete classroom." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error deleting classroom." });
    } finally {
      setIsDeleting(false);
    }
  };

  // Pagination Calculations (Limit 10 per page)
  const totalPages = Math.ceil(classrooms.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, classrooms.length);
  const paginatedClassrooms = classrooms.slice(startIndex, endIndex);

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
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
                School Facility &amp; Physical Classroom Registry
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-0.5">
                Instructional Rooms &amp; Seating Capacities
              </h2>
              <p className="text-xs text-blue-100 mt-1 max-w-2xl">
                Registered classrooms feed directly into the Schedule Deconfliction Engine. Room capacities are validated against section quotas to prevent physical overcrowding.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            + Add New Classroom
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Dumalneg National High School &bull; Instructional Spaces
          </h3>
          <span className="text-[11px] font-bold text-[#002060] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
            Total Rooms: {classrooms.length} {classrooms.length > PAGE_SIZE ? `(Showing ${startIndex + 1}–${endIndex})` : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-500">
            Loading facilities directory...
          </div>
        ) : classrooms.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600">
            No classrooms registered. Click &quot;Add New Classroom&quot; to initialize physical school rooms.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-[11px] uppercase text-slate-700">
                  <th className="p-3">Room Code</th>
                  <th className="p-3">Room Name</th>
                  <th className="p-3">Building Location</th>
                  <th className="p-3">Seating Capacity</th>
                  <th className="p-3">Deconfliction Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedClassrooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-[#002060]">{room.classroomId}</td>
                    <td className="p-3 font-bold text-slate-900">{room.roomName}</td>
                    <td className="p-3 text-slate-700">{room.building}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{room.capacity} seats</td>
                    <td className="p-3">
                      <span
                        className="px-2 py-0.5 bg-blue-100 border border-blue-300 text-[#002060] rounded font-bold text-[10px] uppercase"
                        title="Monitored by Automated Deconfliction Engine: Active Double-Booking and Room Overcrowding Guard"
                      >
                        Monitored
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(room)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-[11px] font-bold transition-colors cursor-pointer"
                          title={`Edit ${room.classroomId}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRoom(room)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls (Limit 10 per page) */}
        {!isLoading && classrooms.length > PAGE_SIZE && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
            <div className="text-slate-600">
              Page <strong className="text-[#002060]">{safeCurrentPage}</strong> of{" "}
              <strong className="text-[#002060]">{totalPages}</strong> &bull; Showing{" "}
              <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of{" "}
              <strong>{classrooms.length}</strong> room(s) (10 per page)
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

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
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

      {/* Add / Edit Classroom Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#002060] uppercase tracking-widest block">
                  IT Support Facility Desk
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {editingRoom ? `Edit Classroom Space: ${editingRoom.classroomId}` : "Register Classroom Space"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveClassroom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Classroom Code / ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RM-101, SCI-LAB"
                  value={formData.classroomId}
                  onChange={(e) => setFormData({ ...formData, classroomId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#002060]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Room Name / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 7 Rizal Room, Main Computer Laboratory"
                  value={formData.roomName}
                  onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#002060]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Building Location <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={formData.building}
                  onChange={(val) => setFormData({ ...formData, building: val })}
                  options={PRESET_BUILDINGS.map((b) => ({ value: b, label: b }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seating Capacity (Max Students) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  required
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 40 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#002060]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Capacity is checked by the scheduler when allocating section sizes.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002060] hover:bg-[#002b80] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingRoom ? "Update Classroom" : "Register Classroom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Confirmation Modal for Classroom Deletion */}
      {deletingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-red-600 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest block">
                  Delete Instructional Space Confirmation
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Delete Classroom {deletingRoom.classroomId}?
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete instructional space <strong className="text-slate-900 font-mono">{deletingRoom.classroomId}</strong> {deletingRoom.roomName ? `(${deletingRoom.roomName})` : ""}? This will permanently remove this room from the physical school facility directory and the Automated Schedule Deconfliction Hub.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 flex items-start gap-2">
              <span className="font-bold shrink-0">Notice:</span>
              <span>Any existing class timetables assigned to this room may require manual reassignment.</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingRoom(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Classroom</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
