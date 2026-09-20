import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: classrooms, error } = await supabase
      .from("classrooms")
      .select("*")
      .order("classroomId", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, classrooms: classrooms || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch classrooms" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { id, classroomId, roomName, building, capacity } = body;

    if (!classroomId || !roomName || !building) {
      return NextResponse.json(
        { error: "Room Code, Room Name, and Building are required." },
        { status: 400 }
      );
    }

    const payload: Record<string, any> = {
      classroomId: classroomId.trim().toUpperCase(),
      roomName: roomName.trim(),
      building: building.trim(),
      capacity: capacity ? Number(capacity) : 40,
    };

    if (id) {
      payload.id = id;
    }

    const { data, error } = await supabase
      .from("classrooms")
      .upsert(payload, { onConflict: "classroomId" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, classroom: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save classroom" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Classroom ID is required." }, { status: 400 });
    }

    const { data: activeSchedules } = await supabase
      .from("class_schedules")
      .select("id")
      .eq("classroomId", id)
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
