"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface InvitationData {
  id?: string;
  email: string;
  role: "teacher" | "admin" | "it_support";
  fullName?: string;
  department?: string;
  status?: string;
}

const CURRENT_PORTAL_ROLE: string = "it_support";
const CURRENT_PORTAL_NAME: string = "IT Support & Systems Desk";
const CURRENT_PORTAL_TITLE: string = "Infrastructure Workstation";
const CURRENT_PORTAL_THEME_FROM: string = "from-indigo-900";
const CURRENT_PORTAL_THEME_TO: string = "to-slate-950";
const DEFAULT_REDIRECT_PATH: string = "/";

function getRoleMeta(role: string) {
  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  switch (role) {
    case "teacher":
      return {
        role: "teacher",
        name: "Teacher / Faculty Member",
        portalName: "Teacher Portal",
        url: isLocal ? "http://localhost:3001" : "https://dumalnext-teacher.vercel.app",
        badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
        redirectUrl: "/roster",
      };
    case "admin":
      return {
        role: "admin",
        name: "School Administrator",
        portalName: "Admin Portal",
        url: isLocal ? "http://localhost:3000" : "https://dumalnext-admin.vercel.app",
        badgeColor: "bg-blue-100 text-[#002060] border-blue-300",
        redirectUrl: "/adjudication",
      };
    case "it_support":
    default:
      return {
        role: "it_support",
        name: "IT Support & Systems Desk",
        portalName: "IT Support Portal",
        url: isLocal ? "http://localhost:3003" : "https://dumalnext-it-support.vercel.app",
        badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
        redirectUrl: "/",
      };
  }
}

function AcceptInviteContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const code = searchParams.get("code");

  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cross-portal error trapping state
  const [wrongPortalMeta, setWrongPortalMeta] = useState<ReturnType<typeof getRoleMeta> | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ message: string; redirectUrl: string } | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      try {
        // 1. Check for error description in hash (e.g. Supabase link expired or invalid)
        if (typeof window !== "undefined" && window.location.hash.includes("error_description")) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const errDesc = hashParams.get("error_description");
          if (errDesc) {
            if (isMounted) {
              setErrorMessage(decodeURIComponent(errDesc.replace(/\+/g, " ")));
              setIsLoading(false);
            }
            return;
          }
        }

        // 2. If PKCE code is present in query parameters, exchange it for session
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch (codeErr) {
            console.warn("exchangeCodeForSession notice:", codeErr);
          }
        }

        let sessionUser: any = null;

        // 3. Check for access_token in URL hash (#access_token=...&refresh_token=...)
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          try {
            const hashStr = window.location.hash.replace(/^#/, "");
            const hashParams = new URLSearchParams(hashStr);
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");

            if (accessToken) {
              // A. Explicitly establish session in Supabase Auth client
              try {
                const { data: setRes } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || "",
                });
                if (setRes?.user) {
                  sessionUser = setRes.user;
                } else if (setRes?.session?.user) {
                  sessionUser = setRes.session.user;
                }
              } catch (setErr) {
                console.warn("setSession error:", setErr);
              }

              // B. Fallback: Decode JWT directly to guarantee user info is extracted immediately
              if (!sessionUser && accessToken.includes(".")) {
                try {
                  const base64Url = accessToken.split(".")[1];
                  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                  const jsonPayload = decodeURIComponent(
                    atob(base64)
                      .split("")
                      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                      .join("")
                  );
                  const payload = JSON.parse(jsonPayload);
                  if (payload && payload.email) {
                    sessionUser = {
                      id: payload.sub,
                      email: payload.email,
                      user_metadata: payload.user_metadata || {},
                      app_metadata: payload.app_metadata || {},
                    };
                  }
                } catch (decodeErr) {
                  console.warn("JWT parse notice:", decodeErr);
                }
              }
            }
          } catch (hashErr) {
            console.warn("hash parsing error:", hashErr);
          }
        }

        // 4. If not populated from hash, check existing Supabase Auth Session
        if (!sessionUser) {
          const { data: sessionData } = await supabase.auth.getSession();
          sessionUser = sessionData?.session?.user;
        }

        // 5. Fallback check for auth.getUser()
        if (!sessionUser) {
          try {
            const { data: authData } = await supabase.auth.getUser();
            sessionUser = authData?.user;
          } catch {}
        }

        // SCENARIO 1: We have an authenticated sessionUser (from Email Click or Active Session)
        if (sessionUser) {
          let metaRole = (
            sessionUser.user_metadata?.role ||
            sessionUser.user_metadata?.user_role ||
            sessionUser.app_metadata?.role ||
            ""
          ).toLowerCase();

          const userEmail = sessionUser.email || "";

          // Fetch stored invitation by email if needed for role or department
          let dbInvitation: InvitationData | null = null;
          if (userEmail) {
            try {
              let res = await fetch(`/api/it-support/invitations?email=${encodeURIComponent(userEmail)}`);
              if (res.status === 404) {
                res = await fetch(`/api/invitations?email=${encodeURIComponent(userEmail)}`);
              }
              const json = await res.json();
              if (json.valid && json.invitation) {
                dbInvitation = json.invitation;
                if (!metaRole) {
                  metaRole = (json.invitation.role || "").toLowerCase();
                }
              }
            } catch {}
          }

          // ERROR TRAPPING: If the user role does not belong to this portal, route them!
          if (metaRole && metaRole !== CURRENT_PORTAL_ROLE) {
            const targetMeta = getRoleMeta(metaRole);
            if (isMounted) {
              setWrongPortalMeta(targetMeta);
              setIsLoading(false);
            }
            // Auto redirect after 2.5 seconds
            setTimeout(() => {
              if (typeof window !== "undefined") {
                window.location.href = `${targetMeta.url}/accept-invite${window.location.hash || window.location.search}`;
              }
            }, 2500);
            return;
          }

          // User is on the correct portal!
          if (isMounted) {
            setAuthUserId(sessionUser.id);
            const rawName = dbInvitation?.fullName || sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.fullName || "";
            const parts = rawName.split(" ");
            const fName = parts[0] || "";
            const lName = parts.slice(1).join(" ") || "";
            const defaultDept = CURRENT_PORTAL_ROLE === "teacher" ? "Junior High School (JHS)" : CURRENT_PORTAL_ROLE === "admin" ? "Administrator" : "IT-support";
            const dept = dbInvitation?.department || sessionUser.user_metadata?.department || defaultDept;

            setInvitation({
              email: userEmail,
              role: CURRENT_PORTAL_ROLE as any,
              fullName: rawName,
              department: dept,
            });
            setFirstName(fName);
            setLastName(lName);
            setDepartment(dept);
            setIsLoading(false);
          }
          return;
        }

        // SCENARIO 2: If no active session, check if a token query parameter was supplied (?token=...)
        if (token) {
          let res = await fetch(`/api/it-support/invitations?token=${encodeURIComponent(token)}`);
          if (res.status === 404) {
            res = await fetch(`/api/invitations?token=${encodeURIComponent(token)}`);
          }

          const json = await res.json();
          if (json.valid && json.invitation) {
            const tokenRole = (json.invitation.role || "").toLowerCase();

            // ERROR TRAPPING: If token role does not match current portal, redirect to correct portal
            if (tokenRole && tokenRole !== CURRENT_PORTAL_ROLE) {
              const targetMeta = getRoleMeta(tokenRole);
              if (isMounted) {
                setWrongPortalMeta(targetMeta);
                setIsLoading(false);
              }
              setTimeout(() => {
                if (typeof window !== "undefined") {
                  window.location.href = `${targetMeta.url}/accept-invite?token=${encodeURIComponent(token)}`;
                }
              }, 2500);
              return;
            }

            if (isMounted) {
              setInvitation(json.invitation);
              if (json.invitation.fullName) {
                const parts = json.invitation.fullName.split(" ");
                setFirstName(parts[0] || "");
                setLastName(parts.slice(1).join(" ") || "");
              }
              const defaultDept = CURRENT_PORTAL_ROLE === "teacher" ? "Junior High School (JHS)" : CURRENT_PORTAL_ROLE === "admin" ? "Administrator" : "IT-support";
              setDepartment(json.invitation.department || defaultDept);
              setIsLoading(false);
            }
            return;
          } else {
            if (isMounted) {
              setErrorMessage(json.error || "This invitation link is invalid or has expired.");
              setIsLoading(false);
            }
            return;
          }
        }

        // Neither session nor token found
        if (isMounted) {
          setErrorMessage("No invitation session or token found. Please open the 'Accept invitation' link sent to your email by Dumalneg National High School.");
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage("Network error verifying your invitation credentials.");
          setIsLoading(false);
        }
      }
    };

    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [token, code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters in length.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Update password in Supabase Auth if session exists
      try {
        await supabase.auth.updateUser({ password });
      } catch {}

      // 2. Call backend accept API to ensure public tables are updated
      const payload = {
        token: token || undefined,
        email: invitation.email,
        userId: authUserId || undefined,
        role: CURRENT_PORTAL_ROLE,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        department: department.trim(),
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

      if (json.success) {
        if (json.cookieName && json.sessionUser) {
          const serialized = encodeURIComponent(JSON.stringify(json.sessionUser));
          document.cookie = `${json.cookieName}=${serialized}; path=/; max-age=604800; SameSite=Lax`;
        }

        const targetUrl = json.redirectUrl || DEFAULT_REDIRECT_PATH;
        setSuccessInfo({
          message: "Account created and activated successfully! Redirecting you to your workstation...",
          redirectUrl: targetUrl,
        });

        setTimeout(() => {
          window.location.href = targetUrl;
        }, 1500);
      } else {
        setErrorMessage(json.error || "Failed to activate your account. Please try again or contact IT Support.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error activating account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#002060] p-8 text-center space-y-3 shadow-sm max-w-md w-full">
          <div className="w-10 h-10 rounded-full border-2 border-[#002060] border-t-amber-400 animate-spin mx-auto" />
          <span className="text-xs uppercase font-bold text-[#002060] tracking-wider block">
            Verifying Invitation Credentials
          </span>
          <p className="text-xs text-slate-500">Connecting to Dumalneg NHS Identity Service...</p>
        </div>
      </div>
    );
  }

  // SCENARIO A: CROSS-PORTAL ERROR TRAPPING ACTIVATED
  if (wrongPortalMeta) {
    const targetUrl = `${wrongPortalMeta.url}/accept-invite${typeof window !== "undefined" ? (window.location.hash || window.location.search) : ""}`;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full mx-auto bg-white rounded-xl border-2 border-amber-400 p-8 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl font-bold font-mono">
            !
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-amber-800 tracking-wider block">
              CROSS-PORTAL ROLE GUARD &bull; ERROR TRAPPING
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Designated Role: {wrongPortalMeta.name}
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your invitation is officially designated for the <strong>{wrongPortalMeta.portalName}</strong>. 
            You are currently accessing the {CURRENT_PORTAL_NAME} portal.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold rounded-lg">
            Automatically redirecting to {wrongPortalMeta.portalName}...
          </div>
          <a
            href={targetUrl}
            className="inline-block w-full py-2.5 bg-[#002060] hover:bg-blue-950 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs transition-colors"
          >
            Proceed to {wrongPortalMeta.portalName}
          </a>
        </div>
      </div>
    );
  }

  // SCENARIO B: ERROR OR INVALID TOKEN
  if (errorMessage && !invitation) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full mx-auto bg-white rounded-xl border border-slate-200 border-t-4 border-t-red-600 shadow-md overflow-hidden">
          <div className="bg-red-800 text-white p-5 text-center">
            <span className="text-[10px] font-bold tracking-widest uppercase text-red-200 block">
              Access Restricted
            </span>
            <h1 className="text-base font-extrabold tracking-wide mt-0.5">
              Invitation Invalid or Expired
            </h1>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 leading-relaxed">
              {errorMessage}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please check your email and click the official <strong>Accept invitation</strong> button, or contact Dumalneg NHS IT Support to issue a new invitation.
            </p>
            <div className="pt-3 border-t border-slate-200 flex justify-center">
              <Link
                href="/"
                className="text-xs font-bold text-[#002060] hover:underline flex items-center gap-1"
              >
                <span>Return to Portal Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roleMeta = getRoleMeta(CURRENT_PORTAL_ROLE);

  // SCENARIO C: REGISTRATION FORM ON CORRECT PORTAL
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-lg w-full mx-auto space-y-6">
        {/* DepEd Official Strip */}
        <div className="text-center space-y-2">
          <img
            src="/dumalneg-logo.png"
            alt="Dumalneg National High School Seal"
            className="w-16 h-16 rounded-full object-cover bg-white p-1 shadow-md border-2 border-amber-400 mx-auto"
          />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            DepEd Region I &bull; SDO Ilocos Norte &bull; Dumalneg NHS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002060] tracking-tight">
            Official Staff Onboarding &amp; Password Setup
          </h1>
        </div>

        {/* Success Banner */}
        {successInfo && (
          <div className="bg-emerald-50 border border-emerald-300 border-l-4 border-l-emerald-600 rounded-lg p-4 text-xs font-semibold text-emerald-950 space-y-1.5 shadow-xs">
            <div className="font-bold uppercase tracking-wider text-emerald-800">Account Activated</div>
            <div>{successInfo.message}</div>
            <div className="text-[11px] text-emerald-700">
              Redirecting to: {successInfo.redirectUrl}
            </div>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-300 border-l-4 border-l-red-600 rounded-lg p-3.5 text-xs font-semibold text-red-900">
            {errorMessage}
          </div>
        )}

        {/* Onboarding Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
          {/* Card Header */}
          <div className={`bg-gradient-to-r ${CURRENT_PORTAL_THEME_FROM} ${CURRENT_PORTAL_THEME_TO} text-white p-5 border-b-4 border-amber-400`}>
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300 block">
              Official Invitation Verified &bull; {CURRENT_PORTAL_TITLE}
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
              <span className="text-base font-extrabold tracking-tight">
                Setup Credentials: {CURRENT_PORTAL_NAME}
              </span>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase border rounded-full ${roleMeta.badgeColor}`}>
                Role: {CURRENT_PORTAL_ROLE}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
            {/* Email Address (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Authorized Staff Email (Locked)
              </label>
              <input
                type="text"
                readOnly
                value={invitation?.email || ""}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-medium select-all cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                This account is permanently tied to this verified email address.
              </span>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Santos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none"
                />
              </div>
            </div>

            {/* Department / Position */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Department / Position
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none"
              />
            </div>

            {/* Password Fields */}
            <div className="space-y-3.5 pt-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Create Account Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 hover:text-[#002060] px-1.5 py-0.5 cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Password <span className="text-red-600">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-[#002060] focus:ring-2 focus:ring-[#002060]/15 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting || !!successInfo}
                className="w-full py-3 px-4 rounded-lg bg-[#002060] hover:bg-[#001744] disabled:bg-slate-400 text-white text-xs font-bold tracking-wide transition-colors cursor-pointer shadow-sm"
              >
                {isSubmitting
                  ? "Activating Account & Setting Password..."
                  : "Create Password & Activate Account Access"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500">
          Dumalneg National High School &bull; Staff Identity &amp; Access Onboarding
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-xs font-semibold text-[#002060]">
          Loading Staff Onboarding Page...
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
