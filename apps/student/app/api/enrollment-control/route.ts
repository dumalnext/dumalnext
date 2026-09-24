import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
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

function getConfigFilePath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), "config/enrollment-control.json"),
    path.resolve(process.cwd(), "../../config/enrollment-control.json"),
    path.resolve(process.cwd(), "../config/enrollment-control.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

const defaultSettings = {
  isEnrollmentOpen: true,
  schoolYear: "2026–2027",
  semester: "1st Semester",
  enrollmentStartDate: "2026-08-01",
  enrollmentEndDate: "2026-09-30",
  closedMessage:
    "DepEd Official Advisory: Dumalneg National High School Online Enrollment for School Year 2026–2027 is currently closed at this time. Please await further announcements from the Registrar's Office.",
  updatedAt: new Date().toISOString(),
  updatedBy: "School Administrator (DNHS-ADM-001)",
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET() {
  const supabase = getSupabaseClient();
  let activeTerm: { schoolYear: string; termName: string; termNumber: number; startDate?: string | null; endDate?: string | null } | null = null;

  if (supabase) {
    try {
      const { data: termData } = await supabase
        .from("academic_terms")
        .select("schoolYear, termName, termNumber, isActive, startDate, endDate")
        .eq("isActive", true)
        .maybeSingle();
      if (termData?.schoolYear) {
        activeTerm = {
          schoolYear: termData.schoolYear,
          termName: termData.termName || `Trimester ${termData.termNumber || 1}`,
          termNumber: Number(termData.termNumber) || 1,
          startDate: termData.startDate || null,
          endDate: termData.endDate || null,
        };
      }
    } catch (tErr) {
      console.warn("Could not check active academic term in student:", tErr);
    }
  }

  // 1. Try Supabase system_settings first (Production / Vercel Serverless)
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "enrollment_controls")
        .maybeSingle();

      if (data?.value && !error) {
        const val = {
          ...data.value,
          ...(activeTerm
            ? {
                schoolYear: activeTerm.schoolYear,
                semester: activeTerm.termName,
                termNumber: activeTerm.termNumber,
                activeTerm,
              }
            : {}),
        };
        return NextResponse.json(val, {
          headers: NO_CACHE_HEADERS,
        });
      }
    }
  } catch (err) {
    console.warn("Supabase system_settings read fallback to local config:", err);
  }

  // 2. Fallback to local config file
  try {
    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      const val = {
        ...data,
        ...(activeTerm
          ? {
              schoolYear: activeTerm.schoolYear,
              semester: activeTerm.termName,
              termNumber: activeTerm.termNumber,
              activeTerm,
            }
          : {}),
      };
      return NextResponse.json(val, {
        headers: NO_CACHE_HEADERS,
      });
    }
  } catch (err) {
    console.error("Error reading student enrollment control config:", err);
  }

  return NextResponse.json(
    activeTerm
      ? {
          ...defaultSettings,
          schoolYear: activeTerm.schoolYear,
          semester: activeTerm.termName,
          termNumber: activeTerm.termNumber,
          activeTerm,
        }
      : defaultSettings,
    { headers: NO_CACHE_HEADERS }
  );
}
