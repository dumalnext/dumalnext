"use client";

import React, { useState } from "react";
import { FullEnrollmentFormData } from "./EnrollmentStepper";

interface Step3FamilyBackgroundProps {
  data: FullEnrollmentFormData;
  onChange: (fields: Partial<FullEnrollmentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const GUARDIAN_RELATIONSHIPS = [
  "Grandparent (Lolo / Lola)",
  "Aunt / Uncle (Tita / Tito)",
  "Older Sibling (Ate / Kuya)",
  "Authorized Relative",
  "Legal Custodian / Foster Parent",
  "Other Authorized Adult",
] as const;

export default function Step3FamilyBackground({
  data,
  onChange,
  onNext,
  onBack,
}: Step3FamilyBackgroundProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Father availability & middle name states
  const [isFatherNotAvailable, setIsFatherNotAvailable] = useState<boolean>(
    data.fatherLastName === "N/A" || data.fatherLastName === "DECEASED"
  );
  const [hasNoFatherMiddleName, setHasNoFatherMiddleName] = useState<boolean>(
    data.fatherMiddleName === "N/A" || data.fatherMiddleName === "NONE"
  );

  // Mother availability & middle name states
  const [isMotherNotAvailable, setIsMotherNotAvailable] = useState<boolean>(
    data.motherMaidenLastName === "N/A" || data.motherMaidenLastName === "DECEASED"
  );
  const [hasNoMotherMiddleName, setHasNoMotherMiddleName] = useState<boolean>(
    data.motherMiddleName === "N/A" || data.motherMiddleName === "NONE"
  );

  // Guardian availability & middle name states (open by default, optional if living with parents)
  const [hasNoGuardian, setHasNoGuardian] = useState<boolean>(
    data.guardianLastName === "N/A"
  );
  const [hasNoGuardianMiddleName, setHasNoGuardianMiddleName] = useState<boolean>(
    data.guardianMiddleName === "N/A" || data.guardianMiddleName === "NONE"
  );

  // Primary Emergency Contact selection - freely selectable among Father, Mother, or Guardian
  const [primaryContact, setPrimaryContact] = useState<"Father" | "Mother" | "Guardian">(
    data.primaryContactPerson || (isFatherNotAvailable ? (isMotherNotAvailable ? "Guardian" : "Mother") : "Father")
  );

  const handleSelectPrimaryContact = (contact: "Father" | "Mother" | "Guardian") => {
    setPrimaryContact(contact);
    if (contact === "Guardian" && hasNoGuardian) {
      setHasNoGuardian(false);
      onChange({
        guardianLastName: "",
        guardianFirstName: "",
        guardianMiddleName: "",
        primaryContactPerson: "Guardian",
      });
    } else {
      onChange({ primaryContactPerson: contact });
    }
  };

  // Toggle Father availability
  const handleFatherAvailabilityToggle = (notAvailable: boolean) => {
    setIsFatherNotAvailable(notAvailable);
    if (notAvailable) {
      onChange({
        fatherLastName: "N/A",
        fatherFirstName: "N/A",
        fatherMiddleName: "N/A",
        fatherContactNumber: "",
      });
      // Switch primary contact if Father was selected
      if (primaryContact === "Father") {
        setPrimaryContact(isMotherNotAvailable ? "Guardian" : "Mother");
      }
    } else {
      onChange({
        fatherLastName: "",
        fatherFirstName: "",
        fatherMiddleName: "",
        fatherContactNumber: "",
      });
    }
  };

  // Toggle Mother availability
  const handleMotherAvailabilityToggle = (notAvailable: boolean) => {
    setIsMotherNotAvailable(notAvailable);
    if (notAvailable) {
      onChange({
        motherMaidenLastName: "N/A",
        motherFirstName: "N/A",
        motherMiddleName: "N/A",
        motherContactNumber: "",
      });
      // Switch primary contact if Mother was selected
      if (primaryContact === "Mother") {
        setPrimaryContact(isFatherNotAvailable ? "Guardian" : "Father");
      }
    } else {
      onChange({
        motherMaidenLastName: "",
        motherFirstName: "",
        motherMiddleName: "",
        motherContactNumber: "",
      });
    }
  };

  // Toggle Guardian availability
  const handleGuardianAvailabilityToggle = (noGuardian: boolean) => {
    setHasNoGuardian(noGuardian);
    if (noGuardian) {
      onChange({
        guardianLastName: "",
        guardianFirstName: "",
        guardianMiddleName: "",
        guardianContactNumber: "",
        guardianRelationship: "",
      });
      if (primaryContact === "Guardian") {
        setPrimaryContact(!isFatherNotAvailable ? "Father" : "Mother");
      }
    }
  };

  // Validation Logic
  const validateAndProceed = () => {
    const newErrors: Record<string, string> = {};

    // Check that not all contacts are marked unavailable
    if (isFatherNotAvailable && isMotherNotAvailable && hasNoGuardian) {
      newErrors.general =
        "DepEd Compliance: Learner must have at least one active parent or legal guardian on official school records.";
    }

    // 1. Father Validation
    if (!isFatherNotAvailable) {
      if (!data.fatherLastName || data.fatherLastName.trim() === "" || data.fatherLastName === "N/A") {
        newErrors.fatherLastName = "Father's official last name is required.";
      }
      if (!data.fatherFirstName || data.fatherFirstName.trim() === "" || data.fatherFirstName === "N/A") {
        newErrors.fatherFirstName = "Father's official first name is required.";
      }
      if (!hasNoFatherMiddleName && (!data.fatherMiddleName || data.fatherMiddleName.trim() === "" || data.fatherMiddleName === "N/A")) {
        newErrors.fatherMiddleName = "Father's middle name is required, or check 'No Middle Name'.";
      }
      if (data.fatherContactNumber && data.fatherContactNumber.trim() !== "") {
        const cleaned = data.fatherContactNumber.replace(/\D/g, "");
        if (cleaned.length !== 11 || !cleaned.startsWith("09")) {
          newErrors.fatherContactNumber = "Contact number must be 11 numeric digits starting with 09 (e.g., 09171234567).";
        }
      }
    }

    // 2. Mother Validation
    if (!isMotherNotAvailable) {
      if (!data.motherMaidenLastName || data.motherMaidenLastName.trim() === "" || data.motherMaidenLastName === "N/A") {
        newErrors.motherMaidenLastName = "Mother's maiden last name (surname before marriage) is required.";
      }
      if (!data.motherFirstName || data.motherFirstName.trim() === "" || data.motherFirstName === "N/A") {
        newErrors.motherFirstName = "Mother's official first name is required.";
      }
      if (!hasNoMotherMiddleName && (!data.motherMiddleName || data.motherMiddleName.trim() === "" || data.motherMiddleName === "N/A")) {
        newErrors.motherMiddleName = "Mother's middle name is required, or check 'No Middle Name'.";
      }
      if (data.motherContactNumber && data.motherContactNumber.trim() !== "") {
        const cleaned = data.motherContactNumber.replace(/\D/g, "");
        if (cleaned.length !== 11 || !cleaned.startsWith("09")) {
          newErrors.motherContactNumber = "Contact number must be 11 numeric digits starting with 09 (e.g., 09181234567).";
        }
      }
    }

    // 3. Legal Guardian Validation
    // Guardian is required if: primary contact is Guardian, OR both parents are unavailable, OR user entered guardian details
    const hasEnteredGuardianData = Boolean(
      (data.guardianLastName && data.guardianLastName.trim() !== "") ||
      (data.guardianFirstName && data.guardianFirstName.trim() !== "") ||
      (data.guardianRelationship && data.guardianRelationship.trim() !== "") ||
      (data.guardianContactNumber && data.guardianContactNumber.trim() !== "")
    );

    const isGuardianMandatory =
      primaryContact === "Guardian" ||
      (isFatherNotAvailable && isMotherNotAvailable) ||
      (!hasNoGuardian && hasEnteredGuardianData);

    if (!hasNoGuardian && isGuardianMandatory) {
      if (!data.guardianLastName || data.guardianLastName.trim() === "") {
        newErrors.guardianLastName = "Guardian's official last name is required.";
      }
      if (!data.guardianFirstName || data.guardianFirstName.trim() === "") {
        newErrors.guardianFirstName = "Guardian's official first name is required.";
      }
      if (!hasNoGuardianMiddleName && (!data.guardianMiddleName || data.guardianMiddleName.trim() === "")) {
        newErrors.guardianMiddleName = "Guardian's middle name is required, or check 'No Middle Name'.";
      }
      if (!data.guardianRelationship || data.guardianRelationship.trim() === "") {
        newErrors.guardianRelationship = "Please select the legal guardian's relationship to the learner.";
      }
      if (data.guardianContactNumber && data.guardianContactNumber.trim() !== "") {
        const cleaned = data.guardianContactNumber.replace(/\D/g, "");
        if (cleaned.length !== 11 || !cleaned.startsWith("09")) {
          newErrors.guardianContactNumber = "Contact number must be 11 numeric digits starting with 09 (e.g., 09191234567).";
        }
      }
    }

    // 4. Emergency Contact Number Check (At least ONE valid 11-digit number required across all contacts)
    const validFatherContact =
      !isFatherNotAvailable &&
      data.fatherContactNumber &&
      data.fatherContactNumber.replace(/\D/g, "").length === 11 &&
      data.fatherContactNumber.replace(/\D/g, "").startsWith("09");

    const validMotherContact =
      !isMotherNotAvailable &&
      data.motherContactNumber &&
      data.motherContactNumber.replace(/\D/g, "").length === 11 &&
      data.motherContactNumber.replace(/\D/g, "").startsWith("09");

    const validGuardianContact =
      !hasNoGuardian &&
      data.guardianContactNumber &&
      data.guardianContactNumber.replace(/\D/g, "").length === 11 &&
      data.guardianContactNumber.replace(/\D/g, "").startsWith("09");

    if (!validFatherContact && !validMotherContact && !validGuardianContact) {
      newErrors.emergencyContact =
        "Official School Requirement: At least one active 11-digit mobile contact number (09XXXXXXXXX) must be provided across Father, Mother, or Guardian for emergency dispatch and academic notices.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onChange({ primaryContactPerson: primaryContact });
      onNext();
    }
  };

  return (
    <div className="space-y-8 bg-white p-6 sm:p-10 border-2 border-slate-300 shadow-sm">
      {/* Step Header */}
      <div className="border-b-2 border-slate-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-mono font-bold bg-[#002060] text-white px-2.5 py-1 uppercase tracking-wider">
            STEP 03 OF 05
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            DepEd Form Section 4
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Parent &amp; Legal Guardian Information
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Provide complete parental and legal guardian background in accordance with DepEd Civil Registry verification standards.
        </p>
      </div>

      {/* Global Error Banner */}
      {(errors.general || errors.emergencyContact) && (
        <div className="p-4 bg-red-50 border-2 border-red-300 space-y-1">
          {errors.general && (
            <p className="text-xs font-bold text-red-800 leading-normal">
              [ Validation Notice ]: {errors.general}
            </p>
          )}
          {errors.emergencyContact && (
            <p className="text-xs font-bold text-red-800 leading-normal">
              [ Emergency Requirement ]: {errors.emergencyContact}
            </p>
          )}
        </div>
      )}

      {/* Primary Emergency Contact Dispatcher */}
      <div className="p-5 bg-blue-50/50 border-2 border-blue-200 space-y-3">
        <div>
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            [ Primary School Contact / Designated Custodian ]
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            Select who the Dumalneg NHS administration and faculty should prioritize for urgent student notifications, emergency situations, and report card releases:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <label
            className={`p-3 border-2 flex items-center gap-3 cursor-pointer transition-colors ${
              primaryContact === "Father" && !isFatherNotAvailable
                ? "bg-[#002060] text-white border-[#002060]"
                : isFatherNotAvailable
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
            }`}
          >
            <input
              type="radio"
              name="primaryContact"
              value="Father"
              checked={primaryContact === "Father" && !isFatherNotAvailable}
              disabled={isFatherNotAvailable}
              onChange={() => handleSelectPrimaryContact("Father")}
              className="accent-[#002060]"
            />
            <div className="text-xs">
              <div className="font-bold uppercase">Father</div>
              <div className={primaryContact === "Father" && !isFatherNotAvailable ? "text-blue-200 text-[10px]" : "text-slate-500 text-[10px]"}>
                Primary Emergency Contact
              </div>
            </div>
          </label>

          <label
            className={`p-3 border-2 flex items-center gap-3 cursor-pointer transition-colors ${
              primaryContact === "Mother" && !isMotherNotAvailable
                ? "bg-[#002060] text-white border-[#002060]"
                : isMotherNotAvailable
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
            }`}
          >
            <input
              type="radio"
              name="primaryContact"
              value="Mother"
              checked={primaryContact === "Mother" && !isMotherNotAvailable}
              disabled={isMotherNotAvailable}
              onChange={() => handleSelectPrimaryContact("Mother")}
              className="accent-[#002060]"
            />
            <div className="text-xs">
              <div className="font-bold uppercase">Mother</div>
              <div className={primaryContact === "Mother" && !isMotherNotAvailable ? "text-blue-200 text-[10px]" : "text-slate-500 text-[10px]"}>
                Primary Emergency Contact
              </div>
            </div>
          </label>

          <label
            className={`p-3 border-2 flex items-center gap-3 cursor-pointer transition-colors ${
              primaryContact === "Guardian"
                ? "bg-[#002060] text-white border-[#002060]"
                : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
            }`}
          >
            <input
              type="radio"
              name="primaryContact"
              value="Guardian"
              checked={primaryContact === "Guardian"}
              onChange={() => handleSelectPrimaryContact("Guardian")}
              className="accent-[#002060]"
            />
            <div className="text-xs">
              <div className="font-bold uppercase">Legal Guardian</div>
              <div className={primaryContact === "Guardian" ? "text-blue-200 text-[10px]" : "text-slate-500 text-[10px]"}>
                Authorized Custodian
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Section A: Father's Information */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
          <div>
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Section A: Father&apos;s Legal Information ]
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Official legal name and active mobile number as registered in official documents.
            </p>
          </div>
          <label className="text-xs text-slate-700 flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-slate-300">
            <input
              type="checkbox"
              checked={isFatherNotAvailable}
              onChange={(e) => handleFatherAvailabilityToggle(e.target.checked)}
              className="accent-[#002060]"
            />
            <span className="font-bold">Deceased / Unknown / Not Available</span>
          </label>
        </div>

        {isFatherNotAvailable ? (
          <div className="p-4 bg-white border border-slate-200 text-xs text-slate-600 italic">
            Father information is designated as Not Available. The school will reference the Mother or Legal Guardian as primary contact.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Father Last Name */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Father&apos;s Last Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={data.fatherLastName === "N/A" ? "" : data.fatherLastName}
                  onChange={(e) => {
                    onChange({ fatherLastName: e.target.value.toUpperCase() });
                    if (errors.fatherLastName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.fatherLastName;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. DELA CRUZ"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                    errors.fatherLastName ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                />
                {errors.fatherLastName && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.fatherLastName}</p>
                )}
              </div>

              {/* Father First Name */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Father&apos;s First Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={data.fatherFirstName === "N/A" ? "" : data.fatherFirstName}
                  onChange={(e) => {
                    onChange({ fatherFirstName: e.target.value.toUpperCase() });
                    if (errors.fatherFirstName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.fatherFirstName;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. JUAN"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                    errors.fatherFirstName ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                />
                {errors.fatherFirstName && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.fatherFirstName}</p>
                )}
              </div>

              {/* Father Middle Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-900 uppercase">
                    Father&apos;s Middle Name {!hasNoFatherMiddleName && <span className="text-red-700">*</span>}
                  </label>
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasNoFatherMiddleName}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasNoFatherMiddleName(checked);
                        if (checked) {
                          onChange({ fatherMiddleName: "N/A" });
                          if (errors.fatherMiddleName) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.fatherMiddleName;
                              return next;
                            });
                          }
                        } else {
                          onChange({ fatherMiddleName: "" });
                        }
                      }}
                      className="accent-[#002060]"
                    />
                    <span>No Middle Name</span>
                  </label>
                </div>
                <input
                  type="text"
                  disabled={hasNoFatherMiddleName}
                  value={hasNoFatherMiddleName ? "N/A" : data.fatherMiddleName}
                  onChange={(e) => {
                    onChange({ fatherMiddleName: e.target.value.toUpperCase() });
                    if (errors.fatherMiddleName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.fatherMiddleName;
                        return next;
                      });
                    }
                  }}
                  placeholder={hasNoFatherMiddleName ? "N/A" : "e.g. RAMOS"}
                  className={`w-full p-2.5 border-2 text-xs font-bold uppercase outline-none ${
                    hasNoFatherMiddleName
                      ? "bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed"
                      : errors.fatherMiddleName
                      ? "bg-red-50 border-red-600 focus:border-[#002060]"
                      : "bg-white border-slate-300 focus:border-[#002060]"
                  }`}
                />
                {errors.fatherMiddleName && !hasNoFatherMiddleName && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.fatherMiddleName}</p>
                )}
              </div>
            </div>

            {/* Father Contact Number */}
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Father&apos;s Mobile Contact Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={11}
                  value={data.fatherContactNumber || ""}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 11);
                    onChange({ fatherContactNumber: cleaned });
                    if (errors.fatherContactNumber) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.fatherContactNumber;
                        return next;
                      });
                    }
                  }}
                  placeholder="09XXXXXXXXX"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none ${
                    errors.fatherContactNumber ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Standard 11-digit Philippine mobile format (e.g., 09171234567).
              </p>
              {errors.fatherContactNumber && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.fatherContactNumber}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section B: Mother's Maiden Information */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
          <div>
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Section B: Mother&apos;s Maiden Legal Information ]
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Important: Enter your mother&apos;s legal <strong>Maiden Name</strong> (her surname at birth, before marriage).
            </p>
          </div>
          <label className="text-xs text-slate-700 flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-slate-300">
            <input
              type="checkbox"
              checked={isMotherNotAvailable}
              onChange={(e) => handleMotherAvailabilityToggle(e.target.checked)}
              className="accent-[#002060]"
            />
            <span className="font-bold">Deceased / Unknown / Not Available</span>
          </label>
        </div>

        {isMotherNotAvailable ? (
          <div className="p-4 bg-white border border-slate-200 text-xs text-slate-600 italic">
            Mother information is designated as Not Available. The school will reference the Father or Legal Guardian as primary contact.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-normal">
              <strong>DepEd Civil Verification Note:</strong> DepEd Basic Education records strictly require the mother&apos;s <strong>Maiden Last Name</strong> (apelyido sa pagkadalaga) to verify civil registry records in the PSA Birth Certificate.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Mother Maiden Last Name */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Mother&apos;s Maiden Last Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={data.motherMaidenLastName === "N/A" ? "" : data.motherMaidenLastName}
                  onChange={(e) => {
                    onChange({ motherMaidenLastName: e.target.value.toUpperCase() });
                    if (errors.motherMaidenLastName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.motherMaidenLastName;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. SANTOS"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                    errors.motherMaidenLastName ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                />
                {errors.motherMaidenLastName && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.motherMaidenLastName}</p>
                )}
              </div>

              {/* Mother First Name */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Mother&apos;s First Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={data.motherFirstName === "N/A" ? "" : data.motherFirstName}
                  onChange={(e) => {
                    onChange({ motherFirstName: e.target.value.toUpperCase() });
                    if (errors.motherFirstName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.motherFirstName;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. MARIA"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                    errors.motherFirstName ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                />
                {errors.motherFirstName && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.motherFirstName}</p>
                )}
              </div>

              {/* Mother Middle Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-900 uppercase">
                    Mother&apos;s Middle Name {!hasNoMotherMiddleName && <span className="text-red-700">*</span>}
                  </label>
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasNoMotherMiddleName}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasNoMotherMiddleName(checked);
                        if (checked) {
                          onChange({ motherMiddleName: "N/A" });
                          if (errors.motherMiddleName) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.motherMiddleName;
                              return next;
                            });
                          }
                        } else {
                          onChange({ motherMiddleName: "" });
                        }
                      }}
                      className="accent-[#002060]"
                    />
                    <span>No Middle Name</span>
                  </label>
                </div>
                <input
                  type="text"
                  disabled={hasNoMotherMiddleName}
                  value={hasNoMotherMiddleName ? "N/A" : data.motherMiddleName}
                  onChange={(e) => {
                    onChange({ motherMiddleName: e.target.value.toUpperCase() });
                    if (errors.motherMiddleName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.motherMiddleName;
                        return next;
                      });
                    }
                  }}
                  placeholder={hasNoMotherMiddleName ? "N/A" : "e.g. GARCIA"}
                  className={`w-full p-2.5 border-2 text-xs font-bold uppercase outline-none ${
                    hasNoMotherMiddleName
                      ? "bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed"
                      : errors.motherMiddleName
                      ? "bg-red-50 border-red-600 focus:border-[#002060]"
                      : "bg-white border-slate-300 focus:border-[#002060]"
                  }`}
                />
                {errors.motherMiddleName && !hasNoMotherMiddleName && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.motherMiddleName}</p>
                )}
              </div>
            </div>

            {/* Mother Contact Number */}
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Mother&apos;s Mobile Contact Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={11}
                  value={data.motherContactNumber || ""}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 11);
                    onChange({ motherContactNumber: cleaned });
                    if (errors.motherContactNumber) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.motherContactNumber;
                        return next;
                      });
                    }
                  }}
                  placeholder="09XXXXXXXXX"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none ${
                    errors.motherContactNumber ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Standard 11-digit Philippine mobile format (e.g., 09181234567).
              </p>
              {errors.motherContactNumber && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.motherContactNumber}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section C: Legal Guardian Information */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
          <div>
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Section C: Legal Guardian / Authorized Custodian ]
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Fill out if the learner is living with a relative, grandparent, or guardian (e.g., parents working away or OFW).
            </p>
          </div>
          <label className="text-xs text-slate-700 flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-slate-300">
            <input
              type="checkbox"
              checked={hasNoGuardian}
              onChange={(e) => handleGuardianAvailabilityToggle(e.target.checked)}
              className="accent-[#002060]"
            />
            <span className="font-bold">No Separate Legal Guardian (Living with Parents)</span>
          </label>
        </div>

