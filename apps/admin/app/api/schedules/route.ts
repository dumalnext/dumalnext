import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  "Pragma": "no-cache",
  "Expires": "0",
};

export interface ScheduleItem {
  id: string;
  section_id: string;
  teacher_id: string;
  classroom_id: string;
  subject_code: string;
  subject_name: string;
  day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  start_time: string; // e.g. "07:30"
  end_time: string;   // e.g. "08:30"
  school_year: string;
  trimester: number;
  created_at?: string;

  // Enriched labels for UI
  section_name?: string;
  grade_level?: number;
  strand?: string | null;
  teacher_name?: string;
  teacher_email?: string;
  department?: string;
  classroom_name?: string;
  building?: string;
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

// GET /api/schedules - Fetch schedules with optional filters and enriched resource names
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unavailable" },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const filterSectionId = searchParams.get("sectionId");
    const filterTeacherId = searchParams.get("teacherId");
    const filterDay = searchParams.get("dayOfWeek");

    // 1. Fetch auxiliary reference tables in parallel for enrichment
    const [
      { data: sectionsData },
      { data: teachersData },
      { data: classroomsData },
      { data: subjectsData },
      { data: sysSettingsData },
      { data: dbSchedulesData },
    ] = await Promise.all([
      supabase.from("sections").select("id, section_name, grade_level, strand"),
      supabase.from("teachers").select("id, teacher_id, first_name, middle_name, last_name, email, department"),
      supabase.from("classrooms").select("id, classroom_id, room_name, building"),
      supabase.from("course_subjects").select("id, subject_code, subject_name, grade_level, trimester"),
      supabase.from("system_settings").select("value").eq("key", "class_schedules_config").maybeSingle(),
      supabase.from("class_schedules").select("*"),
    ]);

    // Build lookup maps
    const sectionMap = new Map<string, any>();
    (sectionsData || []).forEach((s) => sectionMap.set(s.id, s));

    const teacherMap = new Map<string, any>();
    (teachersData || []).forEach((t) => {
      const middle = t.middle_name ? ` ${t.middle_name}` : "";
      const fullName = `${t.first_name}${middle} ${t.last_name}`.trim();
      teacherMap.set(t.id, { ...t, fullName });
    });

    const classroomMap = new Map<string, any>();
    (classroomsData || []).forEach((c) => classroomMap.set(c.id, c));

    const subjectMap = new Map<string, any>();
    (subjectsData || []).forEach((sub) => subjectMap.set(sub.subject_code, sub));

    // 2. Aggregate schedules: persistent system_settings + class_schedules table
    let configSchedules: ScheduleItem[] = [];
    if (sysSettingsData?.value && Array.isArray(sysSettingsData.value.schedules)) {
      configSchedules = sysSettingsData.value.schedules;
    }

    const scheduleMap = new Map<string, ScheduleItem>();

    // Add items from class_schedules table
    (dbSchedulesData || []).forEach((item: any) => {
      scheduleMap.set(item.id, {
        id: item.id,
        section_id: item.section_id,
        teacher_id: item.teacher_id,
        classroom_id: item.classroom_id,
        subject_code: item.subject_code,
        subject_name: item.subject_name || subjectMap.get(item.subject_code)?.subject_name || item.subject_code,
        day_of_week: item.day_of_week,
        start_time: item.start_time?.slice(0, 5) || "08:00",
        end_time: item.end_time?.slice(0, 5) || "09:00",
        school_year: item.school_year || "2025–2026",
        trimester: item.trimester || 1,
        created_at: item.created_at,
      });
    });

    // Merge/override with config schedules
    configSchedules.forEach((item) => {
      scheduleMap.set(item.id, { ...item });
    });

