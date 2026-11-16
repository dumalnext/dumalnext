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
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white rounded-2xl p-6 shadow-md border border-[#001744] border-t-4 border-t-amber-400">
        <div className="flex items-start gap-4">
          <img
            src="/dumalneg-logo.png"
            alt="Dumalneg NHS Seal"
            className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0 hidden sm:block mt-0.5"
          />
          <div>
            <span className="text-xs font-bold text-amber-300 block mb-1">
              Student &amp; Parent Portal
            </span>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Welcome to the Dumalneg NHS Student Portal
            </h1>
            <p className="text-sm text-blue-100 mt-1.5 max-w-2xl leading-relaxed">
              Enroll online for incoming, returning, and transferring students at Dumalneg National High School. Fill out the form, upload photos of your requirements, and check your enrollment status anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Main Student Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action 1: New Enrollment */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 border-t-4 border-t-[#002060] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-amber-600 mb-1.5">
              Step 1 &bull; Fill Out Form
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Online Enrollment Form (DepEd Revised 2025)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              For Incoming Grade 7, Incoming Grade 11, Transferees, and Returning Learners (Balik-Aral). Includes an easy 5-step guide for uploading your Report Card (Form 138) and Birth Certificate photos smoothly even on mobile data.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <Link
              href="/student/enroll"
              className="btn-primary rounded-lg block text-center text-xs font-bold py-3"
            >
              Start Online Enrollment
            </Link>
          </div>
        </div>

        {/* Action 2: Track Existing Application */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 border-t-4 border-t-[#002060] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-amber-600 mb-1.5">
              Step 2 &bull; Check Status
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Check Your Enrollment Status
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Already submitted your form? Enter your Application Reference Number or 12-digit LRN to see if it is Waiting for Review, Approved, or Needs Correction.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Reference No. or 12-Digit LRN"
                className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-300 text-xs focus:border-[#002060] outline-none"
              />
              <button
                type="button"
                className="btn-secondary rounded-lg text-xs font-bold px-4 shrink-0"
              >
                Check Record
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notice on Continuing Students */}
      <div className="bg-blue-50/70 rounded-xl border border-blue-200 p-5 text-xs text-slate-700 space-y-1.5">
        <span className="font-bold text-[#002060] block">
          Notice for Current Students (Grades 8, 9, 10, and 12)
        </span>
        <p className="leading-relaxed">
          Returning students who studied at Dumalneg NHS last school year already have their records saved in the school system. You do not need to re-upload documents unless you are requesting to change your Senior High strand before Grade 12.
        </p>
      </div>
    </div>
  );
}
