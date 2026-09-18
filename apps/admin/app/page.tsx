import React from "react";

export default function AdminHomePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Notice Banner */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
        <span className="text-xs font-bold tracking-widest text-[#002060] uppercase block mb-1">
          [ Portal 03: School Administration &amp; Admissions ]
        </span>
        <h2 className="text-lg font-bold text-slate-900">
          Executive Academic Management &amp; Scheduling Engine
        </h2>
        <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Authorized console for the School Principal and administrative personnel. 
          Manage enrollment applications, review submitted credentials, configure section capacity quotas, 
          and run automated conflict-free timetable scheduling algorithms.
        </p>
      </section>

      {/* Admin Login Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 border-2 border-[#002060] shadow-sm">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
              [ Administrator Credentials ]
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Administrative Personnel Sign-In
            </h3>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Administrator Employee ID or Email
              </label>
              <input
                type="text"
                placeholder="e.g. DNHS-ADM-001"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-sm focus:border-[#002060] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Security Password
              </label>
              <input
                type="password"
                placeholder="Enter authorized password"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-sm focus:border-[#002060] outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="btn-primary w-full text-xs uppercase tracking-wider font-bold py-3"
              >
                Access Administration Console
              </button>
            </div>
          </form>
        </div>

        {/* Executive Capabilities */}
        <div className="bg-slate-100 p-6 border border-slate-300 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase block">
              [ Administrative Core Modules ]
            </span>

            <div className="p-3 bg-white border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">1. Enrollment Adjudication Console:</strong>
              <p className="text-slate-600">
                Inspect applicant details, verified documents, and set status to [ Approved ] or [ Needs Revision ] with feedback.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">2. Automated Schedule Deconfliction:</strong>
              <p className="text-slate-600">
                Real-time algorithm verifying room occupancy, teacher cross-level loads, and SHS 5-core limits.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">3. Section Quota &amp; Capacity Control:</strong>
              <p className="text-slate-600">
                Balance student distributions across sections and prevent classroom oversubscription.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
