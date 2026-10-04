"use client";

import React, { useState, useEffect, useMemo } from "react";
import CustomSelect, { CustomSelectOption } from "@/components/CustomSelect";

interface DateOfBirthPickerProps {
  value: string; // ISO date string: YYYY-MM-DD
  onChange: (date: string) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
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

const CURRENT_YEAR = new Date().getFullYear();
// Generate birth years from (CURRENT_YEAR - 4) down to 1950 (DepEd learners, balik-aral, and adults)
const YEARS: CustomSelectOption[] = Array.from(
  { length: CURRENT_YEAR - 1950 - 3 },
  (_, i) => {
    const y = (CURRENT_YEAR - 4 - i).toString();
    return { value: y, label: y };
  }
);

function getDaysInMonth(month: string, year: string): number {
  if (!month) return 31;
  const m = parseInt(month, 10);
  const y = year ? parseInt(year, 10) : 2024; // default to leap year
  return new Date(y, m, 0).getDate();
}

export default function DateOfBirthPicker({
  value,
  onChange,
  error,
  disabled = false,
  label = "Date of Birth",
  required = true,
}: DateOfBirthPickerProps) {
  // Parse initial YYYY-MM-DD
  const [year, setYear] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [day, setDay] = useState<string>("");

  useEffect(() => {
    if (value && value.includes("-")) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setYear(parts[0] || "");
        setMonth(parts[1] || "");
        setDay(parts[2] || "");
      }
    } else if (!value) {
      setYear("");
      setMonth("");
      setDay("");
    }
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

  // Human-readable formatted date display
  const formattedDate = useMemo(() => {
    if (year && month && day) {
      const monthObj = MONTHS.find((m) => m.value === month);
      return `${monthObj?.label || month} ${parseInt(day, 10)}, ${year}`;
    }
    return null;
  }, [year, month, day]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
        <label className="block text-xs font-bold text-slate-900 uppercase">
          {label} {required && <span className="text-red-700">*</span>}
        </label>
        {formattedDate && (
          <span className="text-[11px] font-bold text-[#002060] bg-blue-50 px-2 py-0.5 border border-blue-200 rounded-[4px] shrink-0">
            {formattedDate}
          </span>
        )}
      </div>

      {/* 3 Modern DepEd Styled Drop Boxes: Month, Day, Year */}
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
            options={YEARS}
            placeholder="Year"
            disabled={disabled}
            fullWidth
            error={Boolean(error)}
          />
        </div>
      </div>

      {error && (
        <span className="text-xs text-red-700 font-semibold mt-1 block">
          {error}
        </span>
      )}
    </div>
  );
}
