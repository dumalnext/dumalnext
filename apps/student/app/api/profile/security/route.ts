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
          { error: "Kailangan ang wastong rehistradong email address." },
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
          message: `Ang 6-digit verification code ay naipadala na sa iyong email (${maskEmail(email)}).`,
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
          { error: "Kailangan ang Email, 6-digit OTP, at ang iyong bagong password." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Ang bagong password ay dapat hindi bababa sa 6 na karakter." },
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
          { error: "Mali o expired na ang 6-digit verification code. Pakisubukang muli o humiling ng bagong code." },
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
          message: "Matagumpay na nabago ang iyong password! Maaari mo na itong gamitin sa susunod mong pag-login.",
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
          { error: "Pakilagay ang isang wastong bagong email address (hal. Gmail)." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      if (newEmail === currentEmail) {
        return NextResponse.json(
          { error: "Ang bagong email ay kapareho na ng iyong kasalukuyang rehistradong email." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Institutional reservations
      if (
        newEmail === "dumalnext@gmail.com" ||
        newEmail === "heartistrichford@gmail.com"
      ) {
        return NextResponse.json(
          { error: "Ang email address na ito ay nakalaan para sa pamunuan ng paaralan." },
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
          { error: `Ang email na "${newEmail}" ay nakarehistro na sa ibang account sa system.` },
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
          { error: "Ang email address na ito ay nakarehistro bilang opisyal na Faculty Teacher account." },
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
          message: `Ang 6-digit verification code ay naipadala na sa iyong bagong email (${newEmail}).`,
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
          { error: "Kailangan ang bagong email address at ang 6-digit OTP code." },
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
          { error: "Mali o expired na ang 6-digit verification code para sa bagong email." },
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
            { error: "Hindi ma-update ang email sa database: " + updErr.message },
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

      // Remove OTP
      currentOtps.splice(matchIdx, 1);
      await saveStoredOtps(supabase, currentOtps);

      return NextResponse.json(
        {
          success: true,
          newEmail,
          message: `Matagumpay na nabago ang iyong opisyal na login email patungo sa ${newEmail}!`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { error: "Hindi wastong aksyon (Invalid action)." },
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
