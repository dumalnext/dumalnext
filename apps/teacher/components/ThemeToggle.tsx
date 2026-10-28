"use client";

import React, { useState, useEffect } from "react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function ThemeToggle({ className = "", showLabel = true, size = "sm" }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("dnhs-theme");
      const isDarkMode = stored === "dark";
      setIsDark(isDarkMode);
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.removeAttribute("data-theme");
      }
    } catch {
      // Ignore localStorage errors
    }

    const handleThemeChange = (e: CustomEvent<{ isDark: boolean }>) => {
      setIsDark(e.detail.isDark);
    };

    window.addEventListener("dnhs-theme-changed" as any, handleThemeChange);
    return () => {
      window.removeEventListener("dnhs-theme-changed" as any, handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);

    try {
      if (nextDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("dnhs-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("dnhs-theme", "light");
      }
      window.dispatchEvent(
        new CustomEvent("dnhs-theme-changed", { detail: { isDark: nextDark } })
      );
    } catch {
      // Ignore localStorage errors
    }
  };

  const isSmall = size === "sm";
  const activeDark = mounted ? isDark : false;

  return (
    <div
      className={`inline-flex items-center gap-1.5 sm:gap-2 select-none px-2 py-1 rounded-[4px] bg-black/20 border border-white/20 backdrop-blur-xs ${className}`}
      title={`Theme: ${activeDark ? "Dark" : "Light (Default)"}. Click to toggle.`}
    >
      {/* Sun / Moon Icon & Text Label */}
      {showLabel && (
        <span
          className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
            activeDark ? "text-amber-300" : "text-blue-100"
          }`}
        >
          {activeDark ? (
            <svg
              className="w-3.5 h-3.5 text-amber-300 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5 text-amber-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          )}
          <span className="hidden sm:inline font-extrabold">
            {activeDark ? "Dark" : "Light"}
          </span>
        </span>
      )}

      {/* Pill Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={activeDark}
        aria-label={`Toggle Theme. Currently ${activeDark ? "Dark" : "Light"} Mode.`}
        onClick={toggleTheme}
        className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-amber-400 border-2 ${
          isSmall ? "h-5 w-10" : "h-6 w-11"
        } ${
          activeDark
            ? "bg-slate-900 border-amber-400"
            : "bg-white border-slate-300 hover:border-slate-400"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block rounded-full shadow-md transition-transform duration-200 ease-in-out ${
            isSmall ? "h-3.5 w-3.5" : "h-4 w-4"
          } ${
            activeDark
              ? `${isSmall ? "translate-x-5" : "translate-x-5"} bg-amber-400`
              : "translate-x-0.5 bg-[#002060]"
          }`}
        />
      </button>
    </div>
  );
}
