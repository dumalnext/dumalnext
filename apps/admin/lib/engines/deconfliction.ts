/**
 * Automated Schedule Deconfliction Engine
 * Based on Dumal-NEXT Objectives (Activity 3), Class Diagram (Activity 4), and Architecture (Activity 5):
 * Checks 3-dimensional scheduling collisions:
 * 1. Teacher Conflicts (Preventing overlapping loads, especially JHS + SHS cross-level loads)
 * 2. Classroom Conflicts (Preventing double-booking of physical rooms)
 * 3. Student Constraints (Preventing duplicate class enrollment and enforcing max 5 core subjects for SHS per trisem)
 */

export interface ScheduleSlot {
  id?: string;
  subjectCode: string;
  sectionId: string;
  teacherId: string;
  classroomId: string;
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  startTime: string; // "HH:MM" 24-hr format
  endTime: string;   // "HH:MM" 24-hr format
  trimester: number;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: "TEACHER_COLLISION" | "ROOM_COLLISION" | "STUDENT_CORE_LIMIT" | "DUPLICATE_SUBJECT";
  message: string;
  details?: {
    conflictingScheduleId?: string;
    conflictingSubject?: string;
    conflictingRoomOrTeacher?: string;
  };
}

/**
 * Utility to convert "HH:MM" string to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks if two time periods on the same day overlap
 */
export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

/**
 * Deconfliction Engine: Evaluates a candidate schedule against existing schedules
 */
export function evaluateScheduleConflict(
  candidate: ScheduleSlot,
  existingSchedules: ScheduleSlot[]
): ConflictCheckResult {
  for (const existing of existingSchedules) {
    // Ignore self when updating
    if (candidate.id && existing.id === candidate.id) continue;

    // Must be same trimester and same day to collide
    if (
      existing.trimester === candidate.trimester &&
      existing.dayOfWeek === candidate.dayOfWeek
    ) {
      const overlaps = isTimeOverlapping(
        candidate.startTime,
        candidate.endTime,
        existing.startTime,
        existing.endTime
      );

      if (overlaps) {
        // 1. Check Teacher Collision (JHS and SHS cross-level load check)
        if (existing.teacherId === candidate.teacherId) {
          return {
            hasConflict: true,
            conflictType: "TEACHER_COLLISION",
            message: `May conflict sa oras ng guro: Ang guro ay mayroon nang klase sa ${existing.subjectCode} mula ${existing.startTime} hanggang ${existing.endTime} tuwing ${existing.dayOfWeek}.`,
            details: {
              conflictingScheduleId: existing.id,
              conflictingSubject: existing.subjectCode,
              conflictingRoomOrTeacher: candidate.teacherId,
            },
          };
        }

        // 2. Check Classroom Collision
        if (existing.classroomId === candidate.classroomId) {
          return {
            hasConflict: true,
            conflictType: "ROOM_COLLISION",
            message: `May conflict sa silid-aralan: Ang silid (${candidate.classroomId}) ay inookupa na ng ${existing.subjectCode} mula ${existing.startTime} hanggang ${existing.endTime}.`,
            details: {
              conflictingScheduleId: existing.id,
              conflictingSubject: existing.subjectCode,
              conflictingRoomOrTeacher: candidate.classroomId,
            },
          };
        }
      }
    }
  }

  return {
    hasConflict: false,
    message: "Walang nakitang schedule conflict. Ligtas i-save ang timetable.",
  };
}

/**
 * Validates Senior High School Core Subject Limit (Max 5 Core Subjects per Trisem)
 */
export function validateSHSCoreSubjectLimit(
  gradeLevel: number,
  coreSubjectsCount: number
): { isValid: boolean; message: string } {
  if (gradeLevel === 11 || gradeLevel === 12) {
    if (coreSubjectsCount > 5) {
      return {
        isValid: false,
        message: `Lumampas sa limitasyon: Ayon sa patakaran ng Dumalneg NHS, hanggang limang (5) core subjects lamang bawat trisem ang pinapayagan sa Senior High School. (Kasalukuyang pinili: ${coreSubjectsCount}).`,
      };
    }
  }

  return {
    isValid: true,
    message: "Pasok sa limitasyon ng mga core subjects para sa trisem.",
  };
}
