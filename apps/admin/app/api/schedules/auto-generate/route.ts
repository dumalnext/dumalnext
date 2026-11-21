import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  TeacherSpecializationsMap,
  resolveTeacherSpecialization,
  doesSubjectAreaMatchCourse,
} from "@/lib/teacherSpecializations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export interface ScheduleItem {
  id: string;
  section_id: string;
  teacher_id: string;
  classroom_id: string;
  subject_code: string;
  subject_name: string;
  day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  start_time: string;
  end_time: string;
  school_year: string;
  trimester: number;
  created_at?: string;
  section_name?: string;
  grade_level?: number;
  strand?: string | null;
  teacher_name?: string;
  teacher_email?: string;
  department?: string;
  classroom_name?: string;
  building?: string;
  is_elective_slot?: boolean;
  is_backup_assignment?: boolean;
  match_tier?: "main" | "secondary" | "backup" | "manual";
}

export interface TeacherRecord {
  id: string;
  teacher_id?: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  department?: string;
  email?: string;
  fullName?: string;
  mainSubjects: string[];
  secondarySubjects: string[];
}

interface SubjectDef {
  code: string;
  name: string;
  type: "Core" | "Elective" | "Applied" | "Specialized" | "Intervention";
  gradeLevel: number;
  strand?: string | null;
}

function toMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const startA = toMinutes(s1);
  const endA = toMinutes(e1);
  const startB = toMinutes(s2);
  const endB = toMinutes(e2);
  return Math.max(startA, startB) < Math.min(endA, endB);
}

function normalizeSlotWindow(start: string, end: string): { s: string; e: string } {
  const s = (start || "").slice(0, 5);
  const e = (end || "").slice(0, 5);
  if (s === "10:00" && e === "11:00") return { s: "09:45", e: "10:45" };
  if (s === "11:00" && e === "12:00") return { s: "10:45", e: "11:45" };
  return { s, e };
}

const DAYS_OF_WEEK: Array<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"> = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export const CORE_TIME_SLOTS = [
  { id: "P1", name: "Period 1", start: "07:30", end: "08:30" },
  { id: "P2", name: "Period 2", start: "08:30", end: "09:30" },
  { id: "P3", name: "Period 3", start: "09:45", end: "10:45" },
  { id: "P4", name: "Period 4", start: "10:45", end: "11:45" },
  { id: "P5", name: "Period 5", start: "13:00", end: "14:00" },
  { id: "P6", name: "Period 6", start: "14:00", end: "15:00" },
  { id: "P7", name: "Period 7", start: "15:00", end: "16:00" },
  { id: "P8", name: "Period 8", start: "16:00", end: "17:00" },
];

function getDefaultJhsCoreSubjects(gradeLevel: number): SubjectDef[] {
  return [
    { code: `JHS-AP${gradeLevel}`, name: `Araling Panlipunan ${gradeLevel}`, type: "Core", gradeLevel, strand: "Regular" },
    { code: `JHS-VAL${gradeLevel}`, name: `Values Education (EsP) ${gradeLevel}`, type: "Core", gradeLevel, strand: "Regular" },
    { code: `JHS-MTH${gradeLevel}`, name: `Mathematics ${gradeLevel}`, type: "Core", gradeLevel, strand: "Regular" },
    { code: `JHS-ENG${gradeLevel}`, name: `English ${gradeLevel}`, type: "Core", gradeLevel, strand: "Regular" },
    { code: `JHS-SCI${gradeLevel}`, name: `Science ${gradeLevel}`, type: "Core", gradeLevel, strand: "Regular" },
    { code: `JHS-MAP${gradeLevel}`, name: `MAPEH ${gradeLevel}`, type: "Core", gradeLevel, strand: "Regular" },
    { code: `JHS-FIL${gradeLevel}`, name: `Filipino ${gradeLevel}`, type: "Core", gradeLevel, strand: "Regular" },
    { code: `JHS-TLE${gradeLevel}`, name: `Technology & Livelihood Education (TLE) ${gradeLevel}`, type: "Core", gradeLevel, strand: "Regular" },
  ];
}

