"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTeacherAuth } from "@/lib/auth/authContext";
import { createClient } from "@/lib/supabase/client";
import TeacherLoginForm from "@/components/TeacherLoginForm";

interface AdvisorySection {
  id: string;
  name: string;
  gradeLevel: number;
  strand?: string;
  roomNumber?: string;
}

export default function FacultyProfilePage() {
  const { user, isLoading, logout, updateUserName, updateUserEmail, updateUserPhoto, refreshSession } = useTeacherAuth();
  const supabase = createClient();

  // Active Tab: "personal" | "teaching" | "security"
  const [activeTab, setActiveTab] = useState<"personal" | "teaching" | "security">("personal");

  // Advisory Section Details
  const [advisorySection, setAdvisorySection] = useState<AdvisorySection | null>(null);
  const [isLoadingSection, setIsLoadingSection] = useState<boolean>(true);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editFirstName, setEditFirstName] = useState<string>("");
  const [editMiddleName, setEditMiddleName] = useState<string>("");
  const [editLastName, setEditLastName] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [nameSaveError, setNameSaveError] = useState<string>("");
  const [nameSaveSuccess, setNameSaveSuccess] = useState<string>("");

  // 2x2 Photo Upload State
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string>("");
  const [photoSuccess, setPhotoSuccess] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Security Credentials Modification States (Password & Email)
  const [securityModal, setSecurityModal] = useState<"none" | "password" | "email">("none");
  const [securityStep, setSecurityStep] = useState<1 | 2>(1);
  const [securityLoading, setSecurityLoading] = useState<boolean>(false);
  const [securityError, setSecurityError] = useState<string>("");
  const [securitySuccess, setSecuritySuccess] = useState<string>("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>("");

  // Password Modification Form
  const [passwordOtp, setPasswordOtp] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Email Modification Form
  const [newEmailInput, setNewEmailInput] = useState<string>("");
  const [emailOtp, setEmailOtp] = useState<string>("");

  // Fetch Teacher Advisory Section
  useEffect(() => {
    if (!user) {
      setIsLoadingSection(false);
      return;
    }

    let isMounted = true;
    const fetchAdvisorySection = async () => {
      try {
        setIsLoadingSection(true);
        const { data: sections } = await supabase
          .from("sections")
          .select("id, name, grade_level, strand, room_number, adviser_name, adviser_email")
          .or(`adviser_name.eq.${user.fullName},adviser_email.eq.${user.email}`)
          .limit(1);

        if (isMounted && sections && sections.length > 0) {
          const s = sections[0];
          setAdvisorySection({
            id: s.id,
            name: s.name,
            gradeLevel: s.grade_level,
            strand: s.strand || undefined,
            roomNumber: s.room_number || undefined,
          });
        }
      } catch (err) {
        console.warn("Notice: Error loading advisory section:", err);
      } finally {
        if (isMounted) setIsLoadingSection(false);
      }
    };

    fetchAdvisorySection();
    return () => {
      isMounted = false;
    };
  }, [user, supabase]);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white border-2 border-[#002060] text-center space-y-2 font-sans">
        <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
          DUMALNEG NATIONAL HIGH SCHOOL
        </span>
        <p className="text-xs font-mono text-slate-600">
          Loading Faculty Profile...
        </p>
      </div>
    );
  }

  if (!user) {
    return <TeacherLoginForm />;
  }

  const initials =
    `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() || "DN";

  const maskEmailAddress = (emailStr: string) => {
    if (!emailStr || !emailStr.includes("@")) return "";
    const [name, domain] = emailStr.split("@");
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}${"*".repeat(Math.max(name.length - 2, 3))}${name[name.length - 1]}@${domain}`;
  };

  // ---------------------------------------------------------------------------
  // NAME EDIT HANDLERS
  // ---------------------------------------------------------------------------
  const handleStartEdit = () => {
    setEditFirstName(user.firstName || "");
    setEditMiddleName("");
    setEditLastName(user.lastName || "");
    setNameSaveError("");
    setNameSaveSuccess("");
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setNameSaveError("");
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameSaveError("");
    setNameSaveSuccess("");

    const cleanFirst = editFirstName.trim();
    const cleanMiddle = editMiddleName.trim();
    const cleanLast = editLastName.trim();

    if (!cleanFirst) {
      setNameSaveError("Please enter your First Name.");
      return;
    }
    if (!cleanLast) {
      setNameSaveError("Please enter your Last Name.");
      return;
    }

    const newFullName = `${cleanFirst} ${cleanMiddle ? cleanMiddle + " " : ""}${cleanLast}`.trim();
    const oldFullName = user.fullName;

    setIsSavingName(true);

    try {
      // 1. Update teachers table
      const { error: tchErr } = await supabase
        .from("teachers")
        .update({
          first_name: cleanFirst,
          middle_name: cleanMiddle || null,
          last_name: cleanLast,
        })
        .or(`email.eq.${user.email},teacher_id.eq.${user.teacherId}`);

      if (tchErr) {
        console.warn("Notice updating teachers table:", tchErr.message);
      }

      // 2. Synchronize section adviser name
      if (oldFullName && oldFullName !== newFullName) {
        try {
          await supabase
            .from("sections")
            .update({ adviser_name: newFullName })
            .eq("adviser_name", oldFullName);
        } catch (secErr) {
          console.warn("Notice updating section adviser name:", secErr);
        }
      }

      // 3. Update auth context session state
      updateUserName(cleanFirst, cleanMiddle || undefined, cleanLast);

      // 4. Dispatch custom events for real-time synchronization
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dumalnext:teacher-data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:data-changed"));
        window.dispatchEvent(new CustomEvent("dumalnext:admin-data-changed"));
      }

      setNameSaveSuccess(
        `Faculty Name officially updated to ${newFullName}. Synchronized in real time across Teacher, Admin, and Student portals.`
      );
      setIsEditingName(false);
    } catch (err: any) {
      setNameSaveError(err?.message || "Failed to update name. Please check database connection.");
    } finally {
      setIsSavingName(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2x2 PHOTO UPLOAD & REMOVAL HANDLERS
  // ---------------------------------------------------------------------------
  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file (PNG, JPG, or WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image file size exceeds 5MB limit. Please select a smaller photo.");
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError("");
    setPhotoSuccess("");

    try {
      // 1. Client-side crop and resize to standard 2x2 square (320x320)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const dim = 320;
            canvas.width = dim;
            canvas.height = dim;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve((loadEvt.target?.result as string) || "");
              return;
            }

            // Square center crop
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, dim, dim);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = () => reject(new Error("Failed to process image file."));
          img.src = (loadEvt.target?.result as string) || "";
        };
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(file);
      });

      let finalPhotoUrl = dataUrl;

      // 2. Upload to Supabase Storage Bucket if available
      try {
        const cleanId = (user.teacherId || "faculty").replace(/[^a-zA-Z0-9_-]/g, "_");
        const storagePath = `teacher_photos/${cleanId}_2x2_${Date.now()}.jpg`;

        const byteString = atob(dataUrl.split(",")[1]);
        const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });

        const { error: storageErr } = await supabase.storage
          .from("student-documents")
          .upload(storagePath, blob, { contentType: "image/jpeg", upsert: true });

        if (!storageErr) {
          const { data: pubData } = supabase.storage
            .from("student-documents")
            .getPublicUrl(storagePath);
          if (pubData?.publicUrl) {
            finalPhotoUrl = pubData.publicUrl;
          }
        }
      } catch (storageException) {
        console.warn("Storage upload notice (falling back to data URL):", storageException);
      }

      // 3. Persist via API
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          teacherId: user.teacherId,
          email: user.email,
          photoUrl: finalPhotoUrl,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save photo in system settings.");
      }

      // 4. Update auth context & local state
      updateUserPhoto(finalPhotoUrl);
      setPhotoSuccess("Official 2x2 Faculty ID Photo updated successfully.");
      setTimeout(() => setPhotoSuccess(""), 4000);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to upload photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Confirm: Remove your 2x2 ID Photo and reset to default initials?")) {
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError("");
    setPhotoSuccess("");

    try {
      await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          teacherId: user.teacherId,
          email: user.email,
        }),
      });

      updateUserPhoto(null);
      setPhotoSuccess("Official 2x2 ID Photo removed. Reset to default initials.");
      setTimeout(() => setPhotoSuccess(""), 4000);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to remove photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SECURITY MODAL HANDLERS (PASSWORD & EMAIL CHANGE)
  // ---------------------------------------------------------------------------
  const openPasswordModal = () => {
    setSecurityModal("password");
    setSecurityStep(1);
    setSecurityError("");
    setSecuritySuccess("");
    setPasswordOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPasswordInput("");
  };

  const openEmailModal = () => {
    setSecurityModal("email");
    setSecurityStep(1);
    setSecurityError("");
    setSecuritySuccess("");
    setNewEmailInput("");
    setEmailOtp("");
    setCurrentPasswordInput("");
  };

  const closeSecurityModal = () => {
    setSecurityModal("none");
    setSecurityStep(1);
    setSecurityError("");
    setSecuritySuccess("");
    setCurrentPasswordInput("");
  };

  // Send Password OTP
  const handleSendPasswordOtp = async () => {
    try {
      setSecurityLoading(true);
      setSecurityError("");
      const res = await fetch("/api/profile/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_password_otp",
          userId: user.id,
          email: user.email,
          facultyName: user.fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send verification code.");
      }
      setSecurityStep(2);
      setSecuritySuccess(
        `The 6-digit verification code has been dispatched to ${maskEmailAddress(user.email)}. Please check your inbox or spam folder.`
      );
    } catch (err: any) {
      setSecurityError(err.message || "An error occurred while generating the code.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // Verify OTP & Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = passwordOtp.trim();
    const cleanCurrent = currentPasswordInput.trim();

    if (!cleanOtp && !cleanCurrent) {
      setSecurityError("Please enter the 6-digit verification code from your email or your current account password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setSecurityError("New password must be at least 6 characters in length.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("New password and confirmation do not match.");
      return;
    }

    try {
      setSecurityLoading(true);
      setSecurityError("");

      // 1. Server verification & DB update
      const res = await fetch("/api/profile/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_and_update_password",
          userId: user.id,
          email: user.email,
          otp: cleanOtp,
          currentPassword: cleanCurrent,
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update password.");
      }

      // 2. Client auth update
      try {
        await supabase.auth.updateUser({ password: newPassword.trim() });
      } catch (authErr) {
        console.warn("Client auth password update notice:", authErr);
      }

      setSecuritySuccess(data.message || "Password successfully updated! You may use it on your next login.");
      setPasswordOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPasswordInput("");
      setTimeout(() => {
        closeSecurityModal();
      }, 2000);
    } catch (err: any) {
      setSecurityError(err.message || "An error occurred while updating the password.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // Send Email OTP
  const handleSendEmailOtp = async () => {
    const cleanNew = newEmailInput.trim().toLowerCase();
    if (!cleanNew || !cleanNew.includes("@") || !cleanNew.includes(".")) {
      setSecurityError("Please enter a valid new email address (e.g. Gmail).");
      return;
    }
    if (cleanNew === user.email.toLowerCase()) {
      setSecurityError("The new email address cannot be the same as your current registered email.");
      return;
    }

    try {
      setSecurityLoading(true);
      setSecurityError("");
      const res = await fetch("/api/profile/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email_otp",
          userId: user.id,
          currentEmail: user.email,
          newEmail: cleanNew,
          facultyName: user.fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch verification code to the new email.");
      }
      setSecurityStep(2);
      setSecuritySuccess(
        `The 6-digit verification code has been dispatched to ${cleanNew}. Please check your inbox or spam folder.`
      );
    } catch (err: any) {
      setSecurityError(err.message || "An error occurred while generating the code.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // Verify OTP & Update Email
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNew = newEmailInput.trim().toLowerCase();
    const cleanOtp = emailOtp.trim();
    const cleanCurrent = currentPasswordInput.trim();

    if (!cleanOtp && !cleanCurrent) {
      setSecurityError("Please enter the 6-digit verification code from your email or your current password.");
      return;
    }

    try {
      setSecurityLoading(true);
      setSecurityError("");

      // 1. Server validation and database update
      const res = await fetch("/api/profile/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_and_update_email",
          userId: user.id,
          currentEmail: user.email,
          newEmail: cleanNew,
          teacherId: user.teacherId,
          otp: cleanOtp,
          currentPassword: cleanCurrent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update email address.");
      }

      // 2. Client auth update
      try {
        await supabase.auth.updateUser({ email: cleanNew });
      } catch (authErr) {
        console.warn("Client auth email update notice:", authErr);
      }

      // 3. Update auth context session
      updateUserEmail(cleanNew);
      await refreshSession();

      setSecuritySuccess(data.message || `Official faculty login email successfully updated to ${cleanNew}!`);
      setEmailOtp("");
      setNewEmailInput("");
      setCurrentPasswordInput("");
      setTimeout(() => {
        closeSecurityModal();
      }, 2000);
    } catch (err: any) {
      setSecurityError(err.message || "An error occurred while updating the email.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const itSupportGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=dumalnext@gmail.com&su=${encodeURIComponent(
    `Faculty Record Support Request - ${user.fullName} (${user.teacherId})`
  )}&body=${encodeURIComponent(
    `Faculty Name: ${user.fullName}\nTeacher ID: ${user.teacherId}\nDepartment: ${user.department}\nRegistered Email: ${user.email}\n\nDescribe your inquiry or requested profile adjustment:`
  )}`;

  return (
    <div className="space-y-6 font-sans">
      {/* Hidden 2x2 Photo File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* Top Banner & Quick Help Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-black text-[#002060] tracking-tight">
              Official Faculty Profile &amp; Credentials
            </h1>
            <p className="text-xs text-slate-500">
              Department of Education &bull; Dumalneg National High School Personnel Workstation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/schedule"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Teaching Load
          </Link>
          <Link
            href="/roster"
            className="px-3.5 py-2 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Class Advisory Roster</span>
          </Link>
        </div>
      </div>

      {/* Hero Profile Banner with 2x2 Photo and Edit Name Beside Name */}
      <div className="bg-gradient-to-br from-[#002060] via-[#002b80] to-[#0a1936] text-white rounded-xl p-5 sm:p-6 shadow-md border-t-4 border-amber-400 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            {/* 2x2 Official Faculty Photo Card / Avatar */}
            <div className="relative shrink-0 group">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.fullName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-amber-400 shadow-md bg-white ring-2 ring-white/20"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/10 border-2 border-white/30 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-inner">
                  {initials}
                </div>
              )}

              {/* Photo Overlay Upload Trigger */}
              <button
                type="button"
                onClick={handleTriggerFileInput}
                disabled={isUploadingPhoto}
                title="Upload / Change 2x2 Photo"
                className="absolute inset-0 bg-[#002060]/70 rounded-xl flex flex-col items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 text-center"
              >
                <svg className="w-4 h-4 mb-0.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{isUploadingPhoto ? "Processing..." : "Change"}</span>
              </button>
            </div>

            {/* Faculty Identity Details */}
            <div className="space-y-1">
              {/* Name & Edit Button Directly Beside Name */}
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user.fullName}
                </h2>

                {!isEditingName && (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-[#002060] text-xs font-bold transition-colors shadow-xs cursor-pointer rounded-[4px] shrink-0"
                    title="Edit Faculty Name"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Edit Faculty Name</span>
                  </button>
                )}

                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold uppercase rounded tracking-wider">
                  Verified Faculty
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-100">
                <span className="flex items-center gap-1">
                  <span className="text-amber-300 font-bold">Employee ID:</span>
                  <strong className="font-mono text-white tracking-wider">{user.teacherId}</strong>
                </span>
                <span className="hidden sm:inline text-blue-300/40">&bull;</span>
                <span className="flex items-center gap-1">
                  <span className="text-blue-200">Gmail:</span>
                  <span className="text-white font-medium">{user.email}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-blue-200">
                <span className="bg-white/10 px-2.5 py-0.5 rounded border border-white/10 font-semibold">
                  Department: {user.department}
                </span>
                {advisorySection && (
                  <span className="bg-amber-400/20 text-amber-200 px-2.5 py-0.5 rounded border border-amber-400/30 font-semibold">
                    Class Adviser: {advisorySection.name} (Grade {advisorySection.gradeLevel})
                  </span>
                )}
                <span className="bg-white/10 px-2.5 py-0.5 rounded border border-white/10">
                  Dumalneg NHS &bull; School ID: 300050
                </span>
              </div>
            </div>
          </div>

          {/* IT Support Contact Button */}
          <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t border-white/10 sm:border-t-0 pt-3 sm:pt-0">
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block mb-1">
              Need Help with your record?
            </span>
            <a
              href={itSupportGmailUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Open Gmail to email IT Support"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email IT Support Desk</span>
            </a>
          </div>
        </div>
      </div>

      {/* Global Success / Notice Banners */}
      {nameSaveSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-xs text-emerald-950 font-bold rounded-lg shadow-xs">
          {nameSaveSuccess}
        </div>
      )}

      {photoSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-xs text-emerald-950 font-bold rounded-lg shadow-xs">
          {photoSuccess}
        </div>
      )}

      {photoError && (
        <div className="p-4 bg-red-50 border-2 border-red-500 text-xs text-red-950 font-bold rounded-lg shadow-xs">
          {photoError}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABS NAVIGATION (IDENTICAL STYLING TO PROVIDED SCREENSHOT) */}
      {/* ========================================================================= */}
      <div className="flex border-b border-slate-200 bg-slate-100/70 px-2 pt-2 rounded-t-xl overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap text-xs font-bold touch-pan-x gap-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className={`py-3 px-4 rounded-t-lg whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === "personal"
              ? "bg-white text-[#002060] border-t border-l border-r border-slate-200 border-b-2 border-b-[#002060] shadow-xs -mb-[1px] z-10 font-black"
              : "border-b-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60 font-bold"
          }`}
        >
          <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Personal &amp; Institutional Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("teaching")}
          className={`py-3 px-4 rounded-t-lg whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === "teaching"
              ? "bg-white text-[#002060] border-t border-l border-r border-slate-200 border-b-2 border-b-[#002060] shadow-xs -mb-[1px] z-10 font-black"
              : "border-b-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60 font-bold"
          }`}
        >
          <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
          <span>Teaching Load &amp; Class Advisory</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`py-3 px-4 rounded-t-lg whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === "security"
              ? "bg-white text-[#002060] border-t border-l border-r border-slate-200 border-b-2 border-b-[#002060] shadow-xs -mb-[1px] z-10 font-black"
              : "border-b-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60 font-bold"
          }`}
        >
          <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Account Credentials &amp; Security</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT PANELS */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 border-2 border-slate-200 rounded-b-lg shadow-xs space-y-6">
        {/* ======================================================================= */}
        {/* TAB 1: PERSONAL & INSTITUTIONAL DETAILS */}
        {/* ======================================================================= */}
        {activeTab === "personal" && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                  Academic Staff Verification Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official DepEd personnel record for Dumalneg National High School.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-900 text-xs font-bold border border-emerald-300 rounded-[4px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Verified Institutional Faculty
                </span>
              </div>
            </div>

            {/* 2x2 Teacher Photo Upload Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
              <div className="relative shrink-0">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt="2x2 Official Faculty ID"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover border-2 border-[#002060] rounded-lg shadow-xs bg-white"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-blue-100/70 border-2 border-[#002060] flex flex-col items-center justify-center font-black text-xl text-[#002060] shadow-xs">
                    <span>{initials}</span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-500 font-sans mt-1">
                      No Photo
                    </span>
                  </div>
                )}
                <span className="absolute -bottom-2 -right-2 bg-amber-400 text-[#002060] text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                  2x2 Photo
                </span>
              </div>

              <div className="space-y-1 text-xs flex-1 text-center sm:text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Official 2x2 ID Photo
                </span>
                <span className="font-bold text-slate-900 block text-sm">
                  Certified Faculty Photo On File
                </span>
                <p className="text-[11px] text-slate-500">
                  Required for institutional faculty ID card, official class advisory listings, and DepEd compliance records.
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    disabled={isUploadingPhoto}
                    className="px-3 py-1.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>{isUploadingPhoto ? "Uploading Photo..." : "Upload 2x2 Photo"}</span>
                  </button>

                  {user.photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isUploadingPhoto}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* In-Line Edit Faculty Name Box (When Active) */}
            {isEditingName && (
              <div className="p-5 bg-blue-50/60 border-2 border-[#002060] rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <span className="text-xs font-mono font-bold text-[#002060] uppercase">
                    MODIFY OFFICIAL FACULTY NAME
                  </span>
                  <span className="text-[11px] font-mono text-slate-600">
                    Real-time synchronization across Admin, Teacher, &amp; Student Portals
                  </span>
                </div>

                {nameSaveError && (
                  <div className="p-3 bg-red-100 border border-red-400 text-xs text-red-950 font-bold rounded">
                    {nameSaveError}
                  </div>
                )}

                <form onSubmit={handleSaveName} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                        First Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        required
                        placeholder="e.g. Juan"
                        className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                        Middle Name <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={editMiddleName}
                        onChange={(e) => setEditMiddleName(e.target.value)}
                        placeholder="e.g. Reyes"
                        className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                        Last Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        required
                        placeholder="e.g. Dela Cruz"
                        className="w-full p-2.5 bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-[#002060] rounded outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSavingName}
                      className="px-5 py-2 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer rounded disabled:opacity-50"
                    >
                      {isSavingName ? "Saving Name..." : "Save Updated Name"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSavingName}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Verification Details Grid (6 Cards, including Password in place of DepEd Workload) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Card 1: Faculty Full Name with Edit Button */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500 uppercase block">
                    Faculty Full Name
                  </span>
                  {!isEditingName && (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-[11px] font-bold text-[#002060] hover:text-blue-900 underline cursor-pointer"
                    >
                      Edit Name
                    </button>
                  )}
                </div>
                <strong className="text-sm text-slate-900 block">{user.fullName}</strong>
                <span className="text-[10px] text-slate-500 block">
                  Official Institutional Teaching Name
                </span>
              </div>

              {/* Card 2: Faculty Employee ID */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-mono text-slate-500 uppercase block">
                  Faculty Employee ID
                </span>
                <strong className="text-sm font-mono text-[#002060] block">{user.teacherId}</strong>
                <span className="text-[10px] text-slate-500 block">
                  Assigned Personnel Identifier &bull; Dumalneg NHS
                </span>
              </div>

              {/* Card 3: Department Affiliation */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-mono text-slate-500 uppercase block">
                  Department Affiliation
                </span>
                <strong className="text-sm text-slate-900 block">{user.department}</strong>
                <p className="text-[10px] text-slate-500">
                  {user.department === "JHS" && "Junior High School (Grades 7-10) Specialist"}
                  {user.department === "SHS" && "Senior High School (Grades 11-12) Specialist"}
                  {user.department === "CROSS_LEVEL" &&
                    "Authorized Cross-Level Instruction (Junior & Senior High School)"}
                </p>
              </div>

              {/* Card 4: Verified Gmail Address with Change Email Button */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500 uppercase block">
                    Verified Gmail Address
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold uppercase rounded">
                    Verified
                  </span>
                </div>
                <strong className="text-sm font-mono text-slate-900 block truncate">
                  {user.email}
                </strong>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Need to update email?</span>
                  <button
                    type="button"
                    onClick={openEmailModal}
                    className="px-2.5 py-1 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-3 h-3 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Change Email</span>
                  </button>
                </div>
              </div>

              {/* Card 5: School Affiliation */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-mono text-slate-500 uppercase block">
                  School Affiliation
                </span>
                <strong className="text-sm text-slate-900 block">Dumalneg National High School</strong>
                <p className="text-[10px] text-slate-500">
                  School ID: 300050 &bull; Region I &bull; SDO Ilocos Norte
                </p>
              </div>

              {/* Card 6: Account Password & Security (REPLACING DepEd Workload Compliance) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500 uppercase block">
                    Account Password &amp; Security
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold uppercase rounded">
                    Protected
                  </span>
                </div>
                <strong className="text-sm font-mono tracking-widest text-slate-700 block">
                  &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
                </strong>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Want to change password?</span>
                  <button
                    type="button"
                    onClick={openPasswordModal}
                    className="px-2.5 py-1 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-3 h-3 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Change Password</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: TEACHING LOAD & CLASS ADVISORY */}
        {/* ======================================================================= */}
        {activeTab === "teaching" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                Official Teaching Load &amp; Advisory Assignment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Instructional allocations, section advisership, and schedule compliance under Dumalneg National High School.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Class Advisory Section */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Official Advisory Section
                  </span>
                  <span className="text-[10px] bg-blue-100 text-[#002060] px-2 py-0.5 font-bold uppercase rounded">
                    Assigned
                  </span>
                </div>

                {isLoadingSection ? (
                  <p className="text-xs text-slate-500 font-mono">Loading Advisory Assignment...</p>
                ) : advisorySection ? (
                  <div className="space-y-1.5">
                    <span className="text-lg font-black text-[#002060] block">
                      Section {advisorySection.name}
                    </span>
                    <p className="text-xs text-slate-600 font-medium">
                      Grade {advisorySection.gradeLevel} {advisorySection.strand ? `(${advisorySection.strand})` : ""}
                    </p>
                    {advisorySection.roomNumber && (
                      <p className="text-[11px] text-slate-500">
                        Designated Room: {advisorySection.roomNumber}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-slate-700 block">
                      No Advisory Section Designated
                    </span>
                    <p className="text-xs text-slate-500">
                      Subject teacher specialist or pending advisory assignment for the current term.
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">View enrolled students:</span>
                  <Link
                    href="/roster"
                    className="px-3 py-1.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Open Advisory Roster
                  </Link>
                </div>
              </div>

              {/* Card 2: DepEd Workload Compliance */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    DepEd Workload Compliance
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold uppercase rounded">
                    Compliant
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-lg font-black text-[#002060] block">
                    30 Hours / Week Maximum
                  </span>
                  <p className="text-xs text-slate-600">
                    Teaching load governed by DepEd Order on Teaching Load Deconfliction and Faculty Welfare.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Department: {user.department} Specialist
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">View weekly timetable:</span>
                  <Link
                    href="/schedule"
                    className="px-3 py-1.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    View Teaching Schedule
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: ACCOUNT CREDENTIALS & SECURITY */}
        {/* ======================================================================= */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#002060] uppercase tracking-wider">
                Faculty Account Credentials &amp; Security
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your login credentials, password, and registered Gmail address with fast security verification.
              </p>
            </div>

            {/* Self-Service Credentials Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Registered Login Email */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Registered Faculty Login Email
                  </span>
                  <span className="text-[10px] bg-blue-100 text-[#002060] px-2 py-0.5 font-bold uppercase rounded">
                    Verified
                  </span>
                </div>

                <div>
                  <span className="text-sm font-bold text-slate-900 block truncate font-mono">
                    {user.email}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Used for workstation session authentication, official school transmissions, and security verification codes.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Need to change your email?</span>
                  <button
                    type="button"
                    onClick={openEmailModal}
                    className="px-3 py-1.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Change Email</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Account Password */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Faculty Account Password
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold uppercase rounded">
                    Protected
                  </span>
                </div>

                <div>
                  <span className="text-sm font-mono tracking-widest font-black text-slate-700 block">
                    &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Protects student grades, confidential advisory rosters, and institutional access in compliance with DepEd security policies.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Want to change your password?</span>
                  <button
                    type="button"
                    onClick={openPasswordModal}
                    className="px-3 py-1.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Change Password</span>
                  </button>
                </div>
              </div>
            </div>

            {/* System ID & Session Info */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Faculty Account Database ID
                </span>
                <span className="text-sm font-mono font-bold text-[#002060] block mt-0.5">
                  {user.id}
                </span>
              </div>
              <div className="text-xs text-slate-500 sm:text-right">
                <span>DepEd Personnel Status: </span>
                <span className="font-bold text-emerald-700">Verified &bull; Active Faculty</span>
              </div>
            </div>

            {/* Self-Service Security Policy Box */}
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#002060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-bold text-[#002060] uppercase tracking-wider">
                  Self-Service Security Policy
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Since you are already signed in to your verified faculty workstation, <strong>you do not need to contact IT Support</strong> to change your password or Gmail address. You can update them directly using the self-service controls above with instant one-time verification.
              </p>
              <p className="text-[11px] text-slate-500">
                Notice: Contacting the IT Support Desk (<code>dumalnext@gmail.com</code>) is only required if you are locked out outside the portal at the login screen.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CHANGE PASSWORD (STRICTLY ENGLISH & FAST VERIFICATION) */}
      {/* ========================================================================= */}
      {securityModal === "password" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border-t-4 border-[#002060] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[#002060] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-sm font-bold tracking-tight">
                  Change Faculty Password
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSecurityModal}
                disabled={securityLoading}
                className="text-slate-300 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Error Message */}
              {securityError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900 flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{securityError}</span>
                </div>
              )}

              {/* Success Message */}
              {securitySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 flex items-start gap-2 font-medium">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{securitySuccess}</span>
                </div>
              )}

              {/* Step 1: Send / Generate OTP */}
              {securityStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 block">Registered Faculty Account:</span>
                    <strong className="font-mono text-sm text-[#002060] block">{user.email}</strong>
                    <p className="text-[11px] text-slate-500 mt-1">
                      A 6-digit one-time verification code will be dispatched to your registered email to authorize this change.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendPasswordOtp}
                    disabled={securityLoading}
                    className="w-full py-2.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {securityLoading ? "Dispatching 6-Digit Code..." : "Send Verification Code"}
                  </button>
                </div>
              )}

              {/* Step 2: Enter Verification & New Password */}
              {securityStep === 2 && (
                <form onSubmit={handleUpdatePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      6-Digit Verification Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={passwordOtp}
                      onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-center font-mono font-black text-xl tracking-widest text-[#002060] focus:border-[#002060] outline-none"
                      required
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>Check your email inbox or spam folder</span>
                      <button
                        type="button"
                        onClick={handleSendPasswordOtp}
                        disabled={securityLoading}
                        className="text-[#002060] font-bold hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:border-[#002060] outline-none pr-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-slate-800 font-bold"
                      >
                        {showNewPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:border-[#002060] outline-none pr-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-slate-800 font-bold"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={securityLoading}
                      className="flex-1 py-2.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {securityLoading ? "Updating Password..." : "Update Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecurityStep(1)}
                      disabled={securityLoading}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHANGE EMAIL (STRICTLY ENGLISH & FAST VERIFICATION) */}
      {/* ========================================================================= */}
      {securityModal === "email" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border-t-4 border-[#002060] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[#002060] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-sm font-bold tracking-tight">
                  Change Faculty Login Email
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSecurityModal}
                disabled={securityLoading}
                className="text-slate-300 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Error Message */}
              {securityError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900 flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{securityError}</span>
                </div>
              )}

              {/* Success Message */}
              {securitySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 flex items-start gap-2 font-medium">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{securitySuccess}</span>
                </div>
              )}

              {/* Step 1: Input New Email & Generate OTP */}
              {securityStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 block">Current Registered Email:</span>
                    <strong className="font-mono text-sm text-[#002060] block">{user.email}</strong>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      New Gmail Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      placeholder="e.g. juan.delacruz@gmail.com"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:border-[#002060] outline-none"
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      A 6-digit one-time verification code will be dispatched to this new email to verify ownership.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={securityLoading}
                    className="w-full py-2.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {securityLoading ? "Dispatching 6-Digit Code..." : "Send Verification Code"}
                  </button>
                </div>
              )}

              {/* Step 2: Enter Verification Code or Current Password */}
              {securityStep === 2 && (
                <form onSubmit={handleUpdateEmail} className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-950 space-y-1">
                    <span className="font-bold block">New Email Destination:</span>
                    <strong className="font-mono text-xs text-[#002060] block">{newEmailInput.trim()}</strong>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      6-Digit Verification Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-center font-mono font-black text-xl tracking-widest text-[#002060] focus:border-[#002060] outline-none"
                      required
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>Check your new email inbox or spam folder</span>
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        disabled={securityLoading}
                        className="text-[#002060] font-bold hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Or Confirm with Current Password <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="password"
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Enter current password if preferred"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:border-[#002060] outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={securityLoading}
                      className="flex-1 py-2.5 bg-[#002060] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {securityLoading ? "Updating Email..." : "Confirm & Update Email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecurityStep(1)}
                      disabled={securityLoading}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
