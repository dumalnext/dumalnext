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
          [ Portal 01: Mag-aaral / Student Workstation ]
        </span>
        <h1 className="text-xl font-bold text-slate-900">
          Maligayang Pagdating sa Dumalneg NHS Student Portal
        </h1>
        <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Ang opisyal na online workstation para sa mga papasok at kasalukuyang mag-aaral ng Dumalneg National High School. 
          Dito maaaring magsumite ng online enrollment, mag-upload ng mga kinakailangang dokumento, at subaybayan ang katayuan ng inyong aplikasyon.
        </p>
      </div>

      {/* Main Student Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action 1: New Enrollment */}
        <div className="bg-white p-6 border-2 border-[#002060] flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-[#002060] uppercase mb-2">
              [ Hakbang 01: Pagpapatala ]
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Online Enrollment Form (DepEd Revised 2025)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Para sa mga Incoming Grade 7, Incoming Grade 11, Transferees, at Returning Students (Balik-Aral). 
              May 5-step stepper form na may built-in photo compressor (&lt;350KB) para sa madaling pag-upload ng Form 138 at PSA Birth Certificate.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <Link
              href="/student/enroll"
              className="btn-primary block text-center text-xs uppercase tracking-wider font-bold py-3"
            >
              Magsimula ng Enrollment Form
            </Link>
          </div>
        </div>

        {/* Action 2: Track Existing Application */}
        <div className="bg-white p-6 border border-slate-300 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold text-slate-600 uppercase mb-2">
              [ Hakbang 02: Pagsubaybay ]
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Suriin ang Katayuan ng Aplikasyon (Status Tracker)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Naisumite na ba ang iyong form? Ipasok ang iyong Application Tracking Number o LRN 
              upang malaman kung ito ay [ Pending ], [ Approved ], o [ Needs Revision ].
            </p>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ilagay ang Application ID o LRN"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs focus:border-[#002060] outline-none"
              />
              <button
                type="button"
                className="btn-secondary text-xs uppercase font-bold px-4 shrink-0"
              >
                Hanapin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notice on Returning Students */}
      <div className="bg-slate-50 border border-slate-300 p-5 text-xs text-slate-700 space-y-2">
        <span className="font-bold text-[#002060] uppercase block">
          [ Mahalagang Paalala para sa mga Datihang Mag-aaral (Grade 8, 9, 10, at 12) ]
        </span>
        <p>
          Ang mga regular na mag-aaral na nagpatuloy mula sa nakaraang taon sa DNHS ay awtomatikong inililipat sa susunod na antas 
          ng Administrator sa database. Hindi na kailangang muling magpasa ng buong enrollment form maliban kung kayo ay magpapalit 
          ng Senior High School Strand sa pagpasok ng Grade 12.
        </p>
      </div>
    </div>
  );
}
