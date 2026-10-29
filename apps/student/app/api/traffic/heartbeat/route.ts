import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;
  return createClient(url, key);
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const DEFAULT_TRAFFIC_SETTINGS = {
  max_active_students: 100,
  queue_enabled: true,
};

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      // If database client fails, fail open so students aren't blocked
      return NextResponse.json(
        { success: true, allowed: true, maxCapacity: 100, activeCount: 1 },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.sessionId || "").trim();
    const studentId = String(body.studentId || "anonymous").trim();
    const action = body.action || "heartbeat";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Fetch traffic control settings & active sessions
    const { data: configData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "traffic_control")
      .maybeSingle();

    const config = configData?.value || DEFAULT_TRAFFIC_SETTINGS;
    const maxCapacity = Number(config.max_active_students ?? 100);
    const isQueueActive = config.queue_enabled !== false;

    // 2. Fetch current active sessions
    const { data: sessionData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "active_student_sessions")
      .maybeSingle();

    const rawSessions: any[] = Array.isArray(sessionData?.value?.sessions)
      ? sessionData.value.sessions
      : [];

    const now = Date.now();
    // Prune sessions older than 90 seconds
    let activeSessions = rawSessions.filter(
      (s) => s.id && s.lastSeen && now - s.lastSeen < 90000
    );

    // ACTION: LEAVE (Student logged out or closed browser)
    if (action === "leave") {
      activeSessions = activeSessions.filter((s) => s.id !== sessionId);
      await supabase.from("system_settings").upsert({
        key: "active_student_sessions",
        value: { sessions: activeSessions },
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json(
        { success: true, allowed: true, activeCount: activeSessions.length, maxCapacity },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // ACTION: HEARTBEAT
    const existingIndex = activeSessions.findIndex((s) => s.id === sessionId);

    // Case 1: Session is already in the active pool
    if (existingIndex !== -1) {
      activeSessions[existingIndex].lastSeen = now;
      if (studentId !== "anonymous") {
        activeSessions[existingIndex].studentId = studentId;
      }
      await supabase.from("system_settings").upsert({
        key: "active_student_sessions",
        value: { sessions: activeSessions },
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          success: true,
          allowed: true,
          activeCount: activeSessions.length,
          maxCapacity,
          queueEnabled: isQueueActive,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Case 2: New session attempting to register
    if (!isQueueActive || activeSessions.length < maxCapacity) {
      // Allowed into the active pool
      activeSessions.push({
        id: sessionId,
        studentId,
        joinedAt: now,
        lastSeen: now,
      });

      await supabase.from("system_settings").upsert({
        key: "active_student_sessions",
        value: { sessions: activeSessions },
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          allowed: true,
          activeCount: activeSessions.length,
          maxCapacity,
          queueEnabled: isQueueActive,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Case 3: Capacity is FULL (activeSessions.length >= maxCapacity)
    return NextResponse.json(
      {
        success: true,
        allowed: false,
        queued: true,
        activeCount: activeSessions.length,
        maxCapacity,
        queueEnabled: isQueueActive,
        message: `Kasalukuyang puno ang sistema (${activeSessions.length}/${maxCapacity} active students).`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST /api/traffic/heartbeat error:", err);
    // Fail-open fallback so a network anomaly doesn't lock out students
    return NextResponse.json(
      { success: true, allowed: true, activeCount: 1, maxCapacity: 100 },
      { headers: NO_CACHE_HEADERS }
    );
  }
}
