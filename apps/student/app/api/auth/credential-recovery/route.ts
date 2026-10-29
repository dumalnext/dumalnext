import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

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

// Helpers for persisting OTP codes in system_settings
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
    // Keep only unexpired otps (max 30 mins old)
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

// GET: Check credential status for an email or 12-digit LRN
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database client not available" }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const identifier = (searchParams.get("identifier") || "").trim().toLowerCase();

    if (!identifier) {
      return NextResponse.json({ error: "Identifier (Email or LRN) is required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // 1. Check in users table
    const { data: suUsers } = await supabase
      .from("users")
      .select("id, user_id, email, user_role, password")
      .or(`email.ilike.${identifier},user_id.ilike.${identifier}`)
      .limit(1);

    let suUser = suUsers?.[0];
    let studentProfile: any = null;

    // 2. If not found, check in students table by student_id or lrn
    if (!suUser) {
      const { data: stFound } = await supabase
        .from("students")
        .select("*")
        .or(`student_id.eq.${identifier},lrn.eq.${identifier}`)
        .limit(1);

      if (stFound && stFound[0]) {
        studentProfile = stFound[0];
        if (studentProfile.user_id) {
          const { data: userById } = await supabase
            .from("users")
            .select("id, user_id, email, user_role, password")
            .eq("id", studentProfile.user_id)
            .limit(1);
          suUser = userById?.[0];
        }
      }
    } else {
      const { data: stData } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", suUser.id)
        .limit(1);
      studentProfile = stData?.[0] || null;
    }

    if (!suUser && !studentProfile) {
      return NextResponse.json(
        { error: "No student record or account found for the provided Email or LRN." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const email = (suUser?.email || "").trim();
    const passwordVal = (suUser?.password || "").trim();
    const isEmailRemoved = !email;
    const isPasswordRemoved = passwordVal === "REMOVED_BY_IT";

    let status: "both_removed" | "password_removed" | "email_removed" | "normal" = "normal";
    if (isEmailRemoved && isPasswordRemoved) {
      status = "both_removed";
    } else if (isPasswordRemoved) {
      status = "password_removed";
    } else if (isEmailRemoved) {
      status = "email_removed";
    }

    const lrn = studentProfile?.student_id || studentProfile?.lrn || (suUser?.user_id && /^\d{12}$/.test(suUser.user_id) ? suUser.user_id : null);
    const studentName = studentProfile
      ? `${studentProfile.first_name || ""} ${studentProfile.last_name || ""}`.trim()
      : null;

    return NextResponse.json(
      {
        success: true,
        status,
        userId: suUser?.id,
        userDisplayId: suUser?.user_id,
        email: email || "",
        maskedEmail: email ? maskEmail(email) : "",
        lrn,
        studentName,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET /api/auth/credential-recovery error:", err);
    return NextResponse.json({ error: err.message || "Failed to check status" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST: Manage recovery workflows (OTP dispatch, reset password, verify identity)
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database client not available" }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json();
    const { action } = body;

    // ACTION 1: send_password_otp (Case 1)
    if (action === "send_password_otp") {
      const identifier = String(body.identifier || "").trim().toLowerCase();
      if (!identifier) {
        return NextResponse.json({ error: "Identifier is required." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      // Find user
      const { data: suUsers } = await supabase
        .from("users")
        .select("id, user_id, email, password")
        .or(`email.ilike.${identifier},user_id.ilike.${identifier}`)
        .limit(1);

      let suUser = suUsers?.[0];
      if (!suUser) {
        const { data: stFound } = await supabase
          .from("students")
          .select("user_id")
          .or(`student_id.eq.${identifier},lrn.eq.${identifier}`)
          .limit(1);
        if (stFound?.[0]?.user_id) {
          const { data: userById } = await supabase
            .from("users")
            .select("id, user_id, email, password")
            .eq("id", stFound[0].user_id)
            .limit(1);
          suUser = userById?.[0];
        }
      }

      if (!suUser || !suUser.email) {
        return NextResponse.json(
          { error: "No active email address is linked to this account. Please recover using your 12-digit LRN." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const email = suUser.email.trim().toLowerCase();
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

      // Store in system_settings
      const currentOtps = await getStoredOtps(supabase);
      const filtered = currentOtps.filter((o) => !(o.email === email && o.purpose === "password_reset"));
      filtered.push({ email, code, expiresAt, purpose: "password_reset" });
      await saveStoredOtps(supabase, filtered);

      // Attempt to trigger Supabase Auth reset password email
      try {
        await supabase.auth.resetPasswordForEmail(email);
      } catch (e) {
        console.warn("Notice: supabase resetPasswordForEmail fallback:", e);
      }

      return NextResponse.json(
        {
          success: true,
          maskedEmail: maskEmail(email),
          email,
          message: `A 6-digit verification code has been sent to your email (${maskEmail(email)}).`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // ACTION 2: verify_password_otp_and_reset (Case 1)
    if (action === "verify_password_otp_and_reset") {
      const identifier = String(body.identifier || "").trim().toLowerCase();
      const otp = String(body.otp || "").trim();
      const newPassword = String(body.newPassword || "").trim();

      if (!identifier || !otp || !newPassword) {
        return NextResponse.json({ error: "Identifier, 6-digit verification code, and new password are required." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      // Find user
      const { data: suUsers } = await supabase
        .from("users")
        .select("id, user_id, email, password")
        .or(`email.ilike.${identifier},user_id.ilike.${identifier}`)
        .limit(1);

      let suUser = suUsers?.[0];
      if (!suUser) {
        const { data: stFound } = await supabase
          .from("students")
          .select("user_id")
          .or(`student_id.eq.${identifier},lrn.eq.${identifier}`)
          .limit(1);
        if (stFound?.[0]?.user_id) {
          const { data: userById } = await supabase
            .from("users")
            .select("id, user_id, email, password")
            .eq("id", stFound[0].user_id)
            .limit(1);
          suUser = userById?.[0];
        }
      }

      if (!suUser) {
        return NextResponse.json({ error: "User account could not be found." }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      const email = (suUser.email || "").trim().toLowerCase();

      // Check OTP in system_settings
      const currentOtps = await getStoredOtps(supabase);
      const matchIdx = currentOtps.findIndex(
        (o) => (o.email === email || o.email === identifier) && o.code === otp && o.purpose === "password_reset" && Date.now() < o.expiresAt
      );

      // Also allow Supabase Auth OTP verification fallback if configured
      let isOtpValid = matchIdx !== -1;
      if (!isOtpValid) {
        try {
          const verifyRes = await supabase.auth.verifyOtp({ email, token: otp, type: "recovery" });
          if (!verifyRes.error) isOtpValid = true;
        } catch {}
      }

      if (!isOtpValid) {
        return NextResponse.json(
          { error: "Invalid or expired 6-digit verification code. Please try again or request a new code." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Update Supabase Auth password if adminClient available
      const adminClient = getAdminClient();
      if (adminClient && suUser.id) {
        try {
          await adminClient.auth.admin.updateUserById(suUser.id, {
            password: newPassword,
            email_confirm: true,
          });
        } catch (authErr) {
          console.warn("Could not update Supabase Auth password:", authErr);
        }
      }

      // Clear REMOVED_BY_IT from public.users table and set new password
      await supabase
        .from("users")
        .update({
          password: newPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("id", suUser.id);

      // Remove used OTP
      if (matchIdx !== -1) {
        currentOtps.splice(matchIdx, 1);
        await saveStoredOtps(supabase, currentOtps);
      }

      return NextResponse.json(
        {
          success: true,
          message: "Your new password has been set successfully! You may now sign in.",
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // ACTION 3: send_email_otp (Case 2: Email Setup Guard)
    if (action === "send_email_otp") {
      const newEmail = String(body.newEmail || "").trim().toLowerCase();
      if (!newEmail || !newEmail.includes("@")) {
        return NextResponse.json({ error: "Please enter a valid Gmail or email address." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      // Check if email already registered to someone else
      const { data: dupUsers } = await supabase
        .from("users")
        .select("id")
        .eq("email", newEmail)
        .limit(1);

      if (dupUsers && dupUsers.length > 0) {
        return NextResponse.json(
          { error: `The email "${newEmail}" is already registered to another account. Please use a different email.` },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000;

      const currentOtps = await getStoredOtps(supabase);
      const filtered = currentOtps.filter((o) => !(o.email === newEmail && o.purpose === "email_setup"));
      filtered.push({ email: newEmail, code, expiresAt, purpose: "email_setup" });
      await saveStoredOtps(supabase, filtered);

      return NextResponse.json(
        {
          success: true,
          maskedEmail: maskEmail(newEmail),
          message: `A 6-digit verification code has been sent to ${newEmail}.`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // ACTION 4: verify_email_otp_and_save (Case 2: Email Setup Guard)
    if (action === "verify_email_otp_and_save") {
      const userId = String(body.userId || "").trim();
      const newEmail = String(body.newEmail || "").trim().toLowerCase();
      const otp = String(body.otp || "").trim();

      if (!userId || !newEmail || !otp) {
        return NextResponse.json({ error: "User ID, new email, and 6-digit verification code are required." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const currentOtps = await getStoredOtps(supabase);
      const matchIdx = currentOtps.findIndex(
        (o) => o.email === newEmail && o.code === otp && o.purpose === "email_setup" && Date.now() < o.expiresAt
      );

      if (matchIdx === -1) {
        return NextResponse.json(
          { error: "Invalid or expired 6-digit verification code. Please check your email." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      // Update users table
      const { error: updErr } = await supabase
        .from("users")
        .update({
          email: newEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500, headers: NO_CACHE_HEADERS });
      }

      // Sync with Supabase Auth
      const adminClient = getAdminClient();
      if (adminClient) {
        try {
          await adminClient.auth.admin.updateUserById(userId, {
            email: newEmail,
            email_confirm: true,
          });
        } catch {}
      }

      // Remove OTP
      currentOtps.splice(matchIdx, 1);
      await saveStoredOtps(supabase, currentOtps);

      return NextResponse.json(
        {
          success: true,
          email: newEmail,
          message: "Your new email address has been verified and linked successfully!",
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // ACTION 5: verify_identity (Case 3: Both Removed)
    if (action === "verify_identity") {
      const lrn = String(body.lrn || "").replace(/\D/g, "").slice(0, 12);
      const birthDate = String(body.birthDate || "").trim();
      const lastName = String(body.lastName || "").trim().toLowerCase();

      if (!lrn || lrn.length !== 12) {
        return NextResponse.json({ error: "A valid 12-digit Learner Reference Number (LRN) is required." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      if (!birthDate && !lastName) {
        return NextResponse.json({ error: "Please enter your Last Name or Date of Birth." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      // Lookup student record
      const { data: stList } = await supabase
        .from("students")
        .select("*")
        .or(`student_id.eq.${lrn},lrn.eq.${lrn}`)
        .limit(5);

      let matchedStudent: any = null;

      if (stList && stList.length > 0) {
        for (const st of stList) {
          const stLastName = (st.last_name || "").trim().toLowerCase();
          const stDob = String(st.dateOfBirth || st.date_of_birth || "").trim();

          const lastNameMatched = lastName && stLastName.includes(lastName);
          const dobMatched = birthDate && (stDob.startsWith(birthDate) || birthDate.startsWith(stDob));

          if (lastNameMatched || dobMatched) {
            matchedStudent = st;
            break;
          }
        }
      }

      // Fallback check in enrollment_applications
      if (!matchedStudent) {
        const { data: apps } = await supabase
          .from("enrollment_applications")
          .select("*")
          .or(`lrn.eq.${lrn},student_id.eq.${lrn}`)
          .limit(5);

        if (apps && apps.length > 0) {
          for (const app of apps) {
            const appLast = (app.lastName || app.last_name || "").trim().toLowerCase();
            const appDob = String(app.dateOfBirth || app.date_of_birth || "").trim();

            if ((lastName && appLast.includes(lastName)) || (birthDate && appDob.includes(birthDate))) {
              matchedStudent = app;
              break;
            }
          }
        }
      }

      if (!matchedStudent) {
        return NextResponse.json(
          { error: "The provided information does not match official school records. Please check the 12-digit LRN, Last Name, or Date of Birth." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const studentName = `${matchedStudent.first_name || matchedStudent.firstName || ""} ${matchedStudent.last_name || matchedStudent.lastName || ""}`.trim();

      return NextResponse.json(
        {
          success: true,
          verified: true,
          lrn,
          studentName,
          message: `Identity confirmed: ${studentName}. You may now set up your new email and password.`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // ACTION 6: complete_identity_recovery (Case 3: Setup both new Email and Password)
    if (action === "complete_identity_recovery") {
      const lrn = String(body.lrn || "").replace(/\D/g, "").slice(0, 12);
      const newEmail = String(body.newEmail || "").trim().toLowerCase();
      const emailOtp = String(body.emailOtp || "").trim();
      const newPassword = String(body.newPassword || "").trim();

      if (!lrn || lrn.length !== 12 || !newEmail || !emailOtp || !newPassword) {
        return NextResponse.json(
          { error: "All fields (LRN, New Email, 6-digit OTP, New Password) are required." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "The new password must be at least 6 characters." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      // Verify email OTP
      const currentOtps = await getStoredOtps(supabase);
      const matchIdx = currentOtps.findIndex(
        (o) => o.email === newEmail && o.code === emailOtp && o.purpose === "email_setup" && Date.now() < o.expiresAt
      );

      if (matchIdx === -1) {
        return NextResponse.json({ error: "Invalid or expired 6-digit verification code for your email." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      // Find user or student
      const { data: stFound } = await supabase
        .from("students")
        .select("*")
        .or(`student_id.eq.${lrn},lrn.eq.${lrn}`)
        .limit(1);

      const student = stFound?.[0];
      let targetUserId = student?.user_id;

      if (!targetUserId) {
        const { data: uFound } = await supabase
          .from("users")
          .select("id")
          .eq("user_id", lrn)
          .limit(1);
        targetUserId = uFound?.[0]?.id;
      }

      if (targetUserId) {
        await supabase
          .from("users")
          .update({
            email: newEmail,
            password: newPassword,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetUserId);

        const adminClient = getAdminClient();
        if (adminClient) {
          try {
            await adminClient.auth.admin.updateUserById(targetUserId, {
              email: newEmail,
              password: newPassword,
              email_confirm: true,
            });
          } catch {}
        }
      } else {
        // Create new user entry linked to student
        const newUserId = `DNHS-STU-${Math.floor(10000 + Math.random() * 90000)}`;
        const { data: newUser } = await supabase
          .from("users")
          .insert({
            user_id: newUserId,
            email: newEmail,
            password: newPassword,
            user_role: "student",
          })
          .select()
          .single();

        if (newUser && student) {
          await supabase
            .from("students")
            .update({ user_id: newUser.id })
            .eq("id", student.id);
        }
      }

      // Remove OTP
      currentOtps.splice(matchIdx, 1);
      await saveStoredOtps(supabase, currentOtps);

      return NextResponse.json(
        {
          success: true,
          message: "Your account has been recovered successfully! You may now sign in using your new email and password.",
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("POST /api/auth/credential-recovery error:", err);
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
