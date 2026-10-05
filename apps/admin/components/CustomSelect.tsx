"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger" | "neutral";
  sublabel?: string;
  category?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
  fullWidth?: boolean;
  error?: boolean;
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
  fullWidth = false,
  error = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
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
      className={`relative ${fullWidth ? "w-full" : "inline-block"} text-left ${
        isOpen ? "z-30" : ""
      } ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${
          fullWidth
            ? "w-full flex items-center justify-between p-2.5 sm:p-3"
            : "flex items-center gap-1.5 px-2.5 py-1.5"
        } bg-white hover:bg-slate-50 border-2 text-xs font-sans transition-all cursor-pointer select-none rounded-[4px] ${
          error
            ? "border-red-600 bg-red-50/50"
            : isOpen
            ? "border-[#002060] ring-2 ring-[#002060]/20 shadow-xs"
            : "border-slate-300 hover:border-[#002060]"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100" : ""}`}
      >
        <div className="flex items-center gap-2 truncate text-left min-w-0">
          {label && (
            <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider shrink-0">
              {label}
            </span>
          )}

          <span
            className={`truncate ${
              selectedOption
                ? "font-bold text-[#002060]"
                : "font-normal text-slate-400 italic"
            }`}
          >
            {displayLabel}
          </span>
        </div>

        {/* DepEd Styled SVG Chevron */}
        <svg
          className={`w-4 h-4 text-[#002060] shrink-0 transition-transform duration-200 ml-2 ${
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
          } mt-1.5 ${
            fullWidth ? "w-full" : "min-w-[200px] w-auto max-w-[340px]"
          } bg-white border-2 border-[#002060] shadow-2xl z-50 py-1 rounded-[4px] overflow-hidden ${dropdownClassName}`}
        >
          {/* Subtle Dropdown Title Bar */}
          {label && (
            <div className="px-3 py-1 bg-slate-100 border-b border-slate-200 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>{label.replace(/:/g, "")}</span>
              <span className="text-[9px] text-[#002060] font-bold">DepEd DNHS</span>
            </div>
          )}

          {/* Options List */}
          <div className="py-1 max-h-64 overflow-y-auto divide-y divide-slate-100">
            {options.map((option, idx) => {
              const isSelected = String(option.value) === String(value);
              const showCategoryHeader =
                Boolean(option.category) &&
                (idx === 0 || options[idx - 1].category !== option.category);

              let badgeClasses = "bg-blue-100 text-[#002060] border-blue-200";
              if (isSelected) {
                badgeClasses = "bg-white/20 text-white border-white/30";
              } else if (
                option.badgeVariant === "success" ||
                option.badge?.toUpperCase().includes("AVAILABLE")
              ) {
                badgeClasses = "bg-emerald-100 text-emerald-950 border-emerald-300";
              } else if (
                option.badgeVariant === "warning" ||
                option.badge?.toUpperCase().includes("OCCUPIED") ||
                option.badge?.toUpperCase().includes("ADVISING") ||
                option.badge?.toUpperCase().includes("ASSIGNED") ||
                option.badge?.toUpperCase().includes("CURRENT")
              ) {
                badgeClasses = "bg-amber-100 text-amber-950 border-amber-300";
              } else if (
                option.badgeVariant === "danger" ||
                option.badge?.toUpperCase().includes("CONFLICT") ||
                option.badge?.toUpperCase().includes("FULL")
              ) {
                badgeClasses = "bg-red-100 text-red-950 border-red-300";
              }

              return (
                <React.Fragment key={`${option.value}-${idx}`}>
                  {showCategoryHeader && (
                    <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10">
                      <span>{option.category}</span>
                      <span className="text-[9px] text-slate-400 font-normal">Facility</span>
                    </div>
                  )}

                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                      isSelected
                        ? "bg-[#002060] text-white font-bold"
                        : option.disabled
                        ? "text-slate-400 bg-slate-50 cursor-not-allowed"
                        : "text-slate-800 hover:bg-blue-50 hover:text-[#002060] font-medium"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate">{option.label}</span>
                      {option.sublabel && (
                        <span
                          className={`text-[10px] truncate ${
                            isSelected ? "text-blue-100" : "text-slate-500"
                          }`}
                        >
                          {option.sublabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {option.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 font-mono uppercase font-bold border rounded-[4px] ${badgeClasses}`}
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
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
