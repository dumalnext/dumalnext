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

export interface CourseSubjectItem {
  id: string;
  subject_code: string;
  subject_name: string;
  subject_type: "Core" | "Elective" | "Applied" | "Specialized" | "Intervention";
  grade_level: number;
  trimester: number;
  strand?: string | null;
  description?: string | null;
  created_at?: string;
}

// Standard fallback subjects in case database table is empty
const DEFAULT_FALLBACK_SUBJECTS: CourseSubjectItem[] = [
  // Grade 7 JHS Core
  { id: "sub-jhs-7-01", subject_code: "JHS-VAL7-T1", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-02", subject_code: "JHS-FIL7-T1", subject_name: "Filipino", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-03", subject_code: "JHS-ENG7-T1", subject_name: "English", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-04", subject_code: "JHS-SCI7-T1", subject_name: "Science", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-05", subject_code: "JHS-MTH7-T1", subject_name: "Mathematics", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-06", subject_code: "JHS-AP7-T1", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-07", subject_code: "JHS-TLE7-T1", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-08", subject_code: "JHS-MAP7-T1", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-09", subject_code: "JHS-SPS7-T1", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 7, trimester: 1, strand: "SPS" },
  { id: "sub-jhs-7-10", subject_code: "JHS-ARAL7-T1", subject_name: "ARAL Program (Academic Recovery)", subject_type: "Intervention", grade_level: 7, trimester: 1, strand: "Regular" },

  // Grade 8 JHS Core
  { id: "sub-jhs-8-01", subject_code: "JHS-VAL8-T1", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-02", subject_code: "JHS-FIL8-T1", subject_name: "Filipino", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-03", subject_code: "JHS-ENG8-T1", subject_name: "English", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-04", subject_code: "JHS-SCI8-T1", subject_name: "Science", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-05", subject_code: "JHS-MTH8-T1", subject_name: "Mathematics", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-06", subject_code: "JHS-AP8-T1", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-07", subject_code: "JHS-TLE8-T1", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-08", subject_code: "JHS-MAP8-T1", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-09", subject_code: "JHS-SPS8-T1", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 8, trimester: 1, strand: "SPS" },

  // Grade 9 JHS Core
  { id: "sub-jhs-9-01", subject_code: "JHS-VAL9-T1", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-02", subject_code: "JHS-FIL9-T1", subject_name: "Filipino", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-03", subject_code: "JHS-ENG9-T1", subject_name: "English", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-04", subject_code: "JHS-SCI9-T1", subject_name: "Science", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-05", subject_code: "JHS-MTH9-T1", subject_name: "Mathematics", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-06", subject_code: "JHS-AP9-T1", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-07", subject_code: "JHS-TLE9-T1", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-08", subject_code: "JHS-MAP9-T1", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-09", subject_code: "JHS-SPS9-T1", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 9, trimester: 1, strand: "SPS" },

  // Grade 10 JHS Core
  { id: "sub-jhs-10-01", subject_code: "JHS-VAL10-T1", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-02", subject_code: "JHS-FIL10-T1", subject_name: "Filipino", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-03", subject_code: "JHS-ENG10-T1", subject_name: "English", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-04", subject_code: "JHS-SCI10-T1", subject_name: "Science", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-05", subject_code: "JHS-MTH10-T1", subject_name: "Mathematics", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-06", subject_code: "JHS-AP10-T1", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-07", subject_code: "JHS-TLE10-T1", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-08", subject_code: "JHS-MAP10-T1", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-09", subject_code: "JHS-SPS10-T1", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 10, trimester: 1, strand: "SPS" },

  // Senior High School (Grades 11 & 12)
  { id: "sub-shs-11-01", subject_code: "SHS-GMATH11-T1", subject_name: "General Mathematics", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-02", subject_code: "SHS-GSCI11-T1", subject_name: "General Science / Earth & Life", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-03", subject_code: "SHS-EFFCOM11-T1", subject_name: "Effective Communication", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-04", subject_code: "SHS-KASAY11-T1", subject_name: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-05", subject_code: "SHS-LCSKILLS11-T1", subject_name: "Life & Career Skills", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-06", subject_code: "SHS-PRECALC11-T1", subject_name: "Pre-Calculus & STEM Principles", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "STEM" },
  { id: "sub-shs-11-07", subject_code: "SHS-PROG11-T1", subject_name: "Introduction to Programming & Computing", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TVL-ICT" },
  { id: "sub-shs-11-08", subject_code: "SHS-JOURN11-T1", subject_name: "Creative Writing & Journalism", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "HUMSS" },
  { id: "sub-shs-11-09", subject_code: "SHS-HUMMOV11-T1", subject_name: "Human Movement & Fitness 1", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-10", subject_code: "SHS-AGRI11-T1", subject_name: "Agricultural Crop Production", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TVL-Agri-Fishery" },

  { id: "sub-shs-12-01", subject_code: "SHS-PRACRES12-T1", subject_name: "Practical Research 2", subject_type: "Applied", grade_level: 12, trimester: 1, strand: "General" },
  { id: "sub-shs-12-02", subject_code: "SHS-BASICALC12-T1", subject_name: "Basic Calculus", subject_type: "Specialized", grade_level: 12, trimester: 1, strand: "STEM" },
  { id: "sub-shs-12-03", subject_code: "SHS-WEBDEV12-T1", subject_name: "Advanced Web Technologies & Systems", subject_type: "Specialized", grade_level: 12, trimester: 1, strand: "TVL-ICT" },
  { id: "sub-shs-12-04", subject_code: "SHS-POLITICS12-T1", subject_name: "Philippine Politics & Governance", subject_type: "Specialized", grade_level: 12, trimester: 1, strand: "HUMSS" },
  { id: "sub-shs-12-05", subject_code: "SHS-ENTREP12-T1", subject_name: "Entrepreneurship", subject_type: "Applied", grade_level: 12, trimester: 1, strand: "General" },
  { id: "sub-shs-12-06", subject_code: "SHS-ROBOT12-T1", subject_name: "Applied Robotics & Embedded Systems", subject_type: "Elective", grade_level: 12, trimester: 1, strand: "STEM" },
];

function normalizeSubject(row: any): CourseSubjectItem {
  return {
    id: row.id || `subj-${row.subject_code || row.subjectCode}`,
    subject_code: row.subject_code || row.subjectCode || "",
    subject_name: row.subject_name || row.subjectName || "",
    subject_type: (row.subject_type || row.subjectType || "Core") as any,
    grade_level: Number(row.grade_level || row.gradeLevel) || 7,
    trimester: Number(row.trimester) || 1,
    strand: row.strand || null,
    description: row.description || null,
    created_at: row.created_at || row.createdAt || undefined,
  };
}

// GET /api/subjects - List all subjects
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const gradeLevel = searchParams.get("gradeLevel");
    const trimester = searchParams.get("trimester");
    const subjectType = searchParams.get("subjectType");
    const strand = searchParams.get("strand");

    let dbSubjects: CourseSubjectItem[] = [];
    let customSubjects: CourseSubjectItem[] = [];
    let deletedCodes: string[] = [];

    if (supabase) {
      // 1. Fetch from course_subjects table
      try {
        const { data: dbData, error: dbErr } = await supabase
          .from("course_subjects")
          .select("*")
          .order("grade_level", { ascending: true })
          .order("subject_code", { ascending: true });

        if (!dbErr && dbData && dbData.length > 0) {
          dbSubjects = dbData.map(normalizeSubject);
        }
      } catch (err) {
        console.warn("Notice querying course_subjects table:", err);
      }

      // 2. Fetch custom additions & deleted codes from system_settings
      try {
        const { data: sysData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "subjects_config")
          .maybeSingle();

        if (sysData?.value) {
          if (Array.isArray(sysData.value.subjects)) {
            customSubjects = sysData.value.subjects.map(normalizeSubject);
          }
          if (Array.isArray(sysData.value.deletedCodes)) {
            deletedCodes = sysData.value.deletedCodes;
          }
        }
      } catch {}
    }

    // Merge: fallback + database + custom additions
    const subjectMap = new Map<string, CourseSubjectItem>();

    // Initial fill from fallback templates
    DEFAULT_FALLBACK_SUBJECTS.forEach((s) => subjectMap.set(s.subject_code, s));

    // Override with DB data if available
    dbSubjects.forEach((s) => subjectMap.set(s.subject_code, s));

    // Override/extend with custom additions from system_settings
    customSubjects.forEach((s) => subjectMap.set(s.subject_code, s));

    // Remove deleted codes
    deletedCodes.forEach((code) => subjectMap.delete(code));

    let list = Array.from(subjectMap.values());

    // Apply filters if provided
    if (gradeLevel && gradeLevel !== "ALL") {
      const gl = Number(gradeLevel);
      list = list.filter((s) => s.grade_level === gl);
    }
    if (trimester && trimester !== "ALL") {
      const tri = Number(trimester);
      list = list.filter((s) => s.trimester === tri);
    }
    if (subjectType && subjectType !== "ALL") {
      list = list.filter((s) => s.subject_type.toUpperCase() === subjectType.toUpperCase());
    }
    if (strand && strand !== "ALL") {
      list = list.filter((s) => {
        if (!s.strand) return false;
        return s.strand.toUpperCase() === strand.toUpperCase();
      });
    }

    // Sort by grade level ascending, then trimester, then subject title
    list.sort((a, b) => {
      if (a.grade_level !== b.grade_level) return a.grade_level - b.grade_level;
      if (a.trimester !== b.trimester) return a.trimester - b.trimester;
      return a.subject_name.localeCompare(b.subject_name);
    });

    return NextResponse.json({
      success: true,
      subjects: list,
      totalCount: list.length,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("GET /api/subjects error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to fetch subjects",
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST /api/subjects - Create a new subject
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await req.json();
    const {
      subject_code,
      subject_name,
      subject_type,
      grade_level,
      trimester,
      strand,
      description,
    } = body;

    if (!subject_code || !subject_name || !subject_type || !grade_level || !trimester) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: subject_code, subject_name, subject_type, grade_level, trimester",
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const cleanCode = String(subject_code).trim().toUpperCase();
    const cleanName = String(subject_name).trim();
    const numGrade = Number(grade_level);
    const numTri = Number(trimester);

    if (numGrade < 7 || numGrade > 12) {
      return NextResponse.json({
        success: false,
        error: "Grade level must be between 7 and 12",
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (numTri < 1 || numTri > 3) {
      return NextResponse.json({
        success: false,
        error: "Trimester must be 1, 2, or 3",
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const newSubject: CourseSubjectItem = {
      id: `subj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      subject_code: cleanCode,
      subject_name: cleanName,
      subject_type: subject_type,
      grade_level: numGrade,
      trimester: numTri,
      strand: strand ? String(strand).trim() : null,
      description: description ? String(description).trim() : null,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      // 1. Try insert into course_subjects table
      try {
        await supabase
          .from("course_subjects")
          .insert({
            subject_code: cleanCode,
            subject_name: cleanName,
            subject_type: subject_type,
            grade_level: numGrade,
            trimester: numTri,
            strand: newSubject.strand,
          });
      } catch (insertErr) {
        console.warn("Table insert notice:", insertErr);
      }

      // 2. Persist in system_settings (subjects_config)
      try {
        const { data: sysData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "subjects_config")
          .maybeSingle();

        let currentSubjects: CourseSubjectItem[] = [];
        let deletedCodes: string[] = [];

        if (sysData?.value) {
          if (Array.isArray(sysData.value.subjects)) {
            currentSubjects = sysData.value.subjects;
          }
          if (Array.isArray(sysData.value.deletedCodes)) {
            deletedCodes = sysData.value.deletedCodes.filter((c: string) => c !== cleanCode);
          }
        }

        // Remove if existing code exists
        currentSubjects = currentSubjects.filter((s) => s.subject_code !== cleanCode);
        currentSubjects.push(newSubject);

        await supabase
          .from("system_settings")
          .upsert({
            key: "subjects_config",
            value: {
              subjects: currentSubjects,
              deletedCodes,
              updatedAt: new Date().toISOString(),
            },
          }, { onConflict: "key" });
      } catch (sysErr) {
        console.warn("system_settings upsert notice:", sysErr);
      }
    }

    return NextResponse.json({
      success: true,
      subject: newSubject,
      message: `Subject [ ${cleanCode} ] created successfully.`,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("POST /api/subjects error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to create subject",
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// PUT /api/subjects - Update existing subject
export async function PUT(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await req.json();
    const {
      id,
      subject_code,
      subject_name,
      subject_type,
      grade_level,
      trimester,
      strand,
      description,
    } = body;

    if (!subject_code) {
      return NextResponse.json({
        success: false,
        error: "Missing subject_code",
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const cleanCode = String(subject_code).trim().toUpperCase();
    const cleanName = String(subject_name).trim();
    const numGrade = Number(grade_level);
    const numTri = Number(trimester);

    const updatedSubject: CourseSubjectItem = {
      id: id || `subj-${cleanCode}`,
      subject_code: cleanCode,
      subject_name: cleanName,
      subject_type: subject_type,
      grade_level: numGrade,
      trimester: numTri,
      strand: strand ? String(strand).trim() : null,
      description: description ? String(description).trim() : null,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      // 1. Update in table
      try {
        await supabase
          .from("course_subjects")
          .update({
            subject_name: cleanName,
            subject_type: subject_type,
            grade_level: numGrade,
            trimester: numTri,
            strand: updatedSubject.strand,
          })
          .eq("subject_code", cleanCode);
      } catch (err) {
        console.warn("Table update notice:", err);
      }

      // 2. Update in system_settings
      try {
        const { data: sysData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "subjects_config")
          .maybeSingle();

        let currentSubjects: CourseSubjectItem[] = [];
        let deletedCodes: string[] = [];

        if (sysData?.value) {
          if (Array.isArray(sysData.value.subjects)) {
            currentSubjects = sysData.value.subjects;
          }
          if (Array.isArray(sysData.value.deletedCodes)) {
            deletedCodes = sysData.value.deletedCodes;
          }
        }

        const idx = currentSubjects.findIndex((s) => s.subject_code === cleanCode);
        if (idx >= 0) {
          currentSubjects[idx] = { ...currentSubjects[idx], ...updatedSubject };
        } else {
          currentSubjects.push(updatedSubject);
        }

        await supabase
          .from("system_settings")
          .upsert({
            key: "subjects_config",
            value: {
              subjects: currentSubjects,
              deletedCodes,
              updatedAt: new Date().toISOString(),
            },
          }, { onConflict: "key" });
      } catch (sysErr) {
        console.warn("system_settings update notice:", sysErr);
      }
    }

    return NextResponse.json({
      success: true,
      subject: updatedSubject,
      message: `Subject [ ${cleanCode} ] updated successfully.`,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("PUT /api/subjects error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to update subject",
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// DELETE /api/subjects - Delete or archive a subject
export async function DELETE(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const subjectCode = searchParams.get("subjectCode");

    if (!subjectCode) {
      return NextResponse.json({
        success: false,
        error: "Missing subjectCode parameter",
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const cleanCode = subjectCode.trim().toUpperCase();

    if (supabase) {
      // Safeguard: Check if subject is actively scheduled in class_schedules
      try {
        const { data: schedData } = await supabase
          .from("class_schedules")
          .select("id, schedule_id")
          .eq("subject_code", cleanCode)
          .limit(1);

        if (schedData && schedData.length > 0) {
          return NextResponse.json({
            success: false,
            error: `Cannot delete subject [ ${cleanCode} ] because it is actively assigned in one or more class schedules. Please remove or re-assign class schedules first.`,
          }, { status: 409, headers: NO_CACHE_HEADERS });
        }
      } catch {}

      // Delete from course_subjects table
      try {
        await supabase
          .from("course_subjects")
          .delete()
          .eq("subject_code", cleanCode);
      } catch (delErr) {
        console.warn("Table delete notice:", delErr);
      }

      // Record in system_settings
      try {
        const { data: sysData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "subjects_config")
          .maybeSingle();

        let currentSubjects: CourseSubjectItem[] = [];
        let deletedCodes: string[] = [];

        if (sysData?.value) {
          if (Array.isArray(sysData.value.subjects)) {
            currentSubjects = sysData.value.subjects.filter((s: any) => s.subject_code !== cleanCode);
          }
          if (Array.isArray(sysData.value.deletedCodes)) {
            deletedCodes = sysData.value.deletedCodes;
          }
        }

        if (!deletedCodes.includes(cleanCode)) {
          deletedCodes.push(cleanCode);
        }

        await supabase
          .from("system_settings")
          .upsert({
            key: "subjects_config",
            value: {
              subjects: currentSubjects,
              deletedCodes,
              updatedAt: new Date().toISOString(),
            },
          }, { onConflict: "key" });
      } catch (sysErr) {
        console.warn("system_settings delete record notice:", sysErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Subject [ ${cleanCode} ] removed successfully.`,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("DELETE /api/subjects error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to delete subject",
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
