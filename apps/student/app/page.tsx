import React from "react";
import Link from "next/link";

export default function StudentHomePage() {
  return (
    <div className="space-y-8">
      {/* Official Student Notice */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#002060] uppercase">
              [ Official School Announcement ]
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Online Enrollment is Now Open for Incoming, Transferee, &amp; Returning Students
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
              Welcome to the official Dumalneg National High School Student Online Portal. 
              This portal allows students and parents from all barangays of Dumalneg to complete their enrollment 
              and upload required credentials online without travelling to campus.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/enroll"
              className="btn-primary block text-center uppercase tracking-wider text-xs px-6 py-3 font-bold"
            >
              Start Online Enrollment
            </Link>
          </div>
        </div>
      </section>

      {/* Main Student Actions Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action 1: Online Enrollment Form */}
        <div className="bg-white p-6 border-2 border-[#002060] flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-[#002060] uppercase mb-2">
              [ Service 01: Registration ]
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Basic Education Online Enrollment Form
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Designed for Incoming Grade 7, Incoming Grade 11, Transferees, and Returning Learners (Balik-Aral). 
              A 5-step guided form with client-side image compression (&lt;350KB) for seamless uploads of Form 138 and PSA Birth Certificates.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <Link
              href="/enroll"
              className="btn-primary block text-center text-xs uppercase tracking-wider font-bold py-3"
            >
              Proceed to Enrollment Form
            </Link>
          </div>
        </div>

        {/* Action 2: Track Existing Application */}
        <div className="bg-white p-6 border border-slate-300 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-slate-600 uppercase mb-2">
              [ Service 02: Verification ]
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Track Enrollment Application Status
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Already submitted your application? Enter your Application Tracking ID or 12-digit Learner Reference Number (LRN) 
              to verify if your submission is [ Pending ], [ Approved ], or [ Needs Revision ].
            </p>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <form action="/track" method="GET" className="flex gap-2">
              <input
                type="text"
                name="query"
                placeholder="Enter Application ID or 12-Digit LRN"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs focus:border-[#002060] outline-none font-mono"
                required
              />
              <button
                type="submit"
                className="btn-secondary text-xs uppercase font-bold px-4 shrink-0"
              >
                Search Record
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Target Audiences Grid: G7, G11, Transferees, Returning Students */}
      <section className="bg-slate-100 p-6 border border-slate-200">
        <h3 className="text-sm font-bold tracking-wider text-slate-700 uppercase mb-4">
          [ Learner Classification Guidelines ]
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 border border-slate-300">
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ 01 ] Incoming Grade 7
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Junior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              For Grade 6 elementary completers. Upload official PSA Birth Certificate and Form 138 (Learner&apos;s Progress Report Card).
            </p>
            <span className="badge-status badge-pending">Online Registration Required</span>
          </div>

          <div className="bg-white p-4 border border-slate-300">
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ 02 ] Incoming Grade 11 &amp; Transferees
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Senior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Select Senior High Track, Strand (STEM, TVL, HUMSS), and Cross-Strand Electives. Maximum 5 core subjects per trimester.
            </p>
            <span className="badge-status badge-pending">Online Registration Required</span>
          </div>

          <div className="bg-white p-4 border border-slate-300">
            <div className="text-xs font-bold text-emerald-800 uppercase mb-1">
              [ 03 ] Returning Students (Grades 8-10, Grade 12)
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Continuing Enrollment</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Continuing students of DNHS are automatically transcribed in the database. Verify your existing student record via LRN lookup.
            </p>
            <span className="badge-status badge-approved">Database Auto-Transcribed</span>
          </div>
        </div>
      </section>

      {/* Notice on Continuing Students */}
      <section className="bg-white border border-slate-300 p-5 text-xs text-slate-700 space-y-2">
        <span className="font-bold text-[#002060] uppercase block">
          [ Important Notice for Continuing Students (Grades 8, 9, 10, and 12) ]
        </span>
        <p>
          Regular continuing students enrolled in Dumalneg NHS during the preceding school year are automatically promoted and transcribed 
          by school administrators in the database. Resubmission of the full enrollment form is not required unless requesting an approved 
          Senior High School strand realignment prior to Grade 12.
        </p>
      </section>
    </div>
  );
}
