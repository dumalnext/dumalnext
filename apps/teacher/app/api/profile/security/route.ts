import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { sendFacultySecurityOtpEmail } from "@/lib/emailDispatcher";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key);
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "";
  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name[0]}${"*".repeat(Math.max(name.length - 2, 3))}${name[name.length - 1]}@${domain}`;
}

async function getStoredOtps(supabase: any): Promise<any[]> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "credential_otps")
      .maybeSingle();

    if (data && data.value && Array.isArray(data.value.otps)) {
      return data.value.otps;
    }
    return [];
  } catch {
    return [];
  }
}

async function saveStoredOtps(supabase: any, otps: any[]): Promise<boolean> {
  try {
    const valid = otps.filter((o) => Date.now() < o.expiresAt);
    const { error } = await supabase.from("system_settings").upsert({
      key: "credential_otps",
      value: { otps: valid },
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

// POST: Faculty Security Credential Management (Password & Email modification with 6-digit OTP)
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client is currently unavailable." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    const body = await req.json();
    const { action } = body;

    // --------------------------------------------------------------------------
    // ACTION 1: SEND OTP FOR PASSWORD CHANGE
    // --------------------------------------------------------------------------
    if (action === "send_password_otp") {
      const userId = String(body.userId || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const facultyName = String(body.facultyName || "Faculty Member").trim();

      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { error: "A valid registered faculty email address is required." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // 1. Dispatch OTP via Supabase Auth service
      if (supabaseUrl && supabaseAnonKey) {
        try {
          await fetch(`${supabaseUrl}/auth/v1/otp`, {
            method: "POST",
            headers: {
              apikey: supabaseAnonKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, create_user: false }),
          });
        } catch (authErr: any) {
          console.warn("Notice: Supabase Auth OTP fetch error:", authErr?.message);
        }
      }

      // 2. Generate local 6-digit numeric OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins validity

      const currentOtps = await getStoredOtps(supabase);
      const filtered = currentOtps.filter(
        (o) => !(o.email === email && o.purpose === "faculty_password_change")
      );
      filtered.push({
        userId,
        email,
        code,
        purpose: "faculty_password_change",
        expiresAt,
      });

      await saveStoredOtps(supabase, filtered);

      // 3. Dispatch security email via Nodemailer (Gmail SMTP) or Resend API
      await sendFacultySecurityOtpEmail(supabase, {
        to: email,
        facultyName,
        code,
        purpose: "password_change",
      });

      return NextResponse.json(
        {
          success: true,
          maskedEmail: maskEmail(email),
          email,
          message: `The 6-digit verification code has been dispatched to ${maskEmail(email)}. Please check your inbox or spam folder.`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // --------------------------------------------------------------------------
    // ACTION 2: VERIFY OTP AND UPDATE PASSWORD
    // --------------------------------------------------------------------------
    if (action === "verify_and_update_password") {
      const userId = String(body.userId || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const otp = String(body.otp || "").trim();
      const newPassword = String(body.newPassword || "").trim();

      if (!email || !otp || !newPassword) {
        return NextResponse.json(
          { error: "Email, 6-digit verification code, and new password are required." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "The new password must be at least 6 characters in length." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Check stored OTPs
      const currentOtps = await getStoredOtps(supabase);
      const matchIdx = currentOtps.findIndex(
        (o) =>
          o.email === email &&
          o.code === otp &&
          (o.purpose === "faculty_password_change" || o.purpose === "profile_password_change") &&
          Date.now() < o.expiresAt
      );

      let isOtpValid = matchIdx !== -1;
      let sessionAccessToken: string | null = null;

      // Fallback check with Supabase Auth OTP
      if (!isOtpValid && supabaseUrl && supabaseAnonKey) {
        try {
          let verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
            method: "POST",
            headers: {
              apikey: supabaseAnonKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, token: otp, type: "email" }),
          });

          if (!verifyRes.ok) {
            verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
              method: "POST",
              headers: {
                apikey: supabaseAnonKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email, token: otp, type: "recovery" }),
            });
          }

          if (verifyRes.ok) {
            isOtpValid = true;
            const authData = await verifyRes.json();
            sessionAccessToken = authData?.access_token || null;
          }
        } catch (vErr: any) {
          console.warn("Notice: Supabase Auth verify error:", vErr?.message);
        }
      }

      if (!isOtpValid) {
        return NextResponse.json(
          { error: "Invalid or expired 6-digit verification code. Please check your Gmail or request a new code." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Password Update: Update via session access token if available
      if (sessionAccessToken && supabaseUrl && supabaseAnonKey) {
        try {
          await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: "PUT",
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${sessionAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: newPassword }),
          });
        } catch (tokenUpdateErr: any) {
          console.warn("Notice: Session token password update:", tokenUpdateErr?.message);
        }
      }

      // Password Update: Update in Supabase Auth via admin client
      const adminClient = getAdminClient();
      let targetAuthId = userId;

      if (!targetAuthId || targetAuthId.length !== 36) {
        const { data: uFound } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .limit(1);
        if (uFound && uFound[0]?.id) {
          targetAuthId = uFound[0].id;
        }
      }

      if (adminClient && targetAuthId && targetAuthId.length === 36) {
        try {
          await adminClient.auth.admin.updateUserById(targetAuthId, {
            password: newPassword,
            email_confirm: true,
          });
        } catch (authErr: any) {
          console.warn("Notice: Admin auth update error:", authErr?.message);
        }
      }

      // Update public.users record timestamp
      if (targetAuthId) {
        await supabase
          .from("users")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", targetAuthId);
      }

      // Remove used OTP
      if (matchIdx !== -1) {
        currentOtps.splice(matchIdx, 1);
        await saveStoredOtps(supabase, currentOtps);
      }

      return NextResponse.json(
        {
          success: true,
          message: "Faculty password updated successfully. You may now use it on your next login.",
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // --------------------------------------------------------------------------
    // ACTION 3: SEND OTP FOR EMAIL CHANGE
    // --------------------------------------------------------------------------
    if (action === "send_email_otp") {
      const userId = String(body.userId || "").trim();
      const currentEmail = String(body.currentEmail || "").trim().toLowerCase();
      const newEmail = String(body.newEmail || "").trim().toLowerCase();
      const facultyName = String(body.facultyName || "Faculty Member").trim();

      if (!newEmail || !newEmail.includes("@")) {
        return NextResponse.json(
          { error: "Please enter a valid new email address (e.g. Gmail)." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      if (newEmail === currentEmail) {
        return NextResponse.json(
          { error: "The new email address cannot be the same as your current registered email." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Institutional reservations
      if (newEmail === "dumalnext@gmail.com" || newEmail === "heartistrichford@gmail.com") {
        return NextResponse.json(
          { error: "This institutional email address is reserved for school administration." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Check if email already registered to another user
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, user_role")
        .eq("email", newEmail)
        .limit(1);

      if (existingUser && existingUser.length > 0 && existingUser[0].id !== userId) {
        return NextResponse.json(
          { error: `The email address "${newEmail}" is already registered to another account in the system.` },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Generate local 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins validity

      const currentOtps = await getStoredOtps(supabase);
      const filtered = currentOtps.filter(
        (o) => !(o.newEmail === newEmail && o.purpose === "faculty_email_change")
      );
      filtered.push({
        userId,
        currentEmail,
        newEmail,
        code,
        purpose: "faculty_email_change",
        expiresAt,
      });

      await saveStoredOtps(supabase, filtered);

      // Dispatch OTP to new email
      await sendFacultySecurityOtpEmail(supabase, {
        to: newEmail,
        facultyName,
        code,
        purpose: "email_change",
        newEmail,
      });

      return NextResponse.json(
        {
          success: true,
          newEmail,
          maskedEmail: maskEmail(newEmail),
          message: `The 6-digit verification code has been dispatched to ${newEmail}. Please check your inbox or spam folder.`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // --------------------------------------------------------------------------
    // ACTION 4: VERIFY OTP AND UPDATE EMAIL
    // --------------------------------------------------------------------------
    if (action === "verify_and_update_email") {
      const userId = String(body.userId || "").trim();
      const currentEmail = String(body.currentEmail || "").trim().toLowerCase();
      const newEmail = String(body.newEmail || "").trim().toLowerCase();
      const teacherId = String(body.teacherId || "").trim();
      const otp = String(body.otp || "").trim();

      if (!newEmail || !otp) {
        return NextResponse.json(
          { error: "New email address and 6-digit verification code are required." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Check stored OTPs
      const currentOtps = await getStoredOtps(supabase);
      const matchIdx = currentOtps.findIndex(
        (o) =>
          o.newEmail === newEmail &&
          o.code === otp &&
          (o.purpose === "faculty_email_change" || o.purpose === "profile_email_change") &&
          Date.now() < o.expiresAt
      );

      let isOtpValid = matchIdx !== -1;

      // Fallback check with Supabase Auth
      if (!isOtpValid && supabaseUrl && supabaseAnonKey) {
        try {
          const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
            method: "POST",
            headers: {
              apikey: supabaseAnonKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: newEmail, token: otp, type: "email" }),
          });
          if (verifyRes.ok) {
            isOtpValid = true;
          }
        } catch (vErr: any) {
          console.warn("Notice: Supabase Auth email verify error:", vErr?.message);
        }
      }

      if (!isOtpValid) {
        return NextResponse.json(
          { error: "Invalid or expired 6-digit verification code. Please check your Gmail or request a new code." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // 1. Update public.users table
      let targetUserId = userId;
      if (!targetUserId || targetUserId.length !== 36) {
        const { data: uFound } = await supabase
          .from("users")
          .select("id")
          .eq("email", currentEmail)
          .limit(1);
        if (uFound && uFound[0]?.id) {
          targetUserId = uFound[0].id;
        }
      }

      if (targetUserId) {
        await supabase
          .from("users")
          .update({ email: newEmail, updated_at: new Date().toISOString() })
          .eq("id", targetUserId);
      }

      // 2. Update in Supabase Auth via admin client if available
      const adminClient = getAdminClient();
      if (adminClient && targetUserId && targetUserId.length === 36) {
        try {
          await adminClient.auth.admin.updateUserById(targetUserId, {
            email: newEmail,
            email_confirm: true,
          });
        } catch (authErr: any) {
          console.warn("Notice: Admin auth email update error:", authErr?.message);
        }
      }

      // 3. Update public.teachers table
      let tchFilter: string[] = [];
      if (currentEmail) tchFilter.push(`email.eq.${currentEmail}`);
      if (teacherId) tchFilter.push(`teacher_id.eq.${teacherId}`);
      if (targetUserId) tchFilter.push(`user_id.eq.${targetUserId}`);

      if (tchFilter.length > 0) {
        await supabase
          .from("teachers")
          .update({ email: newEmail })
          .or(tchFilter.join(","));
      }

      // 4. Update sections table where adviser_email equals currentEmail
      if (currentEmail) {
        try {
          await supabase
            .from("sections")
            .update({ adviser_email: newEmail })
            .eq("adviser_email", currentEmail);
        } catch (secErr) {
          console.warn("Notice updating section adviser_email:", secErr);
        }
      }

      // 5. Update teacher_profile_photos in system_settings if keyed by email
      try {
        const { data: photoData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "teacher_profile_photos")
          .maybeSingle();

        if (photoData && photoData.value && typeof photoData.value === "object") {
          const updatedPhotos = { ...photoData.value };
          if (updatedPhotos[currentEmail]) {
            updatedPhotos[newEmail] = updatedPhotos[currentEmail];
          }
          await supabase.from("system_settings").upsert({
            key: "teacher_profile_photos",
            value: updatedPhotos,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (photoSyncErr) {
        console.warn("Notice updating photo mapping:", photoSyncErr);
      }

      // Remove used OTP
      if (matchIdx !== -1) {
        currentOtps.splice(matchIdx, 1);
        await saveStoredOtps(supabase, currentOtps);
      }

      return NextResponse.json(
        {
          success: true,
          newEmail,
          message: `Official faculty login email successfully updated to ${newEmail}!`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { error: "Invalid action specified." },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred during security update." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