    // 3. Enrich with human-readable references and apply filters
    let results: ScheduleItem[] = Array.from(scheduleMap.values()).map((sc) => {
      const sec = sectionMap.get(sc.section_id);
      const tch = teacherMap.get(sc.teacher_id);
      const rm = classroomMap.get(sc.classroom_id);
      const sub = subjectMap.get(sc.subject_code);

      return {
        ...sc,
        section_name: sec ? sec.section_name : "General Section",
        grade_level: sec ? sec.grade_level : undefined,
        strand: sec?.strand || null,
        teacher_name: tch ? tch.fullName : "Faculty Member",
        teacher_email: tch ? tch.email : undefined,
        department: tch?.department,
        classroom_name: rm ? rm.room_name : "Main Classroom",
        building: rm?.building,
        subject_name: sc.subject_name || sub?.subject_name || sc.subject_code,
      };
    });

    if (filterSectionId) {
      results = results.filter((r) => r.section_id === filterSectionId);
    }
    if (filterTeacherId) {
      results = results.filter((r) => r.teacher_id === filterTeacherId);
    }
    if (filterDay) {
      results = results.filter((r) => r.day_of_week.toLowerCase() === filterDay.toLowerCase());
    }

    // Sort by Day of Week then Start Time
    const dayOrder: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
    };

    results.sort((a, b) => {
      const dDiff = (dayOrder[a.day_of_week] || 99) - (dayOrder[b.day_of_week] || 99);
      if (dDiff !== 0) return dDiff;
      return toMinutes(a.start_time) - toMinutes(b.start_time);
    });

    return NextResponse.json(
      {
        success: true,
        count: results.length,
        schedules: results,
        classrooms: Array.from(classroomMap.values()),
        subjects: Array.from(subjectMap.values()),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET /api/schedules error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load schedules" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST /api/schedules - Create a schedule item with Server-Side Automated Deconfliction Guard
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unavailable" },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const {
      section_id,
      teacher_id,
      classroom_id,
      subject_code,
      subject_name,
      day_of_week,
      start_time,
      end_time,
      school_year = "2025–2026",
      trimester = 1,
    } = body;

    // Validation
    if (!section_id || !teacher_id || !classroom_id || !subject_code || !day_of_week || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for timetable assignment." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (toMinutes(start_time) >= toMinutes(end_time)) {
      return NextResponse.json(
        { success: false, error: "Invalid time range: Start time must precede End time." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Fetch current schedules and reference tables to perform collision detection
    const [
      { data: sysSettingsData },
      { data: dbSchedulesData },
      { data: teachersData },
      { data: classroomsData },
      { data: sectionsData },
    ] = await Promise.all([
      supabase.from("system_settings").select("value").eq("key", "class_schedules_config").maybeSingle(),
      supabase.from("class_schedules").select("*"),
      supabase.from("teachers").select("id, first_name, last_name"),
      supabase.from("classrooms").select("id, room_name"),
      supabase.from("sections").select("id, section_name"),
    ]);

    let currentSchedules: ScheduleItem[] = [];
    if (sysSettingsData?.value && Array.isArray(sysSettingsData.value.schedules)) {
      currentSchedules = sysSettingsData.value.schedules;
    }

    const scheduleMap = new Map<string, ScheduleItem>();
    (dbSchedulesData || []).forEach((item: any) => {
      scheduleMap.set(item.id, {
        id: item.id,
        section_id: item.section_id,
        teacher_id: item.teacher_id,
        classroom_id: item.classroom_id,
        subject_code: item.subject_code,
        subject_name: item.subject_name || item.subject_code,
        day_of_week: item.day_of_week,
        start_time: item.start_time?.slice(0, 5) || "08:00",
        end_time: item.end_time?.slice(0, 5) || "09:00",
        school_year: item.school_year || "2025–2026",
        trimester: item.trimester || 1,
      });
    });
    currentSchedules.forEach((item) => scheduleMap.set(item.id, item));

    const activeList = Array.from(scheduleMap.values());

    // Lookup names for friendly messages
    const teacherObj = (teachersData || []).find((t) => t.id === teacher_id);
    const teacherName = teacherObj ? `${teacherObj.first_name} ${teacherObj.last_name}` : "Faculty Member";

    const roomObj = (classroomsData || []).find((r) => r.id === classroom_id);
    const roomName = roomObj ? roomObj.room_name : "Selected Classroom";

    const sectionObj = (sectionsData || []).find((s) => s.id === section_id);
    const sectionName = sectionObj ? sectionObj.section_name : "Selected Section";

    // 2. AUTOMATED DECONFLICTION ENGINE (COLLISION AUDIT)
    for (const item of activeList) {
      // Check only if it falls on the same day and overlapping time
      if (item.day_of_week === day_of_week && timesOverlap(item.start_time, item.end_time, start_time, end_time)) {
        // A. Teacher Collision Check
        if (item.teacher_id === teacher_id) {
          const conflictingSection = (sectionsData || []).find((s) => s.id === item.section_id)?.section_name || "another class";
          return NextResponse.json(
            {
              success: false,
              conflictType: "teacher",
              message: `Teacher Collision: Faculty ${teacherName} is already assigned to teach ${item.subject_name || item.subject_code} in ${conflictingSection} on ${day_of_week} at ${item.start_time}–${item.end_time}. DepEd policy prevents simultaneous double-assignment.`,
            },
            { status: 409, headers: NO_CACHE_HEADERS }
          );
        }

        // B. Classroom Collision Check
        if (item.classroom_id === classroom_id) {
          const conflictingSection = (sectionsData || []).find((s) => s.id === item.section_id)?.section_name || "another class";
          return NextResponse.json(
            {
              success: false,
              conflictType: "room",
              message: `Room Collision: ${roomName} is already occupied by ${conflictingSection} on ${day_of_week} at ${item.start_time}–${item.end_time}. Please select an alternative facility or time slot.`,
            },
            { status: 409, headers: NO_CACHE_HEADERS }
          );
        }

        // C. Section Collision Check
        if (item.section_id === section_id) {
          return NextResponse.json(
            {
              success: false,
              conflictType: "section",
              message: `Section Collision: ${sectionName} already has a scheduled class (${item.subject_name || item.subject_code}) on ${day_of_week} at ${item.start_time}–${item.end_time}.`,
            },
            { status: 409, headers: NO_CACHE_HEADERS }
          );
        }
      }
    }

    // 3. Conflict-free! Create and persist new schedule item
    const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sched-${Date.now()}`;
    const newSchedule: ScheduleItem = {
      id: newId,
      section_id,
      teacher_id,
      classroom_id,
      subject_code,
      subject_name: subject_name || subject_code,
      day_of_week,
      start_time: start_time.slice(0, 5),
      end_time: end_time.slice(0, 5),
      school_year,
      trimester,
      created_at: new Date().toISOString(),
      section_name: sectionName,
      teacher_name: teacherName,
      classroom_name: roomName,
    };

    // Append to list and save to system_settings
    currentSchedules.push(newSchedule);
    await supabase.from("system_settings").upsert(
      {
        key: "class_schedules_config",
        value: { schedules: currentSchedules, lastUpdated: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    return NextResponse.json(
      {
        success: true,
        message: `Schedule successfully assigned: ${newSchedule.subject_name} for ${sectionName} with ${teacherName} (${day_of_week} ${newSchedule.start_time}–${newSchedule.end_time}).`,
        schedule: newSchedule,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST /api/schedules error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create schedule" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE /api/schedules - Remove a schedule item by ID
export async function DELETE(req: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unavailable" },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing schedule ID parameter" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { data: sysSettingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "class_schedules_config")
      .maybeSingle();

    let schedules: ScheduleItem[] = [];
    if (sysSettingsData?.value && Array.isArray(sysSettingsData.value.schedules)) {
      schedules = sysSettingsData.value.schedules;
    }

    const updated = schedules.filter((s) => s.id !== id);

    await supabase.from("system_settings").upsert(
      {
        key: "class_schedules_config",
        value: { schedules: updated, lastUpdated: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    return NextResponse.json(
      { success: true, message: "Class schedule period removed successfully." },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("DELETE /api/schedules error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete schedule" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
