export interface StudentGradeRecord {
  id: string; // e.g. "grade-100050610206-t2-2026-2027"
  studentId: string; // student uuid or student_id
  studentLrn: string;
  studentName: string;
  sectionId?: string;
  sectionName?: string;
  gradeLevel?: number | string;
  schoolYear: string; // e.g. "2026-2027"
  trimester: number; // 1, 2, or 3
  termName: string; // e.g. "Trimester 1", "Trimester 2", "Trimester 3"
  gradeImageUrl: string; // Base64 data URL (<350KB compressed)
  gradeImageName?: string;
  status: "DONE"; // System automatically records status as DONE
  uploadedByTeacherId?: string;
  uploadedByTeacherName?: string;
  uploadedAt: string; // ISO string
  remarks?: string;
}

export interface GradesApiResponse {
  success: boolean;
  isGradeOpen: boolean;
  schoolYear: string;
  termNumber: number;
  termName: string;
  records: StudentGradeRecord[];
  error?: string;
  message?: string;
}
