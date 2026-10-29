"use client";

// Version 1.2.0 - Real-time Traffic Capacity Gatekeeper for Dumalneg NHS (Admin Portal)
import React, { useState, useEffect } from "react";

export default function TrafficCapacityManager() {
  const [activeCount, setActiveCount] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number>(100);
  const [tempCapacity, setTempCapacity] = useState<number>(100);
  const [queueEnabled, setQueueEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Fetch status from API
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/it-support/traffic-control", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setActiveCount(data.activeCount || 0);
        setMaxCapacity(data.maxActiveStudents || 100);
        setQueueEnabled(data.queueEnabled !== false);
        if (isLoading) {
          setTempCapacity(data.maxActiveStudents || 100);
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch traffic status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll live count every 4 seconds
    const timer = setInterval(fetchStatus, 4000);
    return () => clearInterval(timer);
  }, []);

  // Save updated capacity & queue mode
  const handleSaveSettings = async (overrideCapacity?: number, overrideQueue?: boolean) => {
    setIsSaving(true);
    setStatusNotice("");
    setErrorMessage("");

    const targetCapacity = overrideCapacity !== undefined ? overrideCapacity : tempCapacity;
    const targetQueue = overrideQueue !== undefined ? overrideQueue : queueEnabled;

    try {
      const res = await fetch("/api/it-support/traffic-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxActiveStudents: targetCapacity,
          queueEnabled: targetQueue,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setMaxCapacity(data.maxActiveStudents);
        setTempCapacity(data.maxActiveStudents);
        setQueueEnabled(data.queueEnabled);
        setStatusNotice(
          `Capacity limit updated to ${data.maxActiveStudents} active student slots (Virtual Queue: ${
            data.queueEnabled ? "ENABLED" : "DISABLED"
          }).`
        );
        setTimeout(() => setStatusNotice(""), 5000);
      } else {
        setErrorMessage(data?.error || "Failed to save capacity settings.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "A network connection error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Emergency Flush of Active Sessions
  const handleResetSessions = async () => {
    if (!window.confirm("Confirm: Flush all current active student sessions?")) {
      return;
    }

    setIsSaving(true);
    setStatusNotice("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/it-support/traffic-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxActiveStudents: maxCapacity,
          queueEnabled,
          resetSessions: true,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setActiveCount(0);
        setStatusNotice("All active student sessions have been successfully flushed.");
        setTimeout(() => setStatusNotice(""), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to flush active sessions.");
    } finally {
      setIsSaving(false);
    }
  };

  const utilizationPercent = Math.min(100, Math.round((activeCount / Math.max(1, maxCapacity)) * 100));

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden font-sans">
      {/* Header Strip */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-4 border-amber-400">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
              Live Concurrency &amp; Traffic Gatekeeper
            </span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight mt-0.5">
            Student Portal User Capacity Controller
          </h3>
          <p className="text-xs text-blue-100 mt-0.5">
            Protects database stability by regulating concurrent active student sessions and requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              queueEnabled
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                : "bg-slate-700 text-slate-300 border border-slate-600"
            }`}
          >
            {queueEnabled ? "Virtual Queue: ON" : "Queue: DISABLED"}
          </span>
        </div>
      </div>

      {/* Main Controls Section */}
      <div className="p-6 space-y-6">
        {/* Real-time Meter Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Current Active Students (Live Active Users)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[#002060] font-mono">
                  {activeCount}
                </span>
                <span className="text-slate-400 font-bold text-lg font-mono">
                  / {maxCapacity} slots
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase ml-2 ${
                    utilizationPercent >= 100
                      ? "bg-red-100 text-red-800 border border-red-300"
                      : utilizationPercent >= 75
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {utilizationPercent >= 100
                    ? "AT CAPACITY / QUEUED"
                    : utilizationPercent >= 75
                    ? "HEAVY LOAD"
                    : "OPTIMAL"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Server Capacity Load
              </span>
              <span className="text-xl font-black text-slate-900 font-mono">
                {utilizationPercent}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                utilizationPercent >= 100
                  ? "bg-red-500"
                  : utilizationPercent >= 75
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>0 Users</span>
            <span>50 Users</span>
            <span>{maxCapacity} Users (Capacity Threshold)</span>
          </div>
        </div>

        {/* Capacity Limit Adjuster */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Stepper Control */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Adjust Maximum Active Capacity (Slots):
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTempCapacity((c) => Math.max(50, c - 10))}
                className="w-12 h-11 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg font-black text-lg transition-colors cursor-pointer"
                title="Decrease by 10 slots"
              >
                -10
              </button>
              <input
                type="number"
                min={50}
                max={500}
                value={tempCapacity}
                onChange={(e) => setTempCapacity(Math.max(50, Number(e.target.value) || 50))}
                className="flex-1 h-11 px-4 border-2 border-slate-300 focus:border-[#002060] rounded-lg text-center font-mono font-black text-xl text-[#002060] outline-none"
              />
              <button
                type="button"
                onClick={() => setTempCapacity((c) => Math.min(500, c + 10))}
                className="w-12 h-11 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg font-black text-lg transition-colors cursor-pointer"
                title="Increase by 10 slots"
              >
                +10
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Minimum capacity is 50 slots. When active sessions reach this threshold, additional students are automatically routed to the Virtual Waiting Room.
            </p>
          </div>

          {/* Quick Presets for Defense & Operation */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Quick Presets (Operational Deployment):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTempCapacity(50);
                  handleSaveSettings(50);
                }}
                className={`p-2.5 border rounded-lg text-left transition-all cursor-pointer ${
                  maxCapacity === 50
                    ? "bg-amber-50 border-amber-400 text-amber-900 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span className="text-[11px] font-black uppercase block text-[#002060]">
                  Conservative (50 Slots)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Minimum capacity baseline
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempCapacity(100);
                  handleSaveSettings(100);
                }}
                className={`p-2.5 border rounded-lg text-left transition-all cursor-pointer ${
                  maxCapacity === 100
                    ? "bg-amber-50 border-amber-400 text-amber-900 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span className="text-[11px] font-black uppercase block text-[#002060]">
                  Standard (100 Slots)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Recommended for Dumalneg NHS
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempCapacity(150);
                  handleSaveSettings(150);
                }}
                className={`p-2.5 border rounded-lg text-left transition-all cursor-pointer ${
                  maxCapacity === 150
                    ? "bg-amber-50 border-amber-400 text-amber-900 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span className="text-[11px] font-black uppercase block text-[#002060]">
                  Expanded (150 Slots)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  For regular enrollment periods
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempCapacity(200);
                  handleSaveSettings(200);
                }}
                className={`p-2.5 border rounded-lg text-left transition-all cursor-pointer ${
                  maxCapacity === 200
                    ? "bg-amber-50 border-amber-400 text-amber-900 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <span className="text-[11px] font-black uppercase block text-[#002060]">
                  Peak Surge (200 Slots)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  High-volume enrollment day surge
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Toggle & Action Bar */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={queueEnabled}
              onChange={(e) => setQueueEnabled(e.target.checked)}
              className="w-5 h-5 accent-[#002060] rounded cursor-pointer"
            />
            <div>
              <span className="text-xs font-extrabold uppercase text-slate-900 block">
                Enable Virtual Waiting Room &amp; Queueing
              </span>
              <span className="text-[11px] text-slate-500 block">
                When enabled, excess student traffic is held in an automated queue to maintain database stability.
              </span>
            </div>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetSessions}
              disabled={isSaving}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Reset all active student session counters if stale sessions persist"
            >
              Flush Sessions
            </button>
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#002060] hover:bg-[#002b80] text-amber-300 font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? "Updating..." : "Save Capacity Settings"}
            </button>
          </div>
        </div>

        {/* Status Notices */}
        {statusNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{statusNotice}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs font-semibold text-red-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
