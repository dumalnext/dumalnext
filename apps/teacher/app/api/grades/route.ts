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
      // 1. Check enrollment_controls in system_settings
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

      // 2. Cross-reference academic_terms for active term
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
      console.warn("Could not fetch grade control status from supabase:", e);
    }
  }

  return { isGradeOpen, schoolYear, termNumber, termName };
}

async function getAllGradeRecords(supabase: any): Promise<StudentGradeRecord[]> {
  // 1. Try Supabase system_settings
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

  // 2. Fallback to local config file
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

async function saveAllGradeRecords(supabase: any, records: StudentGradeRecord[]): Promise<boolean> {
  let savedToSupabase = false;

  // 1. Save to Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert(
          {
            key: "student_grades",
            value: { records, updatedAt: new Date().toISOString() },
            description: "Official student grade snapshots and release statuses",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (!error) savedToSupabase = true;
    } catch (err) {
      console.error("Failed to save student_grades to Supabase:", err);
    }
  }

  // 2. Save to local config fallback
  try {
    const configPath = getLocalConfigPath();
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(
      configPath,
      JSON.stringify({ records, updatedAt: new Date().toISOString() }, null, 2),
      "utf8"
    );
  } catch (err) {
    console.warn("Could not write local student_grades config:", err);
  }

  return savedToSupabase;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { isGradeOpen, schoolYear, termNumber, termName } = await getAdminGradeStatusAndTerm(supabase);
    const records = await getAllGradeRecords(supabase);

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const lrn = searchParams.get("lrn");
    const sectionId = searchParams.get("sectionId");
    const trimesterParam = searchParams.get("trimester");

    let filtered = records;
    if (studentId) {
      filtered = filtered.filter(
        (r) => r.studentId === studentId || r.studentLrn === studentId
      );
    }
    if (lrn) {
      filtered = filtered.filter((r) => r.studentLrn === lrn);
    }
    if (sectionId) {
      filtered = filtered.filter((r) => r.sectionId === sectionId);
    }
    if (trimesterParam) {
      const tNum = parseInt(trimesterParam, 10);
      if (!isNaN(tNum)) {
        filtered = filtered.filter((r) => r.trimester === tNum);
      }
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
    console.error("GET /api/grades error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve student grades" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { isGradeOpen, schoolYear: defaultSY, termNumber: defaultTermNum, termName: defaultTermName } =
      await getAdminGradeStatusAndTerm(supabase);

    // CRITICAL REQUIREMENT: If Admin has turned OFF the Grade switch in Control Room, reject uploads!
    if (isGradeOpen === false) {
      return NextResponse.json(
        {
          error:
            "Grade submission is currently closed by the School Administrator in the Control Room. Uploading grades is locked.",
          isGradeOpen: false,
        },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const {
      studentId,
      studentLrn,
      studentName,
      sectionId,
      sectionName,
      gradeLevel,
      schoolYear = defaultSY,
      trimester = defaultTermNum,
      termName = defaultTermName,
      gradeImageUrl,
      gradeImageName,
      uploadedByTeacherId,
      uploadedByTeacherName,
      remarks,
    } = body;

    if (!studentId && !studentLrn) {
      return NextResponse.json(
        { error: "Student ID or LRN is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!gradeImageUrl || typeof gradeImageUrl !== "string" || !gradeImageUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "A valid grade photo / image snapshot is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanLrn = String(studentLrn || studentId).replace(/\D/g, "");
    const cleanSY = String(schoolYear).replace(/[–—]/g, "-").trim();
    const cleanTrimester = Number(trimester) || 1;
    const recordId = `grade-${cleanLrn || studentId}-t${cleanTrimester}-${cleanSY}`;

    const newRecord: StudentGradeRecord = {
      id: recordId,
      studentId: String(studentId || cleanLrn),
      studentLrn: cleanLrn,
      studentName: String(studentName || "Student").trim().toUpperCase(),
      sectionId: sectionId ? String(sectionId) : undefined,
      sectionName: sectionName ? String(sectionName) : undefined,
      gradeLevel: gradeLevel || undefined,
      schoolYear: cleanSY,
      trimester: cleanTrimester,
      termName: String(termName || `Trimester ${cleanTrimester}`),
      gradeImageUrl,
      gradeImageName: gradeImageName || `Grade_Snapshot_T${cleanTrimester}_${cleanLrn}.jpg`,
      status: "DONE", // Automatically marked as DONE upon teacher submission
      uploadedByTeacherId: uploadedByTeacherId ? String(uploadedByTeacherId) : undefined,
      uploadedByTeacherName: uploadedByTeacherName ? String(uploadedByTeacherName) : undefined,
      uploadedAt: new Date().toISOString(),
      remarks: remarks ? String(remarks).trim() : undefined,
    };

    const currentRecords = await getAllGradeRecords(supabase);
    // Replace if exists for this student + schoolYear + trimester, otherwise prepend
    const existingIndex = currentRecords.findIndex(
      (r) =>
        (r.studentLrn === cleanLrn || r.studentId === studentId) &&
        r.schoolYear === cleanSY &&
        r.trimester === cleanTrimester
    );

    if (existingIndex >= 0) {
      currentRecords[existingIndex] = newRecord;
    } else {
      currentRecords.unshift(newRecord);
    }

    await saveAllGradeRecords(supabase, currentRecords);

    return NextResponse.json(
      {
        success: true,
        record: newRecord,
        isGradeOpen: true,
        message: `Grade snapshot for ${newRecord.studentName} (${newRecord.termName}) has been sent successfully and marked as DONE.`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST /api/grades error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload grade snapshot" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { isGradeOpen } = await getAdminGradeStatusAndTerm(supabase);

    if (isGradeOpen === false) {
      return NextResponse.json(
        {
          error: "Grade modification is currently locked by the School Administrator.",
        },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Grade Record ID is required." }, { status: 400 });
    }

    const currentRecords = await getAllGradeRecords(supabase);
    const filtered = currentRecords.filter((r) => r.id !== id);
    await saveAllGradeRecords(supabase, filtered);

    return NextResponse.json({ success: true, message: "Grade record removed." }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete grade record" }, { status: 500 });
  }
}
