"use client";

import React from "react";
import { ApplicantType } from "@/lib/types/enrollment";
import CustomSelect from "@/components/CustomSelect";

export interface Step1Data {
  isGraded: boolean;
  applicantType: ApplicantType | "";
  targetGradeLevel: number | "";
  jhsProgram?: "Regular";
  targetSemester?: string;
  targetTrack?: string;
  targetStrand?: string;
  lastGradeCompleted?: number | "";
  lastSchoolYearCompleted?: string;
  lastSchoolAttended?: string;
  lastSchoolId?: string;
}

interface Step1ApplicantTypeProps {
  data: Step1Data;
  onChange: (fields: Partial<Step1Data>) => void;
  onNext: () => void;
  schoolYear?: string;
}

export default function Step1ApplicantType({
  data,
  onChange,
  onNext,
  schoolYear = "2026–2027",
}: Step1ApplicantTypeProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Feeder school detection: Grade 7 defaults to Dumalneg Elementary School (100050), Grade 11 to Dumalneg NHS (300017)
  const isElementaryFeeder =
    data.applicantType === "Grade 7" ||
    ((data.applicantType === "Transferee" || data.applicantType === "Returning") &&
      Number(data.targetGradeLevel) === 7);

  const defaultFeederSchoolName = isElementaryFeeder
    ? "Dumalneg Elementary School"
    : "Dumalneg National High School";

  const defaultFeederSchoolId = isElementaryFeeder ? "100050" : "300017";

  const isDefaultSchool =
    Boolean(data.lastSchoolAttended) &&
    data.lastSchoolAttended === defaultFeederSchoolName &&
    data.lastSchoolId === defaultFeederSchoolId;

  // Auto-preset feeder school if applicant type is chosen and no school attended is yet specified
  React.useEffect(() => {
    if (data.applicantType && !data.lastSchoolAttended) {
      onChange({
        lastSchoolAttended: defaultFeederSchoolName,
        lastSchoolId: defaultFeederSchoolId,
        lastSchoolYearCompleted: data.lastSchoolYearCompleted || "2024-2025",
      });
    }
  }, [data.applicantType, defaultFeederSchoolName, defaultFeederSchoolId]);

  // When applicant type changes, set appropriate default grade levels and conditional parameters
  const handleSelectApplicantType = (type: ApplicantType) => {
    if (type === "Grade 7") {
      onChange({
        applicantType: "Grade 7",
        targetGradeLevel: 7,
        jhsProgram: data.jhsProgram || "Regular",
        lastGradeCompleted: 6,
        targetTrack: "",
        targetStrand: "",
        targetSemester: data.targetSemester || "Trimester 1",
        lastSchoolAttended: "Dumalneg Elementary School",
        lastSchoolId: "100050",
        lastSchoolYearCompleted: data.lastSchoolYearCompleted || "2024-2025",
      });
    } else if (type === "Grade 11") {
      onChange({
        applicantType: "Grade 11",
        targetGradeLevel: 11,
        jhsProgram: undefined,
        lastGradeCompleted: 10,
        targetTrack: data.targetTrack || "Academic Track",
        targetStrand: data.targetStrand || "STEM",
        targetSemester: data.targetSemester || "Trimester 1",
        lastSchoolAttended: "Dumalneg National High School",
        lastSchoolId: "300017",
        lastSchoolYearCompleted: data.lastSchoolYearCompleted || "2024-2025",
      });
    } else if (type === "Transferee" || type === "Returning") {
      const currentTarget = typeof data.targetGradeLevel === "number" ? data.targetGradeLevel : 7;
      const isSHS = currentTarget >= 11;
      const isG7 = currentTarget === 7;
      onChange({
        applicantType: type,
        targetGradeLevel: currentTarget,
        jhsProgram: isSHS ? undefined : (data.jhsProgram || "Regular"),
        lastGradeCompleted: currentTarget === 7 ? 6 : currentTarget - 1,
        targetTrack: isSHS ? (data.targetTrack || "Academic Track") : "",
        targetStrand: isSHS ? (data.targetStrand || "STEM") : "",
        targetSemester: data.targetSemester || "Trimester 1",
        lastSchoolAttended: data.lastSchoolAttended || (isG7 ? "Dumalneg Elementary School" : "Dumalneg National High School"),
        lastSchoolId: data.lastSchoolId || (isG7 ? "100050" : "300017"),
        lastSchoolYearCompleted: data.lastSchoolYearCompleted || "2024-2025",
      });
    }

    if (errors.applicantType) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.applicantType;
        return next;
      });
    }
  };

  // Smart level tracker: When target grade level changes for Transferee / Returning
  const handleTargetGradeChange = (newTargetGrade: number) => {
    const standardLastCompleted = newTargetGrade === 7 ? 6 : newTargetGrade - 1;
    const isSHS = newTargetGrade >= 11;

    // Check if the current lastGradeCompleted is logically valid for this new target (strictly prerequisite or repeater)
    let updatedLastCompleted: number = standardLastCompleted;
    if (
      typeof data.lastGradeCompleted === "number" &&
      (data.lastGradeCompleted === standardLastCompleted || data.lastGradeCompleted === newTargetGrade)
    ) {
      updatedLastCompleted = data.lastGradeCompleted;
    }

    onChange({
      targetGradeLevel: newTargetGrade,
      jhsProgram: isSHS ? undefined : (data.jhsProgram || "Regular"),
      lastGradeCompleted: updatedLastCompleted,
      targetTrack: isSHS ? (data.targetTrack || "Academic Track") : "",
      targetStrand: isSHS ? (data.targetStrand || "STEM") : "",
      targetSemester: isSHS ? (data.targetSemester || "1st Semester") : "",
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

  // Compute valid available options for "Last Grade Level Completed" based on Target Grade Level (Strictly 2 options)
  const getAvailableCompletedGrades = (targetGrade: number | "") => {
    if (!targetGrade || typeof targetGrade !== "number") {
      return [
        { value: 6, label: "Grade 6 (Elementary Completer)" },
        { value: 7, label: "Grade 7 (Repeater / Retained in Grade 7)" },
      ];
    }

    const prerequisiteGrade = targetGrade - 1;
    const options: { value: number; label: string }[] = [];

    // 1. Standard Progression / Prerequisite Option (Completed the immediately preceding grade)
    if (prerequisiteGrade === 6) {
      options.push({ value: 6, label: "Grade 6 (Elementary Completer)" });
    } else if (prerequisiteGrade === 10) {
      options.push({ value: 10, label: "Grade 10 (Junior High School Completer)" });
    } else {
      options.push({ value: prerequisiteGrade, label: `Grade ${prerequisiteGrade} Completer` });
    }

    // 2. Repeater Option (Retained or repeating the same target grade level)
    options.push({
      value: targetGrade,
      label: `Grade ${targetGrade} (Repeater / Retained in Grade ${targetGrade})`,
    });

    return options;
  };

  const isSHS =
    data.applicantType === "Grade 11" ||
    ((data.applicantType === "Transferee" || data.applicantType === "Returning") &&
      typeof data.targetGradeLevel === "number" &&
      data.targetGradeLevel >= 11);

  const isJHS =
    data.applicantType === "Grade 7" ||
    ((data.applicantType === "Transferee" || data.applicantType === "Returning") &&
      typeof data.targetGradeLevel === "number" &&
      data.targetGradeLevel <= 10);

  const isTransfereeOrReturning =
    data.applicantType === "Transferee" || data.applicantType === "Returning";

  const availableCompletedGrades = getAvailableCompletedGrades(data.targetGradeLevel);

  const validateAndProceed = () => {
    const newErrors: Record<string, string> = {};

    if (!data.applicantType) {
      newErrors.applicantType = "Please select a learner classification category.";
    }

    if (!data.targetGradeLevel) {
      newErrors.targetGradeLevel = "Target grade level is required.";
    }

    // Section 6 Validation for all categories (since all learners must have previous school data)
    if (!data.lastGradeCompleted) {
      newErrors.lastGradeCompleted = "Last grade level completed is required.";
    } else if (
      typeof data.targetGradeLevel === "number" &&
      Number(data.lastGradeCompleted) > Number(data.targetGradeLevel)
    ) {
      newErrors.lastGradeCompleted = `Invalid academic sequence: Cannot enroll in Grade ${data.targetGradeLevel} after completing Grade ${data.lastGradeCompleted}.`;
    }

    if (!data.lastSchoolYearCompleted || data.lastSchoolYearCompleted.trim() === "") {
      newErrors.lastSchoolYearCompleted = "Last school year completed is required (e.g., 2024-2025).";
    }

    if (!data.lastSchoolAttended || data.lastSchoolAttended.trim() === "") {
      newErrors.lastSchoolAttended = "Official name of last school attended is required.";
    }

    if (!data.lastSchoolId || data.lastSchoolId.trim().length !== 6) {
      newErrors.lastSchoolId = "DepEd School ID must be exactly 6 numeric digits.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-8 bg-white p-6 sm:p-10 border border-slate-200/80 shadow-xs rounded-xl">
      {/* Step Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold bg-[#002060] text-white px-2.5 py-1 tracking-wider rounded-md">
            Step 01 of 05
          </span>
          <span className="text-xs font-semibold text-slate-500 tracking-wider">
            DepEd Form Sections 2, 6 &amp; 7
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Learner Classification &amp; Grade Level
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Select the education program, learner category, and previous academic background.
        </p>
      </div>

      {/* Part 1: Curriculum Program (DepEd Section 2) */}
      <div className="space-y-3">
        <div className="border-l-4 border-[#002060] pl-3">
          <label className="text-xs font-bold text-slate-900 tracking-wider block">
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
            className={`p-5 border-2 text-left transition-all rounded-xl relative ${
              data.isGraded
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md ${
                  data.isGraded
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {data.isGraded ? "Selected" : "Select"}
              </span>
            </div>
            <div className="text-base font-bold text-slate-900">Graded Curriculum Program</div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Standard secondary basic education program for Junior High School and Senior High School.
            </p>
          </button>

          {/* Non-Graded Program */}
          <button
            type="button"
            onClick={() => onChange({ isGraded: false })}
            className={`p-5 border-2 text-left transition-all rounded-xl relative ${
              !data.isGraded
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md ${
                  !data.isGraded
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {!data.isGraded ? "Selected" : "Select"}
              </span>
            </div>
            <div className="text-base font-bold text-slate-900">Non-Graded Program (SNEd Only)</div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Tailored individualized educational program reserved exclusively for learners with special education needs (SNEd).
            </p>
          </button>
        </div>
      </div>

      {/* Part 2: Learner Classification Category */}
      <div className="space-y-3 pt-2">
        <div className="border-l-4 border-[#002060] pl-3">
          <label className="text-xs font-bold text-slate-900 tracking-wider block">
            2. Learner Classification Category
          </label>
          <span className="text-xs text-slate-500">
            Identify the applicant&apos;s current enrollment status.
          </span>
        </div>

        {errors.applicantType && (
          <div className="p-3.5 bg-red-50 border-l-4 border-red-700 text-xs text-red-800 font-semibold shadow-xs rounded-lg">
            Validation Required: {errors.applicantType}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* 1. Incoming Grade 7 */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Grade 7")}
            className={`p-5 border-2 text-left transition-all rounded-xl ${
              data.applicantType === "Grade 7"
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md ${
                  data.applicantType === "Grade 7"
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {data.applicantType === "Grade 7" ? "Selected" : "Select"}
              </span>
            </div>
            <div className="text-base font-bold text-slate-900">Incoming Grade 7</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Elementary Grade 6 completers transitioning into Junior High School at Dumalneg NHS.
            </p>
          </button>

          {/* 2. Incoming Grade 11 */}
          <button
            type="button"
            onClick={() => handleSelectApplicantType("Grade 11")}
            className={`p-5 border-2 text-left transition-all rounded-xl ${
              data.applicantType === "Grade 11"
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md ${
                  data.applicantType === "Grade 11"
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {data.applicantType === "Grade 11" ? "Selected" : "Select"}
              </span>
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
            className={`p-5 border-2 text-left transition-all rounded-xl ${
              data.applicantType === "Transferee"
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md ${
                  data.applicantType === "Transferee"
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {data.applicantType === "Transferee" ? "Selected" : "Select"}
              </span>
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
            className={`p-5 border-2 text-left transition-all rounded-xl ${
              data.applicantType === "Returning"
                ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md ${
                  data.applicantType === "Returning"
                    ? "bg-[#002060] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {data.applicantType === "Returning" ? "Selected" : "Select"}
              </span>
            </div>
            <div className="text-base font-bold text-slate-900">Returning Learner (Balik-Aral)</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Learners who previously stopped schooling and are resuming their studies.
            </p>
          </button>
        </div>
      </div>

      {/* Part 3: Target Grade Level Selector (for Transferee / Returning) */}
      {isTransfereeOrReturning && (
        <div className="space-y-4 p-5 sm:p-6 bg-slate-50/80 border border-slate-300 rounded-xl">
          <div className="border-l-4 border-[#002060] pl-3">
            <label className="text-xs font-bold text-slate-900 tracking-wider block">
              3. Target Grade Level at Dumalneg NHS
            </label>
            <p className="text-xs text-slate-600 mt-0.5">
              Select the grade level you intend to enroll in.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
            {[7, 8, 9, 10, 11, 12].map((lvl) => {
              const isSelected = data.targetGradeLevel === lvl;
              const isJHSLevel = lvl <= 10;

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleTargetGradeChange(lvl)}
                  className={`p-3.5 border-2 text-center font-bold transition-all rounded-xl ${
                    isSelected
                      ? "bg-[#002060] text-white border-[#002060] shadow-sm"
                      : "bg-white text-slate-800 border-slate-300 hover:border-[#002060] hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider opacity-80">
                    {isJHSLevel ? "JHS" : "SHS"}
                  </div>
                  <div className="text-base sm:text-lg font-bold">Grade {lvl}</div>
                </button>
              );
            })}
          </div>

          {errors.targetGradeLevel && (
            <span className="text-xs text-red-700 font-semibold block">
              Validation Required: {errors.targetGradeLevel}
            </span>
          )}
        </div>
      )}

      {/* Part 4: DepEd Section 6: Previous School Attended */}
      {data.applicantType && (
        <div className="space-y-5 p-5 sm:p-6 bg-slate-50/80 border border-slate-300 rounded-xl">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-xs font-bold text-[#002060] tracking-wider block">
              DepEd Section 6: Previous School Attended &amp; Academic History
            </span>
            <p className="text-xs text-slate-600 mt-1">
              Provide information regarding your last completed school and grade level.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Last Grade Level Completed */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Last Grade Level Completed <span className="text-red-700">*</span>
              </label>
              <CustomSelect
                value={data.lastGradeCompleted?.toString() || ""}
                onChange={(val) =>
                  onChange({
                    lastGradeCompleted: val ? Number(val) : "",
                  })
                }
                options={availableCompletedGrades.map((opt) => ({
                  value: opt.value.toString(),
                  label: opt.label,
                }))}
                placeholder="-- Select Completed Grade Level --"
                fullWidth
                error={Boolean(errors.lastGradeCompleted)}
              />
              {errors.lastGradeCompleted && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.lastGradeCompleted}
                </span>
              )}
            </div>

            {/* Last School Year Completed */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Last School Year Completed <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={data.lastSchoolYearCompleted || ""}
                onChange={(e) => onChange({ lastSchoolYearCompleted: e.target.value })}
                placeholder="e.g. 2024-2025"
                className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-medium focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none rounded-xl"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Format: 4-digit start year - 4-digit end year (e.g., 2024-2025).
              </span>
              {errors.lastSchoolYearCompleted && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.lastSchoolYearCompleted}
                </span>
              )}
            </div>

            {/* School Attended Selector: 2 Choices (Dumalneg Elementary School vs Others) */}
            <div className="sm:col-span-2 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-900">
                  {data.applicantType === "Grade 7"
                    ? "Official Name of Elementary School Graduated / Last Attended"
                    : data.applicantType === "Grade 11"
                    ? "Official Name of Junior High School Completed / Last Attended"
                    : "Official Registered Name of Last School Attended"}{" "}
                  <span className="text-red-700">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select your feeder school or choose &apos;Others&apos; to specify a different institution.
                </p>
              </div>

              {/* 2 Interactive Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Choice 1: Default Feeder School (Dumalneg Elementary School / Dumalneg NHS) */}
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      lastSchoolAttended: defaultFeederSchoolName,
                      lastSchoolId: defaultFeederSchoolId,
                    });
                    if (errors.lastSchoolAttended || errors.lastSchoolId) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.lastSchoolAttended;
                        delete next.lastSchoolId;
                        return next;
                      });
                    }
                  }}
                  className={`p-4 border-2 text-left transition-all rounded-xl ${
                    isDefaultSchool
                      ? "border-[#002060] bg-blue-50/70 shadow-sm ring-1 ring-[#002060]"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md ${
                        isDefaultSchool
                           ? "bg-[#002060] text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {isDefaultSchool ? "Selected" : "Select"}
                    </span>
                    <span className="text-[11px] font-bold text-[#002060]">
                      DepEd ID: {defaultFeederSchoolId}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {defaultFeederSchoolName}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                    Official public school in Dumalneg. DepEd School ID ({defaultFeederSchoolId}) is automatically set.
                  </p>
                </button>

                {/* Choice 2: Others (Specify) */}
                <button
                  type="button"
                  onClick={() => {
                    if (isDefaultSchool) {
                      onChange({
                        lastSchoolAttended: "",
                        lastSchoolId: "",
                      });
                    }
                  }}
                  className={`p-4 border-2 text-left transition-all rounded-xl ${
                    !isDefaultSchool
                      ? "border-[#002060] bg-blue-50/70 shadow-sm ring-1 ring-[#002060]"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md ${
                        !isDefaultSchool
                          ? "bg-[#002060] text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {!isDefaultSchool ? "Selected" : "Select"}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Others (Specify School &amp; ID)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                    Graduated or transferring from another school outside Dumalneg (e.g. Pagudpud, Bangui, Adams, private school).
                  </p>
                </button>
              </div>

              {/* Manual Entry Inputs when "Others (Specify)" is selected */}
              {!isDefaultSchool && (
                <div className="p-5 bg-white border-2 border-slate-300 space-y-4 mt-2 shadow-inner rounded-xl">
                  <div className="border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-[#002060] tracking-wider block">
                      Manual School Specification
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Enter the registered name and 6-digit DepEd School ID found on the learner&apos;s Form 138 / SF9 Report Card.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Official School Name <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="text"
                      value={data.lastSchoolAttended || ""}
                      onChange={(e) => {
                        onChange({ lastSchoolAttended: e.target.value.toUpperCase() });
                        if (errors.lastSchoolAttended) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.lastSchoolAttended;
                            return next;
                          });
                        }
                      }}
                      placeholder={
                        data.applicantType === "Grade 7"
                          ? "e.g. CABARITAN ELEMENTARY SCHOOL / BANGUI CENTRAL SCHOOL"
                          : "e.g. PAGUDPUD NATIONAL HIGH SCHOOL / ADAMS NATIONAL HIGH SCHOOL"
                      }
                      className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none rounded-xl ${
                        errors.lastSchoolAttended ? "border-red-600 bg-red-50" : "border-slate-300"
                      }`}
                    />
                    {errors.lastSchoolAttended && (
                      <p className="text-[11px] font-bold text-red-700 mt-1">{errors.lastSchoolAttended}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      DepEd School ID (6 Numeric Digits) <span className="text-red-700">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <input
                        type="text"
                        maxLength={6}
                        value={data.lastSchoolId || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          onChange({ lastSchoolId: val });
                          if (errors.lastSchoolId) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.lastSchoolId;
                              return next;
                            });
                          }
                        }}
                        placeholder="100XXX"
                        className={`w-40 p-2.5 bg-white border-2 text-xs font-bold tracking-widest text-center focus:border-[#002060] outline-none rounded-xl ${
                          errors.lastSchoolId ? "border-red-600 bg-red-50" : "border-slate-300"
                        }`}
                      />
                      <span className="text-xs text-slate-500">
                        Official 6-digit DepEd School ID registered in LIS. Found on the report card header.
                      </span>
                    </div>
                    {errors.lastSchoolId && (
                      <p className="text-[11px] font-bold text-red-700 mt-1">{errors.lastSchoolId}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Box of Selection */}
      {data.applicantType && data.targetGradeLevel && (
        <div className="p-4 sm:p-5 bg-blue-50/70 border-l-4 border-[#002060] text-xs space-y-1.5 shadow-xs rounded-lg">
          <div className="font-bold text-[#002060] tracking-wider">
            Enrollment Classification Summary
          </div>
          <p className="text-slate-800 leading-relaxed">
            Applicant is registering as:{" "}
            <strong className="text-[#002060]">
              {data.applicantType === "Grade 7" && "Incoming Grade 7 (Junior High School)"}
              {data.applicantType === "Grade 11" && "Incoming Grade 11 (Senior High School)"}
              {data.applicantType === "Transferee" && `Transferee for Grade ${data.targetGradeLevel}`}
              {data.applicantType === "Returning" && `Returning Learner (Balik-Aral) for Grade ${data.targetGradeLevel}`}
            </strong>{" "}
            under the <strong>{data.isGraded ? "Graded Curriculum Program" : "Non-Graded Program (SNEd Only)"}</strong>.
            {data.lastGradeCompleted && (
              <span className="block mt-1 text-slate-700 font-medium">
                Academic Background: Completed Grade {data.lastGradeCompleted}
                {data.lastSchoolAttended ? ` at ${data.lastSchoolAttended}` : ""}.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={validateAndProceed}
          className="btn-primary text-xs tracking-wider font-bold py-3.5 px-8 text-center shadow-sm rounded-xl"
        >
          Proceed: Learner&apos;s Personal Information (Step 2)
        </button>
      </div>
    </div>
  );
}
