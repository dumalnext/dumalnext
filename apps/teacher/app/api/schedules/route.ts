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
    const filterTeacherId = searchParams.get("teacherId");
    const filterEmail = searchParams.get("email");

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
      supabase.from("course_subjects").select("id, subject_code, subject_name"),
      supabase.from("system_settings").select("value").eq("key", "class_schedules_config").maybeSingle(),
      supabase.from("class_schedules").select("*"),
    ]);

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

    let configSchedules: any[] = [];
    if (sysSettingsData?.value && Array.isArray(sysSettingsData.value.schedules)) {
      configSchedules = sysSettingsData.value.schedules;
    }

    const scheduleMap = new Map<string, any>();
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
      });
    });

    configSchedules.forEach((item) => {
      scheduleMap.set(item.id, { ...item });
    });

    let results = Array.from(scheduleMap.values()).map((sc) => {
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
        classroom_name: rm ? rm.room_name : "Main Classroom",
        building: rm?.building,
        subject_name: sc.subject_name || sub?.subject_name || sc.subject_code,
      };
    });

    if (filterTeacherId) {
      results = results.filter((r) => r.teacher_id === filterTeacherId);
    } else if (filterEmail) {
      const cleanEmail = filterEmail.trim().toLowerCase();
      results = results.filter((r) => r.teacher_email && r.teacher_email.toLowerCase() === cleanEmail);
    }

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
      return a.start_time.localeCompare(b.start_time);
    });

    return NextResponse.json(
      {
        success: true,
        count: results.length,
        schedules: results,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET teacher /api/schedules error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load schedules" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
