import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Student Portal | Dumalneg National High School",
  description: "Official Student Portal of Dumalneg National High School.",
};

export default function StudentPortalHomePage() {
  return (
    <div className="space-y-6">
      {/* Official Header */}
      <div className="bg-white border-l-4 border-[#002060] p-6 border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-[#002060] uppercase tracking-widest block mb-1">
          [ Portal 01: Student Workstation ]
        </span>
        <h1 className="text-xl font-bold text-slate-900">
          Welcome to the Dumalneg NHS Student Portal
        </h1>
        <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
          The official web-based academic workstation for incoming, continuing, and transferring students of Dumalneg National High School. 
          Submit online enrollment applications, upload required documentation with automated compression, and monitor application review statuses.
        </p>
      </div>

      {/* Main Student Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action 1: New Enrollment */}
        <div className="bg-white p-6 border-2 border-[#002060] flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-[#002060] uppercase mb-2">
              [ Action 01: Registration ]
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Online Enrollment Form (DepEd Revised 2025)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Designed for Incoming Grade 7, Incoming Grade 11, Transferees, and Returning Learners (Balik-Aral). 
              Features a 5-step guided form with built-in client-side image compression (&lt;350KB) for seamless uploads of Form 138 and PSA Birth Certificates.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <Link
              href="/student/enroll"
              className="btn-primary block text-center text-xs uppercase tracking-wider font-bold py-3"
            >
              Start Online Enrollment
            </Link>
          </div>
        </div>

        {/* Action 2: Track Existing Application */}
        <div className="bg-white p-6 border border-slate-300 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-slate-600 uppercase mb-2">
              [ Action 02: Verification ]
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Track Enrollment Application Status
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Already submitted your application? Enter your Application Tracking ID or 12-digit Learner Reference Number (LRN) 
              to verify if your record is [ Pending ], [ Approved ], or [ Needs Revision ].
            </p>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Application ID or 12-Digit LRN"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs focus:border-[#002060] outline-none font-mono"
              />
              <button
                type="button"
                className="btn-secondary text-xs uppercase font-bold px-4 shrink-0"
              >
                Search Record
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notice on Continuing Students */}
      <div className="bg-slate-50 border border-slate-300 p-5 text-xs text-slate-700 space-y-2">
        <span className="font-bold text-[#002060] uppercase block">
          [ Important Notice for Continuing Students (Grades 8, 9, 10, and 12) ]
        </span>
        <p>
          Regular continuing students enrolled in Dumalneg NHS during the preceding school year are automatically promoted and transcribed 
          by school administrators in the database. Resubmission of the full enrollment form is not required unless requesting an approved 
          Senior High School strand realignment prior to Grade 12.
        </p>
      </div>
    </div>
  );
}
