"use client";

import React, { useRef, useEffect } from "react";

export interface SeparatedOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
  className?: string;
}

export default function SeparatedOtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
  autoFocus = true,
  onComplete,
  className = "",
}: SeparatedOtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Array of digits based on length
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  // Auto focus first empty cell on mount or modal open
  useEffect(() => {
    if (autoFocus && !disabled) {
      const firstEmptyIndex = value.length < length ? value.length : 0;
      inputRefs.current[firstEmptyIndex]?.focus();
      inputRefs.current[firstEmptyIndex]?.select();
    }
  }, [autoFocus, disabled]);

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleaned = rawVal.replace(/\D/g, "");

    // If input is cleared or non-digit
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = "";
      const newVal = newDigits.join("").trimEnd();
      onChange(newVal);
      return;
    }

    // If multiple digits were pasted/autofilled into a single cell
    if (cleaned.length > 1) {
      const remainingSlots = length - index;
      const chunk = cleaned.slice(0, remainingSlots);
      const newDigits = [...digits];
      for (let i = 0; i < chunk.length; i++) {
        newDigits[index + i] = chunk[i];
      }
      const newVal = newDigits.join("");
      onChange(newVal);

      const nextFocus = Math.min(index + chunk.length, length - 1);
      inputRefs.current[nextFocus]?.focus();
      inputRefs.current[nextFocus]?.select();

      if (newVal.length === length && onComplete) {
        onComplete(newVal);
      }
      return;
    }

    // Single digit input
    const singleChar = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleChar;
    const newVal = newDigits.join("");
    onChange(newVal);

    // Auto-advance to next box
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }

    if (newVal.length === length && onComplete) {
      onComplete(newVal);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Current cell is empty, clear previous cell and move back
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join("").trimEnd());
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.select();
      } else if (digits[index]) {
        // Clear current cell
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join("").trimEnd());
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const newDigits = Array.from({ length }, (_, i) => pasted[i] || "");
    const newVal = newDigits.join("");
    onChange(newVal);

    const targetIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[targetIdx]?.focus();
    inputRefs.current[targetIdx]?.select();

    if (newVal.length === length && onComplete) {
      onComplete(newVal);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      className={`flex items-center justify-center gap-2 sm:gap-2.5 my-3 ${className}`}
    >
      {digits.map((digit, i) => (
        <React.Fragment key={i}>
          <input
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={2}
            value={digit}
            disabled={disabled}
            aria-label={`Verification code digit ${i + 1} of ${length}`}
            onChange={(e) => handleInputChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-bold text-2xl sm:text-3xl rounded-md transition-all outline-none border-2 ${
              hasError
                ? "border-red-500 bg-red-50/40 text-red-900 ring-2 ring-red-400/20"
                : digit
                ? "border-[#002060] bg-blue-50/50 text-[#002060] shadow-2xs font-extrabold"
                : "border-slate-300 bg-slate-50/60 text-slate-800 hover:border-slate-400 focus:bg-white"
            } focus:border-[#002060] focus:ring-4 focus:ring-[#002060]/20 focus:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
