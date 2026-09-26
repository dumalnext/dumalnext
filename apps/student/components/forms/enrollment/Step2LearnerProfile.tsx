"use client";

import React, { useState, useEffect } from "react";
import { FullEnrollmentFormData } from "./EnrollmentStepper";
import { DUMALNEG_BARANGAYS } from "@/lib/types/enrollment";

const STANDARD_MOTHER_TONGUES = ["Ilokano", "Isnag", "Tagalog", "English"];

const STANDARD_RELIGIONS = [
  "Roman Catholic",
  "Iglesia ni Cristo",
  "Born Again / Evangelical Christian",
  "Islam",
  "Seventh-day Adventist",
  "Baptist",
  "Jehovah's Witnesses",
  "Philippine Independent Church (Aglipayan)",
  "United Church of Christ in the Philippines (UCCP)",
  "Methodist",
  "None / No Religious Affiliation",
];

const getMinAgeForGrade = (grade: number): number => {
  switch (grade) {
    case 7: return 11;
    case 8: return 12;
    case 9: return 13;
    case 10: return 14;
    case 11: return 15;
    case 12: return 16;
    default: return 11;
  }
};

interface Step2LearnerProfileProps {
  data: FullEnrollmentFormData;
  onChange: (fields: Partial<FullEnrollmentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2LearnerProfile({
  data,
  onChange,
  onNext,
  onBack,
}: Step2LearnerProfileProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasNoMiddleName, setHasNoMiddleName] = useState<boolean>(
    data.middleName === "N/A" || data.middleName === "None"
  );

  // Grade level detection and age calculation constraints
  const targetGrade =
    Number(data.step1?.targetGradeLevel) ||
    (data.step1?.applicantType === "Grade 7"
      ? 7
      : data.step1?.applicantType === "Grade 11"
      ? 11
      : 7);

  const minRequiredAge = getMinAgeForGrade(targetGrade);
  const maxUnderageLimit = minRequiredAge - 1;
  const isUnderage = typeof data.age === "number" && data.age < minRequiredAge;

  // Mother Tongue "Other" handling
  const [isOtherMotherTongue, setIsOtherMotherTongue] = useState<boolean>(() => {
    return Boolean(data.motherTongue && !STANDARD_MOTHER_TONGUES.includes(data.motherTongue));
  });
  const [customMotherTongue, setCustomMotherTongue] = useState<string>(() => {
    return data.motherTongue && !STANDARD_MOTHER_TONGUES.includes(data.motherTongue)
      ? data.motherTongue
      : "";
  });

  // Religion "Other" handling
  const [isOtherReligion, setIsOtherReligion] = useState<boolean>(() => {
    return Boolean(data.religion && !STANDARD_RELIGIONS.includes(data.religion));
  });
  const [customReligion, setCustomReligion] = useState<string>(() => {
    return data.religion && !STANDARD_RELIGIONS.includes(data.religion)
      ? data.religion
      : "";
  });

  // Municipality selection mode: DUMALNEG or OTHER
  const [currentMuniMode, setCurrentMuniMode] = useState<"DUMALNEG" | "OTHER">(() => {
    return data.currentMunicipality && data.currentMunicipality.toUpperCase() !== "DUMALNEG"
      ? "OTHER"
      : "DUMALNEG";
  });

  const [permanentMuniMode, setPermanentMuniMode] = useState<"DUMALNEG" | "OTHER">(() => {
    return data.permanentMunicipality && data.permanentMunicipality.toUpperCase() !== "DUMALNEG"
      ? "OTHER"
      : "DUMALNEG";
  });

  // Smart Age Calculator: Recalculate age whenever dateOfBirth changes
  const handleDateOfBirthChange = (dob: string) => {
    let calculatedAge: number | "" = "";
    if (dob) {
      const birthDate = new Date(dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age >= 0 && age <= 100) {
          calculatedAge = age;
        }
      }
    }

    onChange({
      dateOfBirth: dob,
      age: calculatedAge,
    });

    setErrors((prev) => {
      const next = { ...prev };
      delete next.dateOfBirth;
      if (typeof calculatedAge === "number") {
        if (calculatedAge < minRequiredAge) {
          next.age = `Ineligible for Grade ${targetGrade}: Learners aged ${maxUnderageLimit} and below are not accepted. Minimum required age is ${minRequiredAge} years old.`;
        } else {
          delete next.age;
        }
      } else {
        delete next.age;
      }
      return next;
    });
  };

