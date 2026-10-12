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

    const invitations = await getStoredInvitations(supabase);

    // Token Validation Mode
    if (token) {
      const found = invitations.find((i) => i.token === token.trim());
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

    const invitations = await getStoredInvitations(supabase);

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

    // Determine base URL
    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_ADMIN_URL ||
      "http://localhost:3002";

    const inviteUrl = `${origin}/accept-invite?token=${token}`;

    return NextResponse.json(
      {
        success: true,
        invitation: newInvitation,
        inviteUrl,
        message: `Invitation generated successfully for ${cleanEmail}.`,
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
