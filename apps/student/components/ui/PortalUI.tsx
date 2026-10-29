"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import Link from "next/link";

/* ============================================================================
   1. FLOATING TOAST NOTIFICATION SYSTEM (UPGRADE #2)
   ============================================================================ */
export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Global helper to dispatch a toast from anywhere (even outside React hooks)
 */
export function triggerPortalToast(message: string, type: ToastType = "info") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("dumalnext:toast", { detail: { message, type } })
    );
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: ToastType }>;
      if (customEvent.detail?.message) {
        showToast(customEvent.detail.message, customEvent.detail.type || "info");
      }
    };
    window.addEventListener("dumalnext:toast", handleCustomToast);
    return () => window.removeEventListener("dumalnext:toast", handleCustomToast);
  }, [showToast]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toast Container (Bottom-Right on Desktop, Bottom-Center on Mobile) */}
      <div
        aria-live="polite"
        className="no-print fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const styles =
            t.type === "success"
              ? "bg-emerald-950 text-white border-l-4 border-l-emerald-400 border border-emerald-700"
              : t.type === "error"
              ? "bg-red-950 text-white border-l-4 border-l-red-400 border border-red-700"
              : t.type === "warning"
              ? "bg-amber-950 text-white border-l-4 border-l-amber-400 border border-amber-700"
              : "bg-[#002060] text-white border-l-4 border-l-amber-400 border border-blue-800";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-[4px] shadow-lg transition-all duration-200 ${styles}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    t.type === "success"
                      ? "bg-emerald-400"
                      : t.type === "error"
                      ? "bg-red-400"
                      : t.type === "warning"
                      ? "bg-amber-400"
                      : "bg-amber-300"
                  }`}
                />
                <p className="text-xs font-bold leading-snug break-words">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-white/70 hover:text-white text-sm font-bold px-1.5 py-0.5 cursor-pointer shrink-0"
                aria-label="Dismiss notification"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/* ============================================================================
   2. TACTILE 1-CLICK COPY BUTTON CHIP (UPGRADE #3)
   ============================================================================ */
export function CopyChip({
  value,
  label,
  variant = "light",
}: {
  value: string;
  label?: string;
  variant?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  if (!value) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast(`${label || "Reference"} (${value}) copied to clipboard`, "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Unable to copy automatically", "warning");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Click to copy ${label || value}`}
      className={`no-print inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold rounded-[4px] border transition-all cursor-pointer active:scale-95 ${
        copied
          ? "bg-emerald-600 text-white border-emerald-500"
          : variant === "dark"
          ? "bg-white/15 hover:bg-white/25 text-white border-white/25"
          : "bg-slate-100 hover:bg-blue-50 text-[#002060] border-slate-300 hover:border-[#002060]"
      }`}
    >
      <span>{value}</span>
      <span className="text-[10px] opacity-85 uppercase tracking-wider">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

/* ============================================================================
   3. LIVE PASSWORD STRENGTH & CRITERIA METER (UPGRADE #3)
   ============================================================================ */
export function PasswordStrengthMeter({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword?: string;
}) {
  if (!password) return null;

  const hasMinLen = password.length >= 6;
  const hasGoodLen = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const matchesConfirm =
    confirmPassword !== undefined && confirmPassword.length > 0
      ? password === confirmPassword
      : null;

  let score = 0;
  if (hasMinLen) score++;
  if (hasGoodLen) score++;
  if (hasNumber && hasLetter) score++;
  if (/[^a-zA-Z0-9]/.test(password) || password.length >= 10) score++;

  const strengthLabel =
    score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
  const barColor =
    score <= 1
      ? "bg-red-500"
      : score === 2
      ? "bg-amber-500"
      : score === 3
      ? "bg-blue-600"
      : "bg-emerald-600";

  return (
    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200/90 rounded-[4px] space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-600">Password Strength:</span>
        <span
          className={`font-bold ${
            score <= 1
              ? "text-red-700"
              : score === 2
              ? "text-amber-700"
              : score === 3
              ? "text-blue-800"
              : "text-emerald-700"
          }`}
        >
          {strengthLabel}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 h-1.5">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className={`h-full rounded-full transition-colors duration-200 ${
              idx <= score ? barColor : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] pt-0.5">
        <span className={hasMinLen ? "text-emerald-700 font-bold" : "text-slate-500"}>
          {hasMinLen ? "[OK]" : "[-]"} Min. 6 characters
        </span>
        <span
          className={
            hasLetter && hasNumber ? "text-emerald-700 font-bold" : "text-slate-500"
          }
        >
          {hasLetter && hasNumber ? "[OK]" : "[-]"} Letters &amp; numbers
        </span>
        {matchesConfirm !== null && (
          <span
            className={
              matchesConfirm ? "text-emerald-700 font-bold" : "text-red-600 font-bold"
            }
          >
            {matchesConfirm ? "Passwords match" : "Passwords do not match"}
          </span>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   4. SKELETON LOADING PLACEHOLDERS (UPGRADE #1)
   ============================================================================ */
export function PageCardSkeleton({
  title = "Synchronizing Official Learner Records...",
  rows = 3,
}: {
  title?: string;
  rows?: number;
}) {
  return (
    <div className="bg-white border border-slate-200/90 p-6 sm:p-8 rounded-[4px] shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-40 bg-slate-200 rounded-[3px] animate-pulse" />
          <div className="h-5 w-64 bg-slate-200 rounded-[3px] animate-pulse" />
        </div>
        <div className="h-7 w-28 bg-slate-100 rounded-[4px] animate-pulse shrink-0" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="p-4 bg-slate-50 border border-slate-200/60 rounded-[4px] space-y-2"
          >
            <div className="h-2.5 w-20 bg-slate-200 rounded-[3px] animate-pulse" />
            <div className="h-4 w-32 bg-slate-200 rounded-[3px] animate-pulse" />
          </div>
        ))}
      </div>

      <div className="pt-1 flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span className="w-2 h-2 rounded-full bg-[#002060] animate-ping" />
        <span>{title}</span>
      </div>
    </div>
  );
}

/* ============================================================================
   5. ILLUSTRATED EMPTY STATE CARD (UPGRADE #4)
   ============================================================================ */
export function EmptyStateCard({
  badge = "Academic Record Notice",
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: {
  badge?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <div className="bg-white border border-slate-200/90 p-7 sm:p-10 text-center rounded-[4px] shadow-xs max-w-2xl mx-auto space-y-4">
      {/* Minimalist Official Document Illustration */}
      <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#002060]">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#002060] block">
          {badge}
        </span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryLabel) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && actionHref && (
            <Link
              href={actionHref}
              className="px-6 py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold rounded-[4px] transition-colors shadow-xs"
            >
              {actionLabel}
            </Link>
          )}
          {secondaryLabel && secondaryHref && (
            <Link
              href={secondaryHref}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-[4px] transition-colors"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   6. PRINT OFFICIAL COPY BUTTON (UPGRADE #6)
   ============================================================================ */
export function PrintPageButton({ label = "Print Official Copy" }: { label?: string }) {
  const { showToast } = useToast();

  const handlePrint = () => {
    showToast("Preparing print-friendly DepEd layout...", "info");
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
    }, 150);
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs font-bold rounded-[4px] transition-colors cursor-pointer shrink-0"
      title="Print this official record (Ctrl+P)"
    >
      <svg
        className="w-3.5 h-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