  // Handle current address changes with auto-mirroring to permanent address if synced
  const handleCurrentAddressChange = (fields: Partial<FullEnrollmentFormData>) => {
    if (data.isPermanentSameAsCurrent) {
      const permanentMirror: Partial<FullEnrollmentFormData> = {};
      if (fields.currentHouseNo !== undefined) permanentMirror.permanentHouseNo = fields.currentHouseNo;
      if (fields.currentSitio !== undefined) permanentMirror.permanentSitio = fields.currentSitio;
      if (fields.currentBarangay !== undefined) permanentMirror.permanentBarangay = fields.currentBarangay;
      if (fields.currentMunicipality !== undefined) permanentMirror.permanentMunicipality = fields.currentMunicipality;
      if (fields.currentProvince !== undefined) permanentMirror.permanentProvince = fields.currentProvince;
      if (fields.currentCountry !== undefined) permanentMirror.permanentCountry = fields.currentCountry;
      if (fields.currentZipCode !== undefined) permanentMirror.permanentZipCode = fields.currentZipCode;

      onChange({
        ...fields,
        ...permanentMirror,
      });
    } else {
      onChange(fields);
    }
  };

  // Toggle permanent address mirror
  const handlePermanentToggle = (sameAsCurrent: boolean) => {
    if (sameAsCurrent) {
      onChange({
        isPermanentSameAsCurrent: true,
        permanentHouseNo: data.currentHouseNo,
        permanentSitio: data.currentSitio,
        permanentBarangay: data.currentBarangay,
        permanentMunicipality: data.currentMunicipality,
        permanentProvince: data.currentProvince,
        permanentCountry: data.currentCountry,
        permanentZipCode: data.currentZipCode,
      });
      setPermanentMuniMode(currentMuniMode);
    } else {
      onChange({ isPermanentSameAsCurrent: false });
    }
  };

