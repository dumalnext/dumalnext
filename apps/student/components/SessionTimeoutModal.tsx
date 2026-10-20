"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth/authContext";

const WARNING_MS = 15 * 60 * 1000; // 15 minutes of inactivity to show warning
const LOGOUT_MS = 30 * 60 * 1000;  // 30 minutes total inactivity to auto logout
const STORAGE_KEY = "dumalnext_last_active_student";
const TIMEOUT_MSG_KEY = "dumalnext_session_timeout_msg";

export default function SessionTimeoutModal() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15 * 60);
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(null);

  const lastActiveRef = useRef<number>(Date.now());
  const originalTitleRef = useRef<string>("");

  // Check for session timeout notice upon landing (when logged out)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const msg = sessionStorage.getItem(TIMEOUT_MSG_KEY);
      if (msg && !user) {
        setTimeoutNotice(msg);
        sessionStorage.removeItem(TIMEOUT_MSG_KEY);
      }
    }
  }, [user]);

  // Keep track of user activity
  const recordActivity = useCallback(() => {
    // Only record background activity if warning modal is NOT open
    // If warning modal is open, user must explicitly click "Yes, Keep Me Signed In"
    if (!showWarning) {
      const now = Date.now();
      if (now - lastActiveRef.current > 1500) {
        lastActiveRef.current = now;
        try {
          localStorage.setItem(STORAGE_KEY, String(now));
        } catch {}
      }
    }
  }, [showWarning]);

  // Setup Activity Listeners & Heartbeat Interval
  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    // Initialize last active time
    const now = Date.now();
    lastActiveRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {}

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    const handleEvent = () => recordActivity();

    events.forEach((evt) => {
      window.addEventListener(evt, handleEvent, { passive: true });
    });

    // Listen to storage events for multi-tab synchronization
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const remoteTime = Number(e.newValue);
        if (remoteTime > lastActiveRef.current) {
          lastActiveRef.current = remoteTime;
          setShowWarning(false);
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // Heartbeat Interval checking idle status every second
    const interval = setInterval(() => {
      let storedTime = lastActiveRef.current;
      try {
        const val = localStorage.getItem(STORAGE_KEY);
        if (val) storedTime = Math.max(storedTime, Number(val));
      } catch {}

      const idleMs = Date.now() - storedTime;

      if (idleMs >= LOGOUT_MS) {
        // Automatic Logout reached at 30 minutes of inactivity
        setShowWarning(false);
        try {
          sessionStorage.setItem(
            TIMEOUT_MSG_KEY,
            "You were automatically signed out after 30 minutes of inactivity for security."
          );
        } catch {}
        logout();
      } else if (idleMs >= WARNING_MS) {
        // Warning threshold reached at 15 minutes of inactivity
        setShowWarning(true);
        const msLeft = Math.max(0, LOGOUT_MS - idleMs);
        setRemainingSeconds(Math.ceil(msLeft / 1000));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleEvent);
      });
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [user, recordActivity, logout]);

  // Document Title Warning Flasher
  useEffect(() => {
    if (showWarning) {
      if (!originalTitleRef.current && typeof document !== "undefined") {
        originalTitleRef.current = document.title;
      }
      const titleInterval = setInterval(() => {
        if (typeof document !== "undefined") {
          document.title = document.title.startsWith("⚠️")
            ? originalTitleRef.current || "Dumalneg NHS Student Portal"
            : "⚠️ Inactivity Warning: Are you still there?";
        }
      }, 1200);

      return () => {
        clearInterval(titleInterval);
        if (originalTitleRef.current && typeof document !== "undefined") {
          document.title = originalTitleRef.current;
        }
      };
    } else if (originalTitleRef.current && typeof document !== "undefined") {
      document.title = originalTitleRef.current;
      originalTitleRef.current = "";
    }
  }, [showWarning]);

  // Action: Stay Signed In (User confirms "Yes")
  const handleStaySignedIn = () => {
    const now = Date.now();
    lastActiveRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {}
    setShowWarning(false);
  };

  // Action: Sign Out Now
  const handleSignOutNow = () => {
    setShowWarning(false);
    logout();
  };

  // Format MM:SS
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedCountdown = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const totalWarningSeconds = 15 * 60;
  const progressPercent = Math.min(100, Math.max(0, (remainingSeconds / totalWarningSeconds) * 100));

  return (
    <>
      {/* Expired Session Notice Banner (rendered when logged out after 30m) */}
      {timeoutNotice && !user && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] max-w-lg w-[92%] bg-amber-50 border-2 border-amber-500 text-amber-950 p-4 rounded-[4px] shadow-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-start gap-2.5">
            <svg
              className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block mb-0.5">
                Session Expired Due to Inactivity
              </span>
              <p className="text-xs text-amber-950 leading-relaxed">
                {timeoutNotice}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTimeoutNotice(null)}
            className="text-amber-800 hover:text-amber-950 font-bold text-base cursor-pointer px-1 leading-none"
            aria-label="Dismiss notice"
          >
            &times;
          </button>
        </div>
      )}

      {/* 15-Minute Inactivity Warning Modal */}
      {showWarning && user && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="inactivity-title"
            className="bg-white rounded-[4px] border-2 border-[#002060] border-t-4 border-t-amber-400 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="bg-[#002060] text-white px-6 py-4 flex items-center justify-between border-b border-blue-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-amber-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                    Security Inactivity Notice
                  </span>
                  <h3 id="inactivity-title" className="text-base font-bold text-white leading-tight">
                    Are you still there?
                  </h3>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 text-slate-800">
              <p className="text-xs leading-relaxed text-slate-700">
                You have been inactive for <strong>15 minutes</strong>. For learner privacy and DepEd workstation security, your active session will automatically log out in:
              </p>

              {/* Countdown Display Card */}
              <div className="bg-amber-50/80 border-2 border-amber-300 rounded-[4px] p-4 text-center space-y-2">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                  Time Remaining Before Auto Logout
                </span>
                <div className="text-3xl font-extrabold font-mono text-[#002060] tracking-wider">
                  {formattedCountdown}
                </div>
                <div className="w-full bg-amber-200/80 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed text-center">
                Would you like to remain signed in to the Student Portal?
              </p>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleStaySignedIn}
                  className="w-full py-3 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold transition-colors cursor-pointer rounded-[4px] shadow-xs flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Yes, Keep Me Signed In</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOutNow}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer rounded-[4px]"
                >
                  Sign Out Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
