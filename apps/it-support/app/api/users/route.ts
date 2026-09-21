import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key);
}

export async function GET() {
  try {
    const supabase = getAdminClient() || (await createClient());
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/users error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mappedUsers = (users || []).map((u: any) => ({
      id: u.id,
      userId: u.user_id || u.userId || (u.email ? u.email.split("@")[0].toUpperCase() : "DNHS-USER"),
      email: u.email || "",
      userRole: (u.user_role || u.userRole || "student").toLowerCase(),
      createdAt: u.created_at || u.createdAt || new Date().toISOString(),
    }));

    const counts = {
      all: mappedUsers.length,
      student: mappedUsers.filter((u) => u.userRole === "student").length,
      teacher: mappedUsers.filter((u) => u.userRole === "teacher").length,
      admin: mappedUsers.filter((u) => u.userRole === "admin").length,
      it_support: mappedUsers.filter((u) => u.userRole === "it_support").length,
    };

    return NextResponse.json({ success: true, users: mappedUsers, counts });
  } catch (err: any) {
    console.error("GET /api/users exception:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminClient() || (await createClient());
    const body = await req.json();

    const { userId, email, password, userRole, fullName, department } = body;

    if (!userId || !email || !userRole) {
      return NextResponse.json(
        { error: "User ID, Email, and User Role are required." },
        { status: 400 }
      );
    }

    const cleanUserId = userId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = userRole.toLowerCase();

    // Check if user already exists by user_id or email
    const { data: existingUsers } = await supabase
      .from("users")
      .select("*")
      .or(`user_id.eq.${cleanUserId},email.eq.${cleanEmail}`)
      .limit(1);

    let userData = existingUsers?.[0] || null;

    if (userData) {
      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update({
          user_id: cleanUserId,
          email: cleanEmail,
          user_role: cleanRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userData.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      userData = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("users")
        .insert({
          user_id: cleanUserId,
          email: cleanEmail,
          user_role: cleanRole,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      userData = inserted;
    }

    // Role-specific profile syncing
    if (cleanRole === "teacher") {
      const names = (fullName || "Faculty Member").split(" ");
      const firstName = names[0] || "Faculty";
      const lastName = names.slice(1).join(" ") || "Teacher";

      await supabase.from("teachers").upsert(
        {
          user_id: userData.id,
          teacher_id: cleanUserId,
          first_name: firstName,
          last_name: lastName,
          department: department || "CROSS_LEVEL",
          email: cleanEmail,
        },
        { onConflict: "teacher_id" }
      );
    } else if (cleanRole === "admin") {
      const names = (fullName || "School Administrator").split(" ");
      const firstName = names[0] || "Admin";
      const lastName = names.slice(1).join(" ") || "Officer";

      await supabase.from("school_administrators").upsert(
        {
          user_id: userData.id,
          admin_id: cleanUserId,
          first_name: firstName,
          last_name: lastName,
          department: department || "Academic Affairs",
        },
        { onConflict: "admin_id" }
      );
    } else if (cleanRole === "it_support") {
      await supabase.from("it_supports").upsert(
        {
          user_id: userData.id,
          itsupport_id: cleanUserId,
          system_role: department || "System Administrator",
        },
        { onConflict: "itsupport_id" }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        userId: userData.user_id || cleanUserId,
        email: userData.email || cleanEmail,
        userRole: userData.user_role || cleanRole,
        createdAt: userData.created_at || new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to provision user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminClient() || (await createClient());
    let id: string | null = null;
    let email: string | null = null;
    let userId: string | null = null;

    try {
      const body = await req.json();
      id = body.id || null;
      email = body.email || null;
      userId = body.userId || null;
    } catch {
      const { searchParams } = new URL(req.url);
      id = searchParams.get("id");
      email = searchParams.get("email");
      userId = searchParams.get("userId");
    }

    if (!id && !email && !userId) {
      return NextResponse.json(
        { error: "User ID or Email is required for deletion." },
        { status: 400 }
      );
    }

    // Locate the user record in users table
    let query = supabase.from("users").select("*");
    if (id) {
      query = query.eq("id", id);
    } else if (email) {
      query = query.eq("email", email.trim().toLowerCase());
    } else if (userId) {
      query = query.eq("user_id", userId.trim().toUpperCase());
    }

    const { data: existing, error: findError } = await query.limit(1);
    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    const targetUser = existing?.[0];
    if (!targetUser) {
      return NextResponse.json({ success: true, message: "User not found or already deleted." });
    }

    // Clean up dependent profile records
    await Promise.all([
      supabase.from("teachers").delete().or(`user_id.eq.${targetUser.id},email.eq.${targetUser.email}`),
      supabase.from("school_administrators").delete().eq("user_id", targetUser.id),
      supabase.from("it_supports").delete().eq("user_id", targetUser.id),
      supabase.from("students").delete().eq("user_id", targetUser.id),
    ]);

    // Delete from public.users table
    const { error: delError } = await supabase
      .from("users")
      .delete()
      .eq("id", targetUser.id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} (${targetUser.user_id}) deleted successfully.`,
      deletedId: targetUser.id,
    });
  } catch (err: any) {
    console.error("DELETE /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete user" }, { status: 500 });
  }
}
