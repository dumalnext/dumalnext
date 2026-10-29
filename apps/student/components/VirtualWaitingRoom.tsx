"use client";

// Version 1.2.0 - Virtual Waiting Room & Queue System for Dumalneg NHS
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth/authContext";

const HEARTBEAT_INTERVAL_MS = 25 * 1000; // Check every 25 seconds when normal
const QUEUE_POLL_INTERVAL_MS = 5 * 1000;  // Poll every 5 seconds when in waiting room

export default function VirtualWaitingRoom() {
  const { user } = useAuth();
  const [isQueued, setIsQueued] = useState<boolean>(false);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number>(100);
  const [pollCountdown, setPollCountdown] = useState<number>(5);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const sessionIdRef = useRef<string>("");

  // Initialize unique browser tab session ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      let storedId = sessionStorage.getItem("dnhs_student_traffic_session");
      if (!storedId) {
        storedId = `stu_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem("dnhs_student_traffic_session", storedId);
      }
      sessionIdRef.current = storedId;
    }
  }, []);

  // Send heartbeat / check queue status
  const checkStatus = async () => {
    if (!sessionIdRef.current) return;
    setIsChecking(true);
    try {
      const res = await fetch("/api/traffic/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          studentId: user?.userId || user?.email || "anonymous",
          action: "heartbeat",
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setActiveCount(data.activeCount || 0);
        setMaxCapacity(data.maxCapacity || 100);

        if (data.allowed === false) {
          setIsQueued(true);
        } else {
          setIsQueued(false);
        }
      }
    } catch (err) {
      console.warn("Heartbeat notice:", err);
    } finally {
      setIsChecking(false);
      setPollCountdown(isQueued ? 5 : 25);
    }
  };

  // Heartbeat loop
  useEffect(() => {
    // Initial check on mount
    checkStatus();

    const intervalTime = isQueued ? QUEUE_POLL_INTERVAL_MS : HEARTBEAT_INTERVAL_MS;
    const timer = setInterval(() => {
      checkStatus();
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isQueued, user?.userId]);

  // Countdown timer for next poll
  useEffect(() => {
    if (!isQueued) return;
    const cdTimer = setInterval(() => {
      setPollCountdown((prev) => (prev > 1 ? prev - 1 : 5));
    }, 1000);

    return () => clearInterval(cdTimer);
  }, [isQueued]);

  // Notify server when tab is closed to immediately release slot
  useEffect(() => {
    const handleUnload = () => {
      if (sessionIdRef.current) {
        const payload = JSON.stringify({
          sessionId: sessionIdRef.current,
          action: "leave",
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/traffic/heartbeat", payload);
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // If user is permitted, render nothing
  if (!isQueued) {
    return null;
  }

  // Render High-Traffic Virtual Waiting Room Screen
  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-in fade-in duration-300">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl border-4 border-amber-400 overflow-hidden text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-5 text-center relative">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/40 text-amber-300 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            DepEd High-Traffic Virtual Queue
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            System at Maximum Capacity
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-sm mx-auto">
            Dumalneg National High School &bull; Concurrency Traffic &amp; Database Protection
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-center">
          {/* Animated Queue Graphic */}
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-600 shadow-inner">
            <svg
              className="w-8 h-8 animate-spin text-[#002060]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>

          {/* Capacity Metrics */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3 text-left">
            <div className="border-r border-slate-200 pr-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Server Capacity
              </span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {activeCount} / {maxCapacity}
              </span>
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                ● 100% Slots Occupied
              </span>
            </div>
            <div className="pl-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Your Status
              </span>
              <span className="text-base font-extrabold text-[#002060]">
                In Queue
              </span>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                Rechecking in {pollCountdown}s
              </span>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="text-xs text-slate-600 space-y-2 text-left bg-blue-50/60 border border-blue-100 p-3.5 rounded-xl">
            <p className="font-semibold text-[#002060]">
              Why is there a Virtual Waiting Room?
            </p>
            <p className="leading-relaxed">
              To preserve system responsiveness and prevent database over-saturation during peak enrollment traffic, the number of simultaneous active students is temporarily regulated.
            </p>
            <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-600">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>Please do not close or refresh this tab.</strong> You will automatically gain access as soon as an active session is completed and released.
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={checkStatus}
              disabled={isChecking}
              className="w-full py-3 bg-[#002060] hover:bg-[#002b80] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isChecking ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-amber-400 rounded-full animate-spin" />
                  Checking queue status...
                </>
              ) : (
                <>
                  Recheck Queue Status Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 text-[11px] text-slate-500 text-center font-medium">
          Dumalneg National High School &bull; DepEd Region I Ilocos Norte
        </div>
      </div>
    </div>
  );
}
