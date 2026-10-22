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

// GET: Validate token or check invitation status
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
          { valid: false, error: "This invitation link has expired. Please request a new invitation from IT Support." },
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

    return NextResponse.json(
      { success: true, count: invitations.length },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET teacher invitations error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to validate invitation" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
