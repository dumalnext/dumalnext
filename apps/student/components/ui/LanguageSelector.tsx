"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage, LANGUAGE_OPTIONS, Language } from "@/lib/context/LanguageContext";

interface LanguageSelectorProps {
  className?: string;
  variant?: "header" | "card" | "drawer";
}

export default function LanguageSelector({ className = "", variant = "header" }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Current active option
  const activeOption = LANGUAGE_OPTIONS.find((opt) => opt.code === language) || LANGUAGE_OPTIONS[0];

  if (variant === "drawer") {
    return (
      <div className={`p-3 bg-blue-50/70 border border-blue-200 rounded-[4px] space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#002060] uppercase tracking-wider">
            {t("nav.selectLanguage", "Language")}
          </span>
          <span className="text-[10px] font-mono text-slate-500 uppercase">{activeOption.code}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={`py-1.5 px-2 text-xs font-bold rounded-[4px] border transition-all cursor-pointer text-center ${
                language === opt.code
                  ? "bg-[#002060] text-white border-[#002060] shadow-xs"
                  : "bg-white text-slate-700 border-slate-300 hover:border-[#002060] hover:text-[#002060]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-400/30 hover:border-blue-300 text-white rounded-[4px] text-xs font-bold transition-colors cursor-pointer shadow-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
        title="Select Portal Language (English, Ilokano, Tagalog)"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {/* Minimal Globe SVG Icon */}
        <svg
          className="w-3.5 h-3.5 text-blue-300 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>

        <span className="tracking-tight">{activeOption.label}</span>

        {/* Minimal Chevron SVG */}
        <svg
          className={`w-3 h-3 text-blue-300 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-36 bg-white border-2 border-[#002060] rounded-[4px] shadow-lg z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-1 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-[#002060] uppercase tracking-wider">
            {t("nav.selectLanguage", "Language")}
          </div>
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = language === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setLanguage(opt.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-blue-50 text-[#002060] font-bold"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
                role="menuitem"
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg
                    className="w-3.5 h-3.5 text-[#002060]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
