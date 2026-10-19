"use client";

import React, { useState, useEffect, useMemo } from "react";
import CustomSelect, { CustomSelectOption } from "@/components/CustomSelect";

export interface ModernDatePickerProps {
  value: string; // ISO date string: YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean | string;
  className?: string;
  startYear?: number;
  endYear?: number;
  id?: string;
  name?: string;
  placeholder?: string;
}

const MONTHS: CustomSelectOption[] = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function getDaysInMonth(month: string, year: string): number {
  if (!month) return 31;
  const m = parseInt(month, 10);
  const y = year ? parseInt(year, 10) : 2024; // default to leap year if year not yet chosen
  return new Date(y, m, 0).getDate();
}

export default function ModernDatePicker({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  error,
  className = "",
  startYear,
  endYear,
}: ModernDatePickerProps) {
  // Parse initial YYYY-MM-DD
  const [year, setYear] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [day, setDay] = useState<string>("");

  useEffect(() => {
    if (value && typeof value === "string" && value.includes("-")) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setYear(parts[0] || "");
        setMonth(parts[1] || "");
        setDay(parts[2] || "");
        return;
      }
    }
    setYear("");
    setMonth("");
    setDay("");
  }, [value]);

  // Compute available days for selected month & year
  const daysInSelectedMonth = useMemo(() => {
    return getDaysInMonth(month, year);
  }, [month, year]);

  const dayOptions: CustomSelectOption[] = useMemo(() => {
    return Array.from({ length: daysInSelectedMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, "0");
      return { value: d, label: d };
    });
  }, [daysInSelectedMonth]);

  // Compute year options (academic term range with fallback for any pre-existing year)
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const yearOptions: CustomSelectOption[] = useMemo(() => {
    const minY = startYear !== undefined ? startYear : Math.min(2020, currentYear - 4);
    const maxY = endYear !== undefined ? endYear : Math.max(2035, currentYear + 9);

    let effectiveMin = minY;
    let effectiveMax = maxY;

    if (year && !isNaN(parseInt(year, 10))) {
      const parsedY = parseInt(year, 10);
      if (parsedY < effectiveMin) effectiveMin = parsedY;
      if (parsedY > effectiveMax) effectiveMax = parsedY;
    }

    const list: CustomSelectOption[] = [];
    for (let y = effectiveMin; y <= effectiveMax; y++) {
      const yStr = String(y);
      list.push({ value: yStr, label: yStr });
    }
    return list;
  }, [startYear, endYear, currentYear, year]);

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    let nextDay = day;
    if (newMonth && day) {
      const maxDays = getDaysInMonth(newMonth, year);
      if (parseInt(day, 10) > maxDays) {
        nextDay = String(maxDays).padStart(2, "0");
        setDay(nextDay);
      }
    }
    if (year && newMonth && nextDay) {
      onChange(`${year}-${newMonth}-${nextDay}`);
    } else if (!newMonth && !nextDay && !year) {
      onChange("");
    }
  };

  const handleDayChange = (newDay: string) => {
    setDay(newDay);
    if (year && month && newDay) {
      onChange(`${year}-${month}-${newDay}`);
    } else if (!newDay && !month && !year) {
      onChange("");
    }
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    let nextDay = day;
    if (month && day) {
      const maxDays = getDaysInMonth(month, newYear);
      if (parseInt(day, 10) > maxDays) {
        nextDay = String(maxDays).padStart(2, "0");
        setDay(nextDay);
      }
    }
    if (newYear && month && nextDay) {
      onChange(`${newYear}-${month}-${nextDay}`);
    } else if (!newYear && !month && !nextDay) {
      onChange("");
    }
  };

  const handleClear = () => {
    setYear("");
    setMonth("");
    setDay("");
    onChange("");
  };

  // Human-readable formatted date display (matching DepEd enrollment design)
  const formattedDate = useMemo(() => {
    if (year && month && day) {
      const monthObj = MONTHS.find((m) => m.value === month);
      return `${monthObj?.label || month} ${parseInt(day, 10)}, ${year}`;
    }
    return null;
  }, [year, month, day]);

  return (
    <div className={`w-full ${className}`}>
      {/* Header Row: Label on left, Formatted Date Badge & Clear on right */}
      {(label || formattedDate) && (
        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
          {label ? (
            <label className="block text-xs font-bold text-slate-900 font-sans">
              {label} {required && <span className="text-red-600 font-bold ml-0.5">*</span>}
            </label>
          ) : (
            <span />
          )}

          {formattedDate && (
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span className="text-[11px] font-bold text-[#002060] bg-blue-50 px-2 py-0.5 border border-blue-200 rounded-[4px] font-sans shadow-2xs">
                {formattedDate}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10px] text-slate-400 hover:text-red-700 font-sans px-1 py-0.5 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  title="Clear date"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3 Modern DepEd Styled Drop Boxes: Month, Day, Year (copied from enrollment form) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {/* Month Drop Box */}
        <div>
          <CustomSelect
            value={month}
            onChange={handleMonthChange}
            options={MONTHS}
            placeholder="Month"
            disabled={disabled}
            fullWidth
            dropdownClassName="min-w-[140px] sm:w-full"
            error={Boolean(error)}
          />
        </div>

        {/* Day Drop Box */}
        <div>
          <CustomSelect
            value={day}
            onChange={handleDayChange}
            options={dayOptions}
            placeholder="Day"
            disabled={disabled}
            fullWidth
            error={Boolean(error)}
          />
        </div>

        {/* Year Drop Box */}
        <div>
          <CustomSelect
            value={year}
            onChange={handleYearChange}
            options={yearOptions}
            placeholder="Year"
            disabled={disabled}
            fullWidth
            error={Boolean(error)}
          />
        </div>
      </div>

      {typeof error === "string" && error && (
        <span className="text-xs text-red-700 font-semibold mt-1 block">
          {error}
        </span>
      )}
    </div>
  );
}