  const validateAndProceed = () => {
    const newErrors: Record<string, string> = {};

    // 1. Identification (LRN is strictly required and must be 12 numeric digits)
    const cleanedLrn = (data.lrn || "").replace(/\D/g, "");
    if (!cleanedLrn || cleanedLrn.length !== 12) {
      newErrors.lrn = "Learner Reference Number (LRN) is required and must be exactly 12 numeric digits.";
    }

    // 2. Personal Name
    if (!data.lastName || data.lastName.trim() === "") {
      newErrors.lastName = "Learner's official last name is required.";
    }
    if (!data.firstName || data.firstName.trim() === "") {
      newErrors.firstName = "Learner's official first name is required.";
    }
    if (!hasNoMiddleName && (!data.middleName || data.middleName.trim() === "")) {
      newErrors.middleName = "Learner's middle name is required, or check 'No Middle Name'.";
    }

    // 3. Demographics & Smart Age Error Trapping
    if (!data.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required.";
    }
    if (data.age === "" || typeof data.age !== "number") {
      newErrors.age = "Valid age is required (automatically calculated from birthdate).";
    } else if (data.age < minRequiredAge) {
      newErrors.age = `Ineligible for Grade ${targetGrade}: Learners aged ${maxUnderageLimit} and below cannot proceed. Minimum required age is ${minRequiredAge} years old.`;
    }

    if (!data.gender) {
      newErrors.gender = "Sex (Male / Female) is required.";
    }
    if (!data.placeOfBirth || data.placeOfBirth.trim() === "") {
      newErrors.placeOfBirth = "Place of birth (Municipality/City) is required.";
    }

    // Mother Tongue
    if (!data.motherTongue || data.motherTongue.trim() === "" || (isOtherMotherTongue && (!customMotherTongue || customMotherTongue.trim() === "" || customMotherTongue === "Other"))) {
      newErrors.motherTongue = "Mother tongue is required. Please specify your mother tongue.";
    }

    // Religion
    if (isOtherReligion && (!customReligion || customReligion.trim() === "" || customReligion === "Other")) {
      newErrors.religion = "Please specify your religious affiliation.";
    }

    // 4. IP & 4Ps
    if (data.isIpCommunity && (!data.ipCommunityName || data.ipCommunityName.trim() === "")) {
      newErrors.ipCommunityName = "Please specify the indigenous cultural community name (e.g., Isnag).";
    }
    if (data.is4psBeneficiary) {
      const cleaned4ps = (data.householdId4ps || "").replace(/\D/g, "");
      if (!cleaned4ps || cleaned4ps.length !== 16) {
        newErrors.householdId4ps = "4Ps Household ID Number must be exactly 16 numeric digits.";
      }
    }

    // 5. Current Address
    if (currentMuniMode === "OTHER") {
      if (!data.currentMunicipality || data.currentMunicipality.trim() === "" || data.currentMunicipality.toUpperCase() === "OTHER") {
        newErrors.currentMunicipality = "Please specify your municipality or city.";
      }
    } else {
      if (!data.currentMunicipality || data.currentMunicipality.trim() === "") {
        newErrors.currentMunicipality = "Municipality is required.";
      }
    }

    if (!data.currentBarangay || data.currentBarangay.trim() === "") {
      newErrors.currentBarangay = "Current residential barangay is required.";
    }
    if (!data.currentProvince || data.currentProvince.trim() === "") {
      newErrors.currentProvince = "Province is required.";
    }

    // 6. Permanent Address (if not same)
    if (!data.isPermanentSameAsCurrent) {
      if (permanentMuniMode === "OTHER") {
        if (!data.permanentMunicipality || data.permanentMunicipality.trim() === "" || data.permanentMunicipality.toUpperCase() === "OTHER") {
          newErrors.permanentMunicipality = "Please specify permanent municipality or city.";
        }
      } else {
        if (!data.permanentMunicipality || data.permanentMunicipality.trim() === "") {
          newErrors.permanentMunicipality = "Permanent municipality is required.";
        }
      }
      if (!data.permanentBarangay || data.permanentBarangay.trim() === "") {
        newErrors.permanentBarangay = "Permanent barangay is required.";
      }
      if (!data.permanentProvince || data.permanentProvince.trim() === "") {
        newErrors.permanentProvince = "Permanent province is required.";
      }
    }

    // 7. Contact Number
    const cleanedContact = (data.contactNumber || "").replace(/\D/g, "");
    if (!cleanedContact || cleanedContact.length !== 11 || !cleanedContact.startsWith("09")) {
      newErrors.contactNumber = "Official 11-digit mobile contact number is required (format: 09XXXXXXXXX).";
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
            STEP 02 OF 05
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            DepEd Form Section 3
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Learner&apos;s Personal Information
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Provide complete, official civil registry credentials and residential address in compliance with DepEd Basic Education standards.
        </p>
      </div>

      {/* Part A: Official DepEd Identifiers (LRN & PSA) */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            [ Part A: Official DepEd Identifiers ]
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            Learner Reference Number (LRN) registered in DepEd LIS and Philippine Statistics Authority (PSA) Certificate.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* LRN (12 Digits) */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Learner Reference Number (LRN) <span className="text-red-700">*</span>
            </label>
            <input
              type="text"
              maxLength={12}
              value={data.lrn || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                onChange({ lrn: val });
                if (errors.lrn) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.lrn;
                    return next;
                  });
                }
              }}
              placeholder="Enter 12-digit LRN (e.g. 100234567890)"
              className={`w-full p-3 bg-white border-2 text-sm font-mono tracking-wider font-bold focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none ${
                errors.lrn ? "border-red-600 bg-red-50 text-red-900" : "border-slate-300"
              }`}
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              12-digit permanent student identification number issued by DepEd.
            </span>
            {errors.lrn && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.lrn}
              </span>
            )}
          </div>

          {/* PSA Birth Certificate No. */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              PSA Birth Certificate No. <span className="text-slate-400 font-normal">(Optional upon registration)</span>
            </label>
            <input
              type="text"
              value={data.psaBirthCertNo || ""}
              onChange={(e) => onChange({ psaBirthCertNo: e.target.value.toUpperCase() })}
              placeholder="e.g. 1234-5678-9012"
              className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-mono uppercase focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Official Birth Certificate Registry Number found on the PSA document header.
            </span>
          </div>
        </div>
      </div>

      {/* Part B: Legal Name Details */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            [ Part B: Learner&apos;s Legal Name (As Appearing on PSA Birth Certificate) ]
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            Print legibly in capital letters. Do not use nicknames or informal abbreviations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Last Name */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Last Name <span className="text-red-700">*</span>
            </label>
            <input
              type="text"
              value={data.lastName || ""}
              onChange={(e) => onChange({ lastName: e.target.value.toUpperCase() })}
              placeholder="DELA CRUZ"
              className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-bold uppercase focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
            />
            {errors.lastName && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.lastName}
              </span>
            )}
          </div>

          {/* First Name */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              First Name <span className="text-red-700">*</span>
            </label>
            <input
              type="text"
              value={data.firstName || ""}
              onChange={(e) => onChange({ firstName: e.target.value.toUpperCase() })}
              placeholder="JUAN MIGUEL"
              className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-bold uppercase focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
            />
            {errors.firstName && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.firstName}
              </span>
            )}
          </div>

          {/* Middle Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-900 uppercase">
                Middle Name {!hasNoMiddleName && <span className="text-red-700">*</span>}
              </label>
              <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasNoMiddleName}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasNoMiddleName(checked);
                    if (checked) {
                      onChange({ middleName: "N/A" });
                      if (errors.middleName) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.middleName;
                          return next;
                        });
                      }
                    } else {
                      onChange({ middleName: "" });
                    }
                  }}
                  className="rounded text-[#002060] focus:ring-[#002060]"
                />
                <span>None</span>
              </label>
            </div>
            <input
              type="text"
              disabled={hasNoMiddleName}
              value={hasNoMiddleName ? "N/A" : data.middleName || ""}
              onChange={(e) => onChange({ middleName: e.target.value.toUpperCase() })}
              placeholder="SANTOS"
              className={`w-full p-3 bg-white border-2 text-sm font-bold uppercase focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none ${
                hasNoMiddleName ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-300"
              }`}
            />
            {errors.middleName && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.middleName}
              </span>
            )}
          </div>

          {/* Extension Name */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Extension Name <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={data.extensionName || ""}
              onChange={(e) => onChange({ extensionName: e.target.value })}
              className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-medium focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
            >
              <option value="">None</option>
              <option value="JR.">JR.</option>
              <option value="SR.">SR.</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
              <option value="V">V</option>
            </select>
          </div>
        </div>
      </div>

      {/* Part C: Demographics & Smart Age Calculator */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
              [ Part C: Demographics &amp; Smart Age Calculation ]
            </span>
            {isUnderage || errors.age ? (
              <span className="text-[11px] font-mono bg-red-100 text-red-800 border border-red-400 px-2 py-0.5 font-bold uppercase">
                [ INELIGIBLE: UNDERAGE FOR GRADE {targetGrade} ]
              </span>
            ) : (
              <span className="text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-bold">
                [ AUTO-AGE COMPUTATION ACTIVE &bull; GRADE {targetGrade} ]
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Age is automatically derived from the registered Date of Birth.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Date of Birth <span className="text-red-700">*</span>
            </label>
            <input
              type="date"
              value={data.dateOfBirth || ""}
              onChange={(e) => handleDateOfBirthChange(e.target.value)}
              className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-medium focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
            />
            {errors.dateOfBirth && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.dateOfBirth}
              </span>
            )}
          </div>

          {/* Age (Auto-Calculated) */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Age (Years Old) <span className="text-red-700">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={data.age || ""}
                readOnly
                placeholder="Auto"
                className={`w-full p-3 border-2 text-sm font-bold cursor-not-allowed outline-none text-center ${
                  isUnderage || errors.age
                    ? "border-red-600 bg-red-50 text-red-700 font-extrabold ring-2 ring-red-400"
                    : "bg-slate-100 border-slate-300 text-slate-800"
                }`}
              />
              <span className={`text-xs font-bold whitespace-nowrap ${isUnderage || errors.age ? "text-red-700 font-extrabold" : "text-slate-500"}`}>
                Y/O
              </span>
            </div>
            {(isUnderage || errors.age) ? (
              <div className="mt-1.5 p-2.5 bg-red-100 border border-red-400 text-red-900 rounded-none space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-red-800">
                  <span>[ INELIGIBLE FOR GRADE {targetGrade} ]</span>
                </div>
                <p className="text-[11px] text-red-700 font-semibold leading-tight">
                  {errors.age || `Learners aged ${maxUnderageLimit} and below are not eligible for Grade ${targetGrade}. Minimum required age is ${minRequiredAge} years old.`}
                </p>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Calculated from birthdate (Min. {minRequiredAge} y/o for Grade {targetGrade}).
              </span>
            )}
          </div>

          {/* Sex (Male / Female) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Sex <span className="text-red-700">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["Male", "Female"] as const).map((genderOption) => {
                const isSelected = data.gender === genderOption;
                return (
                  <button
                    key={genderOption}
                    type="button"
                    onClick={() => {
                      onChange({ gender: genderOption });
                      if (errors.gender) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.gender;
                          return next;
                        });
                      }
                    }}
                    className={`p-3 border-2 font-bold text-xs uppercase tracking-wider transition-all ${
                      isSelected
                        ? "bg-[#002060] text-white border-[#002060] shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:border-[#002060]"
                    }`}
                  >
                    [ {isSelected ? "X" : " "} ] {genderOption}
                  </button>
                );
              })}
            </div>
            {errors.gender && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.gender}
              </span>
            )}
          </div>

          {/* Place of Birth */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Place of Birth (Municipality/City) <span className="text-red-700">*</span>
            </label>
            <input
              type="text"
              value={data.placeOfBirth || ""}
              onChange={(e) => onChange({ placeOfBirth: e.target.value.toUpperCase() })}
              placeholder="e.g. DUMALNEG, ILOCOS NORTE / LAOAG CITY"
              className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-medium uppercase focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
            />
            {errors.placeOfBirth && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.placeOfBirth}
              </span>
            )}
          </div>

          {/* Mother Tongue */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Mother Tongue <span className="text-red-700">*</span>
            </label>
            <select
              value={isOtherMotherTongue ? "Other" : (data.motherTongue || "Ilokano")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "Other") {
                  setIsOtherMotherTongue(true);
                  onChange({ motherTongue: customMotherTongue || "Other" });
                } else {
                  setIsOtherMotherTongue(false);
                  onChange({ motherTongue: val });
                }
                if (errors.motherTongue) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.motherTongue;
                    return next;
                  });
                }
              }}
              className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-medium focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
            >
              <option value="Ilokano">Ilokano</option>
              <option value="Isnag">Isnag</option>
              <option value="Tagalog">Tagalog</option>
              <option value="English">English</option>
              <option value="Other">Other (Please specify)</option>
            </select>

            {isOtherMotherTongue && (
              <div className="mt-2">
                <label className="block text-[11px] font-bold text-slate-800 uppercase mb-1">
                  Please specify Mother Tongue <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={customMotherTongue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomMotherTongue(val);
                    onChange({ motherTongue: val });
                    if (errors.motherTongue) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.motherTongue;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. Pangasinense, Ibanag, Kankanaey"
                  className={`w-full p-2.5 bg-white border-2 text-xs font-bold focus:border-[#002060] outline-none ${
                    errors.motherTongue ? "border-red-600 bg-red-50 text-red-900" : "border-slate-300"
                  }`}
                />
              </div>
            )}
            {errors.motherTongue && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.motherTongue}
              </span>
            )}
          </div>

          {/* Religion */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Religion <span className="text-slate-500 font-normal">(Select or specify)</span>
            </label>
            <select
              value={isOtherReligion ? "Other" : (data.religion || "Roman Catholic")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "Other") {
                  setIsOtherReligion(true);
                  onChange({ religion: customReligion || "Other" });
                } else {
                  setIsOtherReligion(false);
                  onChange({ religion: val });
                }
                if (errors.religion) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.religion;
                    return next;
                  });
                }
              }}
              className="w-full p-3 bg-white border-2 border-slate-300 text-sm font-medium focus:border-[#002060] focus:ring-1 focus:ring-[#002060] outline-none"
            >
              {STANDARD_RELIGIONS.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
              <option value="Other">Other (Please specify)</option>
            </select>

            {isOtherReligion && (
              <div className="mt-2">
                <label className="block text-[11px] font-bold text-slate-800 uppercase mb-1">
                  Please specify Religion <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={customReligion}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomReligion(val);
                    onChange({ religion: val });
                    if (errors.religion) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.religion;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. Latter-day Saints (Mormon), Buddhism, etc."
                  className={`w-full p-2.5 bg-white border-2 text-xs font-bold focus:border-[#002060] outline-none ${
                    errors.religion ? "border-red-600 bg-red-50 text-red-900" : "border-slate-300"
                  }`}
                />
              </div>
            )}
            {errors.religion && (
              <span className="text-xs text-red-700 font-semibold mt-1 block">
                {errors.religion}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Part D: Social Welfare & Indigenous Cultural Community */}
      <div className="space-y-5 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            [ Part D: Indigenous Cultural Community &amp; 4Ps Beneficiary Data ]
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            Dumalneg is an ancestral domain of the Isnag/Itneg people. Specify cultural heritage and national social welfare affiliations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* IP Community Toggle & Specifier */}
          <div className="p-4 bg-white border-2 border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-900 uppercase">
              Belonging to any Indigenous Peoples (IP) Community? <span className="text-red-700">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="isIp"
                  checked={data.isIpCommunity}
                  onChange={() => onChange({ isIpCommunity: true, ipCommunityName: data.ipCommunityName || "Isnag" })}
                  className="text-[#002060] focus:ring-[#002060]"
                />
                <span>YES</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="isIp"
                  checked={!data.isIpCommunity}
                  onChange={() => onChange({ isIpCommunity: false, ipCommunityName: "" })}
                  className="text-[#002060] focus:ring-[#002060]"
                />
                <span>NO</span>
              </label>
            </div>

            {data.isIpCommunity && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Specify Indigenous Community Name <span className="text-red-700">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  {(["Isnag", "Itneg", "Tingguian"] as const).map((ip) => (
                    <button
                      key={ip}
                      type="button"
                      onClick={() => onChange({ ipCommunityName: ip })}
                      className={`text-[11px] font-bold px-2.5 py-1 border transition-all ${
                        data.ipCommunityName === ip
                          ? "bg-[#002060] text-white border-[#002060]"
                          : "bg-slate-100 text-slate-700 border-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {ip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={data.ipCommunityName || ""}
                  onChange={(e) => onChange({ ipCommunityName: e.target.value.toUpperCase() })}
                  placeholder="e.g. ISNAG"
                  className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none"
                />
                {errors.ipCommunityName && (
                  <span className="text-xs text-red-700 font-semibold mt-1 block">
                    {errors.ipCommunityName}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 4Ps Beneficiary Toggle & 16-Digit ID */}
          <div className="p-4 bg-white border-2 border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-900 uppercase">
              Is your family a beneficiary of 4Ps (Pantawid Pamilya)? <span className="text-red-700">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="is4ps"
                  checked={data.is4psBeneficiary}
                  onChange={() => onChange({ is4psBeneficiary: true })}
                  className="text-[#002060] focus:ring-[#002060]"
                />
                <span>YES</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="is4ps"
                  checked={!data.is4psBeneficiary}
                  onChange={() => onChange({ is4psBeneficiary: false, householdId4ps: "" })}
                  className="text-[#002060] focus:ring-[#002060]"
                />
                <span>NO</span>
              </label>
            </div>

            {data.is4psBeneficiary && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  4Ps Household ID Number (16 Digits) <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={data.householdId4ps || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    onChange({ householdId4ps: val });
                  }}
                  placeholder="0123456789012345"
                  className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-mono font-bold tracking-widest focus:border-[#002060] outline-none text-center"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  16-digit official household identification number on the DSWD 4Ps card.
                </span>
                {errors.householdId4ps && (
                  <span className="text-xs text-red-700 font-semibold mt-1 block">
                    {errors.householdId4ps}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Part E: Residential Addresses */}
      <div className="space-y-6 p-6 bg-slate-50 border-2 border-slate-300">
        <div className="border-b-2 border-slate-200 pb-3">
          <span className="text-xs font-bold text-[#002060] uppercase tracking-wider block">
            [ Part E: Current &amp; Permanent Residential Address ]
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            Provide the physical domicile address of the enrolling student.
          </p>
        </div>

        {/* Current Address */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block border-l-3 border-[#002060] pl-2">
            Current Residential Address
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* House No */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                House No. / Street
              </label>
              <input
                type="text"
                value={data.currentHouseNo || ""}
                onChange={(e) => handleCurrentAddressChange({ currentHouseNo: e.target.value.toUpperCase() })}
                placeholder="e.g. BLOCK 1 LOT 2"
                className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-medium uppercase focus:border-[#002060] outline-none"
              />
            </div>

            {/* Sitio */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Sitio / Purok
              </label>
              <input
                type="text"
                value={data.currentSitio || ""}
                onChange={(e) => handleCurrentAddressChange({ currentSitio: e.target.value.toUpperCase() })}
                placeholder="e.g. PUROK MANGGA"
                className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-medium uppercase focus:border-[#002060] outline-none"
              />
            </div>

            {/* Municipality Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Municipality / City <span className="text-red-700">*</span>
              </label>
              <select
                value={currentMuniMode}
                onChange={(e) => {
                  const mode = e.target.value as "DUMALNEG" | "OTHER";
                  setCurrentMuniMode(mode);
                  if (mode === "DUMALNEG") {
                    handleCurrentAddressChange({
                      currentMunicipality: "DUMALNEG",
                      currentBarangay:
                        data.currentBarangay &&
                        DUMALNEG_BARANGAYS.includes(data.currentBarangay.toUpperCase() as any)
                          ? data.currentBarangay.toUpperCase()
                          : "CABARITAN",
                      currentProvince: "ILOCOS NORTE",
                      currentZipCode: "2921",
                    });
                  } else {
                    handleCurrentAddressChange({
                      currentMunicipality: "",
                      currentBarangay: "",
                    });
                  }
                  if (errors.currentMunicipality) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.currentMunicipality;
                      return next;
                    });
                  }
                }}
                className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none"
              >
                <option value="DUMALNEG">DUMALNEG</option>
                <option value="OTHER">OTHER (OUTSIDE DUMALNEG)</option>
              </select>

              {currentMuniMode === "OTHER" && (
                <div className="mt-2">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase mb-1">
                    Specify Municipality / City <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="text"
                    value={
                      data.currentMunicipality &&
                      data.currentMunicipality.toUpperCase() !== "DUMALNEG"
                        ? data.currentMunicipality
                        : ""
                    }
                    onChange={(e) => {
                      handleCurrentAddressChange({
                        currentMunicipality: e.target.value.toUpperCase(),
                      });
                      if (errors.currentMunicipality) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.currentMunicipality;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. BANGUI, PAGUDPUD, ADAMS, LAOAG"
                    className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                      errors.currentMunicipality
                        ? "border-red-600 bg-red-50 text-red-900"
                        : "border-slate-300"
                    }`}
                  />
                </div>
              )}
              {errors.currentMunicipality && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.currentMunicipality}
                </span>
              )}
            </div>

            {/* Barangay (Smart Dropdown for Dumalneg, Text Box for Other) */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Barangay <span className="text-red-700">*</span>
              </label>
              {currentMuniMode === "DUMALNEG" ? (
                <select
                  value={(data.currentBarangay || "CABARITAN").toUpperCase()}
                  onChange={(e) => {
                    handleCurrentAddressChange({ currentBarangay: e.target.value.toUpperCase() });
                    if (errors.currentBarangay) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.currentBarangay;
                        return next;
                      });
                    }
                  }}
                  className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none"
                >
                  {DUMALNEG_BARANGAYS.map((brgy) => (
                    <option key={brgy} value={brgy.toUpperCase()} className="uppercase font-bold">
                      BRGY. {brgy.toUpperCase()}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={data.currentBarangay || ""}
                  onChange={(e) => {
                    handleCurrentAddressChange({ currentBarangay: e.target.value.toUpperCase() });
                    if (errors.currentBarangay) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.currentBarangay;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. SAN NICOLAS / POBLACION"
                  className={`w-full p-3 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                    errors.currentBarangay
                      ? "border-red-600 bg-red-50 text-red-900"
                      : "border-slate-300"
                  }`}
                />
              )}
              {errors.currentBarangay && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.currentBarangay}
                </span>
              )}
            </div>

            {/* Province */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Province <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={data.currentProvince || "ILOCOS NORTE"}
                onChange={(e) => handleCurrentAddressChange({ currentProvince: e.target.value.toUpperCase() })}
                className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none"
              />
              {errors.currentProvince && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.currentProvince}
                </span>
              )}
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Country
              </label>
              <input
                type="text"
                value={data.currentCountry || "Philippines"}
                readOnly
                className="w-full p-3 bg-slate-100 border-2 border-slate-300 text-xs font-bold text-slate-700 cursor-not-allowed outline-none"
              />
            </div>

            {/* Zip Code */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Zip Code
              </label>
              <input
                type="text"
                value={data.currentZipCode || "2921"}
                onChange={(e) => handleCurrentAddressChange({ currentZipCode: e.target.value })}
                readOnly={currentMuniMode === "DUMALNEG"}
                className={`w-full p-3 border-2 text-xs font-mono font-bold text-center outline-none ${
                  currentMuniMode === "DUMALNEG"
                    ? "bg-slate-100 border-slate-300 text-slate-700 cursor-not-allowed"
                    : "bg-white border-slate-300 text-slate-900 focus:border-[#002060]"
                }`}
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Learner / Family Mobile No. <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                maxLength={11}
                value={data.contactNumber || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  onChange({ contactNumber: val });
                }}
                placeholder="09171234567"
                className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none text-center"
              />
              {errors.contactNumber && (
                <span className="text-xs text-red-700 font-semibold mt-1 block">
                  {errors.contactNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Permanent Address Toggle */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between p-4 bg-white border-2 border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase block">
                Permanent Residential Address
              </span>
              <span className="text-[11px] text-slate-600">
                Is your permanent address identical to your current residential address?
              </span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handlePermanentToggle(true)}
                className={`px-4 py-2 border-2 text-xs font-bold uppercase transition-all ${
                  data.isPermanentSameAsCurrent
                    ? "bg-[#002060] text-white border-[#002060]"
                    : "bg-white text-slate-700 border-slate-300 hover:border-[#002060]"
                }`}
              >
                [ {data.isPermanentSameAsCurrent ? "X" : " "} ] YES (SAME)
              </button>
              <button
                type="button"
                onClick={() => handlePermanentToggle(false)}
                className={`px-4 py-2 border-2 text-xs font-bold uppercase transition-all ${
                  !data.isPermanentSameAsCurrent
                    ? "bg-[#002060] text-white border-[#002060]"
                    : "bg-white text-slate-700 border-slate-300 hover:border-[#002060]"
                }`}
              >
                [ {!data.isPermanentSameAsCurrent ? "X" : " "} ] NO (DIFFERENT)
              </button>
            </div>
          </div>

          {/* If Permanent Address is different */}
          {!data.isPermanentSameAsCurrent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white border-2 border-t-0 border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Permanent House No. / Street
                </label>
                <input
                  type="text"
                  value={data.permanentHouseNo || ""}
                  onChange={(e) => onChange({ permanentHouseNo: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-medium uppercase focus:border-[#002060] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Permanent Sitio / Purok
                </label>
                <input
                  type="text"
                  value={data.permanentSitio || ""}
                  onChange={(e) => onChange({ permanentSitio: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-medium uppercase focus:border-[#002060] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Permanent Municipality <span className="text-red-700">*</span>
                </label>
                <select
                  value={permanentMuniMode}
                  onChange={(e) => {
                    const mode = e.target.value as "DUMALNEG" | "OTHER";
                    setPermanentMuniMode(mode);
                    if (mode === "DUMALNEG") {
                      onChange({
                        permanentMunicipality: "DUMALNEG",
                        permanentBarangay:
                          data.permanentBarangay &&
                          DUMALNEG_BARANGAYS.includes(data.permanentBarangay.toUpperCase() as any)
                            ? data.permanentBarangay.toUpperCase()
                            : "CABARITAN",
                        permanentProvince: "ILOCOS NORTE",
                        permanentZipCode: "2921",
                      });
                    } else {
                      onChange({
                        permanentMunicipality: "",
                        permanentBarangay: "",
                      });
                    }
                    if (errors.permanentMunicipality) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.permanentMunicipality;
                        return next;
                      });
                    }
                  }}
                  className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none"
                >
                  <option value="DUMALNEG">DUMALNEG</option>
                  <option value="OTHER">OTHER (OUTSIDE DUMALNEG)</option>
                </select>

                {permanentMuniMode === "OTHER" && (
                  <div className="mt-2">
                    <label className="block text-[11px] font-bold text-slate-800 uppercase mb-1">
                      Specify Municipality / City <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="text"
                      value={
                        data.permanentMunicipality &&
                        data.permanentMunicipality.toUpperCase() !== "DUMALNEG"
                          ? data.permanentMunicipality
                          : ""
                      }
                      onChange={(e) => {
                        onChange({ permanentMunicipality: e.target.value.toUpperCase() });
                        if (errors.permanentMunicipality) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.permanentMunicipality;
                            return next;
                          });
                        }
                      }}
                      placeholder="e.g. BANGUI, PAGUDPUD, ADAMS, LAOAG"
                      className={`w-full p-2 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                        errors.permanentMunicipality
                          ? "border-red-600 bg-red-50 text-red-900"
                          : "border-slate-300"
                      }`}
                    />
                  </div>
                )}
                {errors.permanentMunicipality && (
                  <span className="text-xs text-red-700 font-semibold mt-1 block">
                    {errors.permanentMunicipality}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Permanent Barangay <span className="text-red-700">*</span>
                </label>
                {permanentMuniMode === "DUMALNEG" ? (
                  <select
                    value={(data.permanentBarangay || "CABARITAN").toUpperCase()}
                    onChange={(e) => {
                      onChange({ permanentBarangay: e.target.value.toUpperCase() });
                      if (errors.permanentBarangay) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.permanentBarangay;
                          return next;
                        });
                      }
                    }}
                    className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none"
                  >
                    {DUMALNEG_BARANGAYS.map((brgy) => (
                      <option key={brgy} value={brgy.toUpperCase()} className="uppercase font-bold">
                        BRGY. {brgy.toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={data.permanentBarangay || ""}
                    onChange={(e) => {
                      onChange({ permanentBarangay: e.target.value.toUpperCase() });
                      if (errors.permanentBarangay) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.permanentBarangay;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. CABARITAN / SAN NICOLAS"
                    className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                      errors.permanentBarangay
                        ? "border-red-600 bg-red-50 text-red-900"
                        : "border-slate-300"
                    }`}
                  />
                )}
                {errors.permanentBarangay && (
                  <span className="text-xs text-red-700 font-semibold mt-1 block">
                    {errors.permanentBarangay}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Permanent Province <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={data.permanentProvince || "ILOCOS NORTE"}
                  onChange={(e) => onChange({ permanentProvince: e.target.value.toUpperCase() })}
                  placeholder="e.g. ILOCOS NORTE"
                  className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none"
                />
                {errors.permanentProvince && (
                  <span className="text-xs text-red-700 font-semibold mt-1 block">
                    {errors.permanentProvince}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Permanent Zip Code
                </label>
                <input
                  type="text"
                  value={data.permanentZipCode || "2921"}
                  onChange={(e) => onChange({ permanentZipCode: e.target.value })}
                  readOnly={permanentMuniMode === "DUMALNEG"}
                  className={`w-full p-2.5 border-2 text-xs font-mono font-bold text-center outline-none ${
                    permanentMuniMode === "DUMALNEG"
                      ? "bg-slate-100 border-slate-300 text-slate-700 cursor-not-allowed"
                      : "bg-white border-slate-300 text-slate-900 focus:border-[#002060]"
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t-2 border-slate-200 pt-6 flex flex-col sm:flex-row justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary text-xs uppercase tracking-wider font-bold py-3.5 px-8 text-center"
        >
          Back to Step 1: Classification
        </button>
        <button
          type="button"
          onClick={validateAndProceed}
          className="btn-primary text-xs uppercase tracking-wider font-bold py-3.5 px-8 text-center shadow-sm"
        >
          Proceed: Family Background (Step 3)
        </button>
      </div>
    </div>
  );
}
