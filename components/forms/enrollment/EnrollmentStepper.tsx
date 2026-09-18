"use client";

import React, { useState } from "react";
import Step1ApplicantType, { Step1Data } from "./Step1ApplicantType";
import { downloadDepEdEnrollmentPdf } from "@/lib/utils/depedPdfGenerator";

export interface FullEnrollmentFormData {
  // Step 1: Classification
  step1: Step1Data;

  // Step 2: Learner Details
  lrn: string;
  psaBirthCertNo: string;
  lastName: string;
  firstName: string;
  middleName: string;
  extensionName: string;
  dateOfBirth: string;
  age: number | "";
  gender: "Male" | "Female" | "";
  placeOfBirth: string;
  religion: string;
  motherTongue: string;
  contactNumber: string;

  // IP & 4Ps
  isIpCommunity: boolean;
  ipCommunityName: string;
  is4psBeneficiary: boolean;
  householdId4ps: string;

  // Address
  currentHouseNo: string;
  currentSitio: string;
  currentBarangay: string;
  currentMunicipality: string;
  currentProvince: string;
  currentCountry: string;
  currentZipCode: string;
  isPermanentSameAsCurrent: boolean;
  permanentHouseNo: string;
  permanentSitio: string;
  permanentBarangay: string;
  permanentMunicipality: string;
  permanentProvince: string;
  permanentCountry: string;
  permanentZipCode: string;

  // Step 3: Family / Guardian
  fatherLastName: string;
  fatherFirstName: string;
  fatherMiddleName: string;
  fatherContactNumber: string;
  motherMaidenLastName: string;
  motherFirstName: string;
  motherMiddleName: string;
  motherContactNumber: string;
  guardianLastName: string;
  guardianFirstName: string;
  guardianMiddleName: string;
  guardianContactNumber: string;

  // Step 4: SHS, SNEd, & Modalities
  isSned: boolean;
  snedCategory: "Diagnosis" | "Manifestations" | "";
  snedDetails: string[];
  hasPwdId: boolean;
  targetSemester: "1st Semester" | "2nd Semester" | "";
  targetTrack: string;
  targetStrand: string;
  selectedElectives: string[];
  preferredModalities: string[];

  // Step 5: Documents & Agreements
  submittedDocuments: {
    type: "birth_certificate" | "form_138" | "id_picture" | "good_moral" | "other";
    fileName: string;
    fileUrl: string;
    sizeKb: number;
  }[];
  dataPrivacyAccepted: boolean;
}

const initialFormData: FullEnrollmentFormData = {
  step1: {
    isGraded: true,
    applicantType: "",
    targetGradeLevel: "",
    targetSemester: "1st Semester",
    targetTrack: "Academic Track",
    targetStrand: "",
    lastGradeCompleted: "",
    lastSchoolYearCompleted: "",
    lastSchoolAttended: "",
    lastSchoolId: "",
  },
  lrn: "",
  psaBirthCertNo: "",
  lastName: "",
  firstName: "",
  middleName: "",
  extensionName: "",
  dateOfBirth: "",
  age: "",
  gender: "",
  placeOfBirth: "",
  religion: "",
  motherTongue: "Ilokano",
  contactNumber: "",
  isIpCommunity: false,
  ipCommunityName: "",
  is4psBeneficiary: false,
  householdId4ps: "",
  currentHouseNo: "",
  currentSitio: "",
  currentBarangay: "Cabaritan",
  currentMunicipality: "Dumalneg",
  currentProvince: "Ilocos Norte",
  currentCountry: "Philippines",
  currentZipCode: "2921",
  isPermanentSameAsCurrent: true,
  permanentHouseNo: "",
  permanentSitio: "",
  permanentBarangay: "Cabaritan",
  permanentMunicipality: "Dumalneg",
  permanentProvince: "Ilocos Norte",
  permanentCountry: "Philippines",
  permanentZipCode: "2921",
  fatherLastName: "",
  fatherFirstName: "",
  fatherMiddleName: "",
  fatherContactNumber: "",
  motherMaidenLastName: "",
  motherFirstName: "",
  motherMiddleName: "",
  motherContactNumber: "",
  guardianLastName: "",
  guardianFirstName: "",
  guardianMiddleName: "",
  guardianContactNumber: "",
  isSned: false,
  snedCategory: "",
  snedDetails: [],
  hasPwdId: false,
  targetSemester: "1st Semester",
  targetTrack: "Academic Track",
  targetStrand: "",
  selectedElectives: [],
  preferredModalities: ["Modular (Print)"],
  submittedDocuments: [],
  dataPrivacyAccepted: false,
};

const STEP_LABELS = [
  { step: 1, label: "Classification", sublabel: "Learner Category" },
  { step: 2, label: "Learner Profile", sublabel: "Personal & Address" },
  { step: 3, label: "Family Background", sublabel: "Parent & Guardian" },
  { step: 4, label: "Curriculum & Modality", sublabel: "SHS Strand & SNEd" },
  { step: 5, label: "Documents & Submit", sublabel: "Compression & Review" },
];

