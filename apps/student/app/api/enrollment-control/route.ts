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
    console.error("Error reading student enrollment control config:", err);
  }

  return NextResponse.json(defaultSettings, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
