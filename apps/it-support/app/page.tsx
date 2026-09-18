import React from "react";

export default function ITSupportHomePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Notice Banner */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
        <span className="text-xs font-bold tracking-widest text-[#002060] uppercase block mb-1">
          [ Portal 04: IT Systems &amp; Technical Infrastructure ]
        </span>
        <h2 className="text-lg font-bold text-slate-900">
          System Administration &amp; Dynamic Calendar Configuration
        </h2>
        <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Technical console for IT support personnel of Dumalneg National High School. 
          Configure dynamic school year dates, set trimester schedules without code modification, 
          manage system roles (RBAC), and monitor real-time audit logs.
        </p>
      </section>

      {/* IT Login Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 border-2 border-[#002060] shadow-sm">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
              [ System Administrator Access ]
            </span>
            <h3 className="text-base font-bold text-slate-900">
              IT Support Specialist Sign-In
            </h3>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                IT Staff Employee ID or System Email
              </label>
              <input
                type="text"
                placeholder="e.g. DNHS-IT-001"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-sm focus:border-[#002060] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Security Passkey
              </label>
              <input
                type="password"
                placeholder="Enter root credentials"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-sm focus:border-[#002060] outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="btn-primary w-full text-xs uppercase tracking-wider font-bold py-3"
              >
                Unlock Management Console
              </button>
            </div>
          </form>
        </div>

        {/* Technical Capabilities */}
        <div className="bg-slate-100 p-6 border border-slate-300 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase block">
              [ Core Infrastructure Controls ]
            </span>

            <div className="p-3 bg-white border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">1. Dynamic Academic Calendar Setup:</strong>
              <p className="text-slate-600">
                Zero hardcoded dates. Dynamically initialize new school years and configure start/end dates for Trimesters 1, 2, and 3.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">2. Role-Based Access Control (RBAC):</strong>
              <p className="text-slate-600">
                Configure user roles across Student, Teacher, Administrator, and IT Support with strict database row-level security.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">3. Audit Logging &amp; System Health:</strong>
              <p className="text-slate-600">
                Monitor database connectivity, document storage quotas, and maintain immutable security access logs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
