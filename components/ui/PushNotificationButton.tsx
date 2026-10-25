"use client";

import React, { useState } from "react";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";

/**
 * Push Notification Status & Settings Modal
 * Works across both Desktop (PC) and Mobile Phones (CP)
 */
export function PushNotificationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isMobile,
    deviceType,
    requestPermission,
    sendTestNotification,
  } = usePushNotifications();

  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await sendTestNotification(
        "Dumalneg NHS Portal Alert",
        `Test push notification successfully delivered to your ${deviceType}. System alerts and academic updates are active.`,
        "/"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleEnable = async () => {
    await requestPermission();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border-2 border-[#002060] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-5 border-b-4 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-amber-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">
                Progressive Web App Push
              </span>
              <h3 className="text-base font-extrabold text-white tracking-tight leading-snug">
                Device Push Notifications
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Device & Status Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-[4px] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Detected Device:</span>
              <span className="font-bold text-[#002060] px-2 py-0.5 bg-blue-100 rounded-[3px]">
                {deviceType}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Notification Status:</span>
              {permission === "granted" ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-950 font-bold rounded-[3px] text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active on this Device
                </span>
              ) : permission === "denied" ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-950 font-bold rounded-[3px] text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Blocked in Browser
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-950 font-bold rounded-[3px] text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Permission Required
                </span>
              )}
            </div>
          </div>

          {/* Explanation */}
          <p className="text-xs text-slate-700 leading-relaxed">
            Enable instant DepEd system push notifications to stay informed on your{" "}
            <strong>{isMobile ? "cellphone (CP)" : "PC / Laptop"}</strong> even when the browser tab is closed or in the background.
          </p>

          {/* Notification Perks */}
          <div className="space-y-1.5 p-3 bg-blue-50/60 border border-blue-200 rounded-[4px] text-xs text-slate-700">
            <div className="font-bold text-[#002060] mb-1">Alerts Included:</div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold shrink-0">•</span>
              <span>Enrollment application approval and registrar review updates</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold shrink-0">•</span>
              <span>Official section placement &amp; weekly timetable synchronization</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold shrink-0">•</span>
              <span>DepEd weather advisories &amp; emergency heat index suspensions</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {permission !== "granted" ? (
              <button
                type="button"
                onClick={handleEnable}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#002060] hover:bg-blue-900 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-[4px] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isLoading ? "Requesting Permission..." : "Enable Push Notifications"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-[0.99] text-xs font-bold uppercase tracking-wider rounded-[4px] transition-all cursor-pointer shadow-xs border border-amber-500 disabled:opacity-50"
              >
                {isTesting ? "Sending Test Push..." : `Send Test Alert to this ${isMobile ? "CP" : "PC"}`}
              </button>
            )}

            {permission === "denied" && (
              <div className="p-3 bg-red-50 border border-red-300 text-xs text-red-900 rounded-[4px]">
                <strong>How to unblock:</strong> Click the lock icon beside the URL in your browser&apos;s address bar, find <em>Notifications</em>, change it to <em>Allow</em>, and refresh the page.
              </div>
            )}
          </div>

          {/* Device Specific Tip */}
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">
            {isMobile ? (
              <p>
                <strong>Cellphone (CP) Tip:</strong> On Android Chrome, alerts arrive directly in your phone&apos;s notification shade. On iPhone (iOS), install the app to your Home Screen to activate Web Push.
              </p>
            ) : (
              <p>
                <strong>PC / Desktop Tip:</strong> Notifications arrive as native Windows/macOS notification banners with school seal and 1-click action buttons.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#002060] hover:bg-blue-900 text-white rounded-[4px] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Top Header Navigation Notification Button
 * Adapts seamlessly for Desktop (PC) and Mobile Phone (CP) viewports
 */
export function PushNotificationHeaderButton() {
  const { permission, isMobile } = usePushNotifications();
  const [showModal, setShowModal] = useState(false);

  const isGranted = permission === "granted";

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-[4px] transition-all cursor-pointer shadow-xs ${
          isGranted
            ? "bg-blue-950/80 hover:bg-blue-900 text-blue-100 border border-blue-400/30"
            : "bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-300/40 animate-pulse"
        }`}
        title={isGranted ? "Push notifications active on this device" : "Enable push notifications on this device"}
      >
        {/* Bell Icon */}
        <svg
          className={`w-4 h-4 shrink-0 ${isGranted ? "text-emerald-400" : "text-amber-300"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Text for Desktop / Tablets */}
        <span className="hidden sm:inline">
          {isGranted ? "Alerts Active" : "Enable Alerts"}
        </span>

        {/* Indicator dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isGranted ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
      </button>

      <PushNotificationModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

/**
 * Mobile Navigation Drawer Push Notification Card
 * Specifically styled for Cellphones (CP)
 */
export function PushNotificationDrawerCard() {
  const { permission, isMobile, requestPermission, sendTestNotification } = usePushNotifications();
  const [showModal, setShowModal] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const isGranted = permission === "granted";

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await sendTestNotification(
        "Dumalneg NHS Portal Alert",
        "Test notification received successfully on this mobile phone (CP).",
        "/"
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-[#002060]/30 rounded-[4px] shadow-xs space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[9px] font-black text-[#002060] uppercase tracking-widest block">
              DEVICE PUSH ALERTS
            </span>
            <h4 className="text-xs font-extrabold text-slate-950 leading-tight mt-0.5">
              Cellphone Notifications
            </h4>
          </div>
          <span
            className={`px-1.5 py-0.5 text-[9px] font-bold rounded-[3px] uppercase ${
              isGranted
                ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                : "bg-amber-100 text-amber-950 border border-amber-300"
            }`}
          >
            {isGranted ? "ACTIVE" : "OFF"}
          </span>
        </div>
        <p className="text-[11px] text-slate-700 leading-snug">
          Receive real-time alerts for enrollment status, section assignments, and DepEd advisories directly on this phone.
        </p>
        <div className="flex items-center gap-2 pt-1">
          {!isGranted ? (
            <button
              type="button"
              onClick={requestPermission}
              className="flex-1 py-2 bg-[#002060] hover:bg-blue-900 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-[4px] transition-colors cursor-pointer text-center shadow-xs"
            >
              Turn On Alerts
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="flex-1 py-2 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 text-xs font-bold uppercase tracking-wider rounded-[4px] transition-colors cursor-pointer text-center shadow-xs border border-amber-500 disabled:opacity-50"
            >
              {isTesting ? "Sending..." : "Test CP Alert"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-2.5 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-[4px] hover:bg-slate-50 transition-colors"
            title="Notification Options & Help"
          >
            Info
          </button>
        </div>
      </div>

      <PushNotificationModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
