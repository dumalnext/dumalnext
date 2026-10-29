"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/authContext";
import StudentHeaderNav from "@/components/layout/StudentHeaderNav";
import { StudentGradeRecord, GradesApiResponse } from "@/lib/types/grade";
import { createClient } from "@/lib/supabase/client";

export default function StudentGradesPage() {
  const { user } = useAuth();
  const [selectedTrimester, setSelectedTrimester] = useState<number>(1);
  const [gradesData, setGradesData] = useState<GradesApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [studentDetails, setStudentDetails] = useState<{
    lrn: string;
    fullName: string;
    sectionName?: string;
    gradeLevel?: string | number;
    strand?: string;
  } | null>(null);

  // Fetch student profile and grade records
  useEffect(() => {
    const currentUser = user;
    let isMounted = true;
    const supabase = createClient();

    async function loadData() {
      if (!currentUser) return;
      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch student record
        const cleanLrn = currentUser.lrn || (/^\d{12}$/.test(currentUser.userId || "") ? currentUser.userId : "");
        let stName = currentUser.fullName || "Learner";
        let resolvedLrn = cleanLrn;
        let secName = "Assigned Section";
        let gLevel: string | number = "High School";
        let strand = "";

        if (supabase) {
          const { data: stList } = await supabase
            .from("students")
            .select("*, sections:current_section_id(section_name, grade_level)")
            .or(`user_id.eq.${currentUser.id},student_id.eq.${cleanLrn || currentUser.userId}`)
            .limit(1);

          if (stList && stList[0]) {
            const st = stList[0];
            resolvedLrn = st.student_id || resolvedLrn;
            stName = `${st.first_name || ""} ${st.last_name || ""}`.trim() || stName;
            secName = st.sections?.section_name || secName;
            gLevel = st.grade_level || st.sections?.grade_level || gLevel;
            strand = st.strand || "";
          }
        }

        if (isMounted) {
          setStudentDetails({
            lrn: resolvedLrn,
            fullName: stName,
            sectionName: secName,
            gradeLevel: gLevel,
            strand,
          });
        }

        // 2. Fetch grades from API
        const queryParams = new URLSearchParams();
        if (resolvedLrn) queryParams.set("lrn", resolvedLrn);
        if (currentUser.id) queryParams.set("studentId", currentUser.id);

        const res = await fetch(`/api/grades?${queryParams.toString()}`);
        const data: GradesApiResponse = await res.json();

        if (isMounted) {
          if (res.ok && data.success) {
            setGradesData(data);
            if (data.termNumber && data.termNumber >= 1 && data.termNumber <= 3) {
              setSelectedTrimester(data.termNumber);
            }
          } else {
            setError(data.error || "Unable to load grade records.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error fetching student grades:", err);
          setError("A network error occurred while loading grade records.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const activeRecords = gradesData?.records || [];
  const activeSY = gradesData?.schoolYear || "2026-2027";
  const isGradeOpen = gradesData?.isGradeOpen ?? true;

  // Find record for current selected trimester
  const currentGrade = activeRecords.find((r) => r.trimester === selectedTrimester);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <StudentHeaderNav />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="bg-white border-2 border-slate-300 p-5 sm:p-6 rounded-[4px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#002060] text-white">
                Official DepEd Grades
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                School Year {activeSY}
              </span>
              {isGradeOpen ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded text-[10px] font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Viewing Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded text-[10px] font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  Administrative Review
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              My Academic Grades
            </h1>
            <p className="text-xs text-slate-600">
              View your teacher-submitted report card pictures, SF9 snapshots, and academic evaluations per trimester.
            </p>
          </div>

          {/* Student Badge Card */}
          {studentDetails && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-[4px] text-xs font-mono shrink-0 space-y-0.5">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Learner Information
              </div>
              <div className="font-bold text-[#002060] text-sm">
                {studentDetails.fullName}
              </div>
              <div className="text-slate-600 text-[11px]">
                LRN: <strong>{studentDetails.lrn || "PENDING"}</strong>
              </div>
              {studentDetails.sectionName && (
                <div className="text-slate-600 text-[11px]">
                  Section: <strong>{studentDetails.sectionName}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Administrative Closed Banner (if turned off by admin) */}
        {!isGradeOpen && (
          <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-[4px] text-xs text-amber-950 flex items-start gap-3 shadow-xs">
            <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              !
            </div>
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider block text-amber-900">
                Grade Submission &amp; Evaluation Notice
              </span>
              <p className="leading-relaxed">
                The School Administrator has closed online grade submissions in the Control Room. Teachers cannot upload new grade snapshots at this time. Existing released records remain accessible below.
              </p>
            </div>
          </div>
        )}

        {/* Trimester Tabs */}
        <div className="bg-white border-2 border-slate-300 p-2 rounded-[4px] shadow-xs flex flex-wrap gap-2">
          {[1, 2, 3].map((tNum) => {
            const hasGradeForTerm = activeRecords.some((r) => r.trimester === tNum);
            const isSelected = selectedTrimester === tNum;

            return (
              <button
                key={tNum}
                type="button"
                onClick={() => setSelectedTrimester(tNum)}
                className={`flex-1 min-w-[120px] py-2.5 px-3 text-xs font-bold rounded-[3px] transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                  isSelected
                    ? "bg-[#002060] text-white border-[#002060] shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <span className="uppercase tracking-wider">
                  Trimester {tNum}
                </span>
                {hasGradeForTerm ? (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isSelected
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}
                  >
                    Done
                  </span>
                ) : (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    Pending
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Grade Card Content */}
        {isLoading ? (
          <div className="bg-white border-2 border-slate-300 p-12 text-center rounded-[4px]">
            <div className="w-6 h-6 border-2 border-[#002060] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-mono text-slate-600">
              Loading official grade records...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-300 p-6 rounded-[4px] text-xs text-red-950 font-mono space-y-2">
            <div className="font-bold uppercase tracking-wider text-red-900">
              Error Loading Grades
            </div>
            <p>{error}</p>
          </div>
        ) : currentGrade ? (
          <div className="bg-white border-2 border-slate-300 rounded-[4px] shadow-sm overflow-hidden space-y-0">
            {/* Grade Meta Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded">
                    Status: DONE
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                    {currentGrade.termName} &bull; S.Y. {currentGrade.schoolYear}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Adviser: <strong>{currentGrade.uploadedByTeacherName || "Class Adviser"}</strong>
                  {currentGrade.uploadedAt && (
                    <span className="ml-2 font-mono text-[11px] text-slate-500">
                      &bull; Released on {new Date(currentGrade.uploadedAt).toLocaleDateString()} at{" "}
                      {new Date(currentGrade.uploadedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                {currentGrade.remarks && (
                  <p className="text-xs text-slate-700 italic mt-1 bg-amber-50 p-2 border border-amber-200 rounded">
                    &ldquo;{currentGrade.remarks}&rdquo;
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewImage({
                      url: currentGrade.gradeImageUrl,
                      title: `${currentGrade.termName} Grade - ${studentDetails?.fullName || "Student"}`,
                    })
                  }
                  className="px-3.5 py-2 bg-[#002060] hover:bg-[#002b80] text-white text-xs font-bold rounded transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Full Photo</span>
                </button>
                <a
                  href={currentGrade.gradeImageUrl}
                  download={currentGrade.gradeImageName || `Grade_${currentGrade.termName}.jpg`}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download</span>
                </a>
              </div>
            </div>

            {/* Embedded Grade Image Display */}
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-100/60 border-t border-slate-200">
              <div
                onClick={() =>
                  setPreviewImage({
                    url: currentGrade.gradeImageUrl,
                    title: `${currentGrade.termName} Grade - ${studentDetails?.fullName || "Student"}`,
                  })
                }
                className="max-w-2xl w-full max-h-[500px] overflow-hidden rounded border-2 border-slate-300 bg-white shadow-md cursor-pointer group relative flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentGrade.gradeImageUrl}
                  alt={currentGrade.gradeImageName || "Student Grade Snapshot"}
                  className="w-full h-auto object-contain max-h-[500px] group-hover:opacity-95 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-3 py-1.5 bg-[#002060] text-white text-xs font-bold rounded shadow-md flex items-center gap-1.5">
                    Click to Zoom
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-500 mt-2">
                Click picture to enlarge or download an official copy.
              </span>
            </div>
          </div>
        ) : (
          /* Empty / Pending Evaluation State */
          <div className="bg-white border-2 border-slate-300 p-8 sm:p-12 text-center rounded-[4px] shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center mx-auto text-slate-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded text-[10px] font-bold uppercase tracking-wider inline-block">
                Status: Pending Evaluation
              </span>
              <h3 className="text-base font-bold text-slate-900 uppercase">
                Trimester {selectedTrimester} Grade Not Yet Released
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your class adviser has not uploaded the official grade snapshot for <strong>Trimester {selectedTrimester}</strong> yet. Once evaluated and submitted by your teacher, it will automatically appear here with a <strong>DONE</strong> status.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Full-Screen Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-[4px] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#002060] text-white px-4 py-3 flex items-center justify-between border-b border-blue-950">
              <span className="text-xs font-bold uppercase font-mono tracking-wider truncate">
                {previewImage.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-white hover:text-slate-300 text-xl font-bold px-2 py-0.5 cursor-pointer leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-[80vh] object-contain rounded"
              />
            </div>
            <div className="bg-slate-100 p-3 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="font-mono text-[11px] text-slate-500">
                Official Dumalneg National High School Electronic SF9
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  download="Grade_Snapshot.jpg"
                  className="px-3 py-1.5 bg-[#002060] text-white font-bold rounded text-xs hover:bg-[#002b80] cursor-pointer"
                >
                  Download File
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-800 font-bold rounded text-xs hover:bg-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
