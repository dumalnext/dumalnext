import React from "react";

export default function TeacherHomePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Notice Banner */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
        <span className="text-xs font-bold tracking-widest text-[#002060] uppercase block mb-1">
          [ Portal 02: Faculty &amp; Academic Staff Workstation ]
        </span>
        <h2 className="text-lg font-bold text-slate-900">
          Faculty Teaching Load &amp; Class Roster Management
        </h2>
        <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Authorized portal for teaching personnel of Dumalneg National High School. 
          Access cross-level teaching load assignments (Junior High School and Senior High School), 
          review class schedules, and retrieve officially enrolled section rosters.
        </p>
      </section>

      {/* Faculty Login Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 border-2 border-[#002060] shadow-sm">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
              [ Secure Access Authentication ]
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Faculty Member Sign-In
            </h3>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Faculty Employee ID or DNHS Email
              </label>
              <input
                type="text"
                placeholder="e.g. DNHS-TCH-001"
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
                Authenticate &amp; Enter Workstation
              </button>
            </div>
          </form>
        </div>

        {/* Workstation Capabilities */}
        <div className="bg-slate-100 p-6 border border-slate-300 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase block">
              [ Institutional Faculty Features ]
            </span>

            <div className="p-3 bg-white border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">1. Cross-Level Teaching Load Schedule:</strong>
              <p className="text-slate-600">
                View unified timetables for faculty handling simultaneous Junior High School and Senior High School subject blocks.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">2. Real-Time Student Roster Lookup:</strong>
              <p className="text-slate-600">
                Access certified lists of enrolled students per section, updated immediately following administrative approval.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">3. Automated Schedule Deconfliction:</strong>
              <p className="text-slate-600">
                All faculty schedules are guaranteed clash-free across rooms and instructional hours through the scheduling engine.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
