// ==============================================================================
// DUMAL-NEXT: ACADEMIC TERM HELPER UTILITIES (STUDENT PORTAL)
// Scoping enrollments and applications strictly to the active School Year & Term
// ==============================================================================

/**
 * Extracts numeric term number (1, 2, or 3) from various term/semester formats.
 * e.g., "1st Semester" -> 1, "Trimester 2" -> 2, "Third Trimester" -> 3, "2" -> 2
 */
export function extractTermNumber(termStr?: string | number | null): number {
  if (termStr === null || termStr === undefined) return 0;
  if (typeof termStr === "number") {
    return termStr >= 1 && termStr <= 3 ? termStr : 0;
  }
  const clean = String(termStr).toLowerCase().trim();
  if (!clean) return 0;

  if (clean.includes("1") || clean.includes("first") || clean.includes("una")) return 1;
  if (clean.includes("2") || clean.includes("second") || clean.includes("pangalawa")) return 2;
  if (clean.includes("3") || clean.includes("third") || clean.includes("pangatlo")) return 3;

  return 0;
}

/**
 * Normalizes school year strings (e.g., replaces en-dashes with hyphens, trims whitespace).
 */
export function normalizeSchoolYear(sy?: string | null): string {
  if (!sy) return "";
  return String(sy).replace(/[–—]/g, "-").trim();
}

/**
 * Checks whether an enrollment application belongs to a specific School Year and Academic Term.
 */
export function isApplicationInTerm(
  app: any,
  targetSchoolYear?: string | null,
  targetTerm?: string | number | null
): boolean {
  if (!app) return false;

  const targetSY = normalizeSchoolYear(targetSchoolYear);
  const appSY = normalizeSchoolYear(app.school_year || app.schoolYear);

  // If target school year is defined, ensure application matches
  if (targetSY && appSY && targetSY !== appSY) {
    return false;
  }

  // Extract application term from selected_electives payload or root properties
  const fd = Array.isArray(app.selected_electives) && app.selected_electives.length > 0
    ? app.selected_electives[0]
    : (typeof app.selected_electives === "object" && app.selected_electives !== null ? app.selected_electives : {});

  const rawTerm =
    fd.term_name ||
    fd.termName ||
    fd.semester ||
    fd.term ||
    fd.targetSemester ||
    app.term_name ||
    app.semester ||
    app.target_semester ||
    "";

  const appTermNum = extractTermNumber(rawTerm) || 1;
  const targetTermNum = extractTermNumber(targetTerm) || 1;

  return appTermNum === targetTermNum;
}

/**
 * Formats a clean display label for an academic period.
 */
export function formatAcademicPeriod(schoolYear?: string | null, termName?: string | null, termNumber?: number | null): string {
  const cleanSY = normalizeSchoolYear(schoolYear) || "2026-2027";
  const label = termName || (termNumber ? `Trimester ${termNumber}` : "Trimester 1");
  return `S.Y. ${cleanSY} (${label})`;
}
