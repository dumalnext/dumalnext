"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your registered Email Address or 12-Digit LRN.");
      return;
    }

    if (!password) {
      setError("Please enter your account password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(identifier, password);
      if (res.success) {
        router.push("/enroll");
      } else {
        setError(res.error || "Authentication failed. Please check your credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 font-sans">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-200 pb-4 text-center">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#002060]">
          DUMALNEG NATIONAL HIGH SCHOOL &bull; STUDENT PORTAL
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Student Portal Sign In
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed max-w-sm mx-auto">
          Sign in using your registered <strong>Email Address</strong> or <strong>12-Digit Learner Reference Number (LRN)</strong> to access online enrollment and admission records.
        </p>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-400">
          <p className="text-xs font-bold text-red-900 leading-normal">
            [ AUTHENTICATION ERROR ]: {error}
          </p>
        </div>
      )}

      {/* Sign In Card */}
      <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dual Identifier: Email or 12-Digit LRN */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Email Address or 12-Digit LRN <span className="text-red-700">*</span>
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. 100050123456 or student@example.com"
              className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Supports both your 12-digit DepEd LRN or account email address.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Account Password <span className="text-red-700">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your account password"
              className="w-full p-3 bg-white border-2 border-slate-300 text-xs focus:border-[#002060] outline-none"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#002060] text-white text-xs uppercase font-bold tracking-wider hover:bg-blue-950 transition-colors shadow-xs disabled:bg-slate-400"
            >
              {isSubmitting ? "[ AUTHENTICATING ACCOUNT... ]" : "[ SIGN IN TO STUDENT PORTAL ]"}
            </button>
          </div>
        </form>

        {/* Capstone Defense Testing Quick Buttons */}
        <div className="p-3 bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
          <span className="font-bold text-slate-600 block uppercase text-[10px]">
            [ Capstone Defense Demo Shortcuts ]:
          </span>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setIdentifier("100050123456");
                setPassword("password123");
              }}
              className="text-left text-[#002060] font-mono hover:underline truncate"
            >
              &bull; Login as Mark Agcaoili (LRN: 100050123456)
            </button>
            <button
              type="button"
              onClick={() => {
                setIdentifier("john.lozano@example.com");
                setPassword("password123");
              }}
              className="text-left text-[#002060] font-mono hover:underline truncate"
            >
              &bull; Login as John Lozano (Email: john.lozano@example.com)
            </button>
          </div>
        </div>

        {/* Register Account Link */}
        <div className="text-center pt-2 border-t border-slate-200 text-xs text-slate-600">
          First time enrolling or don&apos;t have an account yet?{" "}
          <Link href="/register" className="text-[#002060] font-bold uppercase hover:underline block mt-1">
            Register New Student Account &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
