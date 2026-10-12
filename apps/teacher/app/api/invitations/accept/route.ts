import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { StaffInvitation } from "../route";

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

async function getStoredInvitations(supabase: any): Promise<StaffInvitation[]> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "staff_invitations")
      .maybeSingle();

    if (data && data.value && Array.isArray(data.value.invitations)) {
      return data.value.invitations;
    }
    return [];
  } catch {
    return [];
  }
}

async function saveStoredInvitations(supabase: any, invitations: StaffInvitation[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "staff_invitations",
        value: { invitations },
        updated_at: new Date().toISOString(),
      });
    return !error;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const { token, password, firstName, lastName, department } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanPass = String(password || "").trim();
    if (!cleanPass || cleanPass.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters in length." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const invitations = await getStoredInvitations(supabase);
    const invitationIndex = invitations.findIndex((i) => i.token === token.trim());

    if (invitationIndex === -1) {
      return NextResponse.json(
        { error: "Invalid invitation token or link has expired." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const invitation = invitations[invitationIndex];

    if (invitation.status === "accepted") {
      return NextResponse.json(
        { error: "This invitation has already been accepted." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (invitation.status === "revoked") {
      return NextResponse.json(
        { error: "This invitation was revoked by IT Support." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This invitation link has expired." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const email = invitation.email.toLowerCase().trim();
    const fName = String(firstName || invitation.fullName?.split(" ")[0] || "Faculty").trim().toUpperCase();
    const lName = String(lastName || invitation.fullName?.split(" ").slice(1).join(" ") || "Member").trim().toUpperCase();
    const fullName = `${fName} ${lName}`.trim();
    const dept = String(department || invitation.department || "Junior High School (JHS)").trim();

    // 1. Supabase Auth Registration / Activation
    let authUserId: string | null = null;

    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: cleanPass,
        options: {
          data: {
            role: "teacher",
            fullName,
            department: dept,
          },
        },
      });

      if (signUpData?.user) {
        authUserId = signUpData.user.id;
      } else if (signUpErr) {
        console.warn("Notice during auth.signUp:", signUpErr.message);
      }
    } catch (e: any) {
      console.warn("Auth signup notice:", e?.message);
    }

    if (!authUserId) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        authUserId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}`;
      }
    }

    // 2. Generate standard teacher identifier
    const randomNum = Math.floor(100 + Math.random() * 900);
    let generatedUserId = `DNHS-TCH-${randomNum}`;

    // 3. Upsert into public.users
    const userPayload: Record<string, any> = {
      id: authUserId,
      email,
      user_role: "teacher",
      updated_at: new Date().toISOString(),
    };

    const { data: existingUserRow } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (existingUserRow && existingUserRow.user_id) {
      userPayload.user_id = existingUserRow.user_id;
      generatedUserId = existingUserRow.user_id;
    } else {
      userPayload.user_id = generatedUserId;
    }

    await supabase.from("users").upsert(userPayload, { onConflict: "email" });

    // 4. Upsert into public.teachers
    const { data: existingTeacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let teacherDbId = existingTeacher?.id;

    const teacherUpsert = await supabase.from("teachers").upsert(
      {
        user_id: authUserId,
        teacher_id: generatedUserId,
        first_name: fName,
        last_name: lName,
        email,
        department: dept,
      },
      { onConflict: "email" }
    ).select("id").maybeSingle();

    if (teacherUpsert.data?.id) {
      teacherDbId = teacherUpsert.data.id;
    }

    // 5. Mark invitation as accepted
    invitations[invitationIndex] = {
      ...invitation,
      status: "accepted",
      acceptedAt: new Date().toISOString(),
    };
    await saveStoredInvitations(supabase, invitations);

    // 6. Session User & Cookie
    const cookieName = "dumalnext_teacher_session";
    const sessionUser = {
      id: authUserId,
      teacherDbId: teacherDbId || authUserId,
      teacherId: generatedUserId,
      email,
      fullName,
      firstName: fName,
      lastName: lName,
      department: dept,
      userRole: "teacher",
      isEmailVerified: true,
    };

    const response = NextResponse.json(
      {
        success: true,
        message: "Faculty account created and activated successfully.",
        role: "teacher",
        redirectUrl: "/",
        sessionUser,
        cookieName,
      },
      { headers: NO_CACHE_HEADERS }
    );

    const serialized = encodeURIComponent(JSON.stringify(sessionUser));
    response.cookies.set(cookieName, serialized, {
      path: "/",
      maxAge: 604800,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("POST accept invitation teacher error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to accept invitation and activate account." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
