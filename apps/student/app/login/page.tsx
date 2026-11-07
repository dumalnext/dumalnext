"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  React.useEffect(() => {
    router.replace("/?tab=signin");
  }, [router]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="max-w-md mx-auto space-y-6 ">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-200 pb-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Student Portal Sign In
        </h1>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-400 rounded-[4px]">
          <p className="text-xs font-bold text-red-900 leading-normal">
            Authentication Error: {error}
          </p>
        </div>
      )}

      {/* Sign In Card */}
      <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-6 rounded-[4px] shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identifier: Email First */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Registered Email Address <span className="text-red-700">*</span>
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. student@example.com"
              className="w-full p-3 bg-white border-2 border-slate-300 text-xs font-bold tracking-wider focus:border-[#002060] outline-none rounded-[4px]"
              required
            />

          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Password <span className="text-red-700">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-[11px] font-bold text-[#002060] hover:underline cursor-pointer select-none"
              >
                {showPassword ? "Hide Password" : "Show Password"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your account password"
              className="w-full p-3 bg-slate-50/70 focus:bg-white border-2 border-slate-300 text-xs font-semibold focus:border-[#002060] outline-none rounded-[4px] transition-colors"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#002060] text-white text-xs font-bold hover:bg-blue-950 transition-colors shadow-xs disabled:bg-slate-400 rounded-[4px] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-amber-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>{isSubmitting ? "Authenticating Account..." : "Sign In to Student Portal"}</span>
            </button>
          </div>
        </form>



        {/* Register Account Link */}
        <div className="text-center pt-2 border-t border-slate-200 text-xs text-slate-600">
          First time enrolling or don&apos;t have an account yet?{" "}
          <Link href="/register" className="text-[#002060] font-bold hover:underline block mt-1">
            Register New Student Account
          </Link>
        </div>
      </div>
    </div>
  );
}
