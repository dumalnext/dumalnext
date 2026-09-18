"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    lrn: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Official Last Name is required.";
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = "Official First Name is required.";
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      newErrors.email = "A valid email address is required.";
    }
    if (formData.lrn && formData.lrn.replace(/\D/g, "").length !== 12) {
      newErrors.lrn = "Learner Reference Number (LRN) must be exactly 12 numeric digits.";
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters in length.";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match. Please re-enter.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        lrn: formData.lrn,
        email: formData.email,
        password: formData.password,
      });

      if (res.success) {
        router.push("/enroll");
      } else {
        setErrors({ form: res.error || "Registration failed. Please check your inputs." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 font-sans">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-200 pb-4 text-center">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#002060]">
          DUMALNEG NATIONAL HIGH SCHOOL &bull; STUDENT PORTAL
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Create Student Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed max-w-md mx-auto">
          Register your official student account to initiate online enrollment, upload school credentials, and track your admission status.
        </p>
      </div>

      {/* Global Error Notice */}
      {errors.form && (
        <div className="p-4 bg-red-50 border-2 border-red-400">
          <p className="text-xs font-bold text-red-900 leading-normal">
            [ REGISTRATION NOTICE ]: {errors.form}
          </p>
        </div>
      )}

      {/* Registration Form Card */}
      <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
              [ 1. Official Learner Identification ]
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Last Name */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Last Name <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value.toUpperCase() });
                  if (errors.lastName) setErrors({ ...errors, lastName: "" });
                }}
                placeholder="e.g. AGCAOILI"
                className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                  errors.lastName ? "border-red-600 bg-red-50" : "border-slate-300"
                }`}
              />
              {errors.lastName && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.lastName}</p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                First Name <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value.toUpperCase() });
                  if (errors.firstName) setErrors({ ...errors, firstName: "" });
                }}
                placeholder="e.g. MARK ANTHONY"
                className={`w-full p-2.5 bg-white border-2 text-xs font-bold uppercase focus:border-[#002060] outline-none ${
                  errors.firstName ? "border-red-600 bg-red-50" : "border-slate-300"
                }`}
              />
              {errors.firstName && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.firstName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Middle Name */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Middle Name (Optional)
              </label>
              <input
                type="text"
                value={formData.middleName}
                onChange={(e) =>
                  setFormData({ ...formData, middleName: e.target.value.toUpperCase() })
                }
                placeholder="e.g. DELA CRUZ"
                className="w-full p-2.5 bg-white border-2 border-slate-300 text-xs font-bold uppercase focus:border-[#002060] outline-none"
              />
            </div>

            {/* 12-Digit LRN */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                12-Digit DepEd LRN (Optional)
              </label>
              <input
                type="text"
                maxLength={12}
                value={formData.lrn}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setFormData({ ...formData, lrn: cleaned });
                  if (errors.lrn) setErrors({ ...errors, lrn: "" });
                }}
                placeholder="e.g. 100050123456"
                className={`w-full p-2.5 bg-white border-2 text-xs font-mono font-bold tracking-wider focus:border-[#002060] outline-none ${
                  errors.lrn ? "border-red-600 bg-red-50" : "border-slate-300"
                }`}
              />
              {errors.lrn ? (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.lrn}</p>
              ) : (
                <p className="text-[10px] text-slate-500 mt-0.5">Found on your elementary SF9 / Report Card.</p>
              )}
            </div>
          </div>

          <div className="border-b border-slate-200 pt-2 pb-2">
            <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
              [ 2. Account Access Credentials ]
            </span>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
              Email Address <span className="text-red-700">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
              placeholder="e.g. student.name@gmail.com"
              className={`w-full p-2.5 bg-white border-2 text-xs font-mono focus:border-[#002060] outline-none ${
                errors.email ? "border-red-600 bg-red-50" : "border-slate-300"
              }`}
            />
            {errors.email && (
              <p className="text-[11px] font-bold text-red-700 mt-1">{errors.email}</p>
            )}
            <p className="text-[10px] text-slate-500 mt-0.5">
              This email will be used for your account login and school admission notifications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Password <span className="text-red-700">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
                placeholder="Minimum 6 characters"
                className={`w-full p-2.5 bg-white border-2 text-xs focus:border-[#002060] outline-none ${
                  errors.password ? "border-red-600 bg-red-50" : "border-slate-300"
                }`}
              />
              {errors.password && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Confirm Password <span className="text-red-700">*</span>
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                }}
                placeholder="Re-type password"
                className={`w-full p-2.5 bg-white border-2 text-xs focus:border-[#002060] outline-none ${
                  errors.confirmPassword ? "border-red-600 bg-red-50" : "border-slate-300"
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-[11px] font-bold text-red-700 mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#002060] text-white text-xs uppercase font-bold tracking-wider hover:bg-blue-950 transition-colors shadow-xs disabled:bg-slate-400"
            >
              {isSubmitting ? "[ CREATING OFFICIAL ACCOUNT... ]" : "[ REGISTER ACCOUNT & PROCEED TO ENROLLMENT ]"}
            </button>
          </div>
        </form>

        <div className="text-center pt-2 border-t border-slate-200 text-xs text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="text-[#002060] font-bold uppercase hover:underline">
            Sign In with Email or LRN &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
