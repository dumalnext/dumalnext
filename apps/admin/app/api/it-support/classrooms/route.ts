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

export interface ClassroomRecord {
  id: string;
  classroomId: string;
  classroom_id: string;
  roomName: string;
  room_name: string;
  building: string;
  capacity: number;
  createdAt?: string;
}

async function getMergedClassrooms(supabase: any): Promise<ClassroomRecord[]> {
  const { data: classrooms, error } = await supabase
    .from("classrooms")
    .select("*")
    .order("classroom_id", { ascending: true });

  if (error) {
    console.warn("Notice reading classrooms table:", error.message);
  }

  // Fetch overrides and custom classrooms from system_settings
  let customClassrooms: any[] = [];
  let deletedIds: string[] = [];
  try {
    const { data: sysData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "classrooms_config")
      .maybeSingle();

    if (sysData?.value) {
      customClassrooms = sysData.value.customClassrooms || [];
      deletedIds = sysData.value.deletedIds || [];
    }
  } catch (sysErr) {
    console.warn("Notice reading classrooms_config:", sysErr);
  }

  const roomMap = new Map<string, ClassroomRecord>();

  (classrooms || []).forEach((c: any) => {
    const id = c.id;
    const code = (c.classroom_id || c.classroomId || "").trim().toUpperCase();
    if (deletedIds.includes(id) || deletedIds.includes(code)) return;

    roomMap.set(id, {
      id,
      classroomId: code,
      classroom_id: code,
      roomName: c.room_name || c.roomName || "",
      room_name: c.room_name || c.roomName || "",
      building: c.building || "",
      capacity: Number(c.capacity) || 40,
      createdAt: c.created_at || c.createdAt || new Date().toISOString(),
    });
  });

  // Apply custom rooms and capacity/name overrides
  customClassrooms.forEach((cr: any) => {
    const id = cr.id;
    const code = (cr.classroom_id || cr.classroomId || "").trim().toUpperCase();
    if (deletedIds.includes(id) || deletedIds.includes(code)) return;

    let matchedId = id;
    if (!roomMap.has(id)) {
      for (const [existingId, existingRoom] of roomMap.entries()) {
        if (existingRoom.classroom_id.toUpperCase() === code.toUpperCase()) {
          matchedId = existingId;
          break;
        }
      }
    }

    const existing = roomMap.get(matchedId);
    if (existing) {
      roomMap.set(matchedId, {
        ...existing,
        ...cr,
        id: matchedId,
        classroomId: code || existing.classroomId,
        classroom_id: code || existing.classroom_id,
        roomName: cr.roomName || cr.room_name || existing.roomName,
        room_name: cr.roomName || cr.room_name || existing.room_name,
        building: cr.building !== undefined ? cr.building : existing.building,
        capacity: cr.capacity !== undefined ? Number(cr.capacity) : existing.capacity,
      });
    } else {
      roomMap.set(id, {
        id,
        classroomId: code,
        classroom_id: code,
        roomName: cr.roomName || cr.room_name || "",
        room_name: cr.roomName || cr.room_name || "",
        building: cr.building || "",
        capacity: Number(cr.capacity) || 40,
        createdAt: cr.createdAt || cr.created_at || new Date().toISOString(),
      });
    }
  });

  return Array.from(roomMap.values()).sort((a, b) => a.classroomId.localeCompare(b.classroomId));
}

