import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch all classrooms for facility management and scheduling
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: classrooms, error } = await supabase
      .from("classrooms")
      .select("*")
      .order("classroom_id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    return NextResponse.json({ success: true, classrooms: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch classrooms" }, { status: 500 });
  }
}

// POST: Add or update a classroom
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { id, classroomId, roomName, building, capacity } = body;
    const roomCode = (classroomId || body.classroom_id || "").trim().toUpperCase();
    const name = (roomName || body.room_name || "").trim();
    const bldg = (building || "").trim();
    const cap = capacity ? Number(capacity) : 40;

    if (!roomCode || !name || !bldg) {
      return NextResponse.json(
        { error: "Room Code (e.g. RM-101), Room Name, and Building are required." },
        { status: 400 }
      );
    }

    const payload: Record<string, any> = {
      classroom_id: roomCode,
      room_name: name,
      building: bldg,
      capacity: cap,
    };

    if (id) {
      payload.id = id;
    }

    const { data, error } = await supabase
      .from("classrooms")
      .upsert(payload, { onConflict: "classroom_id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    return NextResponse.json({ success: true, classroom: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save classroom" }, { status: 500 });
  }
}

// DELETE: Delete a classroom
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Classroom ID is required." }, { status: 400 });
    }

    // Check if classroom is actively referenced in class_schedules
    const { data: activeSchedules } = await supabase
      .from("class_schedules")
      .select("id")
      .eq("classroom_id", id)
      .limit(1);

    if (activeSchedules && activeSchedules.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete this classroom because it has active class schedules assigned to it." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("classrooms").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete classroom" }, { status: 500 });
  }
}