export default function EnrollmentStepper() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<FullEnrollmentFormData>(initialFormData);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const handleStep1Change = (fields: Partial<Step1Data>) => {
    setFormData((prev) => ({
      ...prev,
      step1: { ...prev.step1, ...fields },
      ...(fields.targetTrack !== undefined ? { targetTrack: fields.targetTrack } : {}),
      ...(fields.targetStrand !== undefined ? { targetStrand: fields.targetStrand } : {}),
      ...(fields.targetSemester !== undefined ? { targetSemester: fields.targetSemester } : {}),
    }));
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadDepEdEnrollmentPdf(formData);
    } catch (err) {
      console.error("Failed to generate DepEd Enrollment PDF:", err);
      alert("Error generating PDF. Please ensure all required fields are filled.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6">
      {/* Official Stepper Progress Bar (Zero Emoji / Zero Icon) */}
      <div className="bg-white border border-slate-300 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#002060]">
              [ Dumalneg NHS Online Enrollment ]
            </span>
            <h1 className="text-lg font-bold text-slate-900">
              Basic Education Enrollment Form
            </h1>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-600 block">
              Step {currentStep} of 5
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {Math.round((currentStep / 5) * 100)}% Complete
            </span>
          </div>
        </div>

        {/* Stepper Steps Breadcrumbs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {STEP_LABELS.map((item) => {
            const isActive = currentStep === item.step;
            const isDone = currentStep > item.step;

            return (
              <div
                key={item.step}
                className={`p-2.5 border transition-colors ${
                  isActive
                    ? "bg-[#002060] text-white border-[#002060]"
                    : isDone
                    ? "bg-blue-50 text-[#002060] border-blue-200"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                <div className="font-mono font-bold text-[10px] uppercase">
                  [ {isDone ? "OK" : `0${item.step}`} ]
                </div>
                <div className="font-bold truncate mt-0.5">{item.label}</div>
                <div
                  className={`text-[10px] truncate ${
                    isActive ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {item.sublabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Step Content */}
      <div>
        {currentStep === 1 && (
          <Step1ApplicantType
            data={formData.step1}
            onChange={handleStep1Change}
            onNext={nextStep}
          />
        )}

        {currentStep === 2 && (
          <div className="bg-white p-8 border border-slate-300 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block mb-1">
                [ Step 2 of 5: Learner&apos;s Personal Information ]
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Full Name, Birthdate, LRN, Indigenous Cultural Community (IP), and Residential Address
              </h2>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 text-xs text-slate-700">
              Selected in Step 1:{" "}
              <strong>{formData.step1.applicantType}</strong> (Grade {formData.step1.targetGradeLevel}).
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary text-xs uppercase font-bold py-2.5 px-6"
              >
                Back to Step 1
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary text-xs uppercase font-bold py-2.5 px-6"
              >
                Proceed to Step 3
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="bg-white p-8 border border-slate-300 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block mb-1">
                [ Step 3 of 5: Parent &amp; Legal Guardian Information ]
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Father, Mother&apos;s Maiden Name, and Legal Guardian Background
              </h2>
            </div>
            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary text-xs uppercase font-bold py-2.5 px-6"
              >
                Back to Step 2
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary text-xs uppercase font-bold py-2.5 px-6"
              >
                Proceed to Step 4
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="bg-white p-8 border border-slate-300 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block mb-1">
                [ Step 4 of 5: Senior High School Track &amp; Strand, SNEd, and Modality ]
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Strand Selection, Cross-Strand Electives, and Distance Learning Modalities
              </h2>
            </div>
            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary text-xs uppercase font-bold py-2.5 px-6"
              >
                Back to Step 3
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary text-xs uppercase font-bold py-2.5 px-6"
              >
                Proceed to Step 5
              </button>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="bg-white p-8 border border-slate-300 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block mb-1">
                [ Step 5 of 5: Client-Side Document Upload &amp; Review ]
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Official Document Upload via HTML5 Canvas Compressor (&lt;350KB)
              </h2>
            </div>

            {/* Smart Feature: Automated DepEd PDF Form Filler */}
            <div className="p-6 bg-blue-50 border-2 border-[#002060] space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#002060]">
                  [ SMART FEATURE: AUTOMATED DEPED FORM FILLER (PDF) ]
                </span>
                <span className="text-[11px] font-mono bg-[#002060] text-white px-2 py-0.5 font-bold">
                  DEPED FORM REVISED 06/01/2025
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                All submitted learner credentials, previous school history, LRN, 4Ps data, and senior high school selections
                are automatically mapped onto the official 2-page DepEd Basic Education Enrollment Form template.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="btn-primary text-xs uppercase tracking-wider font-bold py-3 px-6 shadow-sm flex items-center justify-center"
                >
                  {isGeneratingPdf
                    ? "[ GENERATING OFFICIAL DEPED FORM... ]"
                    : "[ DOWNLOAD ACCOMPLISHED DEPED FORM (PDF) ]"}
                </button>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary text-xs uppercase font-bold py-2.5 px-6"
              >
                Back to Step 4
              </button>
              <button
                type="button"
                disabled
                className="bg-slate-300 text-slate-600 cursor-not-allowed text-xs uppercase font-bold py-2.5 px-6"
              >
                Submit Application
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
