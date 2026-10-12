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

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed. Missing credentials." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const { data: classrooms, error } = await supabase
      .from("classrooms")
      .select("*")
      .order("classroom_id", { ascending: true });

    if (error) {
      console.error("GET classrooms error:", error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    const formatted = (classrooms || []).map((c: any) => ({
      id: c.id,
      classroomId: c.classroom_id || c.classroomId || "",
      classroom_id: c.classroom_id || c.classroomId || "",
      roomName: c.room_name || c.roomName || "",
      room_name: c.room_name || c.roomName || "",
      building: c.building || "",
      capacity: Number(c.capacity) || 40,
      createdAt: c.created_at || c.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, classrooms: formatted }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("GET classrooms exception:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch classrooms" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed. Missing credentials." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }
    const body = await req.json();

    const { id, classroomId, roomName, building, capacity } = body;
    const roomCode = (classroomId || body.classroom_id || "").trim().toUpperCase();
    const name = (roomName || body.room_name || "").trim();
    const bldg = (building || "").trim();
    const cap = capacity ? Number(capacity) : 40;

    if (!roomCode || !name || !bldg) {
      return NextResponse.json(
        { error: "Room Code, Room Name, and Building are required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (id) {
      const { data, error } = await supabase
        .from("classrooms")
        .update({
          classroom_id: roomCode,
          room_name: name,
          building: bldg,
          capacity: cap,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("POST update classroom error:", error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
      }

      const formatted = {
        id: data.id,
        classroomId: data.classroom_id,
        classroom_id: data.classroom_id,
        roomName: data.room_name,
        room_name: data.room_name,
        building: data.building,
        capacity: data.capacity,
      };

      return NextResponse.json({ success: true, classroom: formatted }, { headers: NO_CACHE_HEADERS });
    }

    const payload: Record<string, any> = {
      classroom_id: roomCode,
      room_name: name,
      building: bldg,
      capacity: cap,
    };

    const { data, error } = await supabase
      .from("classrooms")
      .upsert(payload, { onConflict: "classroom_id" })
      .select()
      .single();

    if (error) {
      console.error("POST insert classroom error:", error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    const formatted = {
      id: data.id,
      classroomId: data.classroom_id,
      classroom_id: data.classroom_id,
      roomName: data.room_name,
      room_name: data.room_name,
      building: data.building,
      capacity: data.capacity,
    };

    return NextResponse.json({ success: true, classroom: formatted }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("POST classroom exception:", err);
    return NextResponse.json({ error: err.message || "Failed to save classroom" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// PUT: Update an existing classroom
export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed. Missing credentials." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Classroom ID is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const { data: activeSchedules } = await supabase
      .from("class_schedules")
      .select("id")
      .eq("classroom_id", id)
      .limit(1);

    if (activeSchedules && activeSchedules.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete this classroom because it has active class schedules assigned to it." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { error } = await supabase.from("classrooms").delete().eq("id", id);
    if (error) {
      console.error("DELETE classroom error:", error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("DELETE classroom exception:", err);
    return NextResponse.json({ error: err.message || "Failed to delete classroom" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
