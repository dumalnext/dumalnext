import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { sendSecurityOtpEmail } from "@/lib/emailDispatcher";

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

// POST: Manage profile security updates (Password & Email modification with 6-digit OTP)
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client is not available." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const { action } = body;

    // --------------------------------------------------------------------------
    // ACTION 1: SEND OTP FOR PASSWORD CHANGE
    // --------------------------------------------------------------------------
    if (action === "send_password_otp") {
      const userId = String(body.userId || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const studentName = String(body.studentName || "Learner").trim();

      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { error: "A valid registered email address is required." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Generate 6-digit numeric OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins validity

      const currentOtps = await getStoredOtps(supabase);
      // Remove previous unexpired password otps for this user/email
      const filtered = currentOtps.filter(
        (o) => !(o.email === email && o.purpose === "profile_password_change")
      );
      filtered.push({
        userId,
        email,
        code,
        purpose: "profile_password_change",
        expiresAt,
      });

      await saveStoredOtps(supabase, filtered);

      // Dispatch security email
      await sendSecurityOtpEmail(supabase, {
        to: email,
        studentName,
        code,
        purpose: "password_change",
      });

      return NextResponse.json(
        {
          success: true,
          maskedEmail: maskEmail(email),
          email,
          message: `The 6-digit verification code has been sent to your email (${maskEmail(email)}).`,
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

      const currentOtps = await getStoredOtps(supabase);
      const matchIdx = currentOtps.findIndex(
        (o) =>
          o.email === email &&
          o.code === otp &&
          o.purpose === "profile_password_change" &&
          Date.now() < o.expiresAt
      );

      if (matchIdx === -1) {
        return NextResponse.json(
          { error: "Invalid or expired 6-digit verification code. Please try again or request a new code." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Update password in Supabase Auth via admin client if available
      const adminClient = getAdminClient();
      let targetAuthId = userId;

      if (!targetAuthId || targetAuthId.length !== 36) {
        // Lookup user id from public.users table
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
          console.warn("Notice: admin auth update error:", authErr?.message);
        }
      }

      // Update public.users record timestamp
      if (targetAuthId) {
        await supabase
          .from("users")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetAuthId);
      }

      // Remove used OTP
      currentOtps.splice(matchIdx, 1);
      await saveStoredOtps(supabase, currentOtps);

      return NextResponse.json(
        {
          success: true,
          message: "Password updated successfully! You may now use it on your next login.",
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
      const studentName = String(body.studentName || "Learner").trim();

      if (!newEmail || !newEmail.includes("@")) {
        return NextResponse.json(
          { error: "Please enter a valid new email address (e.g., Gmail)." },
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
      if (
        newEmail === "dumalnext@gmail.com" ||
        newEmail === "heartistrichford@gmail.com"
      ) {
        return NextResponse.json(
          { error: "This institutional email address is reserved for school administration." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Trapping: Check if email already in use by another user
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, user_role")
        .eq("email", newEmail)
        .limit(1);

      if (existingUser && existingUser.length > 0) {
        return NextResponse.json(
          { error: `The email "${newEmail}" is already registered to another account in the system.` },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Trapping: Check teachers table
      const { data: teacherFound } = await supabase
        .from("teachers")
        .select("id")
        .eq("email", newEmail)
        .limit(1);

      if (teacherFound && teacherFound.length > 0) {
        return NextResponse.json(
          { error: "This email address is officially registered as a Faculty Teacher account." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

      const currentOtps = await getStoredOtps(supabase);
      const filtered = currentOtps.filter(
        (o) => !(o.newEmail === newEmail && o.purpose === "profile_email_change")
      );
      filtered.push({
        userId,
        currentEmail,
        newEmail,
        code,
        purpose: "profile_email_change",
        expiresAt,
      });

      await saveStoredOtps(supabase, filtered);

      // Send to the NEW email address so student proves ownership
      await sendSecurityOtpEmail(supabase, {
        to: newEmail,
        studentName,
        code,
        purpose: "email_change",
        newEmail,
      });

      return NextResponse.json(
        {
          success: true,
          newEmail,
          maskedEmail: maskEmail(newEmail),
          message: `The 6-digit verification code has been sent to your new email (${newEmail}).`,
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
      const otp = String(body.otp || "").trim();

      if (!newEmail || !otp) {
        return NextResponse.json(
          { error: "New email address and 6-digit verification code are required." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const currentOtps = await getStoredOtps(supabase);
      const matchIdx = currentOtps.findIndex(
        (o) =>
          o.newEmail === newEmail &&
          o.code === otp &&
          o.purpose === "profile_email_change" &&
          Date.now() < o.expiresAt
      );

      if (matchIdx === -1) {
        return NextResponse.json(
          { error: "Invalid or expired 6-digit verification code for the new email." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Update public.users table
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
        const { error: updErr } = await supabase
          .from("users")
          .update({
            email: newEmail,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetUserId);

        if (updErr) {
          return NextResponse.json(
            { error: "Failed to update email in database: " + updErr.message },
            { status: 500, headers: NO_CACHE_HEADERS }
          );
        }
      }

      // Update in Supabase Auth via admin client if available
      const adminClient = getAdminClient();
      if (adminClient && targetUserId && targetUserId.length === 36) {
        try {
          await adminClient.auth.admin.updateUserById(targetUserId, {
            email: newEmail,
            email_confirm: true,
          });
        } catch (authErr: any) {
          console.warn("Notice: admin auth email update error:", authErr?.message);
        }
      }

      // 1. Synchronize new email to enrollment_applications (for Admin Adjudication Console & Modal)
      try {
        const { data: stList } = await supabase
          .from("students")
          .select("id, student_id")
          .eq("user_id", targetUserId);
        const studentIds = (stList || []).map((s: any) => s.id);

        let appQuery = supabase
          .from("enrollment_applications")
          .select("id, student_id, selected_electives");
        if (studentIds.length > 0) {
          appQuery = appQuery.in("student_id", studentIds);
        }

        const { data: appsToUpdate } = await appQuery;
        if (appsToUpdate && appsToUpdate.length > 0) {
          for (const app of appsToUpdate) {
            let updatedElectives = app.selected_electives;
            if (Array.isArray(updatedElectives)) {
              updatedElectives = updatedElectives.map((el: any) => {
                const copy = { ...el };
                if (copy.email) copy.email = newEmail;
                if (copy.learnerEmail) copy.learnerEmail = newEmail;
                return copy;
              });
            } else if (typeof updatedElectives === "object" && updatedElectives !== null) {
              updatedElectives = {
                ...updatedElectives,
                email: newEmail,
                learnerEmail: newEmail,
              };
            }

            await supabase
              .from("enrollment_applications")
              .update({
                selected_electives: updatedElectives,
                updated_at: new Date().toISOString(),
              })
              .eq("id", app.id);
          }
        }
      } catch (appSyncErr) {
        console.warn("Notice: enrollment_applications email sync:", appSyncErr);
      }

      // 2. Synchronize new email to student_concerns in system_settings (for IT Support Concerns Desk)
      try {
        const { data: concData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "student_concerns")
          .maybeSingle();

        if (concData && concData.value && Array.isArray(concData.value.concerns)) {
          let hasConcernChange = false;
          const updatedConcerns = concData.value.concerns.map((c: any) => {
            if (
              (c.email && c.email.toLowerCase() === currentEmail.toLowerCase()) ||
              (c.studentEmail && c.studentEmail.toLowerCase() === currentEmail.toLowerCase())
            ) {
              hasConcernChange = true;
              return {
                ...c,
                email: newEmail,
                studentEmail: newEmail,
              };
            }
            return c;
          });

          if (hasConcernChange) {
            await supabase.from("system_settings").upsert({
              key: "student_concerns",
              value: { ...concData.value, concerns: updatedConcerns },
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (concSyncErr) {
        console.warn("Notice: student_concerns email sync:", concSyncErr);
      }

      // Remove OTP
      currentOtps.splice(matchIdx, 1);
      await saveStoredOtps(supabase, currentOtps);

      return NextResponse.json(
        {
          success: true,
          newEmail,
          message: `Official login email successfully updated to ${newEmail}!`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { error: "Invalid action." },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST /api/profile/security error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process security update." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
