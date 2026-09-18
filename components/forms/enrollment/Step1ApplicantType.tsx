"use client";

import React from "react";
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

  const handleSelectApplicantType = (type: ApplicantType) => {
    let defaultGrade: number | "" = data.targetGradeLevel;
    if (type === "Grade 7") defaultGrade = 7;
    if (type === "Grade 11") defaultGrade = 11;

    onChange({
      applicantType: type,
      targetGradeLevel: defaultGrade,
    });

    if (errors.applicantType) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.applicantType;
        return next;
      });
    }
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
      }
      if (!data.lastSchoolYearCompleted || data.lastSchoolYearCompleted.trim() === "") {
        newErrors.lastSchoolYearCompleted = "Last school year completed is required (e.g., 2024-2025).";
      }
      if (!data.lastSchoolAttended || data.lastSchoolAttended.trim() === "") {
        newErrors.lastSchoolAttended = "Official name of last school attended is required.";
      }
      if (!data.lastSchoolId || data.lastSchoolId.trim().length !== 6) {
        newErrors.lastSchoolId = "Previous DepEd School ID must be exactly 6 digits.";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const isTransfereeOrReturning =
    data.applicantType === "Transferee" || data.applicantType === "Returning";

  return (
    <div className="space-y-8 bg-white p-6 sm:p-8 border border-slate-300">
      {/* Step Header */}
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block mb-1">
          [ Step 1 of 5: Learner Classification & Target Grade Level ]
        </span>
        <h2 className="text-xl font-bold text-slate-900">
          Select Learner Classification & Target Grade Level
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          In strict compliance with Section 2 and Section 6 of the Official DepEd Basic Education Enrollment Form (Revised 06/01/2025).
        </p>
      </div>

      {/* Part A: Graded vs Non-Graded (SNEd Only) */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
          Curriculum Program (Section 2)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onChange({ isGraded: true })}
            className={`p-4 border text-left transition-colors ${
              data.isGraded
                ? "border-[#002060] bg-blue-50/50 ring-2 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ {data.isGraded ? "Selected" : "Select"} ]
            </div>
            <div className="text-sm font-bold text-slate-900">Graded Program</div>
            <div className="text-xs text-slate-600 mt-1">
              Standard secondary education curriculum for Junior High School (Grades 7–10) and Senior High School (Grades 11–12).
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ isGraded: false })}
            className={`p-4 border text-left transition-colors ${
              !data.isGraded
                ? "border-[#002060] bg-blue-50/50 ring-2 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ {!data.isGraded ? "Selected" : "Select"} ]
            </div>
            <div className="text-sm font-bold text-slate-900">Non-Graded Program (SNEd Only)</div>
            <div className="text-xs text-slate-600 mt-1">
              Reserved exclusively for learners enrolled under the Special Needs Education (SNEd) Program.
            </div>
          </button>
        </div>
      </div>

      {/* Part B: Applicant Classification */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
          Learner Classification (Select One)
        </label>

        {errors.applicantType && (
          <div className="p-3 bg-red-50 border-l-4 border-red-700 text-xs text-red-800 font-medium">
            [ Notice ]: {errors.applicantType}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Incoming Grade 7 */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Grade 7")}
            className={`p-4 border text-left transition-colors ${
              data.applicantType === "Grade 7"
                ? "border-[#002060] bg-blue-50/50 ring-2 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ {data.applicantType === "Grade 7" ? "Active" : "Select"} ] Category 01
            </div>
            <div className="text-sm font-bold text-slate-900">Incoming Grade 7</div>
            <div className="text-xs text-slate-600 mt-1">
              Elementary Grade 6 completers transitioning into the First Year of Junior High School.
            </div>
          </button>

          {/* 2. Incoming Grade 11 */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Grade 11")}
            className={`p-4 border text-left transition-colors ${
              data.applicantType === "Grade 11"
                ? "border-[#002060] bg-blue-50/50 ring-2 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ {data.applicantType === "Grade 11" ? "Active" : "Select"} ] Category 02
            </div>
            <div className="text-sm font-bold text-slate-900">Incoming Grade 11</div>
            <div className="text-xs text-slate-600 mt-1">
              Junior High School (Grade 10) completers enrolling in Senior High School.
            </div>
          </button>

          {/* 3. Transferee */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Transferee")}
            className={`p-4 border text-left transition-colors ${
              data.applicantType === "Transferee"
                ? "border-[#002060] bg-blue-50/50 ring-2 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ {data.applicantType === "Transferee" ? "Active" : "Select"} ] Category 03
            </div>
            <div className="text-sm font-bold text-slate-900">Transferee (Move-In)</div>
            <div className="text-xs text-slate-600 mt-1">
              Learners originating from another public or private secondary institution transferring to Dumalneg NHS.
            </div>
          </button>

          {/* 4. Returning Student (Balik-Aral) */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Returning")}
            className={`p-4 border text-left transition-colors ${
              data.applicantType === "Returning"
                ? "border-[#002060] bg-blue-50/50 ring-2 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ {data.applicantType === "Returning" ? "Active" : "Select"} ] Category 04
            </div>
            <div className="text-sm font-bold text-slate-900">Returning Learner (Balik-Aral)</div>
            <div className="text-xs text-slate-600 mt-1">
              Learners who previously discontinued schooling for one or more school years and are now resuming their studies.
            </div>
          </button>
        </div>
      </div>

      {/* Part C: Dynamic Target Grade Level for Transferee / Returning */}
      {isTransfereeOrReturning && (
        <div className="space-y-3 p-5 bg-slate-50 border border-slate-300">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            Target Grade Level at Dumalneg NHS
          </label>
          <p className="text-xs text-slate-600 mb-2">
            Specify the grade level you are registering for in the upcoming academic term.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[7, 8, 9, 10, 11, 12].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => onChange({ targetGradeLevel: lvl })}
                className={`py-3 px-2 border text-center font-bold text-sm transition-colors ${
                  data.targetGradeLevel === lvl
                    ? "bg-[#002060] text-white border-[#002060]"
                    : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
                }`}
              >
                Grade {lvl}
              </button>
            ))}
          </div>

          {errors.targetGradeLevel && (
            <span className="text-xs text-red-700 font-medium block">
              [ Notice ]: {errors.targetGradeLevel}
            </span>
          )}
        </div>
      )}

      {/* Part D: Dynamic Previous School Information (DepEd Section 6) */}
      {isTransfereeOrReturning && (
        <div className="space-y-4 p-5 bg-slate-50 border border-slate-300">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Section 6: For Returning Learner (Balik-Aral) and Transferee / Move-In ]
            </span>
            <p className="text-xs text-slate-600 mt-1">
              Academic history and details from the previous school attended.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Last Grade Completed */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Last Grade Level Completed <span className="text-red-700">*</span>
              </label>
              <select
                value={data.lastGradeCompleted || ""}
                onChange={(e) =>
                  onChange({
                    lastGradeCompleted: e.target.value ? Number(e.target.value) : "",
                  })
                }
                className="w-full p-2.5 bg-white border border-slate-300 text-sm focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
              >
                <option value="">-- Select Grade Level --</option>
                <option value="6">Grade 6 (Elementary)</option>
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
              </select>
              {errors.lastGradeCompleted && (
                <span className="text-xs text-red-700 font-medium mt-1 block">
                  {errors.lastGradeCompleted}
                </span>
              )}
            </div>

            {/* Last School Year Completed */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Last School Year Completed <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={data.lastSchoolYearCompleted || ""}
                onChange={(e) => onChange({ lastSchoolYearCompleted: e.target.value })}
                placeholder="e.g. 2024-2025"
                className="w-full p-2.5 bg-white border border-slate-300 text-sm focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
              />
              {errors.lastSchoolYearCompleted && (
                <span className="text-xs text-red-700 font-medium mt-1 block">
                  {errors.lastSchoolYearCompleted}
                </span>
              )}
            </div>

            {/* Last School Attended */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Official Name of Last School Attended <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={data.lastSchoolAttended || ""}
                onChange={(e) => onChange({ lastSchoolAttended: e.target.value })}
                placeholder="Full official school name"
                className="w-full p-2.5 bg-white border border-slate-300 text-sm focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
              />
              {errors.lastSchoolAttended && (
                <span className="text-xs text-red-700 font-medium mt-1 block">
                  {errors.lastSchoolAttended}
                </span>
              )}
            </div>

            {/* School ID (6-digit) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Previous School ID (6 Digits) <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={data.lastSchoolId || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  onChange({ lastSchoolId: val });
                }}
                placeholder="e.g. 300123"
                className="w-full p-2.5 bg-white border border-slate-300 text-sm font-mono tracking-widest focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                6-digit official DepEd School ID indicated on Form 138 (Learner&apos;s Progress Report Card).
              </span>
              {errors.lastSchoolId && (
                <span className="text-xs text-red-700 font-medium mt-1 block">
                  {errors.lastSchoolId}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Box of Selection */}
      {data.applicantType && data.targetGradeLevel && (
        <div className="p-4 bg-blue-50 border-l-4 border-[#002060] text-xs space-y-1">
          <div className="font-bold text-[#002060] uppercase">
            [ Enrollment Classification Confirmation ]
          </div>
          <p className="text-slate-800">
            Applying as:{" "}
            <strong>
              {data.applicantType === "Grade 7" && "Incoming Grade 7 (Junior High School)"}
              {data.applicantType === "Grade 11" && "Incoming Grade 11 (Senior High School)"}
              {data.applicantType === "Transferee" && `Transferee for Grade ${data.targetGradeLevel}`}
              {data.applicantType === "Returning" && `Returning Learner (Balik-Aral) for Grade ${data.targetGradeLevel}`}
            </strong>{" "}
            under the <strong>{data.isGraded ? "Graded Program" : "Non-Graded Program (SNEd Only)"}</strong>.
          </p>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={validateAndProceed}
          className="btn-primary text-xs uppercase tracking-wider font-bold py-3 px-8 text-center"
        >
          Proceed: Learner&apos;s Personal Information (Step 2)
        </button>
      </div>
    </div>
  );
}