        {hasNoGuardian ? (
          <div className="p-4 bg-white border border-slate-200 text-xs text-slate-600 italic">
            The learner is designated as living with parents. A separate legal guardian entry is not required. (Uncheck this box or select Legal Guardian as Primary Contact above to enter guardian details.)
          </div>
        ) : (
          <div className="space-y-4">
            {/* Guardian Relationship Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Guardian&apos;s Relationship to Learner <span className="text-red-700">*</span>
              </label>
              <select
                value={data.guardianRelationship || ""}
                onChange={(e) => {
                  onChange({ guardianRelationship: e.target.value });
                  if (errors.guardianRelationship) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.guardianRelationship;
                      return next;
                    });
                  }
                }}
                className={`w-full sm:w-80 p-2.5 bg-white border-2 text-xs font-bold focus:border-[#002060] outline-none ${
                  errors.guardianRelationship ? "border-red-600 bg-red-50" : "border-slate-300"
                }`}
              >
                <option value="">-- SELECT RELATIONSHIP --</option>
                {GUARDIAN_RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
              {errors.guardianRelationship && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.guardianRelationship}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Guardian Last Name */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Guardian&apos;s Last Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={data.guardianLastName || ""}
                  onChange={(e) => {
                    onChange({ guardianLastName: e.target.value.toUpperCase() });
                    if (errors.guardianLastName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.guardianLastName;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. AGCAOILI"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                    errors.guardianLastName ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                />
                {errors.guardianLastName && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.guardianLastName}</p>
                )}
              </div>

              {/* Guardian First Name */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Guardian&apos;s First Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={data.guardianFirstName || ""}
                  onChange={(e) => {
                    onChange({ guardianFirstName: e.target.value.toUpperCase() });
                    if (errors.guardianFirstName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.guardianFirstName;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. EDUARDO"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                    errors.guardianFirstName ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                />
                {errors.guardianFirstName && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.guardianFirstName}</p>
                )}
              </div>

              {/* Guardian Middle Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-900 uppercase">
                    Guardian&apos;s Middle Name {!hasNoGuardianMiddleName && <span className="text-red-700">*</span>}
                  </label>
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasNoGuardianMiddleName}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasNoGuardianMiddleName(checked);
                        if (checked) {
                          onChange({ guardianMiddleName: "N/A" });
                          if (errors.guardianMiddleName) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.guardianMiddleName;
                              return next;
                            });
                          }
                        } else {
                          onChange({ guardianMiddleName: "" });
                        }
                      }}
                      className="accent-[#002060]"
                    />
                    <span>No Middle Name</span>
                  </label>
                </div>
                <input
                  type="text"
                  disabled={hasNoGuardianMiddleName}
                  value={hasNoGuardianMiddleName ? "N/A" : data.guardianMiddleName}
                  onChange={(e) => {
                    onChange({ guardianMiddleName: e.target.value.toUpperCase() });
                    if (errors.guardianMiddleName) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.guardianMiddleName;
                        return next;
                      });
                    }
                  }}
                  placeholder={hasNoGuardianMiddleName ? "N/A" : "e.g. CASTRO"}
                  className={`w-full p-2.5 border-2 text-xs font-bold uppercase outline-none ${
                    hasNoGuardianMiddleName
                      ? "bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed"
                      : errors.guardianMiddleName
                      ? "bg-red-50 border-red-600 focus:border-[#002060]"
                      : "bg-white border-slate-300 focus:border-[#002060]"
                  }`}
                />
                {errors.guardianMiddleName && !hasNoGuardianMiddleName && (
                  <p className="text-[11px] font-bold text-red-700 mt-1">{errors.guardianMiddleName}</p>
                )}
              </div>
            </div>

            {/* Guardian Contact Number */}
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Guardian&apos;s Mobile Contact Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={11}
                  value={data.guardianContactNumber || ""}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 11);
                    onChange({ guardianContactNumber: cleaned });
                    if (errors.guardianContactNumber) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.guardianContactNumber;
                        return next;
                      });
                    }
                  }}
                  placeholder="09XXXXXXXXX"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none ${
                    errors.guardianContactNumber ? "border-red-600 bg-red-50" : "border-slate-300"
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Standard 11-digit Philippine mobile format (e.g., 09191234567).
              </p>
              {errors.guardianContactNumber && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.guardianContactNumber}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="border-t-2 border-slate-200 pt-6 flex flex-col sm:flex-row justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary text-xs uppercase tracking-wider font-bold py-3.5 px-8 text-center"
        >
          Back to Step 2: Learner Profile
        </button>
        <button
          type="button"
          onClick={validateAndProceed}
          className="btn-primary text-xs uppercase tracking-wider font-bold py-3.5 px-8 text-center shadow-sm"
        >
          Proceed: Curriculum &amp; Modality (Step 4)
        </button>
      </div>
    </div>
  );
}
