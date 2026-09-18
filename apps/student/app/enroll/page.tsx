import React from "react";
import Link from "next/link";
import EnrollmentStepper from "@/components/forms/enrollment/EnrollmentStepper";

export const metadata = {
  title: "Online Enrollment Form | Dumalneg National High School",
  description: "Official DepEd Basic Education Online Enrollment Form for Dumalneg National High School.",
};

export default function StudentEnrollPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-3 border border-slate-300">
        <div className="flex items-center space-x-2">
          <Link href="/" className="font-bold text-[#002060] hover:underline">
            [ Student Home ]
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Online Enrollment Form</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          DEPED FORM: REVISED 06/01/2025
        </div>
      </div>

      {/* Main Enrollment Stepper */}
      <EnrollmentStepper />
    </div>
  );
}
