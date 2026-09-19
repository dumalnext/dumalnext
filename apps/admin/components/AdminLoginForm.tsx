"use client";

import React, { useState } from "react";
import { useAdminAuth } from "@/lib/auth/authContext";

export default function AdminLoginForm() {
  const { login } = useAdminAuth();

  const [adminId, setAdminId] = useState<string>("admin@dumalneg.deped.gov.ph");
  const [adminPassword, setAdminPassword] = useState<string>("admin123");
  const [loginError, setLoginError] = useState<string>("" );
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginProgress, setLoginProgress] = useState<number>(0);
  const [loginStatusText, setLoginStatusText] = useState<string>("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!adminId.trim() || !adminPassword) {
      setLoginError("Please enter your Administrator ID or Email and password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginProgress(20);
    setLoginStatusText("Connecting to Dumalneg NHS Security Realm...");

    try {
      await new Promise((res) => setTimeout(res, 400));
      setLoginProgress(55);
      setLoginStatusText("Verifying administrative role permissions with Supabase database...");

      const res = await login(adminId, adminPassword);
      if (!res.success) {
        setLoginError(res.error || "Invalid administrator credentials.");
        setIsLoggingIn(false);
        setLoginProgress(0);
        return;
      }

      setLoginProgress(90);
      setLoginStatusText("Access granted. Initializing School Administrator Console...");
      await new Promise((res) => setTimeout(res, 350));

      setLoginProgress(100);
      setLoginStatusText("Welcome, Administrator!");
      await new Promise((res) => setTimeout(res, 200));
    } finally {
      setIsLoggingIn(false);
      setLoginProgress(0);
      setLoginStatusText("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 font-sans">
      {/* Notice Banner */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
        <span className="text-xs font-bold tracking-widest text-[#002060] uppercase block mb-1">
          [ PORTAL 03 &bull; DUMALNEG NATIONAL HIGH SCHOOL &bull; ADMISSIONS ]
        </span>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 uppercase">
          School Administration &amp; Enrollment Adjudication Console
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Authorized management console for the School Principal, Registrar, and Admissions personnel. 
          Review learner enrollment credentials, inspect submitted PSA documents and report cards, 
          adjudicate application status, manage section quotas, and run schedule deconfliction algorithms.
        </p>
      </section>

      {/* Login Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 sm:p-8 border-2 border-[#002060] shadow-sm space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-xs font-mono font-bold text-[#002060] uppercase block mb-1">
              [ OFFICIAL ADMINISTRATOR AUTHENTICATION ]
            </span>
            <h3 className="text-base font-bold text-slate-900 uppercase">
              Administrative Personnel Sign-In
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your authorized Employee ID or official DepEd Email Address.
            </p>
          </div>

          {/* Progress Bar */}
          {isLoggingIn && (
            <div className="p-4 bg-blue-50 border-2 border-[#002060] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-[#002060]">
                <span>[ VERIFYING CREDENTIALS ]</span>
                <span>{loginProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 border border-blue-900/30 overflow-hidden">
                <div
                  className="bg-[#002060] h-full transition-all duration-300 ease-out"
                  style={{ width: `${loginProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-800 font-medium">
                {loginStatusText || "Authenticating..."}
              </p>
            </div>
          )}

          {loginError && (
            <div className="p-3 bg-red-50 border-2 border-red-400 text-xs font-bold text-red-900 leading-normal">
              [ AUTHENTICATION ERROR ]: {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Administrator ID or Email <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="e.g. admin@gmail.com or DNHS-ADM-001"
                className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none disabled:bg-slate-100"
                disabled={isLoggingIn}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Security Password <span className="text-red-700">*</span>
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter administrator password"
                className="w-full p-3 bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none disabled:bg-slate-100"
                disabled={isLoggingIn}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="btn-primary w-full text-xs uppercase tracking-wider font-bold py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? "[ AUTHENTICATING... PLEASE WAIT ]" : "Sign In to Administration Console"}
              </button>
            </div>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-3 border-t border-slate-200 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase block font-medium">
              Administrator Quick-Fill Presets:
            </span>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setAdminId("admin@gmail.com");
                  setAdminPassword("admin123");
                }}
                className="text-[#002060] font-bold uppercase underline hover:text-blue-950"
              >
                [ admin@gmail.com ]
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={() => {
                  setAdminId("admin@dumalneg.deped.gov.ph");
                  setAdminPassword("admin123");
                }}
                className="text-[#002060] font-bold uppercase underline hover:text-blue-950"
              >
                [ admin@dumalneg.deped.gov.ph ]
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={() => {
                  setAdminId("DNHS-ADM-001");
                  setAdminPassword("admin123");
                }}
                className="text-[#002060] font-bold uppercase underline hover:text-blue-950"
              >
                [ DNHS-ADM-001 ]
              </button>
            </div>
          </div>
        </div>

        {/* Executive Security Clearance Notice */}
        <div className="bg-slate-100 p-6 border border-slate-300 flex flex-col justify-between space-y-4">
          <div className="space-y-3 text-xs">
            <span className="font-mono font-bold text-[#002060] uppercase block">
              [ DepEd Dumalneg NHS Security Clearance ]
            </span>
            <p className="text-slate-700 leading-relaxed">
              This portal is strictly restricted to authorized Dumalneg National High School personnel. 
              All admissions adjudication actions, document evaluations, and section assignments are digitally audited.
            </p>

            <div className="p-3 bg-white border border-slate-300 space-y-1">
              <strong className="text-slate-900 block font-bold uppercase">1. Enrollment Adjudication:</strong>
              <p className="text-slate-600 text-[11px]">
                Real-time queue of basic education applications. Approve or request revision on submitted Form 138 report cards and PSA certificates.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-300 space-y-1">
              <strong className="text-slate-900 block font-bold uppercase">2. Section Quota Enforcement:</strong>
              <p className="text-slate-600 text-[11px]">
                Enforces standard DepEd capacity (40 students per section) to eliminate classroom oversubscription.
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-300 space-y-1">
              <strong className="text-slate-900 block font-bold uppercase">3. Conflict-Free Timetable Scheduling:</strong>
              <p className="text-slate-600 text-[11px]">
                Evaluates 3D timetable collisions (Teacher loads, Classroom occupancies, and SHS 5-core limits).
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-300 space-y-1">
              <strong className="text-slate-900 block font-bold uppercase">4. Enrollment Control Room:</strong>
              <p className="text-slate-600 text-[11px]">
                Master switch to toggle online enrollment ON or OFF, configure active School Year, and set institutional advisories.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-slate-500 uppercase">
            Dumalneg NHS &bull; CCIS Capstone Project
          </span>
        </div>
      </div>
    </div>
  );
}
