"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FullEnrollmentFormData } from "./EnrollmentStepper";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import { createClient } from "@/lib/supabase/client";
import {
  JHS_PROGRAMS,
  SHS_TRACKS,
  STRENGTHENED_SHS_CORE_SUBJECTS,
  SNED_DIAGNOSES,
  SNED_MANIFESTATIONS,
  DISTANCE_LEARNING_MODALITIES,
} from "@/lib/types/enrollment";

export interface CourseSubjectItem {
  id: string;
  subject_code: string;
  subject_name: string;
  subject_type: "Core" | "Elective" | "Applied" | "Specialized" | "Intervention";
  grade_level: number;
  trimester: number;
  strand?: string | null;
  description?: string | null;
}

const isTechProSubject = (s: CourseSubjectItem) => {
  const strand = (s.strand || "").toUpperCase();
  const code = (s.subject_code || "").toUpperCase();
  return (
    strand === "TECHPRO" ||
    strand.startsWith("TVL") ||
    code.startsWith("TECH-") ||
    code.startsWith("TVL-")
  );
};

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
  const gradeNum = Number(targetGrade);

  // Current values with fallbacks
  const currentJhsProgram = data.jhsProgram || data.step1.jhsProgram || "Regular";
  const currentSpsSport = data.spsSport || "";

  // Track normalization
  const rawTrack = data.targetTrack || data.step1.targetTrack || "Academic Track";
  const currentTrack =
    rawTrack === "Technical-Vocational-Livelihood Track" || rawTrack === "TVL Track"
      ? "Technical-Professional Track"
      : rawTrack;

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Live subjects synchronized from Admin catalog
  const [subjectsList, setSubjectsList] = useState<CourseSubjectItem[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(!isJHS);

  // Fetch live subjects (silent mode avoids flickering skeleton)
  const fetchLiveSubjects = useCallback(async (showLoading: boolean = false) => {
    if (isJHS) return;
    if (showLoading) setIsLoadingSubjects(true);

    try {
      const res = await fetch(`/api/subjects?gradeLevel=${gradeNum}&_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const json = await res.json();
      if (json.success && Array.isArray(json.subjects)) {
        setSubjectsList(json.subjects);

        // Real-time synchronization check: if student had selected an elective that admin just deleted, clean it up
        const currentData = dataRef.current;
        if (currentTrack === "Academic Track" && currentData.selectedElectives && currentData.selectedElectives.length > 0) {
          const validCodes = new Set(
            json.subjects
              .filter((s: CourseSubjectItem) => s.grade_level === gradeNum && s.subject_type !== "Core" && !isTechProSubject(s))
              .map((s: CourseSubjectItem) => s.subject_code)
          );
          const filtered = currentData.selectedElectives.filter((c: string) => validCodes.has(c));
          if (filtered.length !== currentData.selectedElectives.length) {
            onChangeRef.current({ selectedElectives: filtered });
          }
        }
      }
    } catch (err) {
      console.warn("Could not load live subjects:", err);
    } finally {
      if (showLoading) setIsLoadingSubjects(false);
    }
  }, [isJHS, gradeNum, currentTrack]);

  // Real-time multi-channel listener: Supabase WebSocket + BroadcastChannel + Window Events + 3s Polling
  useEffect(() => {
    if (isJHS) return;

    // 1. Initial immediate fetch with loading skeleton
    fetchLiveSubjects(true);

    // 2. Supabase Realtime WebSocket Push (0-millisecond sync across any port or device)
    const supabase = createClient();
    const realtimeChannel = supabase
      .channel("dumalnext-subjects-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_subjects" },
        () => {
          fetchLiveSubjects(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings" },
        (payload: any) => {
          if (payload?.new?.key === "subjects_config" || payload?.eventType === "DELETE") {
            fetchLiveSubjects(false);
          }
        }
      )
      .on("broadcast", { event: "subjects-updated" }, () => {
        fetchLiveSubjects(false);
      })
      .subscribe();

    // 3. Browser BroadcastChannel for instant local cross-tab communication
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("dumalnext-subjects-sync");
        bc.onmessage = () => {
          fetchLiveSubjects(false);
        };
      } catch {}
    }

    // 4. Window events and storage listener (cross-origin / tab focus)
    const handleUpdate = () => fetchLiveSubjects(false);
    window.addEventListener("dumalnext:data-changed", handleUpdate);
    window.addEventListener("dumalnext:admin-data-changed", handleUpdate);
    window.addEventListener("dumalnext:subjects-changed", handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dumalnext:subjects-timestamp") {
        fetchLiveSubjects(false);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleUpdate);

    // 5. Silent background polling fallback (every 2 minutes, active tab only)
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchLiveSubjects(false);
      }
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      if (bc) bc.close();
      supabase.removeChannel(realtimeChannel);
      window.removeEventListener("dumalnext:data-changed", handleUpdate);
      window.removeEventListener("dumalnext:admin-data-changed", handleUpdate);
      window.removeEventListener("dumalnext:subjects-changed", handleUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleUpdate);
    };
  }, [isJHS, gradeNum, fetchLiveSubjects]);

  // Categorized subjects for the current Grade level
  const academicCoreSubjects = subjectsList.filter(
    (s) => s.grade_level === gradeNum && s.subject_type === "Core" && !isTechProSubject(s)
  );
  const academicElectiveSubjects = subjectsList.filter(
    (s) => s.grade_level === gradeNum && s.subject_type !== "Core" && !isTechProSubject(s)
  );

  const techproCoreSubjects = subjectsList.filter(
    (s) =>
      s.grade_level === gradeNum &&
      s.subject_type === "Core" &&
      (isTechProSubject(s) || s.strand === "General" || !s.strand)
  );
  const techproSpecializedSubjects = subjectsList.filter(
    (s) => s.grade_level === gradeNum && s.subject_type !== "Core" && isTechProSubject(s)
  );

  const [showCoreDetails, setShowCoreDetails] = useState<boolean>(false);

  const currentModalities = data.preferredModalities && data.preferredModalities.length > 0
    ? data.preferredModalities
    : ["Modular (Print)"];

  // Single-select Elective (Maximum of 1 allowed per semester)
  const handleElectiveToggle = (subjectCode: string) => {
    const current = data.selectedElectives || [];
    let updated: string[];
    if (current.includes(subjectCode)) {
      // Deselect if already selected
      updated = [];
    } else {
      // Select the clicked elective as the single chosen subject
      updated = [subjectCode];
    }
    onChange({ selectedElectives: updated });
    if (errors.selectedElectives) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.selectedElectives;
        return next;
      });
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
      if (currentTrack === "Academic Track" && academicElectiveSubjects.length > 0) {
        if (!data.selectedElectives || data.selectedElectives.length === 0) {
          newErrors.selectedElectives = `Please select one (1) elective subject for your Grade ${targetGrade} Academic Track curriculum.`;
        } else if (data.selectedElectives.length > 1) {
          newErrors.selectedElectives = "DepEd Policy: A maximum of one (1) elective subject is allowed per semester.";
        }
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
        const finalStrand = currentTrack === "Academic Track" ? "Academic" : "TechPro";
        const finalElectives = currentTrack === "Academic Track"
          ? (data.selectedElectives || [])
          : techproSpecializedSubjects.map((s) => s.subject_code);

        onChange({
          targetTrack: currentTrack,
          targetStrand: finalStrand,
          targetSemester: currentSemester,
          careerPathway: "",
          primaryCluster: finalStrand,
          doorwayElectives: [],
          selectedElectives: finalElectives,
          jhsProgram: undefined,
          spsSport: undefined,
          preferredModalities: currentModalities,
          step1: {
            ...data.step1,
            targetTrack: currentTrack,
            targetStrand: finalStrand,
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
    <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-8 font-sans rounded-lg shadow-sm">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold tracking-wider text-[#002060]">
            Step 04 of 05
          </span>
          <span className="text-xs font-medium text-slate-500">
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
        <div className="p-4 bg-red-50 border-2 border-red-300 space-y-1 rounded-md">
          <p className="text-xs font-bold text-red-800 leading-normal">
            Validation Required: Please address the highlighted required fields before advancing to Step 5.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONDITIONAL SECTION A: JUNIOR HIGH SCHOOL CURRICULAR PROGRAM (GRADES 7-10) */}
      {/* ========================================================================= */}
      {isJHS ? (
        <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300 rounded-md">
          <div className="border-b-2 border-slate-200 pb-3">
            <span className="text-xs font-bold text-[#002060] block">
              Section 4-B: Junior High School Curricular Program
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
                  className={`p-5 border-2 cursor-pointer transition-all flex flex-col justify-between rounded-md ${
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
                        <span className="text-xs font-bold text-slate-900">
                          {program.title}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold bg-[#002060] text-white px-2 py-0.5 uppercase rounded">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-[#002060] mb-1">
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
            <div className="p-4 bg-blue-50/70 border border-blue-300 space-y-1 mt-4 rounded-md">
              <span className="text-xs font-bold text-[#002060] block">
                General Special Program in Sports (SPS) Curriculum
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
          <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300 rounded-md">
            <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-[#002060] block">
                  Section 7-A: Senior High School Track Selection
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  The Strengthened Senior High School Program offers two (2) distinct tracks with unified core foundations and specialized elective clusters:
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#002060] text-white px-2.5 py-1 uppercase tracking-wider w-fit rounded">
                DEPED REFORM STANDARD
              </span>
            </div>

            {/* Auto-Synced Official Academic Term from IT-Support */}
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Semester / Trimester of Enrollment
              </label>
              <div className="p-3.5 bg-white border-2 border-[#002060] flex items-center justify-between shadow-xs rounded-md">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-[#002060]">
                    {activeSemester}
                  </div>
                  <div className="text-[11px] font-mono text-slate-600">
                    School Year {activeSchoolYear}
                    {activeTerm?.startDate && activeTerm?.endDate ? ` (${activeTerm.startDate} to ${activeTerm.endDate})` : ""}
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-950 border border-emerald-400 px-2.5 py-1 uppercase tracking-wider shrink-0 rounded">
                  AUTO-SYNCED (ACTIVE)
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-1">
                Centrally managed and synchronized with IT-Support Registered Academic Terms
              </p>
            </div>

            {/* 2-Track Selection Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-2">
                Select Track <span className="text-red-700">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SHS_TRACKS.map((t) => {
                  const isSelected = currentTrack === t.code;
                  return (
                    <label
                      key={t.code}
                      className={`p-5 border-2 cursor-pointer transition-all flex flex-col justify-between rounded-md ${
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
                                const newStrand = t.code === "Academic Track" ? "Academic" : "TechPro";
                                onChange({
                                  targetTrack: t.code,
                                  primaryCluster: newStrand,
                                  targetStrand: newStrand,
                                  selectedElectives:
                                    t.code === "Academic Track"
                                      ? []
                                      : techproSpecializedSubjects.map((s) => s.subject_code),
                                  doorwayElectives: [],
                                  step1: {
                                    ...data.step1,
                                    targetTrack: t.code,
                                    targetStrand: newStrand,
                                  },
                                });
                                if (errors.targetTrack) {
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.targetTrack;
                                    return next;
                                  });
                                }
                                if (errors.selectedElectives) {
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.selectedElectives;
                                    return next;
                                  });
                                }
                              }}
                              className="accent-[#002060] mt-0.5"
                            />
                            <span className="text-sm font-bold text-slate-900">
                              {t.name}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold bg-[#002060] text-white px-2 py-0.5 uppercase rounded">
                              SELECTED
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-semibold text-[#002060] mb-1">
                          {t.code === "Academic Track"
                            ? "Unified Core Foundations • Student Elective Selection"
                            : "Standardized Prescribed Curriculum • TESDA NC-Aligned"}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          {t.code === "Academic Track"
                            ? "Comprehensive academic preparation featuring fixed core foundations and student-selected elective courses configured by school administration."
                            : "Prescribed technical-vocational training with standardized specialized courses for the full academic year without elective choices."}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-600">
                          {t.code === "Academic Track" ? (
                            <>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">STEM</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">Humanities &amp; Social Sciences</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">Business &amp; Management</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">Arts &amp; Design</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">Sports &amp; Health</span>
                            </>
                          ) : (
                            <>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-950 rounded">Fixed Curriculum</span>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-950 rounded">TESDA NC II / III</span>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-950 rounded">Work Immersion</span>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-950 rounded">Industry Direct</span>
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

          {/* ========================================================================= */}
          {/* SECTION 7-B: ELECTIVE PART / PRESCRIBED TRACK CURRICULUM (SYNCED WITH ADMIN) */}
          {/* ========================================================================= */}
          {currentTrack === "Academic Track" ? (
            /* ACADEMIC TRACK: ELECTIVE SUBJECT SELECTION */
            <div className="space-y-4 p-6 bg-slate-50 border-2 border-slate-300 rounded-md">
              <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[#002060] block">
                    Section 7-B: Grade {targetGrade} Academic Track - Elective Part (Maximum 1 Subject)
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Choose one (1) elective subject for this semester. Under DepEd curriculum guidelines, learners may enroll in a maximum of one (1) elective offering per semester:
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-purple-100 text-purple-950 border border-purple-300 uppercase rounded">
                    {(data.selectedElectives || []).length} / 1 SELECTED
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100 text-[#002060] border border-blue-300 uppercase rounded">
                    MAX 1 PER SEMESTER
                  </span>
                </div>
              </div>

              {isLoadingSubjects ? (
                <div className="p-8 text-center bg-white border border-slate-200 space-y-2 rounded-md">
                  <div className="text-xs font-mono font-bold text-[#002060] animate-pulse">
                    Synchronizing elective subject offerings with Administrator catalog...
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Retrieving active Grade {targetGrade} elective offerings from database.
                  </p>
                </div>
              ) : academicElectiveSubjects.length === 0 ? (
                <div className="p-6 text-center bg-white border border-slate-200 space-y-2 rounded-md">
                  <span className="text-xs font-bold text-slate-600 block">
                    No Elective Subjects on Record for Grade {targetGrade} Academic Track
                  </span>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    The school administrator has not yet scheduled specific elective subjects for Grade {targetGrade} Academic Track. You may proceed with enrollment and your assigned adviser will confirm your schedule upon registration.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-900">
                      Select Elective Subject (Choose Maximum 1) <span className="text-red-700">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">
                      Click any card to select or switch your elective
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {academicElectiveSubjects.map((sub) => {
                      const isSelected = (data.selectedElectives || []).includes(sub.subject_code);
                      return (
                        <div
                          key={sub.id || sub.subject_code}
                          onClick={() => handleElectiveToggle(sub.subject_code)}
                          className={`p-4 border-2 cursor-pointer transition-all flex flex-col justify-between select-none rounded-md ${
                            isSelected
                              ? "bg-blue-50/60 border-[#002060] shadow-xs"
                              : "bg-white border-slate-300 hover:border-slate-400"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="academicElectiveRadio"
                                  value={sub.subject_code}
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="accent-[#002060] pointer-events-none"
                                />
                                <span className="text-xs font-mono font-bold text-[#002060]">
                                  {sub.subject_code}
                                </span>
                              </div>
                              <span
                                className={`text-[9px] font-mono font-bold px-2 py-0.5 uppercase border rounded ${
                                  isSelected
                                    ? "bg-[#002060] text-white border-[#002060]"
                                    : "bg-purple-100 text-purple-950 border-purple-300"
                                }`}
                              >
                                {isSelected ? "SELECTED" : sub.subject_type.toUpperCase()}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-slate-900 leading-snug">
                              {sub.subject_name}
                            </div>

                            {sub.description && (
                              <p className="text-[11px] text-slate-600 leading-relaxed mt-1.5 pt-1.5 border-t border-slate-200">
                                {sub.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {errors.selectedElectives && (
                    <p className="text-[11px] font-bold text-red-700 mt-2">{errors.selectedElectives}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* TECHPRO TRACK: PRESCRIBED STANDARDIZED CURRICULUM (NO ELECTIVES) */
            <div className="space-y-4 p-6 bg-slate-50 border-2 border-slate-300 rounded-md">
              <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[#002060] block">
                    Section 7-B: Grade {targetGrade} Technical-Professional Track - Prescribed Curriculum
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Standardized TechPro Curriculum: All specialized industry subjects configured by administration are fixed and automatically assigned for the full academic year.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-400 uppercase shrink-0 rounded">
                  FIXED CURRICULUM (NO ELECTIVES)
                </span>
              </div>

              {isLoadingSubjects ? (
                <div className="p-8 text-center bg-white border border-slate-200 space-y-2 rounded-md">
                  <div className="text-xs font-mono font-bold text-[#002060] animate-pulse">
                    Synchronizing TechPro specialized courses with Administrator catalog...
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Retrieving prescribed Grade {targetGrade} TechPro curriculum from database.
                  </p>
                </div>
              ) : techproSpecializedSubjects.length === 0 ? (
                <div className="p-6 text-center bg-white border border-slate-200 space-y-2 rounded-md">
                  <span className="text-xs font-bold text-slate-600 block">
                    No Specialized TechPro Subjects on Record for Grade {targetGrade}
                  </span>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    The administrator has not yet registered specific specialized courses for Grade {targetGrade} TechPro.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Prescribed Industry Specialization Courses ({techproSpecializedSubjects.length} Courses)
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">
                      TESDA NC-Aligned Standards
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {techproSpecializedSubjects.map((sub) => (
                      <div
                        key={sub.id || sub.subject_code}
                        className="p-4 bg-white border-2 border-amber-300 space-y-1.5 shadow-2xs rounded-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-[#002060]">
                            {sub.subject_code}
                          </span>
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-400 uppercase rounded">
                            PRESCRIBED / SPECIALIZED
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {sub.subject_name}
                        </div>
                        {sub.description && (
                          <p className="text-[11px] text-slate-600 leading-relaxed pt-1.5 border-t border-slate-100">
                            {sub.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-amber-50/80 border border-amber-300 text-xs text-amber-950 rounded-md">
                    <strong className="block text-[11px] mb-0.5">Automatic Enrollment Policy:</strong>
                    Under DepEd Technical-Professional track guidelines, learners undergo a standardized, unified industry syllabus without elective branching. All courses above will be studied throughout the entire academic year as configured by the school administration.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 7-C: MANDATORY CORE FOUNDATION SUBJECTS (SYNCED WITH ADMIN)       */}
          {/* ========================================================================= */}
          {(() => {
            const activeCoreList = currentTrack === "Academic Track" ? academicCoreSubjects : techproCoreSubjects;
            const displayCoreSubjects =
              activeCoreList.length > 0
                ? activeCoreList
                : gradeNum === 11
                ? STRENGTHENED_SHS_CORE_SUBJECTS.map((s, i) => ({
                    id: `fallback-core-${i}`,
                    subject_code: s.code,
                    subject_name: s.name,
                    subject_type: "Core" as const,
                    grade_level: 11,
                    trimester: 1,
                    description: s.description,
                  }))
                : [];

            return (
              <div className="space-y-4 p-6 bg-white border-2 border-slate-300 rounded-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-bold text-[#002060] block">
                      Section 7-C: Grade {targetGrade} Mandatory Unified Core Subjects
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Mandatory foundation subjects automatically enrolled for all Grade {targetGrade} {currentTrack} learners:
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 uppercase rounded">
                      AUTOMATICALLY ENROLLED
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCoreDetails(!showCoreDetails)}
                      className="text-xs font-bold text-[#002060] hover:underline cursor-pointer"
                    >
                      {showCoreDetails ? "Hide Details" : "View Details"}
                    </button>
                  </div>
                </div>

                {isLoadingSubjects && displayCoreSubjects.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono font-bold text-[#002060] animate-pulse">
                    Synchronizing core curriculum foundation...
                  </div>
                ) : displayCoreSubjects.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No core subjects on record for Grade {targetGrade}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayCoreSubjects.map((sub, idx) => (
                      <div
                        key={sub.id || sub.subject_code}
                        className="p-3 bg-slate-50 border border-slate-200 space-y-1 rounded-md"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                            {sub.subject_code || `Core 0${idx + 1}`}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-100 text-[#002060] font-bold rounded">
                            CORE
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {sub.subject_name}
                        </div>
                        {showCoreDetails && sub.description && (
                          <p className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-slate-200">
                            {sub.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 italic">
                  Notice: Core foundation courses are synchronized live from the administrator curriculum catalog and automatically assigned to all Grade {targetGrade} learners upon enrollment.
                </p>
              </div>
            );
          })()}

          {/* SECTION 7-D: WORK IMMERSION & FIELD EXPERIENCE NOTICE */}
          <div className="p-4 bg-slate-100 border border-slate-300 text-xs space-y-1 rounded-md">
            <span className="text-xs font-bold text-slate-900 block">
              DepEd Work Immersion & Field Experience Requirement
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
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300 rounded-md">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] block">
            Section 5: Special Needs Education (SNEd) &amp; Inclusive Support
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            DepEd mandate on inclusive education: Inquire if the learner requires specialized academic accommodations, adaptive facilities, or individualized learning assistance:
          </p>
        </div>

        {/* SNEd Yes/No Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-2">
            Does the learner have a diagnosed disability, health condition, or require special education support? <span className="text-red-700">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <label
              className={`p-3 border-2 flex items-center gap-3 cursor-pointer transition-colors rounded-md ${
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
              <div className="text-xs font-bold">
                No (General Education Learner)
              </div>
            </label>

            <label
              className={`p-3 border-2 flex items-center gap-3 cursor-pointer transition-colors rounded-md ${
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
              <div className="text-xs font-bold">
                Yes (SNEd / Inclusive Learner)
              </div>
            </label>
          </div>
        </div>

        {/* Expanded SNEd Fields */}
        {data.isSned && (
          <div className="p-5 bg-white border-2 border-blue-200 space-y-4 rounded-md">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
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
              <label className="block text-xs font-bold text-slate-900 mb-2">
                Specific Learning Need / Condition (DepEd Official Form Checklist) <span className="text-red-700">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-3 border border-slate-300 bg-slate-50 rounded-md">
                {(data.snedCategory === "Manifestations" ? SNED_MANIFESTATIONS : SNED_DIAGNOSES).map(
                  (item) => {
                    const isChecked = (data.snedDetails || []).includes(item);
                    return (
                      <label
                        key={item}
                        className="flex items-start gap-2 p-1.5 hover:bg-white text-xs text-slate-800 cursor-pointer rounded"
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
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300 rounded-md">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] block">
            Section 8: Preferred Distance Learning Modalities
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
                className={`p-3.5 border-2 flex items-start gap-3 cursor-pointer transition-colors rounded-md ${
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
          className="w-full sm:w-auto px-6 py-2.5 bg-white border-2 border-slate-400 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors rounded-md"
        >
          &larr; Back to Family Background (Step 3)
        </button>
        <button
          type="button"
          onClick={validateAndProceed}
          className="w-full sm:w-auto px-8 py-2.5 bg-[#002060] border-2 border-[#002060] text-xs font-bold text-white hover:bg-blue-950 transition-colors shadow-xs rounded-md"
        >
          Proceed to Document Upload (Step 5) &rarr;
        </button>
      </div>
    </div>
  );
}
