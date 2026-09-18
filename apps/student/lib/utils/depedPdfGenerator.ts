// ==============================================================================
// DUMAL-NEXT: AUTOMATED OFFICIAL DEPED BASIC EDUCATION ENROLLMENT FORM GENERATOR
// Aligned with DepEd Form Revised 06/01/2025
// Populates Official 2-Page Scanned DepEd Document Template with Precision Alignment
// ==============================================================================

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { FullEnrollmentFormData } from "@/components/forms/enrollment/EnrollmentStepper";

/**
 * Loads binary image data for the DepEd form template pages.
 * Works seamlessly in client-side (via fetch) and server-side environments.
 */
async function loadTemplateImage(pageNumber: 1 | 2): Promise<ArrayBuffer> {
  const fileName = pageNumber === 1 ? "deped-enrollment-p1.jpg" : "deped-enrollment-p2.jpg";
  const publicPath = `/forms/${fileName}`;

  if (typeof window !== "undefined") {
    // Client-side execution (browser)
    const response = await fetch(publicPath);
    if (!response.ok) {
      throw new Error(`Failed to load DepEd template page ${pageNumber} from ${publicPath}`);
    }
    return await response.arrayBuffer();
  } else {
    // Server-side / Node.js execution
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", "forms", fileName);
    const buffer = fs.readFileSync(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }
}

/**
 * Generates the official DepEd 2-page accomplished enrollment form PDF.
 */
export async function generateDepEdEnrollmentPdf(data: FullEnrollmentFormData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Official DepEd Navy Blue text color (#002060)
  const textColor = rgb(0 / 255, 32 / 255, 96 / 255);

  // ----------------------------------------------------------------------------
  // PAGE 1: Learner Background, Addresses, & Family Information
  // ----------------------------------------------------------------------------
  const page1Bytes = await loadTemplateImage(1);
  const imgPage1 = await pdfDoc.embedJpg(page1Bytes);
  const page1 = pdfDoc.addPage([imgPage1.width, imgPage1.height]);
  page1.drawImage(imgPage1, {
    x: 0,
    y: 0,
    width: imgPage1.width,
    height: imgPage1.height,
  });

  // 1. School Year (e.g., 2025 - 2026)
  const currentSY = "2025-2026";
  const [syStart, syEnd] = currentSY.split("-");
  page1.drawText(syStart || "2025", { x: 142, y: 804, size: 9, font: fontBold, color: textColor });
  page1.drawText(syEnd || "2026", { x: 224, y: 804, size: 9, font: fontBold, color: textColor });

  // 1. LRN: 12-digit Learner Reference Number in boxes
  const rawLrn = (data.lrn || "").replace(/\D/g, "").slice(0, 12);
  for (let i = 0; i < rawLrn.length; i++) {
    page1.drawText(rawLrn[i], {
      x: 382 + i * 18.6,
      y: 789,
      size: 9,
      font: fontBold,
      color: textColor,
    });
  }

  // 2. Grade Level to Enroll
  if (data.step1.isGraded) {
    page1.drawText("X", { x: 59, y: 770, size: 9, font: fontBold, color: textColor });
    const targetGradeStr = String(data.step1.targetGradeLevel || "");
    page1.drawText(targetGradeStr, {
      x: 233,
      y: 768,
      size: 11,
      font: fontBold,
      color: textColor,
    });

    const isJHS = Number(data.step1.targetGradeLevel) <= 10;
    if (isJHS && (data.jhsProgram === "SPS" || data.step1.jhsProgram === "SPS")) {
      page1.drawText("(SPS - SPORTS)", {
        x: 260,
        y: 768,
        size: 8,
        font: fontBold,
        color: textColor,
      });
    }
  } else {
    // Non-Graded (SNEd Only)
    page1.drawText("X", { x: 59, y: 736, size: 9, font: fontBold, color: textColor });
  }

  // 3. Learner's Personal Information
  // PSA Birth Certificate No.
  if (data.psaBirthCertNo) {
    page1.drawText(data.psaBirthCertNo.toUpperCase(), {
      x: 80,
      y: 712,
      size: 9,
      font: fontBold,
      color: textColor,
    });
  }

  // Last Name (in individual letter boxes)
  const upperLastName = (data.lastName || "").toUpperCase();
  for (let i = 0; i < Math.min(upperLastName.length, 25); i++) {
    page1.drawText(upperLastName[i], {
      x: 61 + i * 18.2,
      y: 644,
      size: 9,
      font: fontBold,
      color: textColor,
    });
  }

  // First Name (in individual letter boxes)
  const upperFirstName = (data.firstName || "").toUpperCase();
  for (let i = 0; i < Math.min(upperFirstName.length, 25); i++) {
    page1.drawText(upperFirstName[i], {
      x: 61 + i * 18.2,
      y: 597,
      size: 9,
      font: fontBold,
      color: textColor,
    });
  }

  // Middle Name (in individual letter boxes)
  const upperMiddleName = (data.middleName || "").toUpperCase();
  for (let i = 0; i < Math.min(upperMiddleName.length, 25); i++) {
    page1.drawText(upperMiddleName[i], {
      x: 61 + i * 18.2,
      y: 550,
      size: 9,
      font: fontBold,
      color: textColor,
    });
  }

  // Extension Name (e.g., JR., III)
  const upperExt = (data.extensionName || "").toUpperCase();
  for (let i = 0; i < Math.min(upperExt.length, 5); i++) {
    page1.drawText(upperExt[i], {
      x: 61 + i * 18.2,
      y: 508,
      size: 9,
      font: fontBold,
      color: textColor,
    });
  }

  // Birthdate (mm/dd/yyyy)
  if (data.dateOfBirth) {
    // format YYYY-MM-DD
    const parts = data.dateOfBirth.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      page1.drawText(month, { x: 495, y: 644, size: 9, font: fontBold, color: textColor });
      page1.drawText(day, { x: 545, y: 644, size: 9, font: fontBold, color: textColor });
      page1.drawText(year, { x: 585, y: 644, size: 9, font: fontBold, color: textColor });
    }
  }

  // Age & Sex
  if (data.age) {
    page1.drawText(String(data.age), {
      x: 460,
      y: 597,
      size: 9,
      font: fontBold,
      color: textColor,
    });
  }

  if (data.gender === "Male") {
    page1.drawText("X", { x: 511, y: 597, size: 9, font: fontBold, color: textColor });
  } else if (data.gender === "Female") {
    page1.drawText("X", { x: 574, y: 597, size: 9, font: fontBold, color: textColor });
  }

  // Place of Birth
  if (data.placeOfBirth) {
    page1.drawText(data.placeOfBirth.toUpperCase(), {
      x: 455,
      y: 550,
      size: 8.5,
      font: fontRegular,
      color: textColor,
    });
  }

  // Religion
  if (data.religion) {
    page1.drawText(data.religion.toUpperCase(), {
      x: 455,
      y: 508,
      size: 8.5,
      font: fontRegular,
      color: textColor,
    });
  }

  // Mother Tongue
  page1.drawText((data.motherTongue || "ILOKANO").toUpperCase(), {
    x: 455,
    y: 468,
    size: 8.5,
    font: fontRegular,
    color: textColor,
  });

  // IP Community
  if (data.isIpCommunity) {
    page1.drawText("X", { x: 61, y: 480, size: 9, font: fontBold, color: textColor });
    page1.drawText((data.ipCommunityName || "ISNAG").toUpperCase(), {
      x: 245,
      y: 480,
      size: 8.5,
      font: fontBold,
      color: textColor,
    });
  } else {
    page1.drawText("X", { x: 105, y: 480, size: 9, font: fontBold, color: textColor });
  }

  // 4Ps Beneficiary
  if (data.is4psBeneficiary) {
    page1.drawText("X", { x: 220, y: 452, size: 9, font: fontBold, color: textColor });
    const raw4ps = (data.householdId4ps || "").replace(/\D/g, "").slice(0, 16);
    for (let i = 0; i < raw4ps.length; i++) {
      page1.drawText(raw4ps[i], {
        x: 70 + i * 18.5,
        y: 412,
        size: 9,
        font: fontBold,
        color: textColor,
      });
    }
  } else {
    page1.drawText("X", { x: 260, y: 452, size: 9, font: fontBold, color: textColor });
  }

  // Current Address
  if (data.currentHouseNo) {
    page1.drawText(data.currentHouseNo.toUpperCase(), {
      x: 58,
      y: 362,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
  }
  if (data.currentSitio) {
    page1.drawText(data.currentSitio.toUpperCase(), {
      x: 178,
      y: 362,
      size: 8,
      font: fontRegular,
      color: textColor,
    });
  }
  page1.drawText((data.currentBarangay || "CABARITAN").toUpperCase(), {
    x: 425,
    y: 362,
    size: 8,
    font: fontRegular,
    color: textColor,
  });
  page1.drawText((data.currentMunicipality || "DUMALNEG").toUpperCase(), {
    x: 58,
    y: 332,
    size: 8,
    font: fontRegular,
    color: textColor,
  });
  page1.drawText((data.currentProvince || "ILOCOS NORTE").toUpperCase(), {
    x: 215,
    y: 332,
    size: 8,
    font: fontRegular,
    color: textColor,
  });
  page1.drawText((data.currentCountry || "PHILIPPINES").toUpperCase(), {
    x: 375,
    y: 332,
    size: 8,
    font: fontRegular,
    color: textColor,
  });
  page1.drawText((data.currentZipCode || "2921").toUpperCase(), {
    x: 545,
    y: 332,
    size: 8,
    font: fontRegular,
    color: textColor,
  });

  // Permanent Address
  if (data.isPermanentSameAsCurrent) {
    page1.drawText("X", { x: 355, y: 303, size: 9, font: fontBold, color: textColor });
  } else {
    page1.drawText("X", { x: 395, y: 303, size: 9, font: fontBold, color: textColor });
    if (data.permanentHouseNo) page1.drawText(data.permanentHouseNo.toUpperCase(), { x: 58, y: 285, size: 8, font: fontRegular, color: textColor });
    if (data.permanentSitio) page1.drawText(data.permanentSitio.toUpperCase(), { x: 178, y: 285, size: 8, font: fontRegular, color: textColor });
    if (data.permanentBarangay) page1.drawText(data.permanentBarangay.toUpperCase(), { x: 425, y: 285, size: 8, font: fontRegular, color: textColor });
    if (data.permanentMunicipality) page1.drawText(data.permanentMunicipality.toUpperCase(), { x: 58, y: 260, size: 8, font: fontRegular, color: textColor });
    if (data.permanentProvince) page1.drawText(data.permanentProvince.toUpperCase(), { x: 215, y: 260, size: 8, font: fontRegular, color: textColor });
    if (data.permanentCountry) page1.drawText(data.permanentCountry.toUpperCase(), { x: 375, y: 260, size: 8, font: fontRegular, color: textColor });
    if (data.permanentZipCode) page1.drawText(data.permanentZipCode.toUpperCase(), { x: 545, y: 260, size: 8, font: fontRegular, color: textColor });
  }

  // 4. Parent's / Guardian's Information
  // Father
  if (data.fatherLastName) page1.drawText(data.fatherLastName.toUpperCase(), { x: 58, y: 222, size: 8, font: fontRegular, color: textColor });
  if (data.fatherFirstName) page1.drawText(data.fatherFirstName.toUpperCase(), { x: 205, y: 222, size: 8, font: fontRegular, color: textColor });
  if (data.fatherMiddleName) page1.drawText(data.fatherMiddleName.toUpperCase(), { x: 350, y: 222, size: 8, font: fontRegular, color: textColor });
  if (data.fatherContactNumber) page1.drawText(data.fatherContactNumber, { x: 495, y: 222, size: 8, font: fontRegular, color: textColor });

  // Mother's Maiden Name
  if (data.motherMaidenLastName) page1.drawText(data.motherMaidenLastName.toUpperCase(), { x: 58, y: 172, size: 8, font: fontRegular, color: textColor });
  if (data.motherFirstName) page1.drawText(data.motherFirstName.toUpperCase(), { x: 205, y: 172, size: 8, font: fontRegular, color: textColor });
  if (data.motherMiddleName) page1.drawText(data.motherMiddleName.toUpperCase(), { x: 350, y: 172, size: 8, font: fontRegular, color: textColor });
  if (data.motherContactNumber) page1.drawText(data.motherContactNumber, { x: 495, y: 172, size: 8, font: fontRegular, color: textColor });

  // Legal Guardian
  if (data.guardianLastName) page1.drawText(data.guardianLastName.toUpperCase(), { x: 58, y: 122, size: 8, font: fontRegular, color: textColor });
  if (data.guardianFirstName) page1.drawText(data.guardianFirstName.toUpperCase(), { x: 205, y: 122, size: 8, font: fontRegular, color: textColor });
  if (data.guardianMiddleName) page1.drawText(data.guardianMiddleName.toUpperCase(), { x: 350, y: 122, size: 8, font: fontRegular, color: textColor });
  if (data.guardianContactNumber) page1.drawText(data.guardianContactNumber, { x: 495, y: 122, size: 8, font: fontRegular, color: textColor });

  // ----------------------------------------------------------------------------
  // PAGE 2: SNEd, Academic History, Senior High Program, & Modalities
  // ----------------------------------------------------------------------------
  const page2Bytes = await loadTemplateImage(2);
  const imgPage2 = await pdfDoc.embedJpg(page2Bytes);
  const page2 = pdfDoc.addPage([imgPage2.width, imgPage2.height]);
  page2.drawImage(imgPage2, {
    x: 0,
    y: 0,
    width: imgPage2.width,
    height: imgPage2.height,
  });

  // Section 5: SNEd Program
  if (data.isSned) {
    page2.drawText("X", { x: 413, y: 887, size: 9, font: fontBold, color: textColor });
  } else {
    page2.drawText("X", { x: 457, y: 887, size: 9, font: fontBold, color: textColor });
  }

  if (data.hasPwdId) {
    page2.drawText("X", { x: 268, y: 647, size: 9, font: fontBold, color: textColor });
  } else {
    page2.drawText("X", { x: 308, y: 647, size: 9, font: fontBold, color: textColor });
  }

  // Section 6: Returning Learner / Transferee / Academic History
  const lastGradeCompleted = data.step1.lastGradeCompleted
    ? `Grade ${data.step1.lastGradeCompleted}`
    : "Grade 6";
  page2.drawText(lastGradeCompleted, {
    x: 75,
    y: 615,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  const lastSy = data.step1.lastSchoolYearCompleted || "2024-2025";
  page2.drawText(lastSy, {
    x: 350,
    y: 615,
    size: 9,
    font: fontBold,
    color: textColor,
  });

  const lastSchoolName = data.step1.lastSchoolAttended || "Dumalneg Central Elementary School";
  page2.drawText(lastSchoolName.toUpperCase(), {
    x: 75,
    y: 585,
    size: 8.5,
    font: fontRegular,
    color: textColor,
  });

  const lastSchoolId = (data.step1.lastSchoolId || "100123").slice(0, 6);
  for (let i = 0; i < lastSchoolId.length; i++) {
    page2.drawText(lastSchoolId[i], {
      x: 395 + i * 21,
      y: 583,
      size: 9,
      font: fontBold,
      color: textColor,
    });
  }

  // Section 7: Senior High School Program
  const isSHS =
    data.step1.applicantType === "Grade 11" ||
    ((data.step1.applicantType === "Transferee" || data.step1.applicantType === "Returning") &&
      Number(data.step1.targetGradeLevel) >= 11);

  if (isSHS) {
    if (data.targetSemester === "2nd Semester" || data.step1.targetSemester === "2nd Semester") {
      page2.drawText("X", { x: 180, y: 507, size: 9, font: fontBold, color: textColor });
    } else {
      page2.drawText("X", { x: 135, y: 507, size: 9, font: fontBold, color: textColor });
    }

    const shsTrack = data.targetTrack || data.step1.targetTrack || "Academic Track";
    page2.drawText(shsTrack.toUpperCase(), {
      x: 105,
      y: 483,
      size: 9,
      font: fontBold,
      color: textColor,
    });

    const shsStrand = data.targetStrand || data.step1.targetStrand || "STEM";
    page2.drawText(shsStrand.toUpperCase(), {
      x: 105,
      y: 450,
      size: 9,
      font: fontBold,
      color: textColor,
    });
  }

  // Section 8: Distance Learning Modalities Preferences
  const modalities = data.preferredModalities || ["Modular (Print)"];
  if (modalities.includes("Blended (Combination)")) {
    page2.drawText("X", { x: 105, y: 348, size: 9, font: fontBold, color: textColor });
  }
  if (modalities.includes("Modular (Print)")) {
    page2.drawText("X", { x: 367, y: 348, size: 9, font: fontBold, color: textColor });
  }
  if (modalities.includes("Modular (Digital)")) {
    page2.drawText("X", { x: 254, y: 334, size: 9, font: fontBold, color: textColor });
  }
  if (modalities.includes("Online")) {
    page2.drawText("X", { x: 395, y: 334, size: 9, font: fontBold, color: textColor });
  }
  if (modalities.includes("Homeschooling")) {
    page2.drawText("X", { x: 254, y: 348, size: 9, font: fontBold, color: textColor });
  }

  // Signature Over Printed Name of Parent/Guardian & Date
  const parentSignatory =
    data.fatherFirstName && data.fatherLastName
      ? `${data.fatherFirstName} ${data.fatherLastName}`
      : data.guardianFirstName && data.guardianLastName
      ? `${data.guardianFirstName} ${data.guardianLastName}`
      : data.motherFirstName && data.motherMaidenLastName
      ? `${data.motherFirstName} ${data.motherMaidenLastName}`
      : `${data.firstName} ${data.lastName} (Learner/Representative)`;

  page2.drawText(parentSignatory.toUpperCase(), {
    x: 135,
    y: 147,
    size: 8.5,
    font: fontBold,
    color: textColor,
  });

  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  page2.drawText(currentDate, {
    x: 470,
    y: 147,
    size: 8.5,
    font: fontBold,
    color: textColor,
  });

  return await pdfDoc.save();
}

/**
 * Triggers an immediate browser download of the accomplished DepEd enrollment form PDF.
 */
export async function downloadDepEdEnrollmentPdf(
  data: FullEnrollmentFormData,
  customFilename?: string
): Promise<void> {
  const pdfBytes = await generateDepEdEnrollmentPdf(data);
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const cleanLast = (data.lastName || "Learner").replace(/[^a-zA-Z0-9]/g, "_");
  const cleanFirst = (data.firstName || "Applicant").replace(/[^a-zA-Z0-9]/g, "_");
  const filename = customFilename || `DepEd_Enrollment_Form_${cleanLast}_${cleanFirst}.pdf`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
