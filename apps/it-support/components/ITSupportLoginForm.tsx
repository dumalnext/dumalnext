"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useITSupportAuth } from "@/lib/auth/itSupportAuthContext";

interface ITSupportInvitation {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  department?: string;
  status: string;
  expiresAt: string;
}

function ITSupportLoginFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { login, demoLogin, refreshSession } = useITSupportAuth();

  // Standard Login State
  const [identifier, setIdentifier] = useState("dumalnext@gmail.com");
  const [password, setPassword] = useState("dumalNext26.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Invitation Onboarding State
  const [isCheckingToken, setIsCheckingToken] = useState<boolean>(Boolean(token));
  const [invitation, setInvitation] = useState<ITSupportInvitation | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Create Password State (for invited IT personnel only)
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [department, setDepartment] = useState<string>("System Administrator");
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Validate Token if present in query params
  useEffect(() => {
    if (!token) {
      setIsCheckingToken(false);
      return;
    }

    const validateToken = async () => {
      setIsCheckingToken(true);
      try {
        let res = await fetch(`/api/it-support/invitations?token=${encodeURIComponent(token)}`);
        if (res.status === 404) {
          res = await fetch(`/api/invitations?token=${encodeURIComponent(token)}`);
        }
        const json = await res.json();
        if (res.ok && json.valid && json.invitation) {
          if (json.invitation.role === "it_support") {
            setInvitation(json.invitation);
            if (json.invitation.fullName) setFullName(json.invitation.fullName);
            if (json.invitation.department) setDepartment(json.invitation.department);
          } else {
            setInviteError(`This invitation link is issued for role "${json.invitation.role.toUpperCase()}". Please open the link corresponding to your designated role.`);
          }
        } else {
          setInviteError(json.error || "This IT Support invitation link is invalid or has expired.");
        }
      } catch (err: any) {
        setInviteError("Network error validating IT Support invitation link.");
      } finally {
        setIsCheckingToken(false);
      }
    };

    validateToken();
  }, [token]);

  // Handle Create Password & Activate Account
  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invitation) return;

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters in length.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsActivating(true);
    setErrorMessage("");

    try {
      const payload = {
        token,
        password: newPassword,
        firstName: fullName.split(" ")[0] || "",
        lastName: fullName.split(" ").slice(1).join(" ") || "",
        department,
      };

      let res = await fetch("/api/it-support/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 404) {
        res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (res.ok && json.success) {
        setActivationSuccess("IT Support account created and activated successfully! Entering IT Support Console...");
        if (json.cookieName && json.sessionUser) {
          const serialized = encodeURIComponent(JSON.stringify(json.sessionUser));
          document.cookie = `${json.cookieName}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
        }

        setTimeout(async () => {
          await refreshSession();
          window.location.href = json.redirectUrl || "/";
        }, 1200);
      } else {
        setErrorMessage(json.error || "Failed to activate your IT Support account.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error activating account.");
    } finally {
      setIsActivating(false);
    }
  };

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

  if (isCheckingToken) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white border-4 border-[#002060] text-center font-sans space-y-2 shadow-md">
        <span className="text-[10px] font-mono font-bold tracking-widest text-[#002060] uppercase block">
          PORTAL 04 &bull; RESTRICTED PERIMETER
        </span>
        <h2 className="text-sm font-bold text-slate-900 uppercase">
          Verifying IT Support Clearance...
        </h2>
        <p className="text-xs text-slate-500">Authenticating invitation token...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 sm:p-8 bg-white border-4 border-[#002060] shadow-md font-sans">
      <div className="border-b-2 border-slate-300 pb-4 mb-6 text-center">
        <span className="text-[10px] font-mono font-bold tracking-widest text-[#002060] uppercase block">
          PORTAL 04 &bull; RESTRICTED PERIMETER
        </span>
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-1">
          {invitation ? "IT Support Onboarding & Setup" : "IT Support Authentication Desk"}
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          {invitation
            ? "Your IT Support invitation has been verified. Create your master password below to activate your system clearance."
            : <>Restricted to authorized system administrator email: <strong className="text-[#002060]">dumalnext@gmail.com</strong></>}
        </p>
      </div>

      {inviteError && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 text-xs font-bold text-red-800">
          [ INVITATION NOTICE ]: {inviteError}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 text-xs font-bold text-red-800">
          [ AUTHENTICATION ERROR ]: {errorMessage}
        </div>
      )}

      {activationSuccess && (
        <div className="mb-4 p-3 bg-green-50 border-2 border-green-600 text-xs font-bold text-green-950 font-mono">
          [ STATUS ]: {activationSuccess}
        </div>
      )}

      {/* CASE 1: INVITATION VERIFIED -> SHOW CREATE PASSWORD FORM */}
      {invitation ? (
        <form onSubmit={handleActivateAccount} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase text-slate-800 mb-1">
              Authorized IT Email
            </label>
            <input
              type="email"
              value={invitation.email}
              disabled
              className="w-full p-2.5 bg-slate-100 border-2 border-slate-300 font-mono text-slate-700 cursor-not-allowed select-all"
            />
            <p className="text-[10px] font-mono text-slate-500 mt-1">
              Locked: System access will be bound to this verified email address.
            </p>
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-800 mb-1">
              Full Name / IT Personnel Label
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 font-bold text-slate-900 focus:bg-white focus:border-[#002060] outline-none"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-800 mb-1">
              System Administration Designation
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 font-bold text-slate-900 focus:bg-white focus:border-[#002060] outline-none"
            >
              <option value="System Administrator">System Administrator</option>
              <option value="Database Operations Specialist">Database Operations Specialist</option>
              <option value="Network &amp; Security Support">Network &amp; Security Support</option>
              <option value="IT Operations Desk">IT Operations Desk</option>
            </select>
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-800 mb-1">
              Create Master Security Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter minimum 6 characters"
              className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 font-mono text-slate-900 focus:bg-white focus:border-[#002060] outline-none"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-800 mb-1">
              Confirm Security Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 font-mono text-slate-900 focus:bg-white focus:border-[#002060] outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isActivating || Boolean(activationSuccess)}
              className="w-full py-3 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isActivating ? "[ ACTIVATING CLEARANCE... ]" : "[ ACTIVATE IT SUPPORT ACCOUNT & LOG IN ]"}
            </button>
          </div>
        </form>
      ) : (
        /* CASE 2: NORMAL LOGIN FORM (WHEN NO INVITE TOKEN IS PRESENT) */
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
            className="w-full py-3 bg-[#002060] hover:bg-[#001845] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "[ Verifying Credentials... ]" : "[ Authenticate IT Support Session ]"}
          </button>

          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleDemoFill}
              disabled={isSubmitting}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 border-2 border-slate-400 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors font-mono cursor-pointer"
            >
              [ Quick Sign-In: dumalnext@gmail.com ]
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ITSupportLoginForm() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto p-8 bg-white border-4 border-[#002060] text-center font-sans space-y-2 shadow-md">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#002060] uppercase block">
            PORTAL 04 &bull; RESTRICTED PERIMETER
          </span>
          <p className="text-xs text-slate-500">Loading IT Support Authentication Desk...</p>
        </div>
      }
    >
      <ITSupportLoginFormInner />
    </Suspense>
  );
}
