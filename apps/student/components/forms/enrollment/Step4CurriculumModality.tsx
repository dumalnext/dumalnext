"use client";

import React, { useState } from "react";
import { FullEnrollmentFormData } from "./EnrollmentStepper";
import {
  JHS_PROGRAMS,
  SPS_SPORTS,
  SHS_STRANDS,
  SNED_DIAGNOSES,
  SNED_MANIFESTATIONS,
  DISTANCE_LEARNING_MODALITIES,
  DEPED_ELECTIVES,
  getEligibleElectives,
} from "@/lib/types/enrollment";
import { extractTermNumber } from "@/lib/utils/academicTerm";

interface Step4CurriculumModalityProps {
  data: FullEnrollmentFormData;
  onChange: (fields: Partial<FullEnrollmentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4CurriculumModality({
  data,
  onChange,
  onNext,
  onBack,
}: Step4CurriculumModalityProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Detection: Check if learner belongs to Junior High School (Grade 7 - 10) or Senior High School (Grade 11 - 12)
  const isJHS =
    data.step1.applicantType === "Grade 7" ||
    (typeof data.step1.targetGradeLevel === "number" && data.step1.targetGradeLevel <= 10) ||
    Number(data.step1.targetGradeLevel) === 7;

  const targetGrade = data.step1.targetGradeLevel || (data.step1.applicantType === "Grade 7" ? 7 : 11);

  // Current values with fallbacks
  const currentJhsProgram = data.jhsProgram || data.step1.jhsProgram || "Regular";
  const currentSpsSport = data.spsSport || "";
  const currentSemester = data.targetSemester || data.step1.targetSemester || "1st Semester";
  const currentTrack = data.targetTrack || data.step1.targetTrack || "Academic Track";
  const currentStrand = data.targetStrand || data.step1.targetStrand || (currentTrack === "Academic Track" ? "STEM" : "TVL-ICT");
  const currentElectives = data.selectedElectives || [];
  const activeTermNumber = extractTermNumber(currentSemester || data.semester || data.targetSemester);

  const [enableElectives, setEnableElectives] = useState<boolean>(() => {
    return Array.isArray(data.selectedElectives) && data.selectedElectives.length > 0;
  });

  // Smart filtering: excludes native strand subjects, matches term and grade level
  const eligibleElectives = getEligibleElectives({
    currentStrand: isJHS ? null : currentStrand,
    gradeLevel: targetGrade,
    termNumber: activeTermNumber,
    previouslyTakenCodes: [],
    isJHS,
  });

  const currentModalities = data.preferredModalities && data.preferredModalities.length > 0
    ? data.preferredModalities
    : ["Modular (Print)"];

  // Filter SHS Strands based on selected track
  const availableStrands = SHS_STRANDS.filter((s) => s.track === currentTrack);

  // Toggle Electives in multi-select array
  const handleElectiveToggle = (code: string) => {
    let updated: string[];
    if (currentElectives.includes(code)) {
      updated = currentElectives.filter((c) => c !== code);
    } else {
      updated = [...currentElectives, code];
    }
    onChange({ selectedElectives: updated });
  };

  // Toggle Modality in multi-select array
  const handleModalityToggle = (modality: string) => {
    let updated: string[];
    if (currentModalities.includes(modality)) {
      if (currentModalities.length === 1) {
        // Prevent deselecting all
        return;
      }
      updated = currentModalities.filter((m) => m !== modality);
    } else {
      updated = [...currentModalities, modality];
    }
    onChange({ preferredModalities: updated });
    if (errors.preferredModalities) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.preferredModalities;
        return next;
      });
    }
  };

  // Toggle SNEd details in multi-select array
  const handleSnedDetailToggle = (detail: string) => {
    const currentList = data.snedDetails || [];
    let updated: string[];
    if (currentList.includes(detail)) {
      updated = currentList.filter((d) => d !== detail);
    } else {
      updated = [...currentList, detail];
    }
    onChange({ snedDetails: updated });
    if (errors.snedDetails) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.snedDetails;
        return next;
      });
    }
  };

  // Validation
  const validateAndProceed = () => {
    const newErrors: Record<string, string> = {};

    if (isJHS) {
      if (!currentJhsProgram) {
        newErrors.jhsProgram = "Please select a Junior High School curricular program.";
      }
      if (currentJhsProgram === "SPS" && (!currentSpsSport || currentSpsSport.trim() === "")) {
        newErrors.spsSport = "Please select a designated sports discipline for the Special Program in Sports.";
      }
    } else {
      // SHS Validation
      if (!currentSemester) {
        newErrors.targetSemester = "Senior High School semester selection is required.";
      }
      if (!currentTrack) {
        newErrors.targetTrack = "Senior High School track selection is required.";
      }
      if (!currentStrand) {
        newErrors.targetStrand = "Senior High School strand selection is required.";
      }
    }

    // SNEd Validation
    if (data.isSned) {
      if (!data.snedCategory) {
        newErrors.snedCategory = "Please select whether the special need is by medical diagnosis or observed manifestations.";
      }
      if (!data.snedDetails || data.snedDetails.length === 0) {
        newErrors.snedDetails = "Please select at least one specific condition or learning manifestation.";
      }
    }

    // Modality Validation
    if (!currentModalities || currentModalities.length === 0) {
      newErrors.preferredModalities = "DepEd Requirement: Select at least one preferred distance learning modality.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Sync all fields cleanly to form data
      if (isJHS) {
        onChange({
          jhsProgram: currentJhsProgram,
          spsSport: currentJhsProgram === "SPS" ? currentSpsSport : "",
          targetTrack: "",
          targetStrand: "",
          targetSemester: "",
          selectedElectives: currentElectives,
          preferredModalities: currentModalities,
          step1: {
            ...data.step1,
            jhsProgram: currentJhsProgram,
            targetTrack: "",
            targetStrand: "",
            targetSemester: "",
          },
        });
      } else {
        onChange({
          targetTrack: currentTrack,
          targetStrand: currentStrand,
          targetSemester: currentSemester,
          jhsProgram: undefined,
          spsSport: undefined,
          selectedElectives: currentElectives,
          preferredModalities: currentModalities,
          step1: {
            ...data.step1,
            targetTrack: currentTrack,
            targetStrand: currentStrand,
            targetSemester: currentSemester,
          },
        });
      }
      onNext();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#002060]">
            STEP 04 OF 05
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            DepEd Form Sections 5, 7, &amp; 8
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Curricular Program, Special Education, &amp; Learning Modalities
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          {isJHS
            ? `Official curriculum placement for Grade ${targetGrade} Junior High School learner, inclusive education profile, and emergency alternative delivery preferences.`
            : `Senior High School Track and Strand designation for Grade ${targetGrade}, semester tracking, inclusive education, and alternative delivery preferences.`}
        </p>
      </div>

      {/* Global Error Notice */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-300 space-y-1">
          <p className="text-xs font-bold text-red-800 leading-normal">
            [ Validation Required ]: Please address the highlighted required fields before advancing to Step 5.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONDITIONAL SECTION A: JUNIOR HIGH SCHOOL CURRICULAR PROGRAM (GRADES 7-10) */}
      {/* ========================================================================= */}
      {isJHS ? (
        <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
          <div className="border-b-2 border-slate-200 pb-3">
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Section 4-B: Junior High School Curricular Program ]
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Select the academic curriculum program for incoming Grade {targetGrade} at Dumalneg National High School:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {JHS_PROGRAMS.map((program) => {
              const isSelected = currentJhsProgram === program.code;
              return (
                <label
                  key={program.code}
                  className={`p-5 border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-white border-[#002060] shadow-xs"
                      : "bg-white border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="jhsProgram"
                          value={program.code}
                          checked={isSelected}
                          onChange={() => {
                            onChange({
                              jhsProgram: program.code as "Regular" | "SPS",
                              step1: { ...data.step1, jhsProgram: program.code as "Regular" | "SPS" },
                            });
                            if (errors.jhsProgram) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.jhsProgram;
                                return next;
                              });
                            }
                          }}
                          className="accent-[#002060] mt-0.5"
                        />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                          {program.title}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold bg-[#002060] text-white px-2 py-0.5 uppercase">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-[#002060] uppercase mb-1">
                      {program.subtitle}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {program.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          {errors.jhsProgram && (
            <p className="text-[11px] font-bold text-red-700">{errors.jhsProgram}</p>
          )}

          {/* Conditional Sport Specialization when SPS is Selected */}
          {currentJhsProgram === "SPS" && (
            <div className="p-5 bg-blue-50/60 border-2 border-blue-200 space-y-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Designated Sports Specialization Discipline <span className="text-red-700">*</span>
                </label>
                <p className="text-xs text-slate-600 mb-2">
                  Indicate the primary athletic event or sports discipline the student-athlete specializes in for varsity training and Division Meet representation:
                </p>
                <select
                  value={currentSpsSport}
                  onChange={(e) => {
                    onChange({ spsSport: e.target.value });
                    if (errors.spsSport) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.spsSport;
                        return next;
                      });
                    }
                  }}
                  className={`w-full sm:w-96 p-2.5 bg-white border-2 text-xs font-bold focus:border-[#002060] outline-none ${
                    errors.spsSport ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                >
                  <option value="">-- SELECT SPORT DISCIPLINE --</option>
                  {SPS_SPORTS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
                {errors.spsSport && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.spsSport}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* CONDITIONAL SECTION B: SENIOR HIGH SCHOOL PROGRAM (GRADES 11-12)          */
        /* ========================================================================= */
        <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
          <div className="border-b-2 border-slate-200 pb-3">
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Section 7: Senior High School (SHS) Program Confirmation ]
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Confirm academic track and official strand for Grade {targetGrade} Senior High School enrollment:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Semester Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Semester of Enrollment <span className="text-red-700">*</span>
              </label>
              <select
                value={currentSemester}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    targetSemester: val,
                    semester: val,
                    step1: { ...data.step1, targetSemester: val },
                  });
                  if (errors.targetSemester) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.targetSemester;
                      return next;
                    });
                  }
                }}
                className={`w-full p-2.5 bg-white border-2 text-xs font-bold focus:border-[#002060] outline-none ${
                  errors.targetSemester ? "border-red-600 bg-red-50" : "border-slate-300"
                }`}
              >
                <option value="Trimester 1">Trimester 1 (August - November)</option>
                <option value="Trimester 2">Trimester 2 (November - March)</option>
                <option value="Trimester 3">Trimester 3 (March - June)</option>
                <option value="1st Semester">1st Semester (August - December)</option>
                <option value="2nd Semester">2nd Semester (January - May)</option>
                {currentSemester &&
                  !["Trimester 1", "Trimester 2", "Trimester 3", "1st Semester", "2nd Semester"].includes(currentSemester) && (
                    <option value={currentSemester}>{currentSemester}</option>
                  )}
              </select>
              {errors.targetSemester && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.targetSemester}</p>
              )}
            </div>

            {/* SHS Track Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Senior High Track <span className="text-red-700">*</span>
              </label>
              <select
                value={currentTrack}
                onChange={(e) => {
                  const newTrack = e.target.value;
                  const defaultNewStrand = newTrack === "Academic Track" ? "STEM" : "TVL-ICT";
                  onChange({
                    targetTrack: newTrack,
                    targetStrand: defaultNewStrand,
                    step1: { ...data.step1, targetTrack: newTrack, targetStrand: defaultNewStrand },
                  });
                  if (errors.targetTrack) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.targetTrack;
                      return next;
                    });
                  }
                }}
                className={`w-full p-2.5 bg-white border-2 text-xs font-bold focus:border-[#002060] outline-none ${
                  errors.targetTrack ? "border-red-600 bg-red-50" : "border-slate-300"
                }`}
              >
                <option value="Academic Track">Academic Track</option>
                <option value="Technical-Vocational-Livelihood Track">
                  Technical-Vocational-Livelihood (TVL) Track
                </option>
              </select>
              {errors.targetTrack && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.targetTrack}</p>
              )}
            </div>

            {/* SHS Strand Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Specialized Strand <span className="text-red-700">*</span>
              </label>
              <select
                value={currentStrand}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    targetStrand: val,
                    step1: { ...data.step1, targetStrand: val },
                  });
                  if (errors.targetStrand) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.targetStrand;
                      return next;
                    });
                  }
                }}
                className={`w-full p-2.5 bg-white border-2 text-xs font-bold focus:border-[#002060] outline-none ${
                  errors.targetStrand ? "border-red-600 bg-red-50" : "border-slate-300"
                }`}
              >
                {availableStrands.map((s) => (
                  <option key={s.code} value={s.code}>
                    [{s.code}] {s.name}
                  </option>
                ))}
              </select>
              {errors.targetStrand && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.targetStrand}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7-B: DEPED ELECTIVE SUBJECTS & SPECIALIZED AREAS (WITH SWITCH)    */}
      {/* ========================================================================= */}
      <div className="space-y-4 p-5 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Section 7-B: Cross-Strand Elective Subjects ]
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Mag-enroll sa karagdagang elective courses para sa {currentSemester}:
            </p>
          </div>

          {/* Interactive Toggle Switch */}
          <div className="flex items-center gap-3 bg-white p-2 border border-slate-300 self-start sm:self-auto shadow-xs">
            <span className="text-xs font-bold uppercase text-slate-700">
              Select Electives:
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enableElectives}
              onClick={() => {
                const next = !enableElectives;
                setEnableElectives(next);
                if (!next) {
                  onChange({ selectedElectives: [] });
                }
              }}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none border-2 ${
                enableElectives
                  ? "bg-[#002060] border-[#002060]"
                  : "bg-slate-200 border-slate-400"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform bg-white transition duration-200 ease-in-out mt-0.5 ${
                  enableElectives ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
            <span
              className={`text-xs font-mono font-bold uppercase px-2 py-0.5 ${
                enableElectives
                  ? "bg-[#002060] text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {enableElectives ? "ON" : "OFF"}
            </span>
          </div>
        </div>

        {/* CONDITIONAL RENDER BASED ON SWITCH */}
        {!enableElectives ? (
          <div className="p-4 bg-white border border-slate-300 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block shrink-0" />
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                [ STANDARD STRAND CURRICULUM ACTIVE: WALANG KARAGDAGANG ELECTIVES ]
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Naka-OFF ang elective selection. Ang mag-aaral ay mag-e-enroll lamang sa mga standard at mandatoryong core at specialized subjects para sa Grade {targetGrade} ({isJHS ? currentJhsProgram : currentStrand}). Walang ibang strand subjects na idinagdag.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600">
              <span className="font-medium">
                Mga asignaturang maaaring kunin ngayong {currentSemester} (Na-filter na ang mga nakuha na at mga kailangan sa sariling strand):
              </span>
              <span className="font-mono font-bold text-[#002060] bg-white px-2 py-0.5 border border-slate-300 w-fit">
                SELECTED: {currentElectives.length} SUBJECT(S)
              </span>
            </div>

            {eligibleElectives.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eligibleElectives.map((elec) => {
                  const isSelected = currentElectives.includes(elec.code);
                  return (
                    <label
                      key={elec.code}
                      className={`p-4 border-2 flex items-start gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-white border-[#002060] shadow-xs"
                          : "bg-white border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleElectiveToggle(elec.code)}
                        className="accent-[#002060] mt-1"
                      />
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold ${isSelected ? "text-[#002060]" : "text-slate-900"}`}>
                            {elec.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200">
                            {elec.category}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-[#002060] border border-blue-200">
                            Term {elec.terms?.join(", ") || "All"}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {elec.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-white border border-slate-300 space-y-1">
                <span className="text-xs font-mono font-bold text-slate-600 uppercase block">
                  [ WALANG IBANG ELECTIVES NA MAAARING KUNIN NGAYONG SEMESTER ]
                </span>
                <p className="text-xs text-slate-500">
                  Lahat ng cross-strand electives para sa terminong ito ay nakuha na noong mga nakaraang sem o kaya naman ay kasama na sa mga mandatoryong subject ng inyong strand ({currentStrand}).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: SPECIAL NEEDS EDUCATION (SNED) / INCLUSIVE LEARNING (SEC. 5)    */}
      {/* ========================================================================= */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            [ Section 5: Special Needs Education (SNEd) &amp; Inclusive Support ]
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            DepEd mandate on inclusive education: Inquire if the learner requires specialized academic accommodations, adaptive facilities, or individualized learning assistance:
          </p>
        </div>

        {/* SNEd Yes/No Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase mb-2">
            Does the learner have a diagnosed disability, health condition, or require special education support? <span className="text-red-700">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <label
              className={`p-3 border-2 flex items-center gap-3 cursor-pointer transition-colors ${
                !data.isSned
                  ? "bg-[#002060] text-white border-[#002060]"
                  : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
              }`}
            >
              <input
                type="radio"
                name="isSned"
                checked={!data.isSned}
                onChange={() => {
                  onChange({
                    isSned: false,
                    snedCategory: "",
                    snedDetails: [],
                    hasPwdId: false,
                  });
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.snedCategory;
                    delete next.snedDetails;
                    return next;
                  });
                }}
                className="accent-[#002060]"
              />
              <div className="text-xs font-bold uppercase">
                No (General Education Learner)
              </div>
            </label>

            <label
              className={`p-3 border-2 flex items-center gap-3 cursor-pointer transition-colors ${
                data.isSned
                  ? "bg-[#002060] text-white border-[#002060]"
                  : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
              }`}
            >
              <input
                type="radio"
                name="isSned"
                checked={data.isSned}
                onChange={() => {
                  onChange({
                    isSned: true,
                    snedCategory: data.snedCategory || "Diagnosis",
                  });
                }}
                className="accent-[#002060]"
              />
              <div className="text-xs font-bold uppercase">
                Yes (SNEd / Inclusive Learner)
              </div>
            </label>
          </div>
        </div>

        {/* Expanded SNEd Fields */}
        {data.isSned && (
          <div className="p-5 bg-white border-2 border-blue-200 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Classification Assessment Basis <span className="text-red-700">*</span>
              </label>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="radio"
                    name="snedCategory"
                    value="Diagnosis"
                    checked={data.snedCategory === "Diagnosis"}
                    onChange={() => {
                      onChange({ snedCategory: "Diagnosis", snedDetails: [] });
                    }}
                    className="accent-[#002060]"
                  />
                  With Formal Medical / Clinical Diagnosis
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="radio"
                    name="snedCategory"
                    value="Manifestations"
                    checked={data.snedCategory === "Manifestations"}
                    onChange={() => {
                      onChange({ snedCategory: "Manifestations", snedDetails: [] });
                    }}
                    className="accent-[#002060]"
                  />
                  Observed Learning Manifestations / Difficulty
                </label>
              </div>
              {errors.snedCategory && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.snedCategory}</p>
              )}
            </div>

            {/* Category Checklists */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-2">
                Specific Learning Need / Condition (DepEd Official Form Checklist) <span className="text-red-700">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-3 border border-slate-300 bg-slate-50">
                {(data.snedCategory === "Manifestations" ? SNED_MANIFESTATIONS : SNED_DIAGNOSES).map(
                  (item) => {
                    const isChecked = (data.snedDetails || []).includes(item);
                    return (
                      <label
                        key={item}
                        className="flex items-start gap-2 p-1.5 hover:bg-white text-xs text-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSnedDetailToggle(item)}
                          className="accent-[#002060] mt-0.5"
                        />
                        <span className={isChecked ? "font-bold text-[#002060]" : ""}>{item}</span>
                      </label>
                    );
                  }
                )}
              </div>
              {errors.snedDetails && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.snedDetails}</p>
              )}
            </div>

            {/* PWD ID Checkbox */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 font-bold">
                <input
                  type="checkbox"
                  checked={data.hasPwdId}
                  onChange={(e) => onChange({ hasPwdId: e.target.checked })}
                  className="accent-[#002060]"
                />
                Learner possesses an official Persons with Disability (PWD) ID Card or Medical Certificate
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION D: DISTANCE LEARNING MODALITIES (DEPED SECTION 8)                  */}
      {/* ========================================================================= */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            [ Section 8: Preferred Distance Learning Modalities ]
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            DepEd Disaster Contingency Standard: In the event of emergency class suspensions (severe weather typhoons or PAGASA extreme heat index), select the learner&apos;s preferred remote alternative learning delivery modes:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {DISTANCE_LEARNING_MODALITIES.map((modality) => {
            const isChecked = currentModalities.includes(modality);
            return (
              <label
                key={modality}
                className={`p-3.5 border-2 flex items-start gap-3 cursor-pointer transition-colors ${
                  isChecked
                    ? "bg-white border-[#002060] shadow-xs"
                    : "bg-white border-slate-300 hover:border-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleModalityToggle(modality)}
                  className="accent-[#002060] mt-0.5"
                />
                <div className="text-xs">
                  <div className={`font-bold ${isChecked ? "text-[#002060]" : "text-slate-800"}`}>
                    {modality}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {modality === "Modular (Print)"
                      ? "Printed Self-Learning Modules via Barangay / Sitio"
                      : modality === "Modular (Digital)"
                      ? "Offline digital copies on USB flash drive / OTG"
                      : modality === "Online"
                      ? "Synchronous virtual meet and online classroom"
                      : modality === "Blended (Combination)"
                      ? "Alternating in-person and distance modular"
                      : modality === "Educational Television"
                      ? "Instructional lessons broadcast via DepEd TV"
                      : modality === "Radio-Based Television"
                      ? "Community radio broadcast lessons"
                      : "DepEd parent-guided home instruction"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        {errors.preferredModalities && (
          <p className="text-[11px] font-bold text-red-700">{errors.preferredModalities}</p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-6 border-t-2 border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-2.5 bg-white border-2 border-slate-400 text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-100 transition-colors"
        >
          &larr; Back to Family Background (Step 3)
        </button>
        <button
          type="button"
          onClick={validateAndProceed}
          className="w-full sm:w-auto px-8 py-2.5 bg-[#002060] border-2 border-[#002060] text-xs font-bold text-white uppercase tracking-wider hover:bg-blue-950 transition-colors shadow-xs"
        >
          Proceed to Document Upload (Step 5) &rarr;
        </button>
      </div>
    </div>
  );
}
