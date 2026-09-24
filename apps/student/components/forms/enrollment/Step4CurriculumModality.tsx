"use client";

import React, { useState, useEffect } from "react";
import { FullEnrollmentFormData } from "./EnrollmentStepper";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import {
  JHS_PROGRAMS,
  SPS_SPORTS,
  SHS_STRANDS,
  SHS_TRACKS,
  SHS_ACADEMIC_CLUSTERS,
  SHS_TECHPRO_CLUSTERS,
  CAREER_PATHWAYS,
  STRENGTHENED_SHS_CORE_SUBJECTS,
  STRENGTHENED_SHS_ELECTIVES,
  getStrengthenedElectives,
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
  schoolYear?: string;
  semester?: string;
}

export default function Step4CurriculumModality({
  data,
  onChange,
  onNext,
  onBack,
  schoolYear,
  semester,
}: Step4CurriculumModalityProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time synchronization with IT-Support Registered Academic Terms
  const { semester: controlSemester, schoolYear: controlSchoolYear, activeTerm } = useEnrollmentControl();

  const activeSemester =
    semester ||
    controlSemester ||
    activeTerm?.termName ||
    data.targetSemester ||
    data.semester ||
    data.step1.targetSemester ||
    "Trimester 1";

  const activeSchoolYear =
    schoolYear ||
    controlSchoolYear ||
    activeTerm?.schoolYear ||
    data.schoolYear ||
    "2026–2027";

  const currentSemester = activeSemester;

  // Auto-sync form state to active semester managed by IT-support
  useEffect(() => {
    if (activeSemester && (data.targetSemester !== activeSemester || data.step1?.targetSemester !== activeSemester)) {
      onChange({
        targetSemester: activeSemester,
        semester: activeSemester,
        step1: {
          ...data.step1,
          targetSemester: activeSemester,
        },
      });
    }
  }, [activeSemester]);

  // Detection: Check if learner belongs to Junior High School (Grade 7 - 10) or Senior High School (Grade 11 - 12)
  const isJHS =
    data.step1.applicantType === "Grade 7" ||
    (typeof data.step1.targetGradeLevel === "number" && data.step1.targetGradeLevel <= 10) ||
    Number(data.step1.targetGradeLevel) === 7;

  const targetGrade = data.step1.targetGradeLevel || (data.step1.applicantType === "Grade 7" ? 7 : 11);

  // Current values with fallbacks
  const currentJhsProgram = data.jhsProgram || data.step1.jhsProgram || "Regular";
  const currentSpsSport = data.spsSport || "";

  // Track normalization
  const rawTrack = data.targetTrack || data.step1.targetTrack || "Academic Track";
  const currentTrack =
    rawTrack === "Technical-Vocational-Livelihood Track" || rawTrack === "TVL Track"
      ? "Technical-Professional Track"
      : rawTrack;

  const currentPathway = data.careerPathway || "";
  const currentCluster =
    data.primaryCluster ||
    (currentTrack === "Academic Track"
      ? "Science, Technology, Engineering, and Mathematics"
      : "ICT Support and Computer Programming Technologies");

  const currentElectives = data.selectedElectives || [];
  const currentDoorwayElectives = data.doorwayElectives || [];

  const [enableElectives, setEnableElectives] = useState<boolean>(() => {
    return Array.isArray(data.selectedElectives) && data.selectedElectives.length > 0;
  });

  const [enableDoorway, setEnableDoorway] = useState<boolean>(() => {
    return Array.isArray(data.doorwayElectives) && data.doorwayElectives.length > 0;
  });

  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>("ALL");
  const [showCoreDetails, setShowCoreDetails] = useState<boolean>(false);

  // Strengthened SHS Electives for current track
  const trackElectives = getStrengthenedElectives({
    targetTrack: currentTrack,
    cluster: selectedClusterFilter === "ALL" ? undefined : selectedClusterFilter,
    gradeLevel: targetGrade,
    isDoorway: false,
  });

  // Cross-track Doorway electives (from the other track)
  const doorwayOptions = getStrengthenedElectives({
    targetTrack: currentTrack,
    gradeLevel: targetGrade,
    isDoorway: true,
  });

  const currentModalities = data.preferredModalities && data.preferredModalities.length > 0
    ? data.preferredModalities
    : ["Modular (Print)"];

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

  // Toggle Doorway Electives (Maximum 2 allowed per DepEd guidelines)
  const handleDoorwayToggle = (code: string) => {
    let updated: string[];
    if (currentDoorwayElectives.includes(code)) {
      updated = currentDoorwayElectives.filter((c) => c !== code);
    } else {
      if (currentDoorwayElectives.length >= 2) {
        alert("DepEd Reform Policy: Learners may select a maximum of two (2) Doorway cross-track electives.");
        return;
      }
      updated = [...currentDoorwayElectives, code];
    }
    onChange({ doorwayElectives: updated });
  };

  // Pathway selection change
  const handlePathwayChange = (pathwayId: string) => {
    if (!pathwayId) {
      onChange({ careerPathway: "" });
      return;
    }
    const pathway = CAREER_PATHWAYS.find((p) => p.id === pathwayId);
    if (pathway) {
      onChange({
        careerPathway: pathway.name,
        targetTrack: pathway.track,
        primaryCluster: pathway.primaryCluster,
        targetStrand: pathway.primaryCluster,
        step1: {
          ...data.step1,
          targetTrack: pathway.track,
          targetStrand: pathway.primaryCluster,
        },
      });
      setSelectedClusterFilter(pathway.primaryCluster);
    }
  };

  // Toggle Modality in multi-select array
  const handleModalityToggle = (modality: string) => {
    let updated: string[];
    if (currentModalities.includes(modality)) {
      if (currentModalities.length === 1) {
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
    } else {
      // SHS Validation
      if (!currentSemester) {
        newErrors.targetSemester = "Senior High School semester selection is required.";
      }
      if (!currentTrack) {
        newErrors.targetTrack = "Senior High School track selection is required.";
      }
      if (!currentCluster) {
        newErrors.primaryCluster = "Thematic elective cluster selection is required.";
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
          careerPathway: "",
          primaryCluster: "",
          selectedElectives: [],
          doorwayElectives: [],
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
          targetStrand: currentCluster || currentPathway || currentTrack,
          targetSemester: currentSemester,
          careerPathway: currentPathway,
          primaryCluster: currentCluster,
          doorwayElectives: enableDoorway ? currentDoorwayElectives : [],
          selectedElectives: currentElectives,
          jhsProgram: undefined,
          spsSport: undefined,
          preferredModalities: currentModalities,
          step1: {
            ...data.step1,
            targetTrack: currentTrack,
            targetStrand: currentCluster || currentPathway || currentTrack,
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

          {/* General SPS Program Notice */}
          {currentJhsProgram === "SPS" && (
            <div className="p-4 bg-blue-50/70 border border-blue-300 space-y-1 mt-4">
              <span className="text-xs font-bold text-[#002060] uppercase block">
                [ General Special Program in Sports (SPS) Curriculum ]
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                The learner is enrolled under the unified Special Program in Sports curriculum combining secondary academic courses with structured athletic training and sports development. No individual sport selection is required.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* CONDITIONAL SECTION B: SENIOR HIGH SCHOOL PROGRAM (GRADES 11-12)          */
        /* DEPED STRENGTHENED SENIOR HIGH SCHOOL PROGRAM (REFORM STANDARD)           */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* SECTION 7-A: ACADEMIC TRACK & SEMESTER SELECTION */}
          <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
            <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                  [ Section 7-A: Senior High School Track Selection ]
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  The Strengthened Senior High School Program offers two (2) distinct tracks with unified core foundations and specialized elective clusters:
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#002060] text-white px-2.5 py-1 uppercase tracking-wider w-fit">
                DEPED REFORM STANDARD
              </span>
            </div>

            {/* Auto-Synced Official Academic Term from IT-Support */}
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Semester / Trimester of Enrollment
              </label>
              <div className="p-3.5 bg-white border-2 border-[#002060] flex items-center justify-between shadow-xs">
                <div className="space-y-0.5">
                  <div className="text-sm font-mono font-bold text-[#002060] uppercase">
                    {activeSemester}
                  </div>
                  <div className="text-[11px] font-mono text-slate-600">
                    School Year {activeSchoolYear}
                    {activeTerm?.startDate && activeTerm?.endDate ? ` (${activeTerm.startDate} to ${activeTerm.endDate})` : ""}
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-950 border border-emerald-400 px-2.5 py-1 uppercase tracking-wider shrink-0">
                  AUTO-SYNCED (ACTIVE)
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-1">
                [ Centrally managed and synchronized with IT-Support Registered Academic Terms ]
              </p>
            </div>

            {/* 2-Track Selection Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-2">
                Select Track <span className="text-red-700">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SHS_TRACKS.map((t) => {
                  const isSelected = currentTrack === t.code;
                  return (
                    <label
                      key={t.code}
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
                              name="targetTrack"
                              value={t.code}
                              checked={isSelected}
                              onChange={() => {
                                const newCluster =
                                  t.code === "Academic Track"
                                    ? "Science, Technology, Engineering, and Mathematics"
                                    : "ICT Support and Computer Programming Technologies";
                                onChange({
                                  targetTrack: t.code,
                                  primaryCluster: newCluster,
                                  targetStrand: newCluster,
                                  selectedElectives: [],
                                  doorwayElectives: [],
                                  step1: {
                                    ...data.step1,
                                    targetTrack: t.code,
                                    targetStrand: newCluster,
                                  },
                                });
                                setSelectedClusterFilter("ALL");
                                if (errors.targetTrack) {
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.targetTrack;
                                    return next;
                                  });
                                }
                              }}
                              className="accent-[#002060] mt-0.5"
                            />
                            <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                              {t.name}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold bg-[#002060] text-white px-2 py-0.5 uppercase">
                              SELECTED
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono font-bold text-[#002060] uppercase mb-1">
                          {t.code === "Academic Track"
                            ? "5 Academic Clusters • 800 Core Hrs • 960 Elective Hrs"
                            : "10 TechPro Clusters • TESDA NC-Aligned • 320-640 Hrs Immersion"}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          {t.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-600">
                          {t.code === "Academic Track" ? (
                            <>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200">STEM</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200">Humanities & Social Sciences</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200">Business & Management</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200">Arts & Design</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200">Sports & Health</span>
                            </>
                          ) : (
                            <>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-950">ICT Programming & Hardware</span>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-950">Industrial & Electrical</span>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-950">Hospitality & Tourism</span>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-950">Agri-Fishery Arts</span>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-950">Maritime Transport</span>
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.targetTrack && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.targetTrack}</p>
              )}
            </div>
          </div>

          {/* SECTION 7-B: CAREER PATHWAYS (DEPED ANNEX B) */}
          <div className="space-y-4 p-6 bg-slate-50 border-2 border-slate-300">
            <div className="border-b-2 border-slate-200 pb-3">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                [ Section 7-B: Career Pathway Specialization (Annex B) ]
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Optional: Select a designated career pathway to automatically configure recommended elective courses and primary clusters, or choose custom exploration:
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Designated Career Pathway
              </label>
              <select
                value={CAREER_PATHWAYS.find((p) => p.name === currentPathway)?.id || ""}
                onChange={(e) => handlePathwayChange(e.target.value)}
                className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold focus:border-[#002060] outline-none"
              >
                <option value="">-- Custom / Exploratory Cluster Selection --</option>
                {CAREER_PATHWAYS.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.track === "Academic Track" ? "ACAD" : "TECHPRO"}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pathway Info Card */}
            {currentPathway && (
              <div className="p-4 bg-white border-2 border-blue-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#002060] uppercase">
                    Active Pathway: {currentPathway}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-[#002060] border border-blue-200 font-bold uppercase">
                    {currentTrack}
                  </span>
                </div>
                {CAREER_PATHWAYS.find((p) => p.name === currentPathway)?.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {CAREER_PATHWAYS.find((p) => p.name === currentPathway)?.description}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px] uppercase">
                      Recommended Academic Electives:
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      {CAREER_PATHWAYS.find((p) => p.name === currentPathway)?.recommendedAcademicElectives.join(", ") || "None specified"}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px] uppercase">
                      Recommended TechPro Electives:
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      {CAREER_PATHWAYS.find((p) => p.name === currentPathway)?.recommendedTechProElectives.join(", ") || "None specified"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 7-C: PRIMARY THEMATIC ELECTIVE CLUSTER */}
          <div className="space-y-4 p-6 bg-slate-50 border-2 border-slate-300">
            <div className="border-b-2 border-slate-200 pb-3">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                [ Section 7-C: Primary Thematic Elective Cluster ]
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Under the strengthened program, rigid strands are replaced by flexible thematic clusters. Select your primary area of focus:
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-2">
                Primary Cluster for {currentTrack} <span className="text-red-700">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(currentTrack === "Academic Track" ? SHS_ACADEMIC_CLUSTERS : SHS_TECHPRO_CLUSTERS).map((cl) => {
                  const isChecked = currentCluster === cl;
                  return (
                    <label
                      key={cl}
                      className={`p-3 border-2 flex items-center gap-3 cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? "bg-white border-[#002060] font-bold text-[#002060] shadow-xs"
                          : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="primaryCluster"
                        value={cl}
                        checked={isChecked}
                        onChange={() => {
                          onChange({
                            primaryCluster: cl,
                            targetStrand: cl,
                            step1: { ...data.step1, targetStrand: cl },
                          });
                          if (errors.primaryCluster) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.primaryCluster;
                              return next;
                            });
                          }
                        }}
                        className="accent-[#002060]"
                      />
                      <span>{cl}</span>
                    </label>
                  );
                })}
              </div>
              {errors.primaryCluster && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.primaryCluster}</p>
              )}
            </div>
          </div>

          {/* SECTION 7-D: MANDATORY GRADE 11 UNIFIED CORE FOUNDATION */}
          <div className="space-y-4 p-6 bg-white border-2 border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                  [ Section 7-D: Grade 11 Mandatory Unified Core Subjects ]
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Five (5) mandatory unified foundation subjects (160 credit hours each, total 800 hours across Grade 11):
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 uppercase">
                  AUTOMATICALLY ENROLLED
                </span>
                <button
                  type="button"
                  onClick={() => setShowCoreDetails(!showCoreDetails)}
                  className="text-xs font-bold text-[#002060] hover:underline cursor-pointer"
                >
                  [{showCoreDetails ? "Hide Details" : "View Details"}]
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STRENGTHENED_SHS_CORE_SUBJECTS.map((sub, idx) => (
                <div
                  key={sub.code}
                  className="p-3 bg-slate-50 border border-slate-200 space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                      Core 0{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-100 text-[#002060] font-bold">
                      160 HRS
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 leading-snug">
                    {sub.name}
                  </div>
                  {showCoreDetails && (
                    <p className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-slate-200">
                      {sub.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Notice: Under the Decongested Curriculum Reform, subjects have been reduced to 5 high-impact, in-depth core courses. These are automatically assigned to all Grade 11 learners.
            </p>
          </div>

          {/* SECTION 7-E: TRACK SPECIALIZED ELECTIVES */}
          <div className="space-y-4 p-5 bg-slate-50 border-2 border-slate-300">
            <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                  [ Section 7-E: Track Specialized Elective Courses ]
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Select specialized elective subjects aligned with your track and career goals:
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

            {enableElectives ? (
              <div className="space-y-4">
                {/* Cluster Filter inside Track */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 uppercase">Filter Cluster:</span>
                    <select
                      value={selectedClusterFilter}
                      onChange={(e) => setSelectedClusterFilter(e.target.value)}
                      className="p-1.5 bg-white border border-slate-300 text-xs font-bold outline-none"
                    >
                      <option value="ALL">All Clusters in {currentTrack}</option>
                      {(currentTrack === "Academic Track" ? SHS_ACADEMIC_CLUSTERS : SHS_TECHPRO_CLUSTERS).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="font-mono font-bold text-[#002060] bg-white px-2 py-0.5 border border-slate-300 w-fit">
                    SELECTED: {currentElectives.length} SUBJECT(S)
                  </span>
                </div>

                {trackElectives.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trackElectives.map((elec) => {
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
                              {elec.ncLevel && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 font-bold">
                                  {elec.ncLevel}
                                </span>
                              )}
                              {elec.hours && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-[#002060] border border-blue-200">
                                  {elec.hours} HRS
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 uppercase">
                              Cluster: {elec.cluster}
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed">
                              {elec.description}
                            </p>
                            {elec.prerequisites && elec.prerequisites !== "none" && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Prereq: {elec.prerequisites}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-300 text-xs text-slate-600">
                    No specialized electives matching the current filter.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-white border border-slate-300 space-y-1">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                  [ STANDARD PROGRAM ACTIVE: NO OPTIONAL ELECTIVES SELECTED ]
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Switch the selector to ON if you wish to enroll in specialized cluster electives for this school term.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 7-F: DOORWAY OPTION (CROSS-TRACK ELECTIVES) */}
          <div className="space-y-4 p-5 bg-blue-50/50 border-2 border-blue-300">
            <div className="border-b border-blue-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
                    [ Section 7-F: Doorway Option (Cross-Track Exploration) ]
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-[#002060] text-white px-2 py-0.5 uppercase">
                    DEPED REFORM EXCLUSIVE
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Under the Strengthened Senior High School Program, learners are allowed to select <strong>1 to 2 electives from the other track</strong> without track shifting, enabling cross-disciplinary discovery.
                </p>
              </div>

              {/* Doorway Toggle Switch */}
              <div className="flex items-center gap-3 bg-white p-2 border border-slate-300 self-start sm:self-auto shadow-xs">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Doorway Mode:
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableDoorway}
                  onClick={() => {
                    const next = !enableDoorway;
                    setEnableDoorway(next);
                    if (!next) {
                      onChange({ doorwayElectives: [] });
                    }
                  }}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none border-2 ${
                    enableDoorway
                      ? "bg-[#002060] border-[#002060]"
                      : "bg-slate-200 border-slate-400"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform bg-white transition duration-200 ease-in-out mt-0.5 ${
                      enableDoorway ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-mono font-bold uppercase px-2 py-0.5 ${
                    enableDoorway
                      ? "bg-[#002060] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {enableDoorway ? "ON" : "OFF"}
                </span>
              </div>
            </div>

            {enableDoorway ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-700">
                  <span className="font-semibold">
                    Offering cross-track courses from{" "}
                    <strong>
                      {currentTrack === "Academic Track" ? "Technical-Professional Track" : "Academic Track"}
                    </strong>:
                  </span>
                  <span className="font-mono font-bold text-[#002060] bg-white px-2.5 py-0.5 border border-blue-300 w-fit">
                    DOORWAY ELECTIVES: {currentDoorwayElectives.length} / 2 MAXIMUM
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {doorwayOptions.slice(0, 12).map((elec) => {
                    const isSelected = currentDoorwayElectives.includes(elec.code);
                    return (
                      <label
                        key={elec.code}
                        className={`p-3.5 border-2 flex items-start gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-white border-[#002060] shadow-xs"
                            : "bg-white border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleDoorwayToggle(elec.code)}
                          className="accent-[#002060] mt-1"
                        />
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold ${isSelected ? "text-[#002060]" : "text-slate-900"}`}>
                              {elec.name}
                            </span>
                            {elec.ncLevel && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 font-bold">
                                {elec.ncLevel}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">
                            Source Track: {elec.track}
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            {elec.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white border border-slate-300 text-xs text-slate-600">
                Doorway Option is currently OFF. Turn ON to select 1 to 2 electives from the alternate track.
              </div>
            )}
          </div>

          {/* SECTION 7-G: WORK IMMERSION & FIELD EXPERIENCE NOTICE */}
          <div className="p-4 bg-slate-100 border border-slate-300 text-xs space-y-1">
            <span className="font-bold text-slate-900 uppercase block">
              [ DepEd Work Immersion & Field Experience Requirement ]
            </span>
            <p className="text-slate-700 leading-relaxed">
              {currentTrack === "Technical-Professional Track"
                ? "Technical-Professional learners complete a mandatory 320 to 640 hours of workplace immersion in Grade 12 directly aligned with TESDA qualifications and partner industry facilities in Dumalneg and northern Luzon."
                : "Academic Track learners undergo Field Experience and Prototyping (160 to 320 hours) in research laboratories, legal offices, medical clinics, or corporate enterprises during Grade 12."}
            </p>
          </div>
        </div>
      )}

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
