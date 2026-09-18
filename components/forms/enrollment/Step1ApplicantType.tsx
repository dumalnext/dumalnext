"use client";

import React, { useEffect } from "react";
import { ApplicantType } from "@/lib/types/enrollment";

export interface Step1Data {
  isGraded: boolean;
  applicantType: ApplicantType | "";
  targetGradeLevel: number | "";
  lastGradeCompleted?: number | "";
  lastSchoolYearCompleted?: string;
  lastSchoolAttended?: string;
  lastSchoolId?: string;
}

interface Step1ApplicantTypeProps {
  data: Step1Data;
  onChange: (fields: Partial<Step1Data>) => void;
  onNext: () => void;
}

export default function Step1ApplicantType({
  data,
  onChange,
  onNext,
}: Step1ApplicantTypeProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // When applicant type changes, set appropriate default grade levels
  const handleSelectApplicantType = (type: ApplicantType) => {
    let defaultTargetGrade: number | "" = data.targetGradeLevel;
    let defaultLastGrade: number | "" = data.lastGradeCompleted || "";

    if (type === "Grade 7") {
      defaultTargetGrade = 7;
      defaultLastGrade = 6;
    } else if (type === "Grade 11") {
      defaultTargetGrade = 11;
      defaultLastGrade = 10;
    } else if (type === "Transferee" || type === "Returning") {
      if (!defaultTargetGrade) {
        defaultTargetGrade = 7;
        defaultLastGrade = 6;
      } else {
        defaultLastGrade = typeof defaultTargetGrade === "number" ? defaultTargetGrade - 1 : 6;
      }
    }

    onChange({
      applicantType: type,
      targetGradeLevel: defaultTargetGrade,
      lastGradeCompleted: defaultLastGrade,
    });

    if (errors.applicantType) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.applicantType;
        return next;
      });
    }
  };

  // Smart level tracker: When target grade level changes, automatically adjust valid completed grade
  const handleTargetGradeChange = (newTargetGrade: number) => {
    // Standard academic progression: Last completed grade is target - 1
    const standardLastCompleted = newTargetGrade - 1;

    // Check if the current lastGradeCompleted is logically impossible (greater than or equal to target grade)
    let updatedLastCompleted: number = standardLastCompleted;
    if (
      typeof data.lastGradeCompleted === "number" &&
      data.lastGradeCompleted < newTargetGrade &&
      data.lastGradeCompleted >= standardLastCompleted - 1
    ) {
      updatedLastCompleted = data.lastGradeCompleted;
    }

    onChange({
      targetGradeLevel: newTargetGrade,
      lastGradeCompleted: updatedLastCompleted,
    });

    if (errors.targetGradeLevel || errors.lastGradeCompleted) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.targetGradeLevel;
        delete next.lastGradeCompleted;
        return next;
      });
    }
  };

  // Compute valid available options for "Last Grade Level Completed" based on Target Grade Level
  const getAvailableCompletedGrades = (targetGrade: number | "") => {
    if (!targetGrade || typeof targetGrade !== "number") {
      return [{ value: 6, label: "Grade 6 (Elementary Completer)" }];
    }

    const options: { value: number; label: string }[] = [];

    // The primary valid completed grade is targetGrade - 1
    const prerequisiteGrade = targetGrade - 1;

    if (prerequisiteGrade === 6) {
      options.push({ value: 6, label: "Grade 6 (Elementary Completer)" });
    } else {
      // Allow the direct prerequisite grade (standard promo)
      options.push({
        value: prerequisiteGrade,
        label: prerequisiteGrade === 10 ? "Grade 10 (Junior High School Completer)" : `Grade ${prerequisiteGrade}`,
      });

      // Also allow repeating the current grade level if repeating / balik-aral
      options.push({
        value: targetGrade,
        label: `Grade ${targetGrade} (Repeater / Discontinued during Grade ${targetGrade})`,
      });

      // Allow 1 grade lower if returning after drop out
      if (prerequisiteGrade - 1 >= 6) {
        options.push({
          value: prerequisiteGrade - 1,
          label: prerequisiteGrade - 1 === 6 ? "Grade 6 (Elementary Completer)" : `Grade ${prerequisiteGrade - 1}`,
        });
      }
    }

    return options;
  };

  const validateAndProceed = () => {
    const newErrors: Record<string, string> = {};

    if (!data.applicantType) {
      newErrors.applicantType = "Please select a learner classification category.";
    }

    if (!data.targetGradeLevel) {
      newErrors.targetGradeLevel = "Target grade level is required.";
    }

    // Validation for Transferee / Returning (Balik-Aral)
    if (data.applicantType === "Transferee" || data.applicantType === "Returning") {
      if (!data.lastGradeCompleted) {
        newErrors.lastGradeCompleted = "Last grade level completed is required.";
      } else if (
        typeof data.targetGradeLevel === "number" &&
        Number(data.lastGradeCompleted) > Number(data.targetGradeLevel)
      ) {
        newErrors.lastGradeCompleted = `Invalid academic sequence: Cannot enroll in Grade ${data.targetGradeLevel} after already completing Grade ${data.lastGradeCompleted}.`;
      }

      if (!data.lastSchoolYearCompleted || data.lastSchoolYearCompleted.trim() === "") {
        newErrors.lastSchoolYearCompleted = "Last school year completed is required (e.g., 2024-2025).";
      }
      if (!data.lastSchoolAttended || data.lastSchoolAttended.trim() === "") {
        newErrors.lastSchoolAttended = "Official name of last school attended is required.";
      }
      if (!data.lastSchoolId || data.lastSchoolId.trim().length !== 6) {
        newErrors.lastSchoolId = "Previous DepEd School ID must be exactly 6 numeric digits.";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const isTransfereeOrReturning =
    data.applicantType === "Transferee" || data.applicantType === "Returning";

  const availableCompletedGrades = getAvailableCompletedGrades(data.targetGradeLevel);

  return (
    <div className="space-y-8 bg-white p-6 sm:p-10 border-2 border-slate-300 shadow-sm">
      {/* Step Header */}
      <div className="border-b-2 border-slate-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-mono font-bold bg-[#002060] text-white px-2.5 py-1 uppercase tracking-wider">
            STEP 01 OF 05
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            DepEd Form Sections 2 &amp; 6
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Learner Classification &amp; Target Grade Level
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Select the appropriate education program and academic classification for the enrolling student.
        </p>
      </div>

      {/* Part A: Graded vs Non-Graded (SNEd Only) */}
      <div className="space-y-3">
        <div className="border-l-4 border-[#002060] pl-3">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            1. Curriculum Program (DepEd Section 2)
          </label>
          <span className="text-xs text-slate-500">
            Specify standard basic education curriculum or specialized SNEd program.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Graded Program */}
          <button
            type="button"
            onClick={() => onChange({ isGraded: true })}
            className={`p-5 border-2 text-left transition-all relative ${
              data.isGraded
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                  data.isGraded
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                [ {data.isGraded ? "SELECTED" : "CLICK TO SELECT"} ]
              </span>
              <span className="text-[11px] font-bold text-slate-400 font-mono">CODE: GRADED</span>
            </div>
            <div className="text-base font-bold text-slate-900">Graded Curriculum Program</div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Standard secondary basic education program for Junior High School (Grades 7–10) and Senior High School (Grades 11–12).
            </p>
          </button>

          {/* Non-Graded Program */}
          <button
            type="button"
            onClick={() => onChange({ isGraded: false })}
            className={`p-5 border-2 text-left transition-all relative ${
              !data.isGraded
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                  !data.isGraded
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                [ {!data.isGraded ? "SELECTED" : "CLICK TO SELECT"} ]
              </span>
              <span className="text-[11px] font-bold text-slate-400 font-mono">CODE: SNED-ONLY</span>
            </div>
            <div className="text-base font-bold text-slate-900">Non-Graded Program (SNEd Only)</div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Tailored individualized educational program reserved exclusively for learners with special education needs (SNEd).
            </p>
          </button>
        </div>
      </div>

      {/* Part B: Applicant Classification */}
      <div className="space-y-3 pt-2">
        <div className="border-l-4 border-[#002060] pl-3">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            2. Learner Classification Category
          </label>
          <span className="text-xs text-slate-500">
            Identify the applicant&apos;s current enrollment status.
          </span>
        </div>

        {errors.applicantType && (
          <div className="p-3.5 bg-red-50 border-l-4 border-red-700 text-xs text-red-800 font-semibold shadow-xs">
            [ Validation Required ]: {errors.applicantType}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* 1. Incoming Grade 7 */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Grade 7")}
            className={`p-5 border-2 text-left transition-all ${
              data.applicantType === "Grade 7"
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                  data.applicantType === "Grade 7"
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                [ {data.applicantType === "Grade 7" ? "ACTIVE" : "SELECT"} ] CATEGORY 01
              </span>
              <span className="text-xs font-bold text-[#002060]">JHS Grade 7</span>
            </div>
            <div className="text-base font-bold text-slate-900">Incoming Grade 7</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Elementary Grade 6 completers transitioning into the First Year of Junior High School at Dumalneg NHS.
            </p>
          </button>

          {/* 2. Incoming Grade 11 */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Grade 11")}
            className={`p-5 border-2 text-left transition-all ${
              data.applicantType === "Grade 11"
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                  data.applicantType === "Grade 11"
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                [ {data.applicantType === "Grade 11" ? "ACTIVE" : "SELECT"} ] CATEGORY 02
              </span>
              <span className="text-xs font-bold text-[#002060]">SHS Grade 11</span>
            </div>
            <div className="text-base font-bold text-slate-900">Incoming Grade 11</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Junior High School (Grade 10) completers enrolling in Senior High School Academic or TVL tracks.
            </p>
          </button>

          {/* 3. Transferee */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Transferee")}
            className={`p-5 border-2 text-left transition-all ${
              data.applicantType === "Transferee"
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                  data.applicantType === "Transferee"
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                [ {data.applicantType === "Transferee" ? "ACTIVE" : "SELECT"} ] CATEGORY 03
              </span>
              <span className="text-xs font-bold text-amber-800">Grades 7–12</span>
            </div>
            <div className="text-base font-bold text-slate-900">Transferee (Move-In)</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Learners transferring from another public or private secondary school into Dumalneg NHS.
            </p>
          </button>

          {/* 4. Returning Student (Balik-Aral) */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Returning")}
            className={`p-5 border-2 text-left transition-all ${
              data.applicantType === "Returning"
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                  data.applicantType === "Returning"
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                [ {data.applicantType === "Returning" ? "ACTIVE" : "SELECT"} ] CATEGORY 04
              </span>
              <span className="text-xs font-bold text-indigo-800">Balik-Aral</span>
            </div>
            <div className="text-base font-bold text-slate-900">Returning Learner (Balik-Aral)</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Learners who previously dropped out or stopped schooling and are resuming their studies.
            </p>
          </button>
        </div>
      </div>

      {/* Part C: Target Grade Level Selector (for Transferee / Returning) */}
      {isTransfereeOrReturning && (
        <div className="space-y-4 p-6 bg-slate-50 border-2 border-slate-300">
          <div className="border-l-4 border-[#002060] pl-3">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              3. Target Grade Level at Dumalneg NHS (Grades 7 to 12)
            </label>
            <p className="text-xs text-slate-600 mt-0.5">
              Select the grade level you intend to enroll in for the upcoming school year.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
            {[7, 8, 9, 10, 11, 12].map((lvl) => {
              const isSelected = data.targetGradeLevel === lvl;
              const isJHS = lvl <= 10;

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleTargetGradeChange(lvl)}
                  className={`p-3.5 border-2 text-center font-bold transition-all relative ${
                    isSelected
                      ? "bg-[#002060] text-white border-[#002060] shadow-sm"
                      : "bg-white text-slate-800 border-slate-300 hover:border-[#002060] hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs uppercase font-mono tracking-wider opacity-80">
                    {isJHS ? "JHS" : "SHS"}
                  </div>
                  <div className="text-base sm:text-lg font-bold">Grade {lvl}</div>
                  {isSelected && (
                    <span className="block text-[10px] font-mono uppercase text-blue-200 mt-0.5">
                      [ TARGET ]
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {errors.targetGradeLevel && (
            <span className="text-xs text-red-700 font-semibold block">
              [ Validation Required ]: {errors.targetGradeLevel}
            </span>
          )}
        </div>
      )}

      {/* Part D: Smart Section 6 Academic History Tracker (DepEd Section 6) */}
      {isTransfereeOrReturning && (
        <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
          <div className="border-b-2 border-slate-200 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                [ DepEd Section 6: Academic Background &amp; Previous School Attended ]
              </span>
              <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-bold">
                [ SMART PREREQUISITE VALIDATION ACTIVE ]
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Based on your target of <strong>Grade {data.targetGradeLevel || 7}</strong>, 
              impossible higher grade levels have been automatically filtered out.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Last Grade Level Completed (SMART FILTERED) */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Last Grade Level Completed <span className="text-red-700">*</span>
              </label>
              <select
                value={data.lastGradeCompleted || ""}
                onChange={(e) =>
                  onChange({
                    lastGradeCompleted: e.target.value ? Number(e.target.value) : "",
                  })
                }
                className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-medium focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
              >
                <option value="">-- Select Completed Grade Level --</option>
                {availableCompletedGrades.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Prerequisite for Grade {data.targetGradeLevel || 7}: Successful completion of Grade {(Number(data.targetGradeLevel) || 7) - 1}.
              </span>
              {errors.lastGradeCompleted && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.lastGradeCompleted}
                </span>
              )}
            </div>

            {/* Last School Year Completed */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Last School Year Completed <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={data.lastSchoolYearCompleted || ""}
                onChange={(e) => onChange({ lastSchoolYearCompleted: e.target.value })}
                placeholder="e.g. 2024-2025"
                className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-medium focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Format: 4-digit start year - 4-digit end year (e.g. 2024-2025).
              </span>
              {errors.lastSchoolYearCompleted && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.lastSchoolYearCompleted}
                </span>
              )}
            </div>

            {/* Last School Attended */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Official Registered Name of Last School Attended <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={data.lastSchoolAttended || ""}
                onChange={(e) => onChange({ lastSchoolAttended: e.target.value })}
                placeholder="e.g. Pagudpud National High School / Bangui Central School"
                className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-medium focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
              />
              {errors.lastSchoolAttended && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.lastSchoolAttended}
                </span>
              )}
            </div>

            {/* School ID (6-digit) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Previous School ID (6 Numeric Digits) <span className="text-red-700">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={data.lastSchoolId || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    onChange({ lastSchoolId: val });
                  }}
                  placeholder="300123"
                  className="w-48 p-3 bg-white border-2 border-slate-300 text-base font-mono tracking-widest font-bold focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none text-center"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  Official 6-digit DepEd School ID registered in the Learner Information System (LIS). 
                  Visible on the learner&apos;s Form 138 / Report Card header.
                </span>
              </div>
              {errors.lastSchoolId && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.lastSchoolId}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Box of Selection */}
      {data.applicantType && data.targetGradeLevel && (
        <div className="p-5 bg-blue-50 border-l-4 border-[#002060] text-xs space-y-1.5 shadow-xs">
          <div className="font-bold text-[#002060] uppercase tracking-wider flex items-center justify-between">
            <span>[ ENROLLMENT CLASSIFICATION SUMMARY ]</span>
            <span className="font-mono text-[11px] text-blue-900">VERIFIED</span>
          </div>
          <p className="text-slate-900 leading-relaxed">
            Applicant is registering as:{" "}
            <strong className="text-[#002060]">
              {data.applicantType === "Grade 7" && "Incoming Grade 7 (Junior High School)"}
              {data.applicantType === "Grade 11" && "Incoming Grade 11 (Senior High School)"}
              {data.applicantType === "Transferee" && `Transferee for Grade ${data.targetGradeLevel}`}
              {data.applicantType === "Returning" && `Returning Learner (Balik-Aral) for Grade ${data.targetGradeLevel}`}
            </strong>{" "}
            under the <strong>{data.isGraded ? "Graded Curriculum Program" : "Non-Graded Program (SNEd Only)"}</strong>.
            {isTransfereeOrReturning && (
              <span className="block mt-1 text-slate-700 font-medium">
                Academic Prerequisite: Completed Grade {data.lastGradeCompleted || ((Number(data.targetGradeLevel) || 7) - 1)}.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="border-t-2 border-slate-200 pt-6 flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={validateAndProceed}
          className="btn-primary text-xs uppercase tracking-wider font-bold py-3.5 px-8 text-center shadow-sm"
        >
          Proceed: Learner&apos;s Personal Information (Step 2)
        </button>
      </div>
    </div>
  );
}
