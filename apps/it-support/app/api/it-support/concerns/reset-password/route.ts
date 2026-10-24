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

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const { ticketId, email, newPassword, resolvedBy, resolutionNotes } = body;

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(newPassword || "").trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid student email address is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters in length." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Supabase service role key is required for direct student password reset." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const adminAuthClient = createSupabaseJsClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Locate student user in Supabase Auth
    let targetUserId: string | null = null;
    const { data: userLookup, error: listErr } = await adminAuthClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (!listErr && userLookup?.users) {
      const match = userLookup.users.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (match) {
        targetUserId = match.id;
      }
    }

    // Fallback: check public.users
    if (!targetUserId) {
      const { data: publicUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();
      if (publicUser?.id) {
        targetUserId = publicUser.id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: `No user account found matching ${cleanEmail}. Please verify the student's registered email address.` },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Update password in Supabase Auth
    const { error: updateErr } = await adminAuthClient.auth.admin.updateUserById(targetUserId, {
      password: cleanPassword,
      email_confirm: true,
    });

    if (updateErr) {
      console.error("admin updateUserById error:", updateErr);
      return NextResponse.json(
        { error: `Failed to update password in Supabase Auth: ${updateErr.message}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Update the student concern record if ticketId was passed
    if (ticketId) {
      try {
        const { data: settingsData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "student_concerns")
          .maybeSingle();

        if (settingsData?.value?.concerns && Array.isArray(settingsData.value.concerns)) {
          const list = settingsData.value.concerns;
          const idx = list.findIndex((c: any) => c.id === ticketId || c.ticketNumber === ticketId);
          if (idx !== -1) {
            const noteText = resolutionNotes
              ? String(resolutionNotes).trim()
              : `Password was reset by IT Support to: ${cleanPassword}. Student can now sign in with this temporary password.`;

            list[idx] = {
              ...list[idx],
              status: "resolved",
              resolvedAt: new Date().toISOString(),
              resolvedBy: resolvedBy || "IT Support Desk",
              newTemporaryPassword: cleanPassword,
              resolutionNotes: noteText,
              updatedAt: new Date().toISOString(),
            };

            await supabase
              .from("system_settings")
              .upsert({
                key: "student_concerns",
                value: { concerns: list },
                updated_at: new Date().toISOString(),
              });
          }
        }
      } catch (cErr) {
        console.warn("Failed to update concern status:", cErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Password for ${cleanEmail} has been updated successfully.`,
        newPassword: cleanPassword,
        email: cleanEmail,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST reset password error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reset student password." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
