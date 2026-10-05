"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";

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

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownPosition, setDropdownPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Check if button is scrolled completely out of view
    if (rect.bottom < 0 || rect.top > viewportHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = viewportHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;

    // Decide whether to open upwards or downwards:
    // If space below is limited (< 220px) and there's more room above, open upwards
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = openUpwards ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(280, Math.max(120, availableSpace));

    let calculatedWidth = fullWidth
      ? rect.width
      : Math.min(Math.max(rect.width, 220), viewportWidth - 24);

    let calculatedLeft = align === "right" ? rect.right - calculatedWidth : rect.left;

    // Clamping to screen boundaries so it never clips off screen
    if (calculatedLeft + calculatedWidth > viewportWidth - 10) {
      calculatedLeft = Math.max(10, viewportWidth - calculatedWidth - 10);
    }
    if (calculatedLeft < 10) {
      calculatedLeft = 10;
      calculatedWidth = Math.min(calculatedWidth, viewportWidth - 20);
    }

    if (openUpwards) {
      setDropdownPosition({
        bottom: viewportHeight - rect.top + 4,
        left: calculatedLeft,
        width: calculatedWidth,
        maxHeight,
      });
    } else {
      setDropdownPosition({
        top: rect.bottom + 4,
        left: calculatedLeft,
        width: calculatedWidth,
        maxHeight,
      });
    }
  }, [align, fullWidth]);

  // Update position synchronously when opening
  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Recalculate on scroll (any parent scrollable container via capture) or resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  const handleOutsideClick = useCallback((event: MouseEvent | TouchEvent) => {
    const target = event.target as Node;
    if (
      containerRef.current &&
      !containerRef.current.contains(target) &&
      dropdownRef.current &&
      !dropdownRef.current.contains(target)
    ) {
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

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? "w-full" : "inline-block"} text-left ${className}`}
    >
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
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

      {/* Styled DepEd Custom Dropdown Menu Portaled to document.body to prevent parent scrollbars/shifts */}
      {isOpen &&
        mounted &&
        dropdownPosition &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: "fixed",
              top: dropdownPosition.top !== undefined ? `${dropdownPosition.top}px` : undefined,
              bottom: dropdownPosition.bottom !== undefined ? `${dropdownPosition.bottom}px` : undefined,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: `${dropdownPosition.maxHeight}px`,
              zIndex: 99999,
            }}
            className={`bg-white border-2 border-[#002060] shadow-2xl py-1 rounded-[4px] flex flex-col overflow-hidden animate-in fade-in-0 duration-100 ${dropdownClassName}`}
          >
            {/* Subtle Dropdown Title Bar */}
            {label && (
              <div className="px-3 py-1 bg-slate-100 border-b border-slate-200 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between shrink-0">
                <span>{label.replace(/:/g, "")}</span>
                <span className="text-[9px] text-[#002060] font-bold">DepEd DNHS</span>
              </div>
            )}

            {/* Options List */}
            <div className="py-1 overflow-y-auto divide-y divide-slate-100 flex-1 min-h-0 custom-scrollbar">
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
                      <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 shrink-0">
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
          </div>,
          document.body
        )}
    </div>
  );
}
