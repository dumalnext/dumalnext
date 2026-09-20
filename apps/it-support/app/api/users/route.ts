import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: users, error } = await supabase
      .from("users")
      .select("id, userId:\"userId\", email, userRole:\"userRole\", createdAt:\"createdAt\"")
      .order("createdAt", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts = {
      all: users?.length || 0,
      student: users?.filter((u) => u.userRole === "student").length || 0,
      teacher: users?.filter((u) => u.userRole === "teacher").length || 0,
      admin: users?.filter((u) => u.userRole === "admin").length || 0,
      it_support: users?.filter((u) => u.userRole === "it_support").length || 0,
    };

    return NextResponse.json({ success: true, users: users || [], counts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { userId, email, password, userRole, fullName, department } = body;

    if (!userId || !email || !userRole) {
      return NextResponse.json(
        { error: "User ID, Email, and User Role are required." },
        { status: 400 }
      );
    }

    const userPayload: Record<string, any> = {
      userId: userId.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      userRole,
      password: password || "dnhs2026",
    };

    const { data: userData, error: userError } = await supabase
      .from("users")
      .upsert(userPayload, { onConflict: "userId" })
      .select()
      .single();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (userRole === "teacher") {
      const names = (fullName || "Faculty Member").split(" ");
      const firstName = names[0] || "Faculty";
      const lastName = names.slice(1).join(" ") || "Teacher";

      await supabase.from("teachers").upsert({
        userId: userData.id,
        teacherID: userData.userId,
        firstName,
        lastName,
        department: department || "CROSS_LEVEL",
        email: userData.email,
      }, { onConflict: "teacherID" });
    } else if (userRole === "admin") {
      const names = (fullName || "School Administrator").split(" ");
      const firstName = names[0] || "Admin";
      const lastName = names.slice(1).join(" ") || "Officer";

      await supabase.from("school_administrators").upsert({
        userId: userData.id,
        adminID: userData.userId,
        firstName,
        lastName,
        department: department || "Academic Affairs",
      }, { onConflict: "adminID" });
    } else if (userRole === "it_support") {
      await supabase.from("it_supports").upsert({
        userId: userData.id,
        itsupportID: userData.userId,
        systemRole: department || "System Administrator",
      }, { onConflict: "itsupportID" });
    }

    return NextResponse.json({ success: true, user: userData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to provision user" }, { status: 500 });
  }
}