// GET: Fetch all classrooms for facility management and scheduling
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed. Missing credentials." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const classrooms = await getMergedClassrooms(supabase);
    return NextResponse.json({ success: true, classrooms }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("GET classrooms exception:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch classrooms" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST: Add or update a classroom
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
    const cap = capacity !== undefined && !isNaN(Number(capacity)) ? Number(capacity) : 40;

    if (!roomCode || !name || !bldg) {
      return NextResponse.json(
        { error: "Room Code (e.g. RM-101), Room Name, and Building are required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const targetId = id || crypto.randomUUID();

    // 1. Attempt direct DB mutation (if service role or table permissions permit)
    try {
      if (id) {
        await supabase
          .from("classrooms")
          .update({
            classroom_id: roomCode,
            room_name: name,
            building: bldg,
            capacity: cap,
          })
          .eq("id", id);
      } else {
        await supabase
          .from("classrooms")
          .upsert(
            {
              id: targetId,
              classroom_id: roomCode,
              room_name: name,
              building: bldg,
              capacity: cap,
            },
            { onConflict: "classroom_id" }
          );
      }
    } catch (dbErr) {
      console.warn("Notice mutating classrooms table directly:", dbErr);
    }

    // 2. Always persist into system_settings under classrooms_config
    const formattedRoom: ClassroomRecord = {
      id: targetId,
      classroomId: roomCode,
      classroom_id: roomCode,
      roomName: name,
      room_name: name,
      building: bldg,
      capacity: cap,
      createdAt: new Date().toISOString(),
    };

    try {
      const { data: sysData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "classrooms_config")
        .maybeSingle();

      const existingConfig = sysData?.value || { customClassrooms: [], deletedIds: [] };
      const currentCustom: any[] = existingConfig.customClassrooms || [];
      const deletedIds: string[] = (existingConfig.deletedIds || []).filter(
        (delId: string) => delId !== targetId && delId.toUpperCase() !== roomCode.toUpperCase()
      );

      const idx = currentCustom.findIndex(
        (r: any) => r.id === targetId || (r.classroomId && r.classroomId.toUpperCase() === roomCode.toUpperCase())
      );

      if (idx >= 0) {
        currentCustom[idx] = { ...currentCustom[idx], ...formattedRoom };
      } else {
        currentCustom.push(formattedRoom);
      }

      await supabase.from("system_settings").upsert({
        key: "classrooms_config",
        value: {
          ...existingConfig,
          customClassrooms: currentCustom,
          deletedIds,
          updatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    } catch (sysErr) {
      console.error("Error saving classrooms_config in system_settings:", sysErr);
    }

    return NextResponse.json({ success: true, classroom: formattedRoom }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("POST classroom exception:", err);
    return NextResponse.json({ error: err.message || "Failed to save classroom" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// PUT: Update an existing classroom
export async function PUT(req: NextRequest) {
  return POST(req);
}

// DELETE: Delete a classroom
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

    // Check if classroom is actively referenced in class_schedules
    try {
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
    } catch {}

    // Check class_schedules_config in system_settings
    try {
      const { data: schedConf } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "class_schedules_config")
        .maybeSingle();

      const customSchedules: any[] = schedConf?.value?.customSchedules || [];
      const hasActive = customSchedules.some((s: any) => s.classroom_id === id || s.classroomId === id);
      if (hasActive) {
        return NextResponse.json(
          { error: "Cannot delete this classroom because it has active class schedules assigned to it." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
    } catch {}

    // 1. Attempt DB delete
    try {
      await supabase.from("classrooms").delete().eq("id", id);
    } catch (dbErr) {
      console.warn("Notice deleting from classrooms table directly:", dbErr);
    }

    // 2. Persist deletion in system_settings under classrooms_config
    try {
      const { data: sysData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "classrooms_config")
        .maybeSingle();

      const existingConfig = sysData?.value || { customClassrooms: [], deletedIds: [] };
      const currentCustom = (existingConfig.customClassrooms || []).filter((r: any) => r.id !== id);
      const deletedIds = Array.from(new Set([...(existingConfig.deletedIds || []), id]));

      await supabase.from("system_settings").upsert({
        key: "classrooms_config",
        value: {
          ...existingConfig,
          customClassrooms: currentCustom,
          deletedIds,
          updatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    } catch (sysErr) {
      console.error("Error updating classrooms_config on delete:", sysErr);
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("DELETE classroom exception:", err);
    return NextResponse.json({ error: err.message || "Failed to delete classroom" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
