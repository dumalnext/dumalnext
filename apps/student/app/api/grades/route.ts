import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { StudentGradeRecord } from "@/lib/types/grade";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
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

function getLocalConfigPath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), "config/student-grades.json"),
    path.resolve(process.cwd(), "../../config/student-grades.json"),
    path.resolve(process.cwd(), "../config/student-grades.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

async function getAdminGradeStatusAndTerm(supabase: any) {
  let isGradeOpen = true;
  let schoolYear = "2026-2027";
  let termNumber = 1;
  let termName = "Trimester 1";

  if (supabase) {
    try {
      const { data: ctrlData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "enrollment_controls")
        .maybeSingle();

      if (ctrlData?.value) {
        if (typeof ctrlData.value.isGradeOpen === "boolean") {
          isGradeOpen = ctrlData.value.isGradeOpen;
        }
        if (ctrlData.value.schoolYear) {
          schoolYear = String(ctrlData.value.schoolYear).replace(/[–—]/g, "-").trim();
        }
        if (ctrlData.value.termNumber) {
          termNumber = Number(ctrlData.value.termNumber);
        }
        if (ctrlData.value.semester) {
          termName = String(ctrlData.value.semester).trim();
        }
      }

      const { data: termData } = await supabase
        .from("academic_terms")
        .select("schoolYear, termName, termNumber, isActive")
        .eq("isActive", true)
        .maybeSingle();

      if (termData?.schoolYear) {
        schoolYear = String(termData.schoolYear).replace(/[–—]/g, "-").trim();
        termNumber = Number(termData.termNumber) || termNumber;
        termName = termData.termName || `Trimester ${termNumber}`;
      }
    } catch (e) {
      console.warn("Could not check grade control status:", e);
    }
  }

  return { isGradeOpen, schoolYear, termNumber, termName };
}

async function getAllGradeRecords(supabase: any): Promise<StudentGradeRecord[]> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "student_grades")
        .maybeSingle();

      if (data?.value?.records && Array.isArray(data.value.records)) {
        return data.value.records;
      }
    } catch (err) {
      console.warn("Could not read student_grades from Supabase:", err);
    }
  }

  try {
    const configPath = getLocalConfigPath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.records && Array.isArray(parsed.records)) {
        return parsed.records;
      }
    }
  } catch (err) {
    console.warn("Could not read local student_grades config:", err);
  }

  return [];
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { isGradeOpen, schoolYear, termNumber, termName } = await getAdminGradeStatusAndTerm(supabase);
    const records = await getAllGradeRecords(supabase);

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const lrn = searchParams.get("lrn");

    let filtered = records;
    if (lrn || studentId) {
      filtered = filtered.filter((r) => {
        const matchLrn = lrn ? r.studentLrn === lrn || r.studentId === lrn : false;
        const matchId = studentId ? r.studentId === studentId || r.studentLrn === studentId : false;
        return matchLrn || matchId;
      });
    }

    return NextResponse.json(
      {
        success: true,
        isGradeOpen,
        schoolYear,
        termNumber,
        termName,
        records: filtered,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET /api/grades in student app error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve student grades" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
