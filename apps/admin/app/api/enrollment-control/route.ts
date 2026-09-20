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
  let activeTerm: { schoolYear: string; termName: string } | null = null;

  if (supabase) {
    try {
      const { data: termData } = await supabase
        .from("academic_terms")
        .select("schoolYear, termName, isActive")
        .eq("isActive", true)
        .maybeSingle();
      if (termData?.schoolYear) {
        activeTerm = {
          schoolYear: termData.schoolYear,
          termName: termData.termName,
        };
      }
    } catch (tErr) {
      console.warn("Could not check active academic term:", tErr);
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
          ...(activeTerm ? { schoolYear: activeTerm.schoolYear, semester: activeTerm.termName } : {}),
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
        ...(activeTerm ? { schoolYear: activeTerm.schoolYear, semester: activeTerm.termName } : {}),
      };
      return NextResponse.json(val, {
        headers: NO_CACHE_HEADERS,
      });
    }
  } catch (err) {
    console.error("Error reading enrollment control config:", err);
  }

  return NextResponse.json(
    activeTerm
      ? { ...defaultSettings, schoolYear: activeTerm.schoolYear, semester: activeTerm.termName }
      : defaultSettings,
    { headers: NO_CACHE_HEADERS }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = getSupabaseClient();

    let activeTerm: { schoolYear: string; termName: string } | null = null;
    if (supabase) {
      try {
        const { data: termData } = await supabase
          .from("academic_terms")
          .select("schoolYear, termName, isActive")
          .eq("isActive", true)
          .maybeSingle();
        if (termData?.schoolYear) {
          activeTerm = {
            schoolYear: termData.schoolYear,
            termName: termData.termName,
          };
        }
      } catch {}
    }

    // Read current settings
    let current = defaultSettings;
    try {
      if (supabase) {
        const { data } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "enrollment_controls")
          .maybeSingle();
        if (data?.value) {
          current = data.value;
        }
      }
    } catch {}

    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      try {
        current = { ...current, ...JSON.parse(fs.readFileSync(filePath, "utf-8")) };
      } catch {}
    }

    const updated = {
      ...current,
      isEnrollmentOpen: typeof body.isEnrollmentOpen === "boolean" ? body.isEnrollmentOpen : current.isEnrollmentOpen,
      schoolYear: activeTerm ? activeTerm.schoolYear : (body.schoolYear || current.schoolYear).trim(),
      semester: activeTerm ? activeTerm.termName : (body.semester || current.semester).trim(),
      enrollmentStartDate: body.enrollmentStartDate || current.enrollmentStartDate,
      enrollmentEndDate: body.enrollmentEndDate || current.enrollmentEndDate,
      closedMessage: (body.closedMessage || current.closedMessage).trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || "School Administrator (DNHS-ADM-001)",
    };

    // 1. Save to Supabase (Production Vercel Persistence)
    try {
      if (supabase) {
        await supabase.from("system_settings").upsert({
          key: "enrollment_controls",
          value: updated,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (dbErr) {
      console.warn("Supabase upsert warning:", dbErr);
    }

    // 2. Save to local config if disk is writable
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
    } catch (fsErr) {
      // In serverless / Vercel read-only filesystem, fs write is ignored
      console.info("Local filesystem write skipped in serverless environment");
    }

    return NextResponse.json({ success: true, settings: updated }, {
      headers: NO_CACHE_HEADERS,
    });
  } catch (err: any) {
    console.error("Error writing enrollment control config:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update enrollment control settings." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
