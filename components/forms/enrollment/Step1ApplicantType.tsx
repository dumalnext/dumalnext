"use client";

import React from "react";
import { ApplicantType, SHS_STRANDS } from "@/lib/types/enrollment";

export interface Step1Data {
  isGraded: boolean;
  applicantType: ApplicantType | "";
  targetGradeLevel: number | "";
  jhsProgram?: "Regular" | "SPS";
  targetSemester?: "1st Semester" | "2nd Semester" | "";
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
}

export default function Step1ApplicantType({
  data,
  onChange,
  onNext,
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
        targetSemester: "",
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
        targetSemester: data.targetSemester || "1st Semester",
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
        targetSemester: isSHS ? (data.targetSemester || "1st Semester") : "",
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

    // Check if the current lastGradeCompleted is logically valid for this new target
    let updatedLastCompleted: number = standardLastCompleted;
    if (
      typeof data.lastGradeCompleted === "number" &&
      data.lastGradeCompleted <= newTargetGrade &&
      data.lastGradeCompleted >= standardLastCompleted - 1
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

  // Track selection change handler for SHS
  const handleTrackChange = (newTrack: string) => {
    const availableForTrack = SHS_STRANDS.filter((s) => s.track === newTrack);
    const firstStrand = availableForTrack.length > 0 ? availableForTrack[0].code : "";

    onChange({
      targetTrack: newTrack,
      targetStrand: firstStrand,
    });

    if (errors.targetTrack || errors.targetStrand) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.targetTrack;
        delete next.targetStrand;
        return next;
      });
    }
  };

  // Compute valid available options for "Last Grade Level Completed" based on Target Grade Level
  const getAvailableCompletedGrades = (targetGrade: number | "") => {
    if (!targetGrade || typeof targetGrade !== "number") {
      return [
        { value: 6, label: "Grade 6 (Elementary Completer)" },
        { value: 7, label: "Grade 7 (Repeater / Discontinued during Grade 7)" },
      ];
    }

    const options: { value: number; label: string }[] = [];
    const prerequisiteGrade = targetGrade - 1;

    // 1. Standard Progression / Prerequisite Option
    if (prerequisiteGrade === 6) {
      options.push({ value: 6, label: "Grade 6 (Elementary Completer)" });
    } else if (prerequisiteGrade === 10) {
      options.push({ value: 10, label: "Grade 10 (Junior High School Completer)" });
    } else {
      options.push({ value: prerequisiteGrade, label: `Grade ${prerequisiteGrade} Completer` });
    }

    // 2. Repeater Option (Always available for every grade level 7 to 12)
    options.push({
      value: targetGrade,
      label: `Grade ${targetGrade} (Repeater / Retained in Grade ${targetGrade} / Discontinued)`,
    });

    // 3. Fallback for returning students who stopped earlier
    if (prerequisiteGrade - 1 >= 6) {
      options.push({
        value: prerequisiteGrade - 1,
        label: prerequisiteGrade - 1 === 6 ? "Grade 6 (Elementary Completer)" : `Grade ${prerequisiteGrade - 1} Completer`,
      });
    }

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

  const availableStrands = SHS_STRANDS.filter(
    (s) => !data.targetTrack || s.track === data.targetTrack
  );

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

    // Section 7 Validation for Senior High School
    if (isSHS) {
      if (!data.targetTrack || data.targetTrack.trim() === "") {
        newErrors.targetTrack = "Please select a Senior High School Track (Academic or TVL).";
      }
      if (!data.targetStrand || data.targetStrand.trim() === "") {
        newErrors.targetStrand = "Please select a Senior High School Strand.";
      }
      if (!data.targetSemester || data.targetSemester.trim() === "") {
        newErrors.targetSemester = "Please select an academic semester.";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-8 bg-white p-6 sm:p-10 border-2 border-slate-300 shadow-sm">
      {/* Step Header */}
      <div className="border-b-2 border-slate-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-mono font-bold bg-[#002060] text-white px-2.5 py-1 uppercase tracking-wider">
            STEP 01 OF 05
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            DepEd Form Sections 2, 6 &amp; 7
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Learner Classification &amp; Target Grade Level
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Select the education program, learner category, previous academic background, and curricular program or strand.
        </p>
      </div>

      {/* Part 1: Curriculum Program (DepEd Section 2) */}
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

      {/* Part 2: Learner Classification Category */}
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
              <span className="text-xs font-bold text-[#002060]">Target: Grade 7</span>
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
              <span className="text-xs font-bold text-[#002060]">Target: Grade 11</span>
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
              <span className="text-xs font-bold text-indigo-800">Balik-Aral (Grades 7–12)</span>
            </div>
            <div className="text-base font-bold text-slate-900">Returning Learner (Balik-Aral)</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Learners who previously dropped out or stopped schooling and are resuming their studies.
            </p>
          </button>
        </div>
      </div>

      {/* Part 3: Target Grade Level Selector (for Transferee / Returning) */}
      {isTransfereeOrReturning && (
        <div className="space-y-4 p-6 bg-slate-50 border-2 border-slate-300">
          <div className="border-l-4 border-[#002060] pl-3">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              3. Target Grade Level at Dumalneg NHS (Grades 7 to 12)
            </label>
            <p className="text-xs text-slate-600 mt-0.5">
              Select the target grade level you intend to enroll in for the upcoming school year.
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
                  className={`p-3.5 border-2 text-center font-bold transition-all relative ${
                    isSelected
                      ? "bg-[#002060] text-white border-[#002060] shadow-sm"
                      : "bg-white text-slate-800 border-slate-300 hover:border-[#002060] hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs uppercase font-mono tracking-wider opacity-80">
                    {isJHSLevel ? "JHS" : "SHS"}
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

      {/* Part 4: Junior High School Curricular Program (Regular vs SPS) - Grades 7 to 10 */}
      {isJHS && data.applicantType && (
        <div className="space-y-4 p-6 bg-slate-50 border-2 border-slate-300">
          <div className="border-l-4 border-[#002060] pl-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Junior High School Curricular Program (DepEd SCP)
              </label>
              <span className="text-[11px] font-mono bg-blue-100 text-[#002060] px-2 py-0.5 font-bold">
                JHS CURRICULUM
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Select whether the student is enrolling in the standard basic education curriculum or the Special Program in Sports (SPS).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Regular JHS */}
            <button
              type="button"
              onClick={() => onChange({ jhsProgram: "Regular" })}
              className={`p-5 border-2 text-left transition-all ${
                (data.jhsProgram || "Regular") === "Regular"
                  ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                  : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                    (data.jhsProgram || "Regular") === "Regular"
                      ? "bg-[#002060] text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  [ {(data.jhsProgram || "Regular") === "Regular" ? "SELECTED" : "CHOOSE"} ]
                </span>
                <span className="text-xs font-bold text-[#002060]">STANDARD JHS</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                Regular Basic Education Curriculum
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Standard secondary basic education curriculum covering core subject areas: English, Science, Mathematics, Filipino, Araling Panlipunan, MAPEH, ESP, and TLE.
              </p>
            </button>

            {/* SPS */}
            <button
              type="button"
              onClick={() => onChange({ jhsProgram: "SPS" })}
              className={`p-5 border-2 text-left transition-all ${
                data.jhsProgram === "SPS"
                  ? "border-[#002060] bg-blue-50/50 shadow-sm ring-1 ring-[#002060]"
                  : "border-slate-300 bg-white hover:border-[#002060]/70 hover:bg-slate-50/60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                    data.jhsProgram === "SPS"
                      ? "bg-[#002060] text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  [ {data.jhsProgram === "SPS" ? "SELECTED" : "CHOOSE"} ]
                </span>
                <span className="text-xs font-bold text-emerald-800 font-mono">DEPED SCP</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                Special Program in Sports (SPS)
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Specialized curricular track for student-athletes with proven athletic competence, combining core academic coursework with dedicated athletic conditioning and sports training.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Part 5: DepEd Section 6: Previous School & Academic Prerequisite Background */}
      {data.applicantType && (
        <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
          <div className="border-b-2 border-slate-200 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                [ DepEd Section 6: Previous School Attended &amp; Academic History ]
              </span>
              <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-bold">
                [ SMART PREREQUISITE VALIDATION ACTIVE ]
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {data.applicantType === "Grade 7" && (
                <>Provide credentials of the graduated Elementary School. Prerequisite: Completed Grade 6.</>
              )}
              {data.applicantType === "Grade 11" && (
                <>Provide credentials of the completed Junior High School. Prerequisite: Completed Grade 10.</>
              )}
              {isTransfereeOrReturning && (
                <>
                  Based on target <strong>Grade {data.targetGradeLevel || 7}</strong>, 
                  impossible future grade levels have been automatically excluded.
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Last Grade Level Completed */}
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
                <label className="block text-xs font-bold text-slate-900 uppercase">
                  {data.applicantType === "Grade 7"
                    ? "Official Name of Elementary School Graduated / Last Attended"
                    : data.applicantType === "Grade 11"
                    ? "Official Name of Junior High School Completed / Last Attended"
                    : "Official Registered Name of Last School Attended"}{" "}
                  <span className="text-red-700">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select your completed feeder school or choose &apos;Others&apos; to specify a different institution.
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
                  className={`p-4 border-2 text-left transition-all ${
                    isDefaultSchool
                      ? "border-[#002060] bg-blue-50/70 shadow-sm ring-1 ring-[#002060]"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                        isDefaultSchool
                          ? "bg-[#002060] text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      [ {isDefaultSchool ? "SELECTED" : "SELECT"} ]
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#002060]">
                      ID: {defaultFeederSchoolId}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {defaultFeederSchoolName}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                    Official public feeder school in Dumalneg. DepEd School ID ({defaultFeederSchoolId}) is automatically filled and verified.
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
                  className={`p-4 border-2 text-left transition-all ${
                    !isDefaultSchool
                      ? "border-[#002060] bg-blue-50/70 shadow-sm ring-1 ring-[#002060]"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                        !isDefaultSchool
                          ? "bg-[#002060] text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      [ {!isDefaultSchool ? "SELECTED" : "SELECT"} ]
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                      MANUAL ENTRY
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Others (Specify School &amp; ID)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                    Select if transferring or graduated from another school outside Dumalneg (e.g., Pagudpud, Bangui, Adams, private school).
                  </p>
                </button>
              </div>

              {/* Verified Feeder Confirmation Banner */}
              {isDefaultSchool && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-emerald-950 uppercase block">
                      Automatic Feeder Applied: {defaultFeederSchoolName}
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      DepEd School ID: <strong>{defaultFeederSchoolId}</strong> (Division of Ilocos Norte). Ready for verification.
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold bg-emerald-800 text-white px-2.5 py-1 uppercase tracking-wider self-start sm:self-auto">
                    [ AUTO-PRESET VERIFIED ]
                  </span>
                </div>
              )}

              {/* Manual Entry Inputs when "Others (Specify)" is selected */}
              {!isDefaultSchool && (
                <div className="p-5 bg-white border-2 border-slate-300 space-y-4 mt-2 shadow-inner">
                  <div className="border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                      [ Manual School Specification ]
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Enter the registered name and 6-digit DepEd School ID found on the learner&apos;s Form 138 / SF9 Report Card.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
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
                      className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                        errors.lastSchoolAttended ? "border-red-600 bg-red-50" : "border-slate-300"
                      }`}
                    />
                    {errors.lastSchoolAttended && (
                      <p className="text-[11px] font-bold text-red-700 mt-1">{errors.lastSchoolAttended}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
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
                        className={`w-40 p-2.5 bg-white border-2 text-xs font-mono font-bold tracking-widest text-center focus:border-[#002060] outline-none ${
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

      {/* Part 6: DepEd Section 7: Senior High School Program Selection (Grades 11 & 12 Only) */}
      {isSHS && (
        <div className="space-y-5 p-6 bg-slate-50 border-2 border-[#002060]/40">
          <div className="border-b-2 border-slate-200 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                [ DepEd Section 7: Senior High School Track &amp; Strand Selection ]
              </span>
              <span className="text-[11px] font-mono bg-blue-100 text-[#002060] px-2 py-0.5 font-bold">
                MANDATORY FOR GRADES 11 &amp; 12
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Select your academic semester, track, and specialized Senior High School strand offered at Dumalneg NHS.
            </p>
          </div>

          {/* Academic Semester */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-2">
              Semester <span className="text-red-700">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3 sm:w-80">
              {(["1st Semester", "2nd Semester"] as const).map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => onChange({ targetSemester: sem })}
                  className={`p-3 border-2 text-center text-xs font-bold uppercase transition-all ${
                    data.targetSemester === sem
                      ? "bg-[#002060] text-white border-[#002060]"
                      : "bg-white text-slate-700 border-slate-300 hover:border-[#002060]"
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
            {errors.targetSemester && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.targetSemester}
              </span>
            )}
          </div>

          {/* Track Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-2">
              Senior High School Track <span className="text-red-700">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "Academic Track",
                  title: "Academic Track",
                  desc: "College preparatory curriculum (STEM, HUMSS).",
                },
                {
                  id: "Technical-Vocational-Livelihood Track",
                  title: "Technical-Vocational-Livelihood (TVL) Track",
                  desc: "Skills-based certification curriculum (ICT, Agri-Fishery, Home Economics).",
                },
              ].map((trk) => {
                const isSelected = data.targetTrack === trk.id;
                return (
                  <button
                    key={trk.id}
                    type="button"
                    onClick={() => handleTrackChange(trk.id)}
                    className={`p-4 border-2 text-left transition-all ${
                      isSelected
                        ? "border-[#002060] bg-blue-50 ring-1 ring-[#002060]"
                        : "border-slate-300 bg-white hover:border-[#002060]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{trk.title}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 uppercase ${
                          isSelected ? "bg-[#002060] text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isSelected ? "SELECTED" : "SELECT"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">{trk.desc}</p>
                  </button>
                );
              })}
            </div>
            {errors.targetTrack && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.targetTrack}
              </span>
            )}
          </div>

          {/* Strand Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-2">
              Specialized Strand at Dumalneg NHS <span className="text-red-700">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableStrands.map((strand) => {
                const isSelected = data.targetStrand === strand.code;
                return (
                  <button
                    key={strand.code}
                    type="button"
                    onClick={() => onChange({ targetStrand: strand.code })}
                    className={`p-4 border-2 text-left transition-all ${
                      isSelected
                        ? "border-[#002060] bg-blue-50 ring-1 ring-[#002060]"
                        : "border-slate-300 bg-white hover:border-[#002060]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5">
                        {strand.code}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 uppercase ${
                          isSelected ? "bg-[#002060] text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isSelected ? "ACTIVE" : "CHOOSE"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1">{strand.name}</div>
                  </button>
                );
              })}
            </div>
            {errors.targetStrand && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.targetStrand}
              </span>
            )}
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
            {isJHS && (
              <span className="block mt-1 text-slate-800 font-semibold">
                JHS Curricular Program: {(data.jhsProgram || "Regular") === "SPS" ? "Special Program in Sports (SPS)" : "Regular Basic Education Curriculum"}
              </span>
            )}
            {isSHS && data.targetStrand && (
              <span className="block mt-1 text-slate-800 font-semibold">
                Senior High Placement: {data.targetSemester} | {data.targetTrack} ({data.targetStrand})
              </span>
            )}
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
