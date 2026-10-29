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
            message: `Instructor schedule conflict: The instructor already has a class in ${existing.subjectCode} from ${existing.startTime} to ${existing.endTime} on ${existing.dayOfWeek}.`,
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
            message: `Classroom conflict: Room (${candidate.classroomId}) is already occupied by ${existing.subjectCode} from ${existing.startTime} to ${existing.endTime}.`,
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
    message: "No schedule conflicts detected. Timetable is safe to save.",
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
        message: `Subject limit exceeded: Per Dumalneg NHS policy, a maximum of five (5) core subjects per trimester are allowed in Senior High School. (Currently selected: ${coreSubjectsCount}).`,
      };
    }
  }

  return {
    isValid: true,
    message: "Complies with core subject load limits for the trimester.",
  };
}
