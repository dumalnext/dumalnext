import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  try {
    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      return NextResponse.json(data, {
        headers: NO_CACHE_HEADERS,
      });
    }
  } catch (err) {
    console.error("Error reading student enrollment control config:", err);
  }

  return NextResponse.json(defaultSettings, {
    headers: NO_CACHE_HEADERS,
  });
}
