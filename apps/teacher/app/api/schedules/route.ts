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
    const filterTeacherDbId = searchParams.get("teacherDbId")?.trim();
    const filterTeacherId = searchParams.get("teacherId")?.trim();
    const filterUserId = searchParams.get("userId")?.trim();
    const filterEmail = searchParams.get("email")?.trim().toLowerCase();
    const filterName = searchParams.get("name")?.trim().toLowerCase();

    // Security guard: If no teacher identifying parameter is supplied, return empty list
    if (!filterTeacherDbId && !filterTeacherId && !filterUserId && !filterEmail && !filterName) {
      return NextResponse.json(
        { success: true, count: 0, schedules: [] },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const [
      { data: sectionsData },
      { data: teachersData },
      { data: classroomsData },
      { data: subjectsData },
      { data: sysSettingsData },
      { data: dbSchedulesData },
    ] = await Promise.all([
      supabase.from("sections").select("id, section_name, grade_level, strand"),
      supabase.from("teachers").select("*"),
      supabase.from("classrooms").select("id, classroom_id, room_name, building"),
      supabase.from("course_subjects").select("id, subject_code, subject_name"),
      supabase.from("system_settings").select("value").eq("key", "class_schedules_config").maybeSingle(),
      supabase.from("class_schedules").select("*"),
    ]);

    const sectionMap = new Map<string, any>();
    (sectionsData || []).forEach((s) => sectionMap.set(s.id, s));

    const teacherMap = new Map<string, any>();
    (teachersData || []).forEach((t: any) => {
      const first = (t.first_name || t.firstName || "").trim();
      const middle = (t.middle_name || t.middleName || "").trim();
      const last = (t.last_name || t.lastName || "").trim();
      const midStr = middle ? ` ${middle}` : "";
      const fullName = `${first}${midStr} ${last}`.trim() || t.email || "Faculty Member";
      const simpleName = `${first} ${last}`.trim();

      const enriched = { ...t, fullName, simpleName };
      if (t.id) teacherMap.set(t.id, enriched);
      if (t.teacher_id) teacherMap.set(t.teacher_id, enriched);
      if (t.user_id) teacherMap.set(t.user_id, enriched);
      if (t.email) teacherMap.set(t.email.toLowerCase(), enriched);
    });

    const classroomMap = new Map<string, any>();
    (classroomsData || []).forEach((c) => classroomMap.set(c.id, c));

    const subjectMap = new Map<string, any>();
    (subjectsData || []).forEach((sub) => subjectMap.set(sub.subject_code, sub));

    // Resolve all possible identifiers for the active logged-in teacher
    const validTeacherIds = new Set<string>();
    const validEmails = new Set<string>();
    const validNames = new Set<string>();

    if (filterTeacherDbId) validTeacherIds.add(filterTeacherDbId);
    if (filterTeacherId) validTeacherIds.add(filterTeacherId);
    if (filterUserId) validTeacherIds.add(filterUserId);
    if (filterEmail) validEmails.add(filterEmail);
    if (filterName) validNames.add(filterName);

    (teachersData || []).forEach((t: any) => {
      const first = (t.first_name || t.firstName || "").trim().toLowerCase();
      const middle = (t.middle_name || t.middleName || "").trim().toLowerCase();
      const last = (t.last_name || t.lastName || "").trim().toLowerCase();
      const full = `${first}${middle ? " " + middle : ""} ${last}`.trim();
      const simple = `${first} ${last}`.trim();
      const em = (t.email || "").trim().toLowerCase();

      const isMatch =
        (filterTeacherDbId && t.id === filterTeacherDbId) ||
        (filterTeacherId && (t.id === filterTeacherId || t.teacher_id === filterTeacherId)) ||
        (filterUserId && (t.user_id === filterUserId || t.id === filterUserId)) ||
        (filterEmail && em === filterEmail) ||
        (filterName && (full === filterName || simple === filterName));

      if (isMatch) {
        if (t.id) validTeacherIds.add(t.id);
        if (t.teacher_id) validTeacherIds.add(t.teacher_id);
        if (t.user_id) validTeacherIds.add(t.user_id);
        if (em) validEmails.add(em);
        if (full) validNames.add(full);
        if (simple) validNames.add(simple);
      }
    });

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

    // Enrich all schedule records
    const enrichedList = Array.from(scheduleMap.values()).map((sc) => {
      const sec = sectionMap.get(sc.section_id);
      const tch = teacherMap.get(sc.teacher_id);
      const rm = classroomMap.get(sc.classroom_id);
      const sub = subjectMap.get(sc.subject_code);

      const resolvedTeacherName = tch?.fullName || sc.teacher_name || "Faculty Member";
      const resolvedTeacherEmail = tch?.email || sc.teacher_email;

      return {
        ...sc,
        section_name: sec ? sec.section_name : sc.section_name || "General Section",
        grade_level: sec ? sec.grade_level : undefined,
        strand: sec?.strand || null,
        teacher_name: resolvedTeacherName,
        teacher_email: resolvedTeacherEmail,
        classroom_name: rm ? rm.room_name : sc.classroom_name || "Main Classroom",
        building: rm?.building,
        subject_name: sc.subject_name || sub?.subject_name || sc.subject_code,
      };
    });

    // Filter strictly to schedules where the Admin assigned this specific teacher
    let results = enrichedList.filter((r) => {
      // 1. Direct ID match
      if (r.teacher_id && validTeacherIds.has(r.teacher_id)) {
        return true;
      }

      // 2. Email match
      if (r.teacher_email && validEmails.has(r.teacher_email.toLowerCase())) {
        return true;
      }

      // 3. Name match
      if (r.teacher_name) {
        const schedTeacherName = r.teacher_name.toLowerCase().trim();
        if (validNames.has(schedTeacherName)) {
          return true;
        }
        // Substring check for name variations
        for (const vName of validNames) {
          if (vName && (schedTeacherName.includes(vName) || vName.includes(schedTeacherName))) {
            return true;
          }
        }
      }

      // 4. Lookup through teacherMap
      if (r.teacher_id && teacherMap.has(r.teacher_id)) {
        const tch = teacherMap.get(r.teacher_id);
        if (tch.email && validEmails.has(tch.email.toLowerCase())) return true;
        if (tch.fullName && validNames.has(tch.fullName.toLowerCase())) return true;
        if (tch.simpleName && validNames.has(tch.simpleName.toLowerCase())) return true;
      }

      return false;
    });

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