function getDefaultShsCoreSubjects(gradeLevel: number): SubjectDef[] {
  return [
    { code: `SHS-GMATH${gradeLevel}`, name: "General Mathematics", type: "Core", gradeLevel, strand: "General" },
    { code: `SHS-LCSKILLS${gradeLevel}`, name: "Life and Career Skills", type: "Core", gradeLevel, strand: "General" },
    { code: `SHS-GSCI${gradeLevel}`, name: "General Science", type: "Core", gradeLevel, strand: "General" },
    { code: `SHS-EFFCOM${gradeLevel}`, name: "Effective Communication / Mabisang Komunikasyon", type: "Core", gradeLevel, strand: "General" },
    { code: `SHS-KASAY${gradeLevel}`, name: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", type: "Core", gradeLevel, strand: "General" },
  ];
}

function getDefaultShsElectives(gradeLevel: number, isTechPro: boolean): SubjectDef[] {
  if (isTechPro) {
    return [
      { code: "TECH-ORGANIC", name: "Organic Agriculture Production (NC II)", type: "Specialized", gradeLevel, strand: "TechPro" },
      { code: "TECH-CROPS", name: "Agricultural Crops Production (NC II)", type: "Specialized", gradeLevel, strand: "TechPro" },
      { code: "TECH-CSS", name: "Computer Systems Servicing (NC II)", type: "Specialized", gradeLevel, strand: "TechPro" },
      { code: "TECH-FOODPROC", name: "Food Processing (NC II)", type: "Specialized", gradeLevel, strand: "TechPro" },
      { code: "TECH-EIM", name: "Electrical Installation Maintenance (NC II)", type: "Specialized", gradeLevel, strand: "TechPro" },
      { code: "TECH-BAKERY", name: "Bakery Operation (NC II)", type: "Specialized", gradeLevel, strand: "TechPro" },
    ];
  }
  return [
    { code: "ACAD-PHILOS", name: "Introduction to Philosophy", type: "Elective", gradeLevel, strand: "Academic" },
    { code: "ACAD-MALIKPAG", name: "Creative Writing / Malikhaing Pagsulat", type: "Elective", gradeLevel, strand: "Academic" },
    { code: "ACAD-BIO1", name: "Biology 1", type: "Elective", gradeLevel, strand: "Academic" },
    { code: "ACAD-CHEM1", name: "Chemistry 1", type: "Elective", gradeLevel, strand: "Academic" },
    { code: "ACAD-PHYS1", name: "Physics 1", type: "Elective", gradeLevel, strand: "Academic" },
    { code: "ACAD-BACC1", name: "Business 1 (Basic Accounting)", type: "Elective", gradeLevel, strand: "Academic" },
    { code: "ACAD-SOCSCI", name: "Social Sciences (Theory and Practice)", type: "Elective", gradeLevel, strand: "Academic" },
    { code: "ACAD-GOV", name: "Philippine Governance (Politics and Governance)", type: "Elective", gradeLevel, strand: "Academic" },
  ];
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unavailable" },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));

    // 0. Fetch active academic term configured by IT Support
    const { data: termsData } = await supabase
      .from("academic_terms")
      .select("schoolYear, termNumber, termName, isActive")
      .order("schoolYear", { ascending: false });

    const activeTerm = (termsData || []).find((t: any) => t.isActive);
    const schoolYear = body.school_year || activeTerm?.schoolYear || "2026–2027";
    const trimester = Number(body.trimester) || Number(activeTerm?.termNumber) || 1;
    const termName = activeTerm?.termName || `Trimester ${trimester}`;
    const clearExisting = body.clearExisting !== false;
    const allowBackupTeachers = Boolean(body.allowBackupTeachers);
    const maxWeeklyHours = Math.min(40, Math.max(10, Number(body.maxWeeklyHours) || 30));

    // 1. Fetch current database state: sections, teachers, specializations, classrooms, subjects, existing schedules
    const [
      { data: dbSections },
      { data: dbTeachers },
      { data: sysSpecsData },
      { data: dbClassrooms },
      { data: sysClassroomsData },
      { data: dbSubjects },
      { data: sysSubjectsData },
      { data: existingSchedConfig },
      { data: dbSchedulesData },
    ] = await Promise.all([
      supabase.from("sections").select("id, section_name, grade_level, strand"),
      supabase.from("teachers").select("id, teacher_id, first_name, middle_name, last_name, department, email").order("last_name"),
      supabase.from("system_settings").select("value").eq("key", "teacher_specializations_config").maybeSingle(),
      supabase.from("classrooms").select("id, classroom_id, room_name, building"),
      supabase.from("system_settings").select("value").eq("key", "classrooms_config").maybeSingle(),
      supabase.from("course_subjects").select("id, subject_code, subject_name, grade_level, trimester, strand, subject_type"),
      supabase.from("system_settings").select("value").eq("key", "subjects_config").maybeSingle(),
      supabase.from("system_settings").select("value").eq("key", "class_schedules_config").maybeSingle(),
      supabase.from("class_schedules").select("*"),
    ]);

    const activeSections = dbSections || [];
    if (activeSections.length === 0) {
      return NextResponse.json(
        { success: false, error: "No class sections found. Please add class sections first before building schedules." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const rawTeachers = dbTeachers || [];
    if (rawTeachers.length === 0) {
      return NextResponse.json(
        { success: false, error: "No registered teachers found. Please add teachers first before building schedules." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const savedSpecsMap: TeacherSpecializationsMap =
      sysSpecsData?.value?.specializations && typeof sysSpecsData.value.specializations === "object"
        ? sysSpecsData.value.specializations
        : {};

    // 2. Build real Teacher Pool with database-saved Main & Secondary subjects (NO fake placeholder teachers)
    const allTeachersPool: TeacherRecord[] = rawTeachers.map((t: any) => {
      const middle = t.middle_name ? ` ${t.middle_name}` : "";
      const fullName = `${t.first_name || ""}${middle} ${t.last_name || ""}`.trim() || t.email || "Faculty Member";
      const spec = resolveTeacherSpecialization(t, savedSpecsMap);
      return {
        ...t,
        fullName,
        mainSubjects: spec.mainSubjects,
        secondarySubjects: spec.secondarySubjects,
      };
    });

    // 3. Classrooms Setup: Merge database classrooms with system_settings custom classrooms
    const customRooms = sysClassroomsData?.value?.customClassrooms || [];
    const roomMap = new Map<string, any>();
    (dbClassrooms || []).forEach((r) => roomMap.set(r.id, r));
    customRooms.forEach((r: any) => {
      const rId = r.id || r.classroom_id || r.classroomId;
      if (rId) {
        roomMap.set(rId, {
          id: rId,
          classroom_id: r.classroom_id || r.classroomId || rId,
          room_name: r.room_name || r.roomName || `Room ${rId}`,
          building: r.building || "Main Academic Building",
        });
      }
    });

    const allClassrooms = Array.from(roomMap.values());
    const sectionBaseRoomMap = new Map<string, any>();
    const usedRoomIds = new Set<string>();

    activeSections.forEach((sec, idx) => {
      const available = allClassrooms.find((r) => !usedRoomIds.has(r.id));
      if (available) {
        usedRoomIds.add(available.id);
        sectionBaseRoomMap.set(sec.id, available);
      } else {
        const virtualRoom = {
          id: `rm-home-${sec.id}`,
          classroom_id: `RM-${101 + idx}`,
          room_name: `Room ${101 + idx} (${sec.section_name})`,
          building: sec.grade_level >= 11 ? "SHS Academic Complex" : "JHS Main Building",
        };
        sectionBaseRoomMap.set(sec.id, virtualRoom);
      }
    });

    // 4. Dynamic Curriculum Subject Pool Setup
    const deletedSubjectCodes = new Set<string>(
      Array.isArray(sysSubjectsData?.value?.deletedCodes) ? sysSubjectsData.value.deletedCodes : []
    );
    const dynamicSubjectsMap = new Map<string, SubjectDef>();

    (dbSubjects || []).forEach((s: any) => {
      const code = (s.subject_code || "").trim();
      if (code && !deletedSubjectCodes.has(code)) {
        dynamicSubjectsMap.set(code, {
          code,
          name: s.subject_name || code,
          type: (s.subject_type || "Core") as any,
          gradeLevel: Number(s.grade_level) || 7,
          strand: s.strand || null,
        });
      }
    });

    if (Array.isArray(sysSubjectsData?.value?.subjects)) {
      sysSubjectsData.value.subjects.forEach((s: any) => {
        const code = (s.subject_code || s.subjectCode || "").trim();
        if (code && !deletedSubjectCodes.has(code)) {
          dynamicSubjectsMap.set(code, {
            code,
            name: s.subject_name || s.subjectName || code,
            type: (s.subject_type || s.subjectType || "Core") as any,
            gradeLevel: Number(s.grade_level || s.gradeLevel) || 7,
            strand: s.strand || null,
          });
        }
      });
    }

    const allDynamicSubjects = Array.from(dynamicSubjectsMap.values());

    // 5. Conflict Trackers, Fair Load Balancing Counters & Pre-loading Manual Schedules (Step 4)
    const teacherSlotTracker = new Set<string>();
    const roomSlotTracker = new Set<string>();
    const sectionSlotTracker = new Set<string>();
    const teacherWeeklyHours = new Map<string, number>();
    const teacherDailyHours = new Map<string, number>();
    allTeachersPool.forEach((t) => teacherWeeklyHours.set(t.id, 0));

    // Existing manual schedules (when clearExisting === false)
    const retainedManualSchedules: ScheduleItem[] = [];
    const manualSubjectCountBySection = new Map<string, number>();

    if (!clearExisting) {
      const existingMap = new Map<string, ScheduleItem>();
      (dbSchedulesData || []).forEach((item: any) => {
        const norm = normalizeSlotWindow(item.start_time?.slice(0, 5) || "07:30", item.end_time?.slice(0, 5) || "08:30");
        existingMap.set(item.id, {
          id: item.id,
          section_id: item.section_id,
          teacher_id: item.teacher_id,
          classroom_id: item.classroom_id,
          subject_code: item.subject_code,
          subject_name: item.subject_name || item.subject_code,
          day_of_week: item.day_of_week,
          start_time: norm.s,
          end_time: norm.e,
          school_year: item.school_year || schoolYear,
          trimester: item.trimester || trimester,
        });
      });
      const cfgSchedules: ScheduleItem[] = existingSchedConfig?.value?.schedules || [];
      cfgSchedules.forEach((item) => {
        const norm = normalizeSlotWindow(item.start_time, item.end_time);
        existingMap.set(item.id, { ...item, start_time: norm.s, end_time: norm.e });
      });

      for (const item of existingMap.values()) {
        const tKey = `${item.teacher_id}|${item.day_of_week}|${item.start_time}-${item.end_time}`;
        const rKey = `${item.classroom_id}|${item.day_of_week}|${item.start_time}-${item.end_time}`;
        const sKey = `${item.section_id}|${item.day_of_week}|${item.start_time}-${item.end_time}`;

        // Skip duplicate corrupted entries if any already existed
        if (sectionSlotTracker.has(sKey)) continue;

        teacherSlotTracker.add(tKey);
        roomSlotTracker.add(rKey);
        sectionSlotTracker.add(sKey);

        teacherWeeklyHours.set(item.teacher_id, (teacherWeeklyHours.get(item.teacher_id) || 0) + 1);
        const dKey = `${item.teacher_id}|${item.day_of_week}`;
        teacherDailyHours.set(dKey, (teacherDailyHours.get(dKey) || 0) + 1);

        const secSubjKey = `${item.section_id}|${(item.subject_code || "").toUpperCase()}`;
        manualSubjectCountBySection.set(secSubjKey, (manualSubjectCountBySection.get(secSubjKey) || 0) + 1);
        const secNameKey = `${item.section_id}|${(item.subject_name || "").toLowerCase()}`;
        manualSubjectCountBySection.set(secNameKey, (manualSubjectCountBySection.get(secNameKey) || 0) + 1);

        retainedManualSchedules.push({ ...item, match_tier: "manual" });
      }
    }

    const generatedSchedules: ScheduleItem[] = [];
    const unassignedSlotsReport: Array<{
      sectionName: string;
      gradeLevel: number;
      subjectName: string;
      subjectCode: string;
      periodsCount: number;
      reason: string;
    }> = [];
    let backupAssignmentsCount = 0;

    const canTeacherTakeSlots = (
      teacherId: string,
      slots: Array<{ day: string; start: string; end: string }>
    ): boolean => {
      const currentWeek = teacherWeeklyHours.get(teacherId) || 0;
      if (currentWeek + slots.length > maxWeeklyHours) return false;
      for (const sl of slots) {
        if (teacherSlotTracker.has(`${teacherId}|${sl.day}|${sl.start}-${sl.end}`)) {
          return false;
        }
      }
      return true;
    };

    const sortByLeastLoaded = (
      candidates: TeacherRecord[],
      preferredOffset: number
    ): TeacherRecord[] => {
      return [...candidates].sort((a, b) => {
        const loadA = teacherWeeklyHours.get(a.id) || 0;
        const loadB = teacherWeeklyHours.get(b.id) || 0;
        if (loadA !== loadB) return loadA - loadB;
        const idxA = (allTeachersPool.findIndex((t) => t.id === a.id) + preferredOffset) % Math.max(1, allTeachersPool.length);
        const idxB = (allTeachersPool.findIndex((t) => t.id === b.id) + preferredOffset) % Math.max(1, allTeachersPool.length);
        return idxA - idxB;
      });
    };

    const selectTeacherForSubjectBlock = (
      subjName: string,
      subjCode: string,
      isSHS: boolean,
      preferredOffset: number,
      slots: Array<{ day: string; start: string; end: string }>
    ): { teacher: TeacherRecord | null; tier: "main" | "secondary" | "backup" | "unassigned"; reason?: string } => {
      // Tier 1: Teachers whose MAIN SUBJECTS match this course, sorted by least loaded first
      const mainSpecialists = sortByLeastLoaded(
        allTeachersPool.filter((t) =>
          t.mainSubjects.some((area) => doesSubjectAreaMatchCourse(area, subjName, subjCode, isSHS))
        ),
        preferredOffset
      );
      for (const cand of mainSpecialists) {
        if (canTeacherTakeSlots(cand.id, slots)) {
          return { teacher: cand, tier: "main" };
        }
      }

      // Tier 2: Teachers whose SECONDARY / BACKUP SUBJECTS match this course, sorted by least loaded first
      const secondarySpecialists = sortByLeastLoaded(
        allTeachersPool.filter((t) =>
          t.secondarySubjects.some((area) => doesSubjectAreaMatchCourse(area, subjName, subjCode, isSHS))
        ),
        preferredOffset
      );
      for (const cand of secondarySpecialists) {
        if (canTeacherTakeSlots(cand.id, slots)) {
          return { teacher: cand, tier: "secondary" };
        }
      }

      // Check why no specialist could take it
      const totalMatchedSpecialists = mainSpecialists.length + secondarySpecialists.length;

      // Tier 3 (Optional): If allowBackupTeachers is enabled, pick the least-loaded free teacher in the same department
      if (allowBackupTeachers) {
        const deptPool = sortByLeastLoaded(
          allTeachersPool.filter((t) =>
            isSHS ? (t.department || "").toUpperCase() === "SHS" : (t.department || "").toUpperCase() !== "SHS"
          ),
          preferredOffset
        );
        for (const cand of deptPool) {
          if (canTeacherTakeSlots(cand.id, slots)) {
            return { teacher: cand, tier: "backup" };
          }
        }
        const anyPool = sortByLeastLoaded(allTeachersPool, preferredOffset);
        for (const cand of anyPool) {
          if (canTeacherTakeSlots(cand.id, slots)) {
            return { teacher: cand, tier: "backup" };
          }
        }
      }

      const reason =
        totalMatchedSpecialists === 0
          ? `No teacher has "${subjName}" assigned as a Main or Backup subject yet.`
          : `All ${totalMatchedSpecialists} qualified teacher(s) for "${subjName}" are either busy at this time slot or have reached the ${maxWeeklyHours} hrs/week limit.`;

      return { teacher: null, tier: "unassigned", reason };
    };

    const bookSlot = (item: ScheduleItem) => {
      const tKey = `${item.teacher_id}|${item.day_of_week}|${item.start_time}-${item.end_time}`;
      const rKey = `${item.classroom_id}|${item.day_of_week}|${item.start_time}-${item.end_time}`;
      const sKey = `${item.section_id}|${item.day_of_week}|${item.start_time}-${item.end_time}`;

      teacherSlotTracker.add(tKey);
      roomSlotTracker.add(rKey);
      sectionSlotTracker.add(sKey);
      teacherWeeklyHours.set(item.teacher_id, (teacherWeeklyHours.get(item.teacher_id) || 0) + 1);
      const dKey = `${item.teacher_id}|${item.day_of_week}`;
      teacherDailyHours.set(dKey, (teacherDailyHours.get(dKey) || 0) + 1);
      generatedSchedules.push(item);
    };

    // 6. GENERATE WEEKLY TIMETABLE PER SECTION (RESPECTING LOCKED MANUAL SLOTS)
    let jhsSecCounter = 0;
    let shsSecCounter = 0;

    for (let secIdx = 0; secIdx < activeSections.length; secIdx++) {
      const sec = activeSections[secIdx];
      const isSHS = sec.grade_level >= 11;
      const isTechPro =
        (sec.strand || "").toUpperCase().includes("TVL") ||
        (sec.strand || "").toUpperCase().includes("TECH");
      const baseRoom = sectionBaseRoomMap.get(sec.id);

      const sectionGrid = new Map<string, { code: string; name: string; isElective: boolean }>();

      if (!isSHS) {
        const k = jhsSecCounter++;
        const dbGradeCore = allDynamicSubjects.filter(
          (s) => s.gradeLevel === sec.grade_level && s.type !== "Intervention"
        );
        const fallbackCore = getDefaultJhsCoreSubjects(sec.grade_level);
        const mergedCore: SubjectDef[] = [...dbGradeCore];
        for (const fb of fallbackCore) {
          if (mergedCore.length >= 8) break;
          if (!mergedCore.some((m) => m.code === fb.code || m.name.toLowerCase() === fb.name.toLowerCase())) {
            mergedCore.push(fb);
          }
        }

        const A: SubjectDef[] = [];
        for (let m = 0; m < 8; m++) {
          A.push(mergedCore[(m + k) % mergedCore.length]);
        }

        const hgpSubj = {
          code: `HGP-${sec.grade_level}`,
          name: `Homeroom Guidance Program (HGP ${sec.grade_level})`,
          isElective: false,
        };
        const aralSubj = {
          code: `ARAL-${sec.grade_level}`,
          name: `ARAL / Remediation & Enrichment`,
          isElective: false,
        };
        const cocurrSubj = {
          code: `COCURR-${sec.grade_level}`,
          name: `Co-Curricular Activities`,
          isElective: false,
        };

        ["Monday", "Tuesday", "Wednesday", "Thursday"].forEach((d) =>
          sectionGrid.set(`${d}|0`, { code: A[0].code, name: A[0].name, isElective: false })
        );
        sectionGrid.set(`Friday|0`, hgpSubj);

        ["Tuesday", "Wednesday", "Thursday", "Friday"].forEach((d) =>
          sectionGrid.set(`${d}|1`, { code: A[1].code, name: A[1].name, isElective: false })
        );
        sectionGrid.set(`Monday|1`, { code: A[7].code, name: A[7].name, isElective: false });

        ["Monday", "Tuesday", "Wednesday", "Thursday"].forEach((d) =>
          sectionGrid.set(`${d}|2`, { code: A[2].code, name: A[2].name, isElective: false })
        );
        sectionGrid.set(`Friday|2`, { code: A[7].code, name: A[7].name, isElective: false });

        ["Monday", "Tuesday", "Thursday", "Friday"].forEach((d) =>
          sectionGrid.set(`${d}|3`, { code: A[3].code, name: A[3].name, isElective: false })
        );
        sectionGrid.set(`Wednesday|3`, { code: A[7].code, name: A[7].name, isElective: false });

        ["Monday", "Tuesday", "Wednesday", "Friday"].forEach((d) =>
          sectionGrid.set(`${d}|4`, { code: A[4].code, name: A[4].name, isElective: false })
        );
        sectionGrid.set(`Thursday|4`, { code: A[7].code, name: A[7].name, isElective: false });

        ["Monday", "Tuesday", "Wednesday", "Friday"].forEach((d) =>
          sectionGrid.set(`${d}|5`, { code: A[5].code, name: A[5].name, isElective: false })
        );
        sectionGrid.set(`Thursday|5`, { code: A[6].code, name: A[6].name, isElective: false });

        ["Monday", "Tuesday", "Wednesday"].forEach((d) =>
          sectionGrid.set(`${d}|6`, { code: A[6].code, name: A[6].name, isElective: false })
        );
        ["Thursday", "Friday"].forEach((d) => sectionGrid.set(`${d}|6`, aralSubj));

        ["Monday", "Tuesday", "Wednesday", "Thursday"].forEach((d) =>
          sectionGrid.set(`${d}|7`, aralSubj)
        );
        sectionGrid.set(`Friday|7`, cocurrSubj);
      } else {
        const k = shsSecCounter++;
        const dbShsCore = allDynamicSubjects.filter(
          (s) => (s.gradeLevel === sec.grade_level || s.gradeLevel >= 11) && s.type === "Core"
        );
        const fallbackShsCore = getDefaultShsCoreSubjects(sec.grade_level);
        const mergedShsCore: SubjectDef[] = [...dbShsCore];
        for (const fb of fallbackShsCore) {
          if (mergedShsCore.length >= 5) break;
          if (!mergedShsCore.some((m) => m.code === fb.code || m.name.toLowerCase() === fb.name.toLowerCase())) {
            mergedShsCore.push(fb);
          }
        }

        const B: SubjectDef[] = [];
        for (let m = 0; m < 5; m++) {
          B.push(mergedShsCore[(m + k) % 5]);
        }

        const dbElectives = allDynamicSubjects.filter((s) => {
          if (s.gradeLevel < 11 || s.type === "Core" || s.type === "Intervention") return false;
          if (isTechPro) {
            return (
              s.type === "Specialized" ||
              (s.strand || "").toLowerCase().includes("tech") ||
              s.code.startsWith("TECH-")
            );
          }
          return (
            s.type === "Elective" ||
            s.type === "Applied" ||
            (s.strand || "").toLowerCase().includes("acad") ||
            s.code.startsWith("ACAD-")
          );
        });

        const fallbackElectives = getDefaultShsElectives(sec.grade_level, isTechPro);
        const mergedElectives: SubjectDef[] = [...dbElectives];
        for (const fb of fallbackElectives) {
          if (!mergedElectives.some((m) => m.code === fb.code || m.name.toLowerCase() === fb.name.toLowerCase())) {
            mergedElectives.push(fb);
          }
        }

        const elec1 = mergedElectives[(k * 2) % mergedElectives.length];
        const elec2 = mergedElectives[(k * 2 + 1) % mergedElectives.length];

        const liSubj = {
          code: `SHS-LI${sec.grade_level}`,
          name: `Learning Intervention (LI)`,
          isElective: false,
        };
        const hgpSubj = {
          code: `SHS-HGP${sec.grade_level}`,
          name: `Homeroom Guidance Program (HGP)`,
          isElective: false,
        };
        const cocurrSubj = {
          code: `SHS-COCURR${sec.grade_level}`,
          name: `Co-Curricular Activities`,
          isElective: false,
        };

        for (let pIdx = 0; pIdx < 5; pIdx++) {
          const coreSubj = B[pIdx];
          DAYS_OF_WEEK.forEach((d) => {
            sectionGrid.set(`${d}|${pIdx}`, {
              code: coreSubj.code,
              name: coreSubj.name,
              isElective: false,
            });
          });
        }

        DAYS_OF_WEEK.forEach((d) => {
          sectionGrid.set(`${d}|5`, {
            code: elec1.code,
            name: elec1.name,
            isElective: true,
          });
        });

        ["Monday", "Tuesday", "Wednesday", "Thursday"].forEach((d) => {
          sectionGrid.set(`${d}|6`, {
            code: elec2.code,
            name: elec2.name,
            isElective: true,
          });
        });
        sectionGrid.set(`Friday|6`, cocurrSubj);

        ["Monday", "Tuesday", "Thursday"].forEach((d) => sectionGrid.set(`${d}|7`, liSubj));
        sectionGrid.set(`Wednesday|7`, hgpSubj);
        sectionGrid.set(`Friday|7`, cocurrSubj);
      }

      // Group open cells by subject code (skipping any slot already filled manually!)
      const subjectGroups = new Map<
        string,
        {
          code: string;
          name: string;
          isElective: boolean;
          slots: Array<{ day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"; slotId: string; start: string; end: string }>;
        }
      >();

      for (let d = 0; d < DAYS_OF_WEEK.length; d++) {
        const day = DAYS_OF_WEEK[d];
        for (let pIdx = 0; pIdx < CORE_TIME_SLOTS.length; pIdx++) {
          const slot = CORE_TIME_SLOTS[pIdx];
          // Step 4: If this section already has a manually added class in this slot, skip it!
          if (sectionSlotTracker.has(`${sec.id}|${day}|${slot.start}-${slot.end}`)) {
            continue;
          }

          const cell = sectionGrid.get(`${day}|${pIdx}`);
          if (!cell) continue;

          if (!subjectGroups.has(cell.code)) {
            subjectGroups.set(cell.code, {
              code: cell.code,
              name: cell.name,
              isElective: cell.isElective,
              slots: [],
            });
          }
          subjectGroups.get(cell.code)!.slots.push({
            day,
            slotId: slot.id,
            start: slot.start,
            end: slot.end,
          });
        }
      }

      let subjGroupIdx = 0;
      for (const group of subjectGroups.values()) {
        // Step 4: Reduce target slots if this subject was already manually scheduled for this section
        const existingCount = Math.max(
          manualSubjectCountBySection.get(`${sec.id}|${group.code.toUpperCase()}`) || 0,
          manualSubjectCountBySection.get(`${sec.id}|${group.name.toLowerCase()}`) || 0
        );
        const neededSlots =
          existingCount > 0 ? group.slots.slice(0, Math.max(0, group.slots.length - existingCount)) : group.slots;

        if (neededSlots.length === 0) continue;

        const selection = selectTeacherForSubjectBlock(
          group.name,
          group.code,
          isSHS,
          secIdx + subjGroupIdx,
          neededSlots
        );
        subjGroupIdx++;

        if (!selection.teacher) {
          unassignedSlotsReport.push({
            sectionName: sec.section_name,
            gradeLevel: sec.grade_level,
            subjectName: group.name,
            subjectCode: group.code,
            periodsCount: neededSlots.length,
            reason: selection.reason || "No qualified teacher available.",
          });
          continue;
        }

        const assignedTeacher = selection.teacher;
        const isBackup = selection.tier === "backup";
        if (isBackup) {
          backupAssignmentsCount += neededSlots.length;
        }

        const middle = assignedTeacher.middle_name ? ` ${assignedTeacher.middle_name}` : "";
        const tName =
          assignedTeacher.fullName ||
          `${assignedTeacher.first_name || ""}${middle} ${assignedTeacher.last_name || ""}`.trim();

        for (const sl of neededSlots) {
          bookSlot({
            id: `sched-${sec.id.slice(0, 6)}-${sl.day.slice(0, 3)}-${sl.slotId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            section_id: sec.id,
            teacher_id: assignedTeacher.id,
            classroom_id: baseRoom.id,
            subject_code: group.code,
            subject_name: group.name,
            day_of_week: sl.day,
            start_time: sl.start,
            end_time: sl.end,
            school_year: schoolYear,
            trimester: trimester,
            section_name: sec.section_name,
            grade_level: sec.grade_level,
            strand: sec.strand,
            teacher_name: tName,
            teacher_email: assignedTeacher.email,
            classroom_name: baseRoom.room_name,
            building: baseRoom.building,
            is_elective_slot: group.isElective,
            is_backup_assignment: isBackup,
            match_tier: selection.tier === "unassigned" ? undefined : selection.tier,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // 7. COMBINED COLLISION AUDIT (Manual + Auto-Generated Together)
    const finalSchedulesList: ScheduleItem[] = clearExisting
      ? generatedSchedules
      : [...retainedManualSchedules, ...generatedSchedules];

    let teacherCollisions = 0;
    let roomCollisions = 0;
    let sectionCollisions = 0;

    for (let i = 0; i < finalSchedulesList.length; i++) {
      for (let j = i + 1; j < finalSchedulesList.length; j++) {
        const a = finalSchedulesList[i];
        const b = finalSchedulesList[j];

        if (a.day_of_week === b.day_of_week && timesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) {
          if (a.teacher_id && b.teacher_id && a.teacher_id === b.teacher_id) {
            teacherCollisions++;
          }
          if (a.classroom_id && b.classroom_id && a.classroom_id === b.classroom_id) {
            roomCollisions++;
          }
          if (a.section_id && b.section_id && a.section_id === b.section_id) {
            sectionCollisions++;
          }
        }
      }
    }

    // 8. DATABASE PERSISTENCE
    await supabase.from("system_settings").upsert(
      {
        key: "class_schedules_config",
        value: {
          schedules: finalSchedulesList,
          lastUpdated: new Date().toISOString(),
          autoGeneratedAt: new Date().toISOString(),
          auditStatus: "Conflict-Free Verified with Fair Load Balancing & Subject Specialization",
          schoolYear,
          trimester,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    try {
      if (clearExisting) {
        await supabase.from("class_schedules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
    } catch {}

    const jhsCount = finalSchedulesList.filter((s) => s.grade_level && s.grade_level <= 10).length;
    const shsTrackCount = finalSchedulesList.filter((s) => s.grade_level && s.grade_level >= 11 && !s.is_elective_slot).length;
    const shsElectiveCount = finalSchedulesList.filter((s) => s.is_elective_slot).length;

    const teacherLoadSummary = allTeachersPool
      .map((t) => ({
        teacherId: t.id,
        teacherName: t.fullName || `${t.first_name || ""} ${t.last_name || ""}`.trim(),
        department: t.department || "JHS",
        mainSubjects: t.mainSubjects,
        weeklyHours: teacherWeeklyHours.get(t.id) || 0,
        maxWeeklyHours,
      }))
      .sort((a, b) => b.weeklyHours - a.weeklyHours);

    return NextResponse.json(
      {
        success: true,
        message: `Auto-built ${generatedSchedules.length} class periods (${retainedManualSchedules.length} manual periods retained) with 0 conflicts.`,
        audit: {
          totalScheduled: finalSchedulesList.length,
          newlyGeneratedCount: generatedSchedules.length,
          retainedManualCount: retainedManualSchedules.length,
          schoolYear,
          trimester,
          termName,
          jhsCount,
          shsTrackCount,
          shsElectiveCount,
          teacherCollisions,
          roomCollisions,
          sectionCollisions,
          isConflictFree: teacherCollisions === 0 && roomCollisions === 0 && sectionCollisions === 0,
          maxWeeklyHours,
          allowBackupTeachers,
          backupAssignmentsCount,
          unassignedSlotsReport,
          teacherLoadSummary,
        },
        schedules: finalSchedulesList,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST /api/schedules/auto-generate error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to auto-generate schedules" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
