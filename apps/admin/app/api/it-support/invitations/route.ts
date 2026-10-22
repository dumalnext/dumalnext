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

export interface StaffInvitation {
  id: string;
  email: string;
  role: "teacher" | "admin" | "it_support";
  fullName?: string;
  department?: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
  invitedAt: string;
  acceptedAt?: string | null;
  expiresAt: string;
}

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

// GET: Validate token or list all invitations
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");

    const invitations = await getStoredInvitations(supabase);

    // Token or Email Validation Mode
    if (token || emailParam) {
      let found: StaffInvitation | undefined;
      if (token) {
        found = invitations.find((i) => i.token === token.trim());
      } else if (emailParam) {
        const clean = emailParam.trim().toLowerCase();
        found = invitations.find((i) => i.email.toLowerCase() === clean && i.status !== "revoked");
      }
      if (!found) {
        return NextResponse.json(
          { valid: false, error: "Invitation not found or link has expired." },
          { status: 404, headers: NO_CACHE_HEADERS }
        );
      }

      if (found.status === "accepted") {
        return NextResponse.json(
          { valid: false, error: "This invitation has already been accepted and the account is active." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      if (found.status === "revoked") {
        return NextResponse.json(
          { valid: false, error: "This invitation has been revoked by IT Support." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      if (new Date(found.expiresAt) < new Date()) {
        return NextResponse.json(
          { valid: false, error: "This invitation link has expired. Please contact IT Support for a new invitation." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        {
          valid: true,
          invitation: {
            id: found.id,
            email: found.email,
            role: found.role,
            fullName: found.fullName || "",
            department: found.department || "",
            status: found.status,
            expiresAt: found.expiresAt,
          },
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // List All Invitations Mode
    const sorted = [...invitations].sort(
      (a, b) => new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime()
    );

    return NextResponse.json({ success: true, invitations: sorted }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("GET invitations error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve invitations" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST: Create and issue new staff invitation
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
    const { email, role, fullName, department } = body;

    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required (e.g. user@dnhs.edu.ph or Gmail)." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const validRoles = ["teacher", "admin", "it_support"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role specified. Role must be teacher, admin, or it_support." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Reserved Accounts Verification
    if (cleanEmail === "dumalnext@gmail.com" && role !== "it_support") {
      return NextResponse.json(
        { error: "Stakeholder policy violation: dumalnext@gmail.com is permanently reserved as the Master IT Support account." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }
    if (cleanEmail === "heartistrichford@gmail.com" && role !== "admin") {
      return NextResponse.json(
        { error: "Stakeholder policy violation: heartistrichford@gmail.com is permanently reserved as the Primary School Administrator account." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Check public.users table for cross-role collision
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, user_id, email, user_role")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingUser) {
      const existingRole = (existingUser.user_role || "").toLowerCase();
      if (existingRole === "student") {
        return NextResponse.json(
          { error: `Stakeholder conflict: ${cleanEmail} is already registered as an enrolled or applicant Student (${existingUser.user_id || "Student"}). Under institutional policy, student emails cannot be invited to staff roles.` },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
      if (existingRole !== role) {
        return NextResponse.json(
          { error: `Stakeholder conflict: ${cleanEmail} is already registered with role "${existingRole}". An email address cannot hold multiple stakeholder roles.` },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
      if (existingRole === role) {
        return NextResponse.json(
          { error: `Account already active: An active ${role} account (${cleanEmail}) already exists in the system.` },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
    }

    // Check public.teachers table
    const { data: teacherFound } = await supabase
      .from("teachers")
      .select("id, teacher_id, first_name, last_name, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (teacherFound && role !== "teacher") {
      return NextResponse.json(
        { error: `Stakeholder conflict: ${cleanEmail} is already assigned to Faculty Teacher ${teacherFound.first_name || ""} ${teacherFound.last_name || ""} (${teacherFound.teacher_id || "Faculty"}).` },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const invitations = await getStoredInvitations(supabase);

    // Check cross-role collision in existing invitations
    const conflictInvite = invitations.find(
      (i) => i.email === cleanEmail && i.role !== role && i.status !== "revoked"
    );
    if (conflictInvite) {
      const assignedRoleLabel = conflictInvite.role === "teacher" ? "Faculty Teacher" : conflictInvite.role === "admin" ? "School Administrator" : "IT Support";
      return NextResponse.json(
        { error: `Stakeholder conflict: ${cleanEmail} already has an active invitation for ${assignedRoleLabel}. Please revoke the existing invitation before inviting under a different role.` },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const alreadyAccepted = invitations.find(
      (i) => i.email === cleanEmail && i.role === role && i.status === "accepted"
    );
    if (alreadyAccepted) {
      return NextResponse.json(
        { error: `This invitation for ${cleanEmail} has already been accepted and activated.` },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Generate unique secure token
    const randomHex = Math.random().toString(36).substring(2, 12);
    const token = `${Date.now()}_${randomHex}`;
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `inv_${Date.now()}_${randomHex}`;

    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const newInvitation: StaffInvitation = {
      id,
      email: cleanEmail,
      role: role as "teacher" | "admin" | "it_support",
      fullName: fullName ? String(fullName).trim() : "",
      department: department ? String(department).trim() : "",
      token,
      status: "pending",
      invitedAt: new Date().toISOString(),
      acceptedAt: null,
      expiresAt,
    };

    // Replace any older pending invitation for this email or append
    const updatedInvitations = invitations.filter(
      (i) => !(i.email === cleanEmail && i.role === role && i.status === "pending")
    );
    updatedInvitations.unshift(newInvitation);

    const saved = await saveStoredInvitations(supabase, updatedInvitations);
    if (!saved) {
      return NextResponse.json(
        { error: "Failed to persist invitation in database." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Determine role-specific portal URL
    const host = req.headers.get("host") || "";
    const isLocal = req.url.includes("localhost") || req.url.includes("127.0.0.1") || host.includes("localhost");
    let portalBaseUrl = "";
    if (role === "teacher") {
      portalBaseUrl = isLocal ? "http://localhost:3001" : (process.env.NEXT_PUBLIC_TEACHER_URL || "https://dumalnext-teacher.vercel.app");
    } else if (role === "admin") {
      portalBaseUrl = isLocal ? "http://localhost:3000" : (process.env.NEXT_PUBLIC_ADMIN_URL || "https://dumalnext-admin.vercel.app");
    } else {
      portalBaseUrl = isLocal ? "http://localhost:3003" : (process.env.NEXT_PUBLIC_ITSUPPORT_URL || "https://dumalnext-it-support.vercel.app");
    }

    const inviteUrl = `${portalBaseUrl}/accept-invite?token=${token}`;
    const redirectTo = `${portalBaseUrl}/accept-invite`;

    // Send official invitation email via Supabase Auth Admin API (triggers Supabase's 'Invite user' email template)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    let emailSent = false;
    let emailError: string | null = null;

    if (serviceRoleKey && supabaseUrl) {
      try {
        const adminAuthClient = createSupabaseJsClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: inviteData, error: inviteErr } = await adminAuthClient.auth.admin.inviteUserByEmail(
          cleanEmail,
          {
            data: {
              role,
              user_role: role,
              full_name: fullName ? String(fullName).trim() : "",
              department: department ? String(department).trim() : "",
            },
            redirectTo,
          }
        );

        if (!inviteErr && inviteData?.user) {
          emailSent = true;
        } else if (inviteErr) {
          console.warn("Supabase auth.admin.inviteUserByEmail notice:", inviteErr.message);
          emailError = inviteErr.message;
        }
      } catch (err: any) {
        console.warn("Supabase auth admin error:", err?.message);
        emailError = err?.message;
      }
    }

    return NextResponse.json(
      {
        success: true,
        invitation: newInvitation,
        inviteUrl,
        emailSent,
        emailError,
        message: emailSent
          ? `Official invitation email successfully sent via Supabase to ${cleanEmail}.`
          : `Invitation registered for ${cleanEmail}.`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST invitation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create invitation" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE: Revoke an invitation
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Invitation ID is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const invitations = await getStoredInvitations(supabase);
    const updated = invitations.map((inv) =>
      inv.id === id ? { ...inv, status: "revoked" as const } : inv
    );

    await saveStoredInvitations(supabase, updated);

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("DELETE invitation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to revoke invitation" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
