import React from "react";
import Link from "next/link";
import EnrollmentStepper from "@/components/forms/enrollment/EnrollmentStepper";
import { AuthProvider } from "@/lib/auth/authContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Online Enrollment Form | Dumalneg National High School",
  description: "Official DepEd Basic Education Online Enrollment Form for Dumalneg National High School.",
};

export default function StudentEnrollPage() {
  return (
    <AuthProvider>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Breadcrumb & Navigation */}
        <div className="flex items-center justify-between text-xs text-slate-600 bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center space-x-2">
            <Link href="/" className="font-bold text-[#002060] hover:underline">
              Home
            </Link>
            <span>/</span>
            <Link href="/student" className="font-bold text-[#002060] hover:underline">
              Student Portal
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Online Enrollment Form</span>
          </div>
          <div className="text-xs text-slate-500">
            DepEd Form &bull; Revised 2025
          </div>
        </div>

        {/* Main Enrollment Stepper */}
        <EnrollmentStepper />
      </div>
    </AuthProvider>
  );
}
