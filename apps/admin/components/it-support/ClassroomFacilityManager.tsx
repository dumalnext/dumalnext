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

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete classroom ${code}? This will remove it from the scheduling directory.`)) {
      return;
    }
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
        fetchClassrooms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to delete classroom." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error deleting classroom." });
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white rounded-xl p-5 sm:p-6 shadow-md border border-[#001744] border-t-4 border-t-amber-400">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <img
              src="/dumalneg-logo.png"
              alt="Dumalneg NHS Seal"
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-sm bg-white shrink-0 hidden sm:block mt-0.5"
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
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Dumalneg National High School &bull; Instructional Spaces
          </h3>
          <span className="text-[11px] font-bold text-[#002060] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
            Total Rooms: {classrooms.length}
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
                {classrooms.map((room) => (
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
                          onClick={() => handleDelete(room.id, room.classroomId)}
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
      </div>

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
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRoom(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveClassroom} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Room Code Identifier <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={formData.classroomId}
                  onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                  required
                  placeholder="e.g. RM-103, SCI-LAB-2"
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Official Room Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={formData.roomName}
                  onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                  required
                  placeholder="e.g. Room 103 - Grade 7 Rizal"
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Building Location <span className="text-red-700">*</span>
                </label>
                <CustomSelect
                  fullWidth
                  placeholder="-- Select Building Location --"
                  value={formData.building}
                  onChange={(val) => setFormData({ ...formData, building: val })}
                  options={[
                    ...PRESET_BUILDINGS.map((bldg) => ({
                      value: bldg,
                      label: bldg,
                    })),
                    ...(formData.building && !PRESET_BUILDINGS.includes(formData.building)
                      ? [{ value: formData.building, label: formData.building }]
                      : []),
                  ]}
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Maximum Seating Capacity <span className="text-red-700">*</span>
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  required
                  min={10}
                  max={80}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Standard DepEd classroom capacity is 40-45 students.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRoom(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#002060] text-white font-bold hover:bg-[#001845] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingRoom ? "Update Classroom" : "Register Classroom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
