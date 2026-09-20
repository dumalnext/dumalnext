"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface EnrollmentControlSettings {
  isEnrollmentOpen: boolean;
  schoolYear: string;
  semester: string;
  enrollmentStartDate?: string;
  enrollmentEndDate?: string;
  closedMessage: string;
  updatedAt?: string;
  updatedBy?: string;
}

export default function EnrollmentControlRoom() {
  const [settings, setSettings] = useState<EnrollmentControlSettings>({
    isEnrollmentOpen: true,
    schoolYear: "2026–2027",
    semester: "1st Semester",
    closedMessage:
      "DepEd Official Advisory: Dumalneg National High School Online Enrollment for School Year 2026–2027 is currently closed at this time. Please await further announcements from the Registrar's Office.",
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");

  // Fetch current settings on load
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const [ctrlRes, termsRes] = await Promise.all([
        fetch(`/api/enrollment-control?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Pragma": "no-cache" },
        }),
        fetch(`/api/it-support/terms?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Pragma": "no-cache" },
        }).catch(() => null),
      ]);

      let itActiveYear = "";
      let itActiveTermName = "";

      if (termsRes && termsRes.ok) {
        try {
          const termsData = await termsRes.json();
          const active = termsData.terms?.find((t: any) => t.isActive);
          if (active) {
            itActiveYear = active.schoolYear;
            itActiveTermName = active.termName;
          }
        } catch {}
      }

      if (ctrlRes.ok) {
        const data = await ctrlRes.json();
        setSettings({
          isEnrollmentOpen: typeof data.isEnrollmentOpen === "boolean" ? data.isEnrollmentOpen : true,
          schoolYear: itActiveYear || data.schoolYear || "2026-2027",
          semester: itActiveTermName || data.semester || "Trimester 1",
          enrollmentStartDate: data.enrollmentStartDate || "",
          enrollmentEndDate: data.enrollmentEndDate || "",
          closedMessage:
            data.closedMessage ||
            "DepEd Official Advisory: Dumalneg National High School Online Enrollment for School Year 2026-2027 is currently closed at this time. Please await further announcements from the Registrar's Office.",
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        });
      }
    } catch (err) {
      console.error("Error loading enrollment control settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings and broadcast in real-time across Supabase and BroadcastChannel
  const saveAndBroadcast = async (targetSettings: EnrollmentControlSettings) => {
    setIsSaving(true);
    setSaveSuccess("");
    setSaveError("");

    try {
      const res = await fetch("/api/enrollment-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetSettings),
      });

      if (!res.ok) {
        throw new Error("Server returned error status " + res.status);
      }

      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        const statusText = data.settings.isEnrollmentOpen ? "OPEN (Active)" : "CLOSED (Offline)";
        setSaveSuccess(
          `Real-Time Broadcast: Online Enrollment is now ${statusText} for School Year ${data.settings.schoolYear}. Student portal updated instantly.`
        );

        // 1. Supabase Realtime WebSocket Push (instant sync across any port or device)
        try {
          const supabase = createClient();
          const channel = supabase.channel("enrollment-control-realtime");
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              channel.send({
                type: "broadcast",
                event: "enrollment-settings-updated",
                payload: data.settings,
              });
            }
          });
        } catch (e) {
          console.warn("Supabase realtime broadcast notice:", e);
        }

        // 2. BroadcastChannel for instant local cross-tab / cross-port communication
        try {
          if (typeof BroadcastChannel !== "undefined") {
            const bc = new BroadcastChannel("dumalnext-enrollment-control");
            bc.postMessage(data.settings);
            bc.close();
          }
        } catch (e) {
          console.warn("BroadcastChannel notice:", e);
        }

        // 3. Window events
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
          window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        }
      } else {
        setSaveError(data.error || "Failed to save settings.");
      }
    } catch (err: any) {
      setSaveError(err?.message || "An error occurred while saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Instant toggle switch handler: Saves and broadcasts immediately on click!
  const handleToggleSwitch = async () => {
    const nextState = !settings.isEnrollmentOpen;
    const updated: EnrollmentControlSettings = {
      ...settings,
      isEnrollmentOpen: nextState,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);
    await saveAndBroadcast(updated);
  };

  // Save settings from form submission
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await saveAndBroadcast(settings);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title & Real-Time Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-300 pb-3">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            [ ENROLLMENT CONTROL ROOM &bull; MASTER SYSTEM OPERATIONS ]
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            DepEd Online Enrollment Master Control Room
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Configure the master online enrollment switch, active School Year (S.Y.), and institutional student advisories.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`w-3 h-3 rounded-full ${
              settings.isEnrollmentOpen ? "bg-emerald-500 animate-pulse" : "bg-red-600"
            }`}
          />
          <span className="text-xs font-mono font-bold uppercase text-slate-800">
            {settings.isEnrollmentOpen ? "System Open (Active)" : "System Closed (Offline)"}
          </span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-xs text-emerald-950 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-200 border border-emerald-400 font-mono font-bold uppercase text-[10px] text-emerald-950 shrink-0">
              [ SUCCESS ]
            </span>
            <span className="font-semibold">{saveSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess("")}
            className="text-emerald-800 font-bold hover:underline shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification Alert */}
      {saveError && (
        <div className="p-4 bg-red-50 border-2 border-red-500 text-xs text-red-950 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-200 border border-red-400 font-mono font-bold uppercase text-[10px] text-red-950 shrink-0">
              [ ERROR ]
            </span>
            <span className="font-semibold">{saveError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveError("")}
            className="text-red-800 font-bold hover:underline shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          1. MASTER ENROLLMENT ON/OFF TOGGLE CARD
          ===================================================================== */}
      <div
        className={`p-5 sm:p-6 border-2 transition-all shadow-xs ${
          settings.isEnrollmentOpen
            ? "bg-emerald-50/70 border-emerald-500"
            : "bg-red-50/70 border-red-500"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 text-xs font-mono font-bold uppercase border ${
                  settings.isEnrollmentOpen
                    ? "bg-emerald-200 text-emerald-950 border-emerald-400"
                    : "bg-red-200 text-red-950 border-red-400"
                }`}
              >
                {settings.isEnrollmentOpen
                  ? "[ STATUS: ENROLLMENT IS ACTIVE & OPEN ]"
                  : "[ STATUS: ENROLLMENT IS OFFICIALLY CLOSED ]"}
              </span>
              <span className="text-xs font-mono text-slate-500">
                School Year: <strong>{settings.schoolYear}</strong>
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-950">
              {settings.isEnrollmentOpen
                ? "Dumalneg NHS Online Enrollment System is currently accepting applications"
                : "Dumalneg NHS Online Enrollment System is currently closed to new applicants"}
            </h3>

            <p className="text-xs text-slate-700 leading-relaxed">
              {settings.isEnrollmentOpen ? (
                <>
                  Students can sign in, click <strong>&ldquo;Start 5-Step Online Enrollment Form&rdquo;</strong>, 
                  and submit their learner profiles and documentary credentials for <strong>S.Y. {settings.schoolYear}</strong>.
                </>
              ) : (
                <>
                  Students can still log in and create accounts, but clicking on the enrollment form will display 
                  the official <strong>DepEd Closed Advisory</strong>. No new applications can be filled out or submitted.
                </>
              )}
            </p>
          </div>

          {/* Master Switch Button */}
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleToggleSwitch}
              disabled={isSaving}
              className={`px-6 py-3.5 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-sm border-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                settings.isEnrollmentOpen
                  ? "bg-red-700 hover:bg-red-800 text-white border-red-900"
                  : "bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-900"
              }`}
            >
              {isSaving ? (
                "[ BROADCASTING REALTIME STATUS... ]"
              ) : settings.isEnrollmentOpen ? (
                "[ TURN OFF / CLOSE ENROLLMENT ]"
              ) : (
                "[ TURN ON / OPEN ENROLLMENT ]"
              )}
            </button>
            <span className="text-[10px] font-mono text-slate-500">
              Click to toggle &bull; Broadcasts instantly to student portal in real-time
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. SCHOOL YEAR & ACADEMIC PARAMETERS CONFIGURATION
          ===================================================================== */}
      <div className="bg-white border-2 border-slate-300 p-5 sm:p-6 space-y-6 shadow-xs">
        <div className="border-b border-slate-200 pb-2">
          <span className="font-bold text-[#002060] uppercase tracking-wider text-xs">
            [ DepEd Academic Year (S.Y.) &amp; Term Parameters &bull; Synchronized from IT Support ]
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Active School Year (Synced from IT Support) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase block">
              Official DepEd School Year (S.Y.):
            </label>
            <div className="p-3 bg-slate-100 border-2 border-slate-300 font-mono font-black text-sm text-[#002060] flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <span>{settings.schoolYear}</span>
              <span className="px-2 py-0.5 bg-green-700 text-white font-mono font-bold text-[10px] uppercase tracking-wider">
                [ SYNCED FROM IT SUPPORT ]
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block leading-normal">
              This School Year is automatically dictated by IT Support&apos;s active academic calendar. Administrators cannot manually modify this to prevent institutional desynchronization.
            </span>
          </div>

          {/* Active Academic Term (Synced from IT Support) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase block">
              Active Trimester / Term:
            </label>
            <div className="p-3 bg-slate-100 border-2 border-slate-300 font-mono font-black text-sm text-[#002060] flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <span>{settings.semester}</span>
              <span className="px-2 py-0.5 bg-[#002060] text-white font-mono font-bold text-[10px] uppercase tracking-wider">
                [ ACTIVE TRIMESTER ]
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block leading-normal">
              Official academic term currently active at Dumalneg National High School, established in the IT Support Console.
            </span>
          </div>
        </div>

        {/* Closed Advisory Message for Students */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="text-xs font-bold text-slate-900 uppercase">
              Official DepEd Closed Advisory Message (Visible to Students when System is OFF):
            </label>
            <span className="text-[10px] font-mono text-slate-500">
              [ Markdown &amp; Plain Text Supported ]
            </span>
          </div>

          <textarea
            rows={3}
            value={settings.closedMessage}
            onChange={(e) => setSettings({ ...settings, closedMessage: e.target.value })}
            placeholder="Enter the official advisory message shown to students when online enrollment is turned OFF..."
            className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-sans text-slate-900 focus:border-[#002060] outline-none leading-relaxed"
          />

          {/* Quick Notice Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-mono font-bold text-slate-500 uppercase">Notice Presets:</span>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  closedMessage: `DepEd Official Advisory: Dumalneg National High School Online Enrollment for School Year ${settings.schoolYear} is currently closed at this time. Please await further announcements from the Registrar's Office.`,
                })
              }
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
            >
              [ Standard Closed Advisory ]
            </button>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  closedMessage: `The official DepEd enrollment window for School Year ${settings.schoolYear} has officially concluded. For late enrollment inquiries, please proceed in-person to the Dumalneg NHS Registrar's Office.`,
                })
              }
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
            >
              [ Enrollment Window Concluded ]
            </button>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  closedMessage: `Online enrollment is temporarily paused for section quota rebalancing and class schedule finalization for S.Y. ${settings.schoolYear}. Re-opening will be announced shortly.`,
                })
              }
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
            >
              [ Section Quota Paused ]
            </button>
          </div>
        </div>

        {/* Live Student Portal Preview */}
        <div className="p-4 bg-slate-50 border border-slate-300 space-y-2">
          <span className="text-[10px] font-mono font-bold text-[#002060] uppercase block">
            [ Live Student Portal Preview: What Students Will See at /enroll ]
          </span>
          <div
            className={`p-4 border-2 ${
              settings.isEnrollmentOpen
                ? "bg-emerald-50 border-emerald-400 text-emerald-950"
                : "bg-amber-50 border-amber-400 text-amber-950"
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.isEnrollmentOpen ? "bg-emerald-600" : "bg-amber-600"
                }`}
              />
              <span>
                {settings.isEnrollmentOpen
                  ? `[ 5-Step Online Enrollment Active for S.Y. ${settings.schoolYear} ]`
                  : `[ DEPED OFFICIAL NOTICE: ONLINE ENROLLMENT IS CURRENTLY CLOSED ]`}
              </span>
            </div>
            <p className="text-xs text-slate-800 mt-1.5 leading-relaxed">
              {settings.isEnrollmentOpen
                ? `Students will see the active 5-step stepper form locked to School Year ${settings.schoolYear}.`
                : settings.closedMessage}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-[11px] font-mono text-slate-500">
            {settings.updatedAt && (
              <>Last updated: {new Date(settings.updatedAt).toLocaleString()}</>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSettings}
              disabled={isLoading || isSaving}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase border border-slate-300 transition-colors cursor-pointer"
            >
              [ Discard / Reload ]
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving ? "Saving Settings..." : "[ Save & Broadcast Enrollment Controls ]"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
