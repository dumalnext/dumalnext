import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  TeacherSpecializationsMap,
  resolveTeacherSpecialization,
} from "@/lib/teacherSpecializations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SETTINGS_KEY = "teacher_specializations_config";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

// GET /api/teacher-specializations
// Returns saved specializations map + resolved Main & Secondary subjects per teacher
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unavailable" },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const [{ data: sysData }, { data: teachersData }] = await Promise.all([
      supabase.from("system_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle(),
      supabase
        .from("teachers")
        .select("id, teacher_id, first_name, middle_name, last_name, email, department")
        .order("last_name"),
    ]);

    const savedMap: TeacherSpecializationsMap =
      sysData?.value?.specializations && typeof sysData.value.specializations === "object"
        ? sysData.value.specializations
        : {};

    const resolvedByTeacherId: TeacherSpecializationsMap = { ...savedMap };
    (teachersData || []).forEach((t: any) => {
      const entry = resolveTeacherSpecialization(t, savedMap);
      if (t.id) resolvedByTeacherId[t.id] = entry;
      if (t.teacher_id) resolvedByTeacherId[String(t.teacher_id).toUpperCase()] = entry;
      if (t.email) resolvedByTeacherId[String(t.email).toLowerCase()] = entry;
    });

    return NextResponse.json(
      {
        success: true,
        specializations: resolvedByTeacherId,
        rawSaved: savedMap,
        updatedAt: sysData?.value?.updatedAt || null,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET /api/teacher-specializations error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load teacher subjects" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST /api/teacher-specializations
// Saves updated mainSubjects & secondarySubjects for teachers in system_settings
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
    const incomingMap: TeacherSpecializationsMap =
      body?.specializations && typeof body.specializations === "object"
        ? body.specializations
        : {};

    const { data: existingRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    const currentSaved: TeacherSpecializationsMap =
      existingRow?.value?.specializations && typeof existingRow.value.specializations === "object"
        ? existingRow.value.specializations
        : {};

    const now = new Date().toISOString();
    const merged: TeacherSpecializationsMap = { ...currentSaved };

    for (const [key, val] of Object.entries(incomingMap)) {
      if (!key || !val || typeof val !== "object") continue;
      const mainSubjects = Array.isArray(val.mainSubjects)
        ? Array.from(new Set(val.mainSubjects.filter(Boolean)))
        : [];
      const secondarySubjects = Array.isArray(val.secondarySubjects)
        ? Array.from(new Set(val.secondarySubjects.filter((s) => Boolean(s) && !mainSubjects.includes(s))))
        : [];

      merged[key] = {
        mainSubjects,
        secondarySubjects,
        updatedAt: now,
      };
    }

    const { error } = await supabase.from("system_settings").upsert(
      {
        key: SETTINGS_KEY,
        value: {
          specializations: merged,
          updatedAt: now,
        },
        updated_at: now,
      },
      { onConflict: "key" }
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        success: true,
        specializations: merged,
        updatedAt: now,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST /api/teacher-specializations error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save teacher subjects" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
