import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Path to shared configuration file at monorepo root
const configPath = path.resolve(process.cwd(), "../../config/enrollment-control.json");
const fallbackConfigPath = path.resolve(process.cwd(), "config/enrollment-control.json");

function getConfigFilePath(): string {
  if (fs.existsSync(configPath)) return configPath;
  if (fs.existsSync(fallbackConfigPath)) return fallbackConfigPath;
  return configPath;
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

export async function GET() {
  try {
    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      return NextResponse.json(data, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
  } catch (err) {
    console.error("Error reading enrollment control config:", err);
  }

  return NextResponse.json(defaultSettings, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const filePath = getConfigFilePath();

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let current = defaultSettings;
    if (fs.existsSync(filePath)) {
      try {
        current = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch {}
    }

    const updated = {
      ...current,
      isEnrollmentOpen: typeof body.isEnrollmentOpen === "boolean" ? body.isEnrollmentOpen : current.isEnrollmentOpen,
      schoolYear: (body.schoolYear || current.schoolYear).trim(),
      semester: (body.semester || current.semester).trim(),
      enrollmentStartDate: body.enrollmentStartDate || current.enrollmentStartDate,
      enrollmentEndDate: body.enrollmentEndDate || current.enrollmentEndDate,
      closedMessage: (body.closedMessage || current.closedMessage).trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || "School Administrator (DNHS-ADM-001)",
    };

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");

    return NextResponse.json({ success: true, settings: updated }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err: any) {
    console.error("Error writing enrollment control config:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update enrollment control settings." },
      { status: 500 }
    );
  }
}
