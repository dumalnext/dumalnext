"use client";

import React, { useState, useEffect } from "react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function ThemeToggle({ className = "", showLabel = true, size = "md" }: ThemeToggleProps) {
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
    } catch {}

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
    } catch {}
  };

  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-11 h-6 rounded-full bg-slate-300 border border-slate-400 opacity-60" />
        {showLabel && <span className="text-[11px] font-bold text-blue-200">Light</span>}
      </div>
    );
  }

  const isSmall = size === "sm";

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {showLabel && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 hidden sm:inline">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? "Light" : "Dark"} Mode (Default is Light)`}
        onClick={toggleTheme}
        className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 border ${
          isSmall ? "h-5 w-9" : "h-6 w-11"
        } ${
          isDark
            ? "bg-amber-400 border-amber-300"
            : "bg-blue-950/80 border-blue-400/40 hover:bg-blue-900/80"
        }`}
        title={`Current: ${isDark ? "Dark" : "Light"} Mode (Click to toggle)`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out ${
            isSmall ? "h-3.5 w-3.5 top-0.5 left-0.5" : "h-4 w-4 top-0.5 left-0.5"
          } absolute ${
            isDark
              ? `${isSmall ? "translate-x-4" : "translate-x-5"} bg-slate-950`
              : "translate-x-0 bg-white"
          }`}
        />
      </button>
    </div>
  );
}
