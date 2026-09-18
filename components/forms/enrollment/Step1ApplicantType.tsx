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
    
    // Clear error for applicantType if set
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
      newErrors.applicantType = "Kinakailangang pumili ng uri ng mag-aaral.";
    }

    if (!data.targetGradeLevel) {
      newErrors.targetGradeLevel = "Kinakailangang tukuyin ang baitang na papasukan.";
    }

    // Validation for Transferee / Returning (Balik-Aral)
    if (data.applicantType === "Transferee" || data.applicantType === "Returning") {
      if (!data.lastGradeCompleted) {
        newErrors.lastGradeCompleted = "Ilagay ang huling natapos na antas.";
      }
      if (!data.lastSchoolYearCompleted || data.lastSchoolYearCompleted.trim() === "") {
        newErrors.lastSchoolYearCompleted = "Ilagay ang huling taong panuruan na natapos (hal. 2024-2025).";
      }
      if (!data.lastSchoolAttended || data.lastSchoolAttended.trim() === "") {
        newErrors.lastSchoolAttended = "Ilagay ang pangalan ng dating pinapasukang paaralan.";
      }
      if (!data.lastSchoolId || data.lastSchoolId.trim().length !== 6) {
        newErrors.lastSchoolId = "Ang DepEd School ID ay dapat eksaktong 6 na numero.";
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
          [ Hakbang 1 ng 5: Klasipikasyon at Antas ng Mag-aaral ]
        </span>
        <h2 className="text-xl font-bold text-slate-900">
          Piliin ang Uri ng Aplikante at Antas na Papasukan
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Batay sa Seksiyon 2 at Seksiyon 6 ng Opisyal na DepEd Basic Education Enrollment Form.
        </p>
      </div>

      {/* Part A: Graded vs Non-Graded (SNEd Only) */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
          Uri ng Programa (Seksiyon 2)
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
              [ {data.isGraded ? "Napili" : "Piliin"} ]
            </div>
            <div className="text-sm font-bold text-slate-900">Graded Program</div>
            <div className="text-xs text-slate-600 mt-1">
              Para sa regular na mag-aaral ng Junior High School (G7-G10) at Senior High School (G11-G12).
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
              [ {!data.isGraded ? "Napili" : "Piliin"} ]
            </div>
            <div className="text-sm font-bold text-slate-900">Non-Graded Program (SNEd Only)</div>
            <div className="text-xs text-slate-600 mt-1">
              Inilaan eksklusibo para sa mga mag-aaral sa ilalim ng Special Needs Education Program.
            </div>
          </button>
        </div>
      </div>

      {/* Part B: Applicant Classification */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
          Kategorya ng Mag-aaral (Pumili ng isa)
        </label>

        {errors.applicantType && (
          <div className="p-3 bg-red-50 border-l-4 border-red-700 text-xs text-red-800 font-medium">
            [ Paalala ]: {errors.applicantType}
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
              [ {data.applicantType === "Grade 7" ? "Aktibo" : "Piliin" } ] Kategorya 01
            </div>
            <div className="text-sm font-bold text-slate-900">Incoming Grade 7</div>
            <div className="text-xs text-slate-600 mt-1">
              Nagtapos ng Grade 6 sa elementarya at papasok sa Unang Taon ng Junior High School.
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
              [ {data.applicantType === "Grade 11" ? "Aktibo" : "Piliin" } ] Kategorya 02
            </div>
            <div className="text-sm font-bold text-slate-900">Incoming Grade 11</div>
            <div className="text-xs text-slate-600 mt-1">
              Junior High School (Grade 10) Completer na magpapatala sa Senior High School.
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
              [ {data.applicantType === "Transferee" ? "Aktibo" : "Piliin" } ] Kategorya 03
            </div>
            <div className="text-sm font-bold text-slate-900">Transferee (Lumipat ng Paaralan)</div>
            <div className="text-xs text-slate-600 mt-1">
              Galing sa ibang pampubliko o pribadong paaralan na lilipat sa Dumalneg NHS (G7-G12).
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
              [ {data.applicantType === "Returning" ? "Aktibo" : "Piliin" } ] Kategorya 04
            </div>
            <div className="text-sm font-bold text-slate-900">Returning Student (Balik-Aral)</div>
            <div className="text-xs text-slate-600 mt-1">
              Mag-aaral na huminto ng pag-aaral noong nakaraang taon at muling magbabalik sa eskwela.
            </div>
          </button>
        </div>
      </div>

      {/* Part C: Dynamic Target Grade Level for Transferee / Returning */}
      {isTransfereeOrReturning && (
        <div className="space-y-3 p-5 bg-slate-50 border border-slate-300">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            Antas na Papasukan sa Dumalneg NHS (Grade Level)
          </label>
          <p className="text-xs text-slate-600 mb-2">
            Piliin kung saang antas ka magpapatala ngayong taon.
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
              [ Paalala ]: {errors.targetGradeLevel}
            </span>
          )}
        </div>
      )}

      {/* Part D: Dynamic Previous School Information (DepEd Section 6) */}
      {isTransfereeOrReturning && (
        <div className="space-y-4 p-5 bg-slate-50 border border-slate-300">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Seksiyon 6: Para sa Returning Learner (Balik-Aral) at Transferee ]
            </span>
            <p className="text-xs text-slate-600 mt-1">
              Impormasyon ng huling natapos na antas at dating pinasukang paaralan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Last Grade Completed */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Huling Antas na Natapos <span className="text-red-700">*</span>
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
                <option value="">-- Pumili ng Antas --</option>
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
                Huling Taong Panuruan na Natapos <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={data.lastSchoolYearCompleted || ""}
                onChange={(e) => onChange({ lastSchoolYearCompleted: e.target.value })}
                placeholder="Halimbawa: 2024-2025"
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
                Pangalan ng Huling Paaralang Pinasukan <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={data.lastSchoolAttended || ""}
                onChange={(e) => onChange({ lastSchoolAttended: e.target.value })}
                placeholder="Buong pangalan ng dating paaralan"
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
                School ID ng Dating Paaralan (6 Digits) <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={data.lastSchoolId || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  onChange({ lastSchoolId: val });
                }}
                placeholder="Hal. 300123"
                className="w-full p-2.5 bg-white border border-slate-300 text-sm font-mono tracking-widest focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                6-digit opisyal na numero ng paaralan na matatagpuan sa Report Card (Form 138).
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
            [ Kumpirmasyon ng Antas at Programa ]
          </div>
          <p className="text-slate-800">
            Ikaw ay magpapatala bilang:{" "}
            <strong>
              {data.applicantType === "Grade 7" && "Incoming Grade 7 (Junior High School)"}
              {data.applicantType === "Grade 11" && "Incoming Grade 11 (Senior High School)"}
              {data.applicantType === "Transferee" && `Transferee para sa Grade ${data.targetGradeLevel}`}
              {data.applicantType === "Returning" && `Returning Student (Balik-Aral) para sa Grade ${data.targetGradeLevel}`}
            </strong>{" "}
            sa ilalim ng <strong>{data.isGraded ? "Graded Program" : "Non-Graded Program (SNEd)"}</strong>.
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
          Susunod: Personal na Impormasyon (Hakbang 2)
        </button>
      </div>
    </div>
  );
}
