"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import EnrollmentStepper from "@/components/forms/enrollment/EnrollmentStepper";

export default function StudentEnrollPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/?tab=signin&reason=auth_required");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white border-2 border-slate-300 text-center font-sans">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
          [ AUTHENTICATING APPLICANT SESSION ]
        </span>
        <p className="text-sm font-bold text-slate-800">
          Verifying authorized student credentials...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-amber-50 border-2 border-amber-400 text-center font-sans space-y-3">
        <span className="text-xs font-bold text-amber-900 uppercase block">
          [ ACCESS RESTRICTED: AUTHENTICATION REQUIRED ]
        </span>
        <p className="text-xs text-amber-800">
          You must create an account or sign in before filling out the official online enrollment form. Redirecting...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
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

