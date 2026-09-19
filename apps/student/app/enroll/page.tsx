"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { useEnrollmentControl } from "@/lib/hooks/useEnrollmentControl";
import EnrollmentStepper from "@/components/forms/enrollment/EnrollmentStepper";

export default function StudentEnrollPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isEnrollmentOpen, schoolYear, closedMessage, isLoading: isControlLoading } = useEnrollmentControl();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/?tab=signin&reason=auth_required");
    }
  }, [user, isLoading, router]);

  if (isLoading || isControlLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white border-2 border-slate-300 text-center font-sans">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
          [ AUTHENTICATING APPLICANT SESSION ]
        </span>
        <p className="text-sm font-bold text-slate-800">
          Verifying authorized student credentials and enrollment system status...
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

  // ===========================================================================
  // CLOSED ENROLLMENT STATE (MASTER SWITCH IS OFF)
  // ===========================================================================
  if (!isEnrollmentOpen) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 font-sans">
        {/* Top Breadcrumb Navigation */}
        <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-3 border border-slate-300">
          <div className="flex items-center space-x-2">
            <Link href="/" className="font-bold text-[#002060] hover:underline">
              [ Student Home ]
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Online Enrollment Notice</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            DEPED MEMORANDUM &bull; S.Y. {schoolYear}
          </div>
        </div>

        {/* Official DepEd Closed Advisory Card */}
        <div className="bg-white border-2 border-red-500 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b-2 border-red-200 pb-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-red-100 text-red-900 border border-red-400 text-xs font-mono font-bold uppercase">
                [ DEPED OFFICIAL ADVISORY: ONLINE ENROLLMENT IS CURRENTLY CLOSED ]
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                School Year: <strong>{schoolYear}</strong>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight">
              Online Basic Education Enrollment is Currently Closed
            </h2>
            <p className="text-xs font-mono text-slate-600">
              Department of Education &bull; Region I &bull; Division of Ilocos Norte &bull; Dumalneg National High School
            </p>
          </div>

          {/* Registrar Official Announcement */}
          <div className="p-4 bg-red-50/70 border border-red-300 space-y-2 text-xs text-red-950 leading-relaxed">
            <span className="font-bold uppercase tracking-wider block text-red-900">
              Official Message from the Dumalneg NHS Registrar's Office:
            </span>
            <p className="whitespace-pre-line text-sm font-sans text-slate-800">
              {closedMessage}
            </p>
          </div>

          {/* Information & Assistance Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                Official School Inquiries
              </span>
              <p className="font-bold text-slate-900">Dumalneg NHS Registrar&apos;s Office</p>
              <p className="text-slate-600">Monday &ndash; Friday &bull; 8:00 AM &ndash; 5:00 PM</p>
              <p className="text-slate-600">Dumalneg, Ilocos Norte, Philippines (2921)</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                Application Tracking
              </span>
              <p className="text-slate-700">
                If you have already submitted an enrollment application prior to closure, you may continue to monitor your evaluation progress.
              </p>
              <Link href="/track" className="font-bold text-[#002060] hover:underline block pt-1">
                &rarr; Check My Application Status in Smart Tracker
              </Link>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-3">
            <Link
              href="/"
              className="px-6 py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              [ Return to Student Dashboard ]
            </Link>
            <Link
              href="/track"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase border border-slate-300 transition-colors"
            >
              [ Track Application ]
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // OPEN ENROLLMENT STATE (MASTER SWITCH IS ON)
  // ===========================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-3 border border-slate-300">
        <div className="flex items-center space-x-2">
          <Link href="/" className="font-bold text-[#002060] hover:underline">
            [ Student Home ]
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Online Enrollment Form (S.Y. {schoolYear})</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          DEPED FORM &bull; S.Y. {schoolYear}
        </div>
      </div>

      {/* Main Enrollment Stepper */}
      <EnrollmentStepper schoolYear={schoolYear} />
    </div>
  );
}
