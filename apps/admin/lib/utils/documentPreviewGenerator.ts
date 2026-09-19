/**
 * DUMAL-NEXT: Institutional Document Preview & Data URL Generator
 * Provides authentic, high-resolution rendering of DepEd admission documents
 */

export interface DocPreviewContext {
  fullName: string;
  lrn: string;
  gender?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  schoolAttended?: string;
  gradeLevel?: number | string;
}

function toSvgDataUrl(svg: string): string {
  const cleanSvg = svg
    .replace(/&bull;/g, "&#8226;")
    .replace(/–/g, "-")
    .trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg)}`;
}

export function generateDepEdDocPreview(docType: string, ctx: DocPreviewContext): string {
  const cleanType = (docType || "").toLowerCase();

  // 1. PSA / NSO Birth Certificate
  if (cleanType.includes("birth") || cleanType.includes("psa")) {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="980" viewBox="0 0 700 980">
      <defs>
        <pattern id="psa-bg" width="100" height="100" patternUnits="userSpaceOnUse">
          <text x="10" y="50" font-family="sans-serif" font-size="9" fill="#002060" opacity="0.04" transform="rotate(-30 10 50)">PSA SECPA OFFICIAL</text>
        </pattern>
      </defs>
      <rect width="700" height="980" fill="#fffdfa" stroke="#cbd5e1" stroke-width="4"/>
      <rect x="15" y="15" width="670" height="950" fill="url(#psa-bg)" stroke="#94a3b8" stroke-width="1.5"/>
      
      <!-- Top PSA Header -->
      <circle cx="90" cy="80" r="30" fill="none" stroke="#002060" stroke-width="2"/>
      <text x="90" y="84" font-family="serif" font-size="10" font-weight="bold" fill="#002060" text-anchor="middle">PSA</text>
      
      <text x="350" y="60" font-family="Times New Roman, serif" font-size="12" text-anchor="middle" fill="#475569">Republic of the Philippines</text>
      <text x="350" y="78" font-family="Times New Roman, serif" font-size="15" font-weight="bold" text-anchor="middle" fill="#0f172a">PHILIPPINE STATISTICS AUTHORITY</text>
      <text x="350" y="96" font-family="Times New Roman, serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#002060">CERTIFICATE OF LIVE BIRTH</text>
      
      <line x1="40" y1="115" x2="660" y2="115" stroke="#002060" stroke-width="2"/>
      
      <!-- Registry Box -->
      <rect x="440" y="125" width="220" height="40" fill="#f8fafc" stroke="#64748b"/>
      <text x="450" y="142" font-family="monospace" font-size="10" fill="#64748b">Registry Number:</text>
      <text x="450" y="158" font-family="monospace" font-size="12" font-weight="bold" fill="#002060">2012-0004921-DN</text>
      
      <!-- Section 1: Child Information -->
      <rect x="40" y="180" width="620" height="28" fill="#002060"/>
      <text x="50" y="199" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" letter-spacing="1">1. CHILD'S PERSONAL RECORD</text>
      
      <!-- Name -->
      <rect x="40" y="208" width="620" height="50" fill="#ffffff" stroke="#94a3b8"/>
      <text x="50" y="224" font-family="sans-serif" font-size="10" fill="#64748b">FULL LEGAL NAME:</text>
      <text x="50" y="247" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${ctx.fullName.toUpperCase()}</text>
      
      <!-- Sex, DOB, POB -->
      <rect x="40" y="258" width="200" height="55" fill="#ffffff" stroke="#94a3b8"/>
      <text x="50" y="275" font-family="sans-serif" font-size="10" fill="#64748b">SEX:</text>
      <text x="50" y="298" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">${(ctx.gender || "MALE").toUpperCase()}</text>
      
      <rect x="240" y="258" width="210" height="55" fill="#ffffff" stroke="#94a3b8"/>
      <text x="250" y="275" font-family="sans-serif" font-size="10" fill="#64748b">DATE OF BIRTH:</text>
      <text x="250" y="298" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">${ctx.dateOfBirth || "MAY 15, 2012"}</text>
      
      <rect x="450" y="258" width="210" height="55" fill="#ffffff" stroke="#94a3b8"/>
      <text x="460" y="275" font-family="sans-serif" font-size="10" fill="#64748b">PLACE OF BIRTH:</text>
      <text x="460" y="298" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${(ctx.placeOfBirth || "Dumalneg, Ilocos Norte").toUpperCase()}</text>
      
      <!-- Section 2: Mother &amp; Father -->
      <rect x="40" y="325" width="620" height="26" fill="#002060"/>
      <text x="50" y="343" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" letter-spacing="1">2. PARENTAGE RECORDS</text>
      
      <!-- Mother -->
      <rect x="40" y="351" width="620" height="50" fill="#ffffff" stroke="#94a3b8"/>
      <text x="50" y="367" font-family="sans-serif" font-size="10" fill="#64748b">MOTHER'S MAIDEN NAME:</text>
      <text x="50" y="390" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${(ctx.motherName || "RAMOS, MARIA DELA CRUZ").toUpperCase()}</text>
      
      <!-- Father -->
      <rect x="40" y="401" width="620" height="50" fill="#ffffff" stroke="#94a3b8"/>
      <text x="50" y="417" font-family="sans-serif" font-size="10" fill="#64748b">FATHER'S NAME:</text>
      <text x="50" y="440" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${(ctx.fatherName || "LOZANO, JUAN CASTRO").toUpperCase()}</text>
      
      <!-- Section 3: Official DepEd Watermark &amp; Verification -->
      <rect x="40" y="465" width="620" height="280" fill="#f8fafc" stroke="#94a3b8" stroke-dasharray="4"/>
      <text x="350" y="520" font-family="sans-serif" font-size="18" font-weight="bold" fill="#002060" text-anchor="middle" opacity="0.15">AUTHENTICATED PHILIPPINE CIVIL REGISTRY</text>
      <text x="350" y="560" font-family="sans-serif" font-size="13" fill="#334155" text-anchor="middle">Official Copy Issued for Dumalneg National High School Basic Education Enrollment</text>
      <text x="350" y="585" font-family="monospace" font-size="12" fill="#002060" text-anchor="middle" font-weight="bold">LRN ASSIGNED: ${ctx.lrn}</text>
      
      <!-- Barcode representation -->
      <g transform="translate(180, 630)">
        <rect x="0" y="0" width="340" height="40" fill="#0f172a"/>
        <rect x="10" y="0" width="8" height="40" fill="#ffffff"/>
        <rect x="25" y="0" width="4" height="40" fill="#ffffff"/>
        <rect x="35" y="0" width="12" height="40" fill="#ffffff"/>
        <rect x="55" y="0" width="6" height="40" fill="#ffffff"/>
        <rect x="70" y="0" width="14" height="40" fill="#ffffff"/>
        <rect x="95" y="0" width="6" height="40" fill="#ffffff"/>
        <rect x="110" y="0" width="8" height="40" fill="#ffffff"/>
        <rect x="130" y="0" width="12" height="40" fill="#ffffff"/>
        <rect x="155" y="0" width="5" height="40" fill="#ffffff"/>
        <rect x="170" y="0" width="14" height="40" fill="#ffffff"/>
        <rect x="195" y="0" width="7" height="40" fill="#ffffff"/>
        <rect x="210" y="0" width="9" height="40" fill="#ffffff"/>
        <rect x="230" y="0" width="15" height="40" fill="#ffffff"/>
        <rect x="260" y="0" width="8" height="40" fill="#ffffff"/>
        <rect x="280" y="0" width="10" height="40" fill="#ffffff"/>
        <rect x="305" y="0" width="12" height="40" fill="#ffffff"/>
        <rect x="325" y="0" width="6" height="40" fill="#ffffff"/>
      </g>
      <text x="350" y="690" font-family="monospace" font-size="11" fill="#475569" text-anchor="middle">BARCODE SECPA NO. 08249-102948-2</text>
      
      <!-- Signatures -->
      <line x1="100" y1="840" x2="280" y2="840" stroke="#0f172a" stroke-width="1.5"/>
      <text x="190" y="860" font-family="sans-serif" font-size="11" font-weight="bold" fill="#002060" text-anchor="middle">CIVIL REGISTRAR GENERAL</text>
      <text x="190" y="875" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Philippine Statistics Authority</text>
      
      <line x1="420" y1="840" x2="600" y2="840" stroke="#0f172a" stroke-width="1.5"/>
      <text x="510" y="860" font-family="sans-serif" font-size="11" font-weight="bold" fill="#002060" text-anchor="middle">LOCAL CIVIL REGISTRAR</text>
      <text x="510" y="875" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Municipality of Dumalneg</text>
      
      <!-- Official Stamp -->
      <rect x="40" y="900" width="620" height="35" fill="#f1f5f9" stroke="#cbd5e1"/>
      <text x="50" y="922" font-family="monospace" font-size="9" font-weight="bold" fill="#002060">
        SECURITY PAPER SERIAL: PSA-2025-DM-883921 &#8226; VERIFIED CLEAR FOR ENROLLMENT EVALUATION
      </text>
    </svg>`;
    return toSvgDataUrl(svg);
  }

  // 2. SF9 / Form 138 (Report Card)
  if (cleanType.includes("form") || cleanType.includes("138") || cleanType.includes("sf9") || cleanType.includes("report")) {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="980" viewBox="0 0 700 980">
      <rect width="700" height="980" fill="#ffffff" stroke="#002060" stroke-width="5"/>
      <rect x="15" y="15" width="670" height="950" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
      
      <!-- DepEd Header -->
      <text x="350" y="55" font-family="Times New Roman, serif" font-size="12" text-anchor="middle" fill="#475569">Republic of the Philippines &#8226; Department of Education &#8226; Region I</text>
      <text x="350" y="75" font-family="Times New Roman, serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#002060">SCHOOLS DIVISION OF ILOCOS NORTE</text>
      <text x="350" y="95" font-family="Times New Roman, serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#0f172a">${(ctx.schoolAttended || "DUMALNEG ELEMENTARY SCHOOL").toUpperCase()}</text>
      <text x="350" y="112" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#64748b">School ID: 100050 &#8226; Dumalneg, Ilocos Norte</text>
      
      <line x1="40" y1="125" x2="660" y2="125" stroke="#002060" stroke-width="2"/>
      
      <!-- Form Title -->
      <text x="350" y="155" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle" fill="#002060">
        LEARNER'S PROGRESS REPORT CARD (SF9)
      </text>
      <text x="350" y="172" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#475569">
        School Year: 2024-2025 &#8226; Grade Level: Grade 6 &#8226; Section: Mabini
      </text>
      
      <!-- Student Info Block -->
      <rect x="40" y="190" width="620" height="55" fill="#f8fafc" stroke="#cbd5e1"/>
      <text x="55" y="210" font-family="sans-serif" font-size="10" fill="#64748b">LEARNER'S NAME:</text>
      <text x="55" y="232" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${ctx.fullName.toUpperCase()}</text>
      
      <text x="420" y="210" font-family="sans-serif" font-size="10" fill="#64748b">12-DIGIT LRN:</text>
      <text x="420" y="232" font-family="monospace" font-size="14" font-weight="bold" fill="#002060">${ctx.lrn}</text>
      
      <!-- Grades Table -->
      <rect x="40" y="260" width="620" height="30" fill="#002060"/>
      <text x="55" y="280" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">LEARNING AREAS (SUBJECTS)</text>
      <text x="350" y="280" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">Q1</text>
      <text x="410" y="280" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">Q2</text>
      <text x="470" y="280" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">Q3</text>
      <text x="530" y="280" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">Q4</text>
      <text x="600" y="280" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">FINAL</text>
      
      <!-- Rows -->
      ${[
        { sub: "Filipino", q1: 89, q2: 90, q3: 89, q4: 91, fin: 90 },
        { sub: "English", q1: 88, q2: 89, q3: 90, q4: 90, fin: 89 },
        { sub: "Mathematics", q1: 91, q2: 92, q3: 90, q4: 93, fin: 92 },
        { sub: "Science", q1: 90, q2: 91, q3: 92, q4: 91, fin: 91 },
        { sub: "Araling Panlipunan (AP)", q1: 88, q2: 89, q3: 90, q4: 89, fin: 89 },
        { sub: "Edukasyon sa Pagpapakatao (EsP)", q1: 93, q2: 94, q3: 92, q4: 93, fin: 93 },
        { sub: "Edukasyong Pantahanan at Pangkabuhayan (EPP)", q1: 88, q2: 89, q3: 89, q4: 90, fin: 89 },
        { sub: "MAPEH (Music, Arts, PE, Health)", q1: 90, q2: 91, q3: 90, q4: 91, fin: 91 },
      ]
        .map(
          (r, idx) => `
        <rect x="40" y="${290 + idx * 35}" width="620" height="35" fill="${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}" stroke="#cbd5e1"/>
        <text x="55" y="${312 + idx * 35}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b">${r.sub}</text>
        <text x="350" y="${312 + idx * 35}" font-family="monospace" font-size="12" fill="#0f172a" text-anchor="middle">${r.q1}</text>
        <text x="410" y="${312 + idx * 35}" font-family="monospace" font-size="12" fill="#0f172a" text-anchor="middle">${r.q2}</text>
        <text x="470" y="${312 + idx * 35}" font-family="monospace" font-size="12" fill="#0f172a" text-anchor="middle">${r.q3}</text>
        <text x="530" y="${312 + idx * 35}" font-family="monospace" font-size="12" fill="#0f172a" text-anchor="middle">${r.q4}</text>
        <text x="600" y="${312 + idx * 35}" font-family="monospace" font-size="12" font-weight="bold" fill="#002060" text-anchor="middle">${r.fin}</text>
      `
        )
        .join("")}
      
      <!-- General Average -->
      <rect x="40" y="570" width="620" height="40" fill="#eff6ff" stroke="#002060" stroke-width="2"/>
      <text x="55" y="595" font-family="sans-serif" font-size="12" font-weight="bold" fill="#002060">GENERAL AVERAGE &amp; REMARK:</text>
      <text x="530" y="596" font-family="sans-serif" font-size="11" font-weight="bold" fill="#047857">PROMOTED</text>
      <text x="600" y="596" font-family="monospace" font-size="16" font-weight="bold" fill="#002060" text-anchor="middle">90.25</text>
      
      <!-- Certificate of Transfer -->
      <rect x="40" y="630" width="620" height="150" fill="#ffffff" stroke="#94a3b8"/>
      <text x="350" y="655" font-family="sans-serif" font-size="11" font-weight="bold" fill="#002060" text-anchor="middle">CERTIFICATE OF TRANSFER / ELIGIBILITY FOR ADMISSION</text>
      <text x="60" y="685" font-family="sans-serif" font-size="11" fill="#334155">Eligible for admission to: <tspan font-weight="bold" fill="#002060">GRADE 7 (Junior High School)</tspan></text>
      <text x="60" y="705" font-family="sans-serif" font-size="11" fill="#334155">Target Institution: <tspan font-weight="bold" fill="#002060">DUMALNEG NATIONAL HIGH SCHOOL</tspan></text>
      <text x="60" y="725" font-family="sans-serif" font-size="11" fill="#334155">Canceled credential / SF9 released on: <tspan font-weight="bold">June 15, 2025</tspan></text>
      <text x="60" y="745" font-family="sans-serif" font-size="11" fill="#047857" font-weight="bold">[ SF9 STATUS: COMPLETE &#8226; NO ACADEMIC DEFICIENCIES ]</text>
      
      <!-- Signatures -->
      <line x1="80" y1="870" x2="260" y2="870" stroke="#0f172a" stroke-width="1.5"/>
      <text x="170" y="890" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">CLASS ADVISER</text>
      <text x="170" y="905" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Grade 6 - Mabini</text>
      
      <line x1="440" y1="870" x2="620" y2="870" stroke="#0f172a" stroke-width="1.5"/>
      <text x="530" y="890" font-family="sans-serif" font-size="11" font-weight="bold" fill="#002060" text-anchor="middle">SCHOOL PRINCIPAL</text>
      <text x="530" y="905" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Dumalneg Elementary School</text>
    </svg>`;
    return toSvgDataUrl(svg);
  }

  // 3. 2x2 Official Learner Photo
  if (cleanType.includes("id") || cleanType.includes("picture") || cleanType.includes("photo")) {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#ffffff" stroke="#002060" stroke-width="6"/>
      <rect x="15" y="15" width="370" height="370" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      
      <!-- Head / Silhouette Avatar with DepEd Style -->
      <circle cx="200" cy="150" r="65" fill="#002060"/>
      <path d="M100 320 C100 230, 300 230, 300 320 Z" fill="#002060"/>
      <polygon points="200,215 175,270 225,270" fill="#ffffff"/>
      
      <!-- Name Tag Box -->
      <rect x="40" y="325" width="320" height="45" fill="#ffffff" stroke="#002060" stroke-width="2"/>
      <text x="200" y="347" font-family="sans-serif" font-size="13" font-weight="bold" fill="#002060" text-anchor="middle">${ctx.fullName.toUpperCase()}</text>
      <text x="200" y="362" font-family="monospace" font-size="10" fill="#475569" text-anchor="middle">LRN: ${ctx.lrn}</text>
      
      <!-- DepEd Watermark -->
      <rect x="25" y="25" width="350" height="24" fill="#002060"/>
      <text x="200" y="41" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">DUMALNEG NATIONAL HIGH SCHOOL &#8226; 2X2 ID</text>
    </svg>`;
    return toSvgDataUrl(svg);
  }

  // 4. Good Moral Character / Barangay Residency Certificate
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="700" height="980" viewBox="0 0 700 980">
    <rect width="700" height="980" fill="#ffffff" stroke="#002060" stroke-width="8"/>
    <rect x="20" y="20" width="660" height="940" fill="none" stroke="#94a3b8" stroke-width="2"/>
    
    <text x="350" y="70" font-family="Times New Roman, serif" font-size="13" text-anchor="middle" fill="#64748b">Republic of the Philippines</text>
    <text x="350" y="95" font-family="Times New Roman, serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#002060">DEPARTMENT OF EDUCATION &#8226; REGION I</text>
    <text x="350" y="120" font-family="Times New Roman, serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#0f172a">${(ctx.schoolAttended || "DUMALNEG ELEMENTARY SCHOOL").toUpperCase()}</text>
    <text x="350" y="140" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#64748b">Municipality of Dumalneg, Province of Ilocos Norte &#8226; School ID: 100050</text>
    
    <line x1="80" y1="165" x2="620" y2="165" stroke="#002060" stroke-width="2"/>
    
    <text x="350" y="250" font-family="Times New Roman, serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#002060">
      CERTIFICATE OF GOOD MORAL CHARACTER
    </text>
    
    <text x="350" y="320" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#334155">TO WHOM IT MAY CONCERN:</text>
    
    <text x="350" y="380" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#334155">This is to certify that according to the records of this school,</text>
    <text x="350" y="430" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle" fill="#0f172a">${ctx.fullName.toUpperCase()}</text>
    <text x="350" y="460" font-family="monospace" font-size="13" font-weight="bold" text-anchor="middle" fill="#002060">Learner Reference Number (LRN): ${ctx.lrn}</text>
    
    <text x="350" y="520" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#334155">
      is an officially recognized student who has exemplified commendable moral character,
    </text>
    <text x="350" y="545" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#334155">
      good leadership, and unblemished behavior with zero disciplinary sanctions.
    </text>
    
    <text x="350" y="600" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#334155">
      This certification is hereby issued upon the request of the interested party for
    </text>
    <text x="350" y="625" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#002060">
      ADMISSION &amp; ENROLLMENT AT DUMALNEG NATIONAL HIGH SCHOOL (SY 2025-2026).
    </text>
    
    <text x="350" y="700" font-family="sans-serif" font-size="12" font-style="italic" text-anchor="middle" fill="#64748b">
      Given this 15th day of June 2025 at Dumalneg, Ilocos Norte, Philippines.
    </text>
    
    <!-- Signatures -->
    <line x1="220" y1="840" x2="480" y2="840" stroke="#002060" stroke-width="2"/>
    <text x="350" y="865" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#002060">SCHOOL PRINCIPAL</text>
    <text x="350" y="885" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#64748b">${(ctx.schoolAttended || "Dumalneg Elementary School").toUpperCase()}</text>
  </svg>`;
  return toSvgDataUrl(svg);
}
