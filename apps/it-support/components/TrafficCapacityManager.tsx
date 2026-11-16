"use client";

// Version 1.2.0 - Real-time Traffic Capacity Gatekeeper for Dumalneg NHS
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
    if (!window.confirm("Reset active visitor count back to 0?")) {
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
        setStatusNotice("Active visitor count has been reset.");
        setTimeout(() => setStatusNotice(""), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not reset active visitor count.");
    } finally {
      setIsSaving(false);
    }
  };

  const utilizationPercent = Math.min(100, Math.round((activeCount / Math.max(1, maxCapacity)) * 100));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      {/* Header Strip */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-4 border-amber-400">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
              Student Portal Visitor Limit
            </span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight mt-0.5">
            Waiting Room &amp; Visitor Limit
          </h3>
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
                Students Online Now
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[#002060] font-medium">
                  {isLoading ? <span className="inline-block w-12 h-7 bg-slate-200 animate-pulse rounded" /> : activeCount}
                </span>
                <span className="text-slate-400 font-bold text-lg font-medium">
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
                    ? "FULL (WAITING ROOM ACTIVE)"
                    : utilizationPercent >= 75
                    ? "HEAVY LOAD"
                    : "OPTIMAL"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Visitor Load
              </span>
              <span className="text-xl font-black text-slate-900 font-medium">
                {isLoading ? <span className="inline-block w-12 h-5 bg-slate-200 animate-pulse rounded" /> : `${utilizationPercent}%`}
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
            <span>{maxCapacity} Users (Visitor Limit)</span>
          </div>
        </div>

        {/* Capacity Limit Adjuster */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Stepper Control */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Max Students Allowed at Once:
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
                className="flex-1 h-11 px-4 border border-slate-200 rounded-xl focus:border-[#002060] rounded-lg text-center font-medium font-black text-xl text-[#002060] outline-none"
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
            <p className="text-[11px] text-slate-500 font-medium">
              Extra visitors wait in line automatically when the limit above is reached.
            </p>
          </div>

          {/* Quick Presets for Defense & Operation */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Quick Limit Presets:
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
                  Baseline minimum
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
                  Recommended configuration
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
                  Regular enrollment
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
                  High-volume surge
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
                Turn On Waiting Room
              </span>
              <span className="text-[11px] text-slate-500 block">
                Places extra students in a short waiting line if too many sign in at once.
              </span>
            </div>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetSessions}
              disabled={isSaving}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              title="Reset all active student session counters if stale sessions persist"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset Visitor Count</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#002060] hover:bg-[#002b80] text-amber-300 font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{isSaving ? "Updating..." : "Save Capacity Settings"}</span>
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
