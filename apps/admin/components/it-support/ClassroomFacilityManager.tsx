"use client";

import React, { useState, useEffect } from "react";

export interface Classroom {
  id: string;
  classroomId: string;
  roomName: string;
  building: string;
  capacity: number;
}

export default function ClassroomFacilityManager() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    classroomId: "",
    roomName: "",
    building: "Main Academic Building",
    capacity: 40,
  });

  const fetchClassrooms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/it-support/classrooms");
      const json = await res.json();
      if (json.success) {
        setClassrooms(json.classrooms || []);
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to load classrooms." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Network error loading classrooms." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/it-support/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: "success", text: `Classroom ${formData.classroomId} registered successfully.` });
        setIsModalOpen(false);
        setFormData({ classroomId: "", roomName: "", building: "Main Academic Building", capacity: 40 });
        fetchClassrooms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to save classroom." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Error saving classroom facility." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete classroom ${code}? This will remove it from the scheduling directory.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/it-support/classrooms?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: "success", text: `Classroom ${code} removed.` });
        fetchClassrooms();
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to delete classroom." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Error deleting classroom." });
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Information Banner */}
      <div className="p-4 bg-blue-50 border-2 border-[#002060]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
              [ School Facility &amp; Physical Classroom Registry ]
            </span>
            <p className="text-xs text-slate-700 mt-1">
              Registered classrooms feed directly into the Schedule Deconfliction Engine. Room capacities are validated against section quotas to prevent physical overcrowding.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#002060] hover:bg-[#001845] text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
          >
            [ + Add New Classroom ]
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

      {/* Classrooms Grid / Table */}
      <div className="bg-white border-2 border-slate-300">
        <div className="px-5 py-3 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Dumalneg National High School &bull; Instructional Spaces
          </h3>
          <span className="text-[11px] font-mono font-bold text-slate-600">
            TOTAL INSTRUCTIONAL ROOMS: {classrooms.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500 uppercase">
            [ Loading Facilities Directory from PostgreSQL... ]
          </div>
        ) : classrooms.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600">
            No classrooms registered. Click &quot;Add New Classroom&quot; to initialize physical school rooms.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-mono text-[11px] uppercase text-slate-700">
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
                      <span className="px-2 py-0.5 bg-blue-100 border border-blue-300 text-[#002060] font-mono font-bold text-[10px] uppercase">
                        MONITORED
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(room.id, room.classroomId)}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 text-[11px] font-bold uppercase transition-colors"
                      >
                        [ Delete ]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add New Classroom */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-[#002060] max-w-md w-full p-6 space-y-4">
            <div className="border-b-2 border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#002060] uppercase tracking-widest block">
                  IT SUPPORT FACILITY DESK
                </span>
                <h3 className="text-base font-bold text-slate-900 uppercase">
                  Register Classroom Space
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
                  className="w-full p-2 border-2 border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
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
                  className="w-full p-2 border-2 border-slate-300 font-bold focus:border-[#002060] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-800 mb-1">
                  Building Location <span className="text-red-700">*</span>
                </label>
                <select
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  className="w-full p-2 border-2 border-slate-300 font-bold focus:border-[#002060] outline-none"
                >
                  <option value="Main Academic Building">Main Academic Building</option>
                  <option value="Science Building">Science Building</option>
                  <option value="IT & Computer Building">IT &amp; Computer Building</option>
                  <option value="Vocational & TVL Building">Vocational &amp; TVL Building</option>
                  <option value="Senior High School Complex">Senior High School Complex</option>
                </select>
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
                  className="w-full p-2 border-2 border-slate-300 font-mono font-bold focus:border-[#002060] outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Standard DepEd classroom capacity is 40-45 students.
                </p>
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
                  {isSubmitting ? "[ Saving... ]" : "[ Register Classroom ]"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
