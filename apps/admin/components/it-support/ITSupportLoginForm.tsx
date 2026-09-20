"use client";

import React, { useState } from "react";
import { useITSupportAuth } from "@/lib/auth/itSupportAuthContext";

export default function ITSupportLoginForm() {
  const { login, demoLogin } = useITSupportAuth();
  const [identifier, setIdentifier] = useState("DNHS-IT-001");
  const [password, setPassword] = useState("dnhs2026");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const result = await login(identifier, password);
    if (!result.success) {
      setErrorMessage(result.error || "Authentication failed. Please verify your credentials.");
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = async () => {
    setIdentifier("DNHS-IT-001");
    setPassword("dnhs2026");
    setIsSubmitting(true);
    await demoLogin();
  };

  return (
    <div className="max-w-md mx-auto p-6 sm:p-8 bg-white border-4 border-[#002060] shadow-md font-sans">
      {/* Header */}
      <div className="border-b-2 border-slate-300 pb-4 mb-6 text-center">
        <span className="text-[10px] font-mono font-bold tracking-widest text-[#002060] uppercase block">
          PORTAL 04 &bull; RESTRICTED ACCESS
        </span>
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-1">
          IT Support Authentication Desk
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Dumalneg National High School System Administration &bull; Academic Calendar &amp; Role Infrastructure
        </p>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 text-xs font-bold text-red-800">
          [ AUTHENTICATION ERROR ]: {errorMessage}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-800 mb-1">
            IT Support ID or DepEd Email <span className="text-red-700">*</span>
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            placeholder="e.g. DNHS-IT-001"
            className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#002060] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-800 mb-1">
            Authorized System Password <span className="text-red-700">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#002060] outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-[#002060] hover:bg-[#001845] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "[ Verifying Credentials... ]" : "[ Authenticate IT Support Session ]"}
        </button>

        {/* Demo Fast-Track Button for Thesis Defense */}
        <div className="pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={handleDemoFill}
            disabled={isSubmitting}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 border-2 border-slate-400 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            [ Quick Sign-In: Demo IT Administrator (DNHS-IT-001) ]
          </button>
        </div>
      </form>

      {/* Security Note */}
      <div className="mt-6 pt-4 border-t border-slate-200 text-center">
        <p className="text-[10px] font-mono text-slate-500 uppercase leading-relaxed">
          Access restricted to designated IT Support Personnel of Dumalneg NHS. All administrative logins are logged for system audit integrity.
        </p>
      </div>
    </div>
  );
}
