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

const DEFAULT_FALLBACK_SUBJECTS: CourseSubjectItem[] = [
  // Grade 7 JHS Core
  { id: "sub-jhs-7-01", subject_code: "JHS-VAL7", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-02", subject_code: "JHS-FIL7", subject_name: "Filipino", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-03", subject_code: "JHS-ENG7", subject_name: "English", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-04", subject_code: "JHS-SCI7", subject_name: "Science", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-05", subject_code: "JHS-MTH7", subject_name: "Mathematics", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-06", subject_code: "JHS-AP7", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-07", subject_code: "JHS-TLE7", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-08", subject_code: "JHS-MAP7", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-09", subject_code: "JHS-SPS7", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 7, trimester: 1, strand: "SPS" },
  { id: "sub-jhs-7-10", subject_code: "JHS-ARAL7", subject_name: "ARAL Program (Academic Recovery)", subject_type: "Intervention", grade_level: 7, trimester: 1, strand: "Regular" },

  // Grade 8 JHS Core
  { id: "sub-jhs-8-01", subject_code: "JHS-VAL8", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-02", subject_code: "JHS-FIL8", subject_name: "Filipino", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-03", subject_code: "JHS-ENG8", subject_name: "English", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-04", subject_code: "JHS-SCI8", subject_name: "Science", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-05", subject_code: "JHS-MTH8", subject_name: "Mathematics", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-06", subject_code: "JHS-AP8", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-07", subject_code: "JHS-TLE8", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-08", subject_code: "JHS-MAP8", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-09", subject_code: "JHS-SPS8", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 8, trimester: 1, strand: "SPS" },

  // Grade 9 JHS Core
  { id: "sub-jhs-9-01", subject_code: "JHS-VAL9", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-02", subject_code: "JHS-FIL9", subject_name: "Filipino", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-03", subject_code: "JHS-ENG9", subject_name: "English", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-04", subject_code: "JHS-SCI9", subject_name: "Science", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-05", subject_code: "JHS-MTH9", subject_name: "Mathematics", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-06", subject_code: "JHS-AP9", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-07", subject_code: "JHS-TLE9", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-08", subject_code: "JHS-MAP9", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-09", subject_code: "JHS-SPS9", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 9, trimester: 1, strand: "SPS" },

  // Grade 10 JHS Core
  { id: "sub-jhs-10-01", subject_code: "JHS-VAL10", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-02", subject_code: "JHS-FIL10", subject_name: "Filipino", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-03", subject_code: "JHS-ENG10", subject_name: "English", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-04", subject_code: "JHS-SCI10", subject_name: "Science", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-05", subject_code: "JHS-MTH10", subject_name: "Mathematics", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-06", subject_code: "JHS-AP10", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-07", subject_code: "JHS-TLE10", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-08", subject_code: "JHS-MAP10", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-09", subject_code: "JHS-SPS10", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 10, trimester: 1, strand: "SPS" },

  // Senior High School (Grades 11 & 12)
  { id: "sub-shs-11-01", subject_code: "SHS-GMATH11", subject_name: "General Mathematics", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-02", subject_code: "SHS-GSCI11", subject_name: "General Science / Earth & Life", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-03", subject_code: "SHS-EFFCOM11", subject_name: "Effective Communication", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-04", subject_code: "SHS-KASAY11", subject_name: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-05", subject_code: "SHS-LCSKILLS11", subject_name: "Life & Career Skills", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-06", subject_code: "SHS-STEM-PRECAL11", subject_name: "Pre-Calculus & STEM Principles", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "STEM" },
  { id: "sub-shs-11-07", subject_code: "SHS-PROG11", subject_name: "Introduction to Programming & Computing", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TVL-ICT" },
  { id: "sub-shs-11-08", subject_code: "SHS-JOURN11", subject_name: "Creative Writing & Journalism", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "HUMSS" },
  { id: "sub-shs-11-09", subject_code: "SHS-HUMMOV11", subject_name: "Human Movement & Fitness 1", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "General" },
  { id: "sub-shs-11-10", subject_code: "SHS-AGRI11", subject_name: "Agricultural Crop Production", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TVL-Agri-Fishery" },

  { id: "sub-shs-12-01", subject_code: "SHS-PRACRES12", subject_name: "Practical Research 2", subject_type: "Applied", grade_level: 12, trimester: 1, strand: "General" },
  { id: "sub-shs-12-02", subject_code: "SHS-STEM-CALC12", subject_name: "Basic Calculus", subject_type: "Specialized", grade_level: 12, trimester: 1, strand: "STEM" },
  { id: "sub-shs-12-03", subject_code: "SHS-WEBDEV12", subject_name: "Advanced Web Technologies & Systems", subject_type: "Specialized", grade_level: 12, trimester: 1, strand: "TVL-ICT" },
  { id: "sub-shs-12-04", subject_code: "SHS-POLITICS12", subject_name: "Philippine Politics & Governance", subject_type: "Specialized", grade_level: 12, trimester: 1, strand: "HUMSS" },
  { id: "sub-shs-12-05", subject_code: "SHS-ENTREP12", subject_name: "Entrepreneurship", subject_type: "Applied", grade_level: 12, trimester: 1, strand: "General" },
  { id: "sub-shs-12-06", subject_code: "SHS-STEM-ROBOT12", subject_name: "Applied Robotics & Embedded Systems", subject_type: "Elective", grade_level: 12, trimester: 1, strand: "STEM" },
];

function normalizeSubject(row: any): CourseSubjectItem {
  return {
    id: row.id || `subj-${row.subject_code || row.subjectCode}`,
    subject_code: (row.subject_code || row.subjectCode || "").trim().toUpperCase(),
    subject_name: (row.subject_name || row.subjectName || "").trim(),
    subject_type: (row.subject_type || row.subjectType || "Core"),
    grade_level: Number(row.grade_level || row.gradeLevel || 7),
    trimester: Number(row.trimester || 1),
    strand: row.strand || null,
    description: row.description || null,
    created_at: row.created_at || row.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const gradeLevel = searchParams.get("gradeLevel");
    const strand = searchParams.get("strand");

    let dbSubjects: CourseSubjectItem[] = [];
    let customSubjects: CourseSubjectItem[] = [];
    let deletedCodes: string[] = [];

    if (supabase) {
      try {
        const { data: dbData } = await supabase
          .from("course_subjects")
          .select("*")
          .order("grade_level", { ascending: true })
          .order("subject_code", { ascending: true });

        if (dbData && dbData.length > 0) {
          dbSubjects = dbData.map(normalizeSubject);
        }
      } catch {}

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

    const subjectMap = new Map<string, CourseSubjectItem>();
    DEFAULT_FALLBACK_SUBJECTS.forEach((s) => subjectMap.set(s.subject_code, s));
    dbSubjects.forEach((s) => subjectMap.set(s.subject_code, s));
    customSubjects.forEach((s) => subjectMap.set(s.subject_code, s));
    deletedCodes.forEach((code) => subjectMap.delete(code));

    let list = Array.from(subjectMap.values());

    if (gradeLevel && gradeLevel !== "ALL") {
      const gl = Number(gradeLevel);
      list = list.filter((s) => s.grade_level === gl);
    }
    if (strand && strand !== "ALL") {
      list = list.filter((s) => {
        if (!s.strand) return false;
        return s.strand.toUpperCase() === strand.toUpperCase();
      });
    }

    list.sort((a, b) => {
      if (a.grade_level !== b.grade_level) return a.grade_level - b.grade_level;
      return a.subject_name.localeCompare(b.subject_name);
    });

    return NextResponse.json({
      success: true,
      subjects: list,
      totalCount: list.length,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to fetch subjects",
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
