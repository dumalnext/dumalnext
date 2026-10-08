"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { createPortal } from "react-dom";

export interface ModernDatePickerProps {
  value: string; // Expected format: YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  name?: string;
  label?: string;
  min?: string;
  max?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateString(year: number, monthIndex: number, day: number): string {
  return `${year}-${padZero(monthIndex + 1)}-${padZero(day)}`;
}

export default function ModernDatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  className = "",
  disabled = false,
  error = false,
  id,
  name,
  label,
  min,
  max,
}: ModernDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position for portal popover
  const [popoverPosition, setPopoverPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width?: number;
  }>({ left: 0 });

  // Current view year & month
  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();
  const todayStr = useMemo(
    () => formatDateString(todayYear, todayMonth, todayDate),
    [todayYear, todayMonth, todayDate]
  );

  // Parse initial selected date
  const parsedValue = useMemo(() => {
    if (!value || typeof value !== "string") return null;
    const parts = value.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return {
        year: parts[0],
        monthIndex: parts[1] - 1,
        day: parts[2],
      };
    }
    return null;
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(() => {
    return parsedValue ? parsedValue.year : todayYear;
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    return parsedValue ? parsedValue.monthIndex : todayMonth;
  });

  // Sync view when value changes while closed
  useEffect(() => {
    if (parsedValue && !isOpen) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.monthIndex);
    }
  }, [parsedValue, isOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update popover position relative to trigger button
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverHeight = 340; // Approx height of calendar card
    const popoverWidth = 288; // 18rem / w-72

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popoverWidth - 8);
    }

    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      // Open upward
      setPopoverPosition({
        bottom: window.innerHeight - rect.top + 4,
        left,
      });
    } else {
      // Open downward
      setPopoverPosition({
        top: rect.bottom + 4,
        left,
      });
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("resize", handleScrollOrResize);
      window.addEventListener("scroll", handleScrollOrResize, true);
      return () => {
        window.removeEventListener("resize", handleScrollOrResize);
        window.removeEventListener("scroll", handleScrollOrResize, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDate = (year: number, monthIndex: number, day: number) => {
    const formatted = formatDateString(year, monthIndex, day);
    onChange(formatted);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelectToday = () => {
    onChange(todayStr);
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange("");
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: {
      day: number;
      monthIndex: number;
      year: number;
      isCurrentMonth: boolean;
      dateString: string;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }[] = [];

    // Prev month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateString = formatDateString(y, m, d);
      days.push({
        day: d,
        monthIndex: m,
        year: y,
        isCurrentMonth: false,
        dateString,
        isSelected: value === dateString,
        isToday: dateString === todayStr,
        isDisabled: Boolean((min && dateString < min) || (max && dateString > max)),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateString = formatDateString(viewYear, viewMonth, d);
      days.push({
        day: d,
        monthIndex: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        dateString,
        isSelected: value === dateString,
        isToday: dateString === todayStr,
        isDisabled: Boolean((min && dateString < min) || (max && dateString > max)),
      });
    }

    // Next month padding to fill grid to 35 or 42 cells
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateString = formatDateString(y, m, d);
      days.push({
        day: d,
        monthIndex: m,
        year: y,
        isCurrentMonth: false,
        dateString,
        isSelected: value === dateString,
        isToday: dateString === todayStr,
        isDisabled: Boolean((min && dateString < min) || (max && dateString > max)),
      });
    }

    return days;
  }, [viewYear, viewMonth, value, todayStr, min, max]);

  // Formatted display text (e.g. Sep 20, 2026 or 2026-09-20)
  const displayLabel = useMemo(() => {
    if (!parsedValue) return "";
    const mName = MONTH_NAMES[parsedValue.monthIndex]?.slice(0, 3) || "";
    return `${mName} ${parsedValue.day}, ${parsedValue.year} (${value})`;
  }, [parsedValue, value]);

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-[11px] font-mono font-bold text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button ("Modern Drop Box") */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-white border-2 text-left rounded-[4px] transition-all cursor-pointer select-none group ${
          error
            ? "border-red-400 bg-red-50/20 text-red-900 focus:border-red-500"
            : isOpen
            ? "border-[#002060] ring-2 ring-blue-500/20 bg-white"
            : "border-slate-300 hover:border-[#002060] bg-slate-50/60 hover:bg-white"
        } ${disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""} ${className}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Calendar Icon */}
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
              isOpen || value
                ? "bg-blue-100 text-[#002060]"
                : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-700"
            }`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
            </svg>
          </div>

          {/* Date Text */}
          {value ? (
            <span className="font-mono text-xs font-bold text-slate-900 truncate">
              {displayLabel || value}
            </span>
          ) : (
            <span className="font-mono text-xs text-slate-400 font-normal">
              {placeholder}
            </span>
          )}
        </div>

        {/* Right Action: Clear or Chevron */}
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-red-700 rounded hover:bg-red-50 transition-colors cursor-pointer"
              title="Clear date"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          )}
          <span
            className={`text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#002060]" : "group-hover:text-slate-600"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </button>

      {/* Modern Popover Dropdown Portal ("Modern Drop Box") */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: popoverPosition.top !== undefined ? `${popoverPosition.top}px` : undefined,
              bottom: popoverPosition.bottom !== undefined ? `${popoverPosition.bottom}px` : undefined,
              left: `${popoverPosition.left}px`,
              zIndex: 99999,
            }}
            className="w-72 bg-white rounded-lg border-2 border-slate-300 shadow-2xl p-3.5 font-sans select-none animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {/* Header: Month / Year / Prev / Next */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded text-slate-700 transition-colors cursor-pointer"
                title="Previous month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="flex items-center gap-1.5 text-xs font-bold font-mono uppercase text-[#002060]">
                <span>{MONTH_NAMES[viewMonth]}</span>
                <span>{viewYear}</span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded text-slate-700 transition-colors cursor-pointer"
                title="Next month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Days of Week Row */}
            <div className="grid grid-cols-7 gap-1 mb-1 text-center">
              {DAY_NAMES.map((name) => (
                <span
                  key={name}
                  className="text-[10px] font-bold font-mono text-slate-400 uppercase py-1"
                >
                  {name}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, idx) => (
                <button
                  key={`${item.dateString}-${idx}`}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => handleSelectDate(item.year, item.monthIndex, item.day)}
                  className={`h-8 w-8 text-xs font-mono font-bold rounded flex items-center justify-center transition-all cursor-pointer ${
                    item.isSelected
                      ? "bg-[#002060] text-white shadow-sm scale-105 z-10"
                      : item.isToday
                      ? "ring-2 ring-blue-500 font-black text-blue-900 bg-blue-50/80 hover:bg-blue-100"
                      : item.isCurrentMonth
                      ? "text-slate-800 hover:bg-blue-50 hover:text-[#002060]"
                      : "text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                  } ${item.isDisabled ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}`}
                >
                  {item.day}
                </button>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2.5 py-1 text-[11px] font-mono font-bold text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
              >
                Today
              </button>

              <div className="flex items-center gap-1.5">
                {value && (
                  <button
                    type="button"
                    onClick={() => handleClear()}
                    className="px-2 py-1 text-[11px] font-mono font-bold text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
