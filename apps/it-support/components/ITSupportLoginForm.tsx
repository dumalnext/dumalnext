"use client";

import React, { useState } from "react";
import { useITSupportAuth } from "@/lib/auth/itSupportAuthContext";

export default function ITSupportLoginForm() {
  const { login, demoLogin } = useITSupportAuth();
  const [identifier, setIdentifier] = useState("dumalnext@gmail.com");
  const [password, setPassword] = useState("dumalNext26.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const result = await login(identifier, password);
    if (!result.success) {
      setErrorMessage(result.error || "Authentication failed. Access is restricted to authorized IT Support personnel.");
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = async () => {
    setIdentifier("dumalnext@gmail.com");
    setPassword("dumalNext26.");
    setIsSubmitting(true);
    await demoLogin();
  };

  return (
    <div className="max-w-md mx-auto p-6 sm:p-8 bg-white border-4 border-[#002060] shadow-md font-sans">
      <div className="border-b-2 border-slate-300 pb-4 mb-6 text-center">
        <span className="text-[10px] font-mono font-bold tracking-widest text-[#002060] uppercase block">
          PORTAL 04 &bull; RESTRICTED PERIMETER
        </span>
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-1">
          IT Support Authentication Desk
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Restricted to authorized system administrator email: <strong className="text-[#002060]">dumalnext@gmail.com</strong>
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 text-xs font-bold text-red-800">
          [ AUTHENTICATION ERROR ]: {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-800 mb-1">
            Authorized Administrator Email <span className="text-red-700">*</span>
          </label>
          <input
            type="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            placeholder="dumalnext@gmail.com"
            className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#002060] outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-800 mb-1">
            System Security Password <span className="text-red-700">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter security password"
            className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#002060] outline-none font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-[#002060] hover:bg-[#001845] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "[ Verifying Credentials... ]" : "[ Authenticate IT Support Session ]"}
        </button>

        <div className="pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={handleDemoFill}
            disabled={isSubmitting}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 border-2 border-slate-400 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors font-mono"
          >
            [ Quick Sign-In: dumalnext@gmail.com ]
          </button>
        </div>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-200 text-center">
        <p className="text-[10px] font-mono text-slate-500 uppercase leading-relaxed">
          Access strictly limited to dumalnext@gmail.com for system operations, dynamic calendar setup, and database audit logs.
        </p>
      </div>
    </div>
  );
}
