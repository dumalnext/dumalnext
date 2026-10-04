"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
}

export interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
}

export default function CustomSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  dropdownClassName = "",
  align = "left",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Close on outside click
  const handleOutsideClick = useCallback((event: MouseEvent | TouchEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen, handleOutsideClick]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border text-xs font-sans transition-all cursor-pointer select-none shrink-0 rounded-[4px] ${
          isOpen
            ? "border-[#002060] bg-white ring-2 ring-[#002060]/20 shadow-xs"
            : "border-slate-300 hover:border-[#002060]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {label && (
          <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider shrink-0">
            {label}
          </span>
        )}

        <span className="font-bold text-[#002060] truncate max-w-[200px]">
          {displayLabel}
        </span>

        {/* DepEd Styled SVG Chevron */}
        <svg
          className={`w-3.5 h-3.5 text-[#002060] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Styled DepEd Custom Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-1 min-w-[200px] w-auto max-w-[320px] bg-white border-2 border-[#002060] shadow-xl z-50 py-1 rounded-[4px] overflow-hidden ${dropdownClassName}`}
        >
          {/* Subtle Dropdown Title Bar */}
          {label && (
            <div className="px-3 py-1 bg-slate-100 border-b border-slate-200 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Filter by {label.replace(/:/g, "")}</span>
              <span className="text-[9px] text-[#002060] font-bold">DepEd DNHS</span>
            </div>
          )}

          {/* Options List */}
          <div className="py-1 max-h-60 overflow-y-auto divide-y divide-slate-100">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                    isSelected
                      ? "bg-[#002060] text-white font-bold"
                      : "text-slate-800 hover:bg-blue-50 hover:text-[#002060] font-medium"
                  }`}
                >
                  <span className="truncate">{option.label}</span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 font-mono uppercase font-bold rounded-[4px] ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-blue-100 text-[#002060]"
                        }`}
                      >
                        {option.badge}
                      </span>
                    )}

                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-white shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
