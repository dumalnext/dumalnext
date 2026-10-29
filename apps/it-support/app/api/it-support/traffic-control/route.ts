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
  updated_at: new Date().toISOString(),
};

// GET: Fetch current capacity settings and live active student sessions
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client not available" },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Fetch traffic_control settings
    const { data: configData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "traffic_control")
      .maybeSingle();

    const config = configData?.value || DEFAULT_TRAFFIC_SETTINGS;

    // 2. Fetch active sessions and prune stale (> 90s)
    const { data: sessionData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "active_student_sessions")
      .maybeSingle();

    const rawSessions: any[] = Array.isArray(sessionData?.value?.sessions)
      ? sessionData.value.sessions
      : [];

    const now = Date.now();
    const validSessions = rawSessions.filter(
      (s) => s.lastSeen && now - s.lastSeen < 90000
    );

    // If pruned, update in background
    if (validSessions.length !== rawSessions.length) {
      await supabase.from("system_settings").upsert({
        key: "active_student_sessions",
        value: { sessions: validSessions },
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        maxActiveStudents: Number(config.max_active_students ?? 100),
        queueEnabled: config.queue_enabled !== false,
        activeCount: validSessions.length,
        activeSessions: validSessions,
        updatedAt: config.updated_at || new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET /api/it-support/traffic-control error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch traffic control status" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST: Update capacity limit, toggle virtual queue, or reset active sessions
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client not available" },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const { maxActiveStudents, queueEnabled, resetSessions } = body;

    // 1. Handle Reset / Flush of all active sessions
    if (resetSessions === true) {
      await supabase.from("system_settings").upsert({
        key: "active_student_sessions",
        value: { sessions: [] },
        updated_at: new Date().toISOString(),
      });
    }

    // 2. Fetch current config
    const { data: existingData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "traffic_control")
      .maybeSingle();

    const currentConfig = existingData?.value || DEFAULT_TRAFFIC_SETTINGS;

    const newConfig = {
      max_active_students:
        typeof maxActiveStudents === "number" && maxActiveStudents > 0
          ? Math.min(Math.max(1, maxActiveStudents), 500)
          : currentConfig.max_active_students ?? 100,
      queue_enabled:
        typeof queueEnabled === "boolean"
          ? queueEnabled
          : currentConfig.queue_enabled !== false,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase.from("system_settings").upsert({
      key: "traffic_control",
      value: newConfig,
      updated_at: new Date().toISOString(),
    });

    if (upsertErr) {
      throw upsertErr;
    }

    // 3. Return updated state with active count
    const { data: sessionData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "active_student_sessions")
      .maybeSingle();

    const sessions = Array.isArray(sessionData?.value?.sessions)
      ? sessionData.value.sessions
      : [];
    const now = Date.now();
    const activeCount = sessions.filter((s) => s.lastSeen && now - s.lastSeen < 90000).length;

    return NextResponse.json(
      {
        success: true,
        message: "Traffic control and capacity settings updated successfully",
        maxActiveStudents: newConfig.max_active_students,
        queueEnabled: newConfig.queue_enabled,
        activeCount,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST /api/it-support/traffic-control error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update traffic control settings" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
