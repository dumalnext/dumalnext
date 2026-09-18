"use client";

import React, { useState } from "react";
import Step1ApplicantType, { Step1Data } from "./Step1ApplicantType";
import Step2LearnerProfile from "./Step2LearnerProfile";
import Step3FamilyBackground from "./Step3FamilyBackground";
import Step4CurriculumModality from "./Step4CurriculumModality";
import Step5DocumentsReview from "./Step5DocumentsReview";
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
  guardianRelationship?: string;
  primaryContactPerson?: "Father" | "Mother" | "Guardian";

  // Step 4: Curriculum (JHS / SHS), SNEd, & Modalities
  isSned: boolean;
  snedCategory: "Diagnosis" | "Manifestations" | "";
  snedDetails: string[];
  hasPwdId: boolean;
  jhsProgram?: "Regular" | "SPS";
  spsSport?: string;
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
    jhsProgram: "Regular",
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
  currentBarangay: "CABARITAN",
  currentMunicipality: "DUMALNEG",
  currentProvince: "ILOCOS NORTE",
  currentCountry: "PHILIPPINES",
  currentZipCode: "2921",
  isPermanentSameAsCurrent: true,
  permanentHouseNo: "",
  permanentSitio: "",
  permanentBarangay: "CABARITAN",
  permanentMunicipality: "DUMALNEG",
  permanentProvince: "ILOCOS NORTE",
  permanentCountry: "PHILIPPINES",
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
  guardianRelationship: "",
  primaryContactPerson: "Father",
  isSned: false,
  snedCategory: "",
  snedDetails: [],
  hasPwdId: false,
  jhsProgram: "Regular",
  spsSport: "",
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
  { step: 4, label: "Curriculum & Modality", sublabel: "Program, SNEd & Mode" },
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
      ...(fields.jhsProgram !== undefined ? { jhsProgram: fields.jhsProgram } : {}),
      ...(fields.targetTrack !== undefined ? { targetTrack: fields.targetTrack } : {}),
      ...(fields.targetStrand !== undefined ? { targetStrand: fields.targetStrand } : {}),
      ...(fields.targetSemester !== undefined ? { targetSemester: fields.targetSemester } : {}),
    }));
  };

  const handleFormDataChange = (fields: Partial<FullEnrollmentFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...fields,
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
          <Step2LearnerProfile
            data={formData}
            onChange={handleFormDataChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 3 && (
          <Step3FamilyBackground
            data={formData}
            onChange={handleFormDataChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 4 && (
          <Step4CurriculumModality
            data={formData}
            onChange={handleFormDataChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 5 && (
          <Step5DocumentsReview
            data={formData}
            onChange={handleFormDataChange}
            onBack={prevStep}
          />
        )}
      </div>
    </div>
  );
}
