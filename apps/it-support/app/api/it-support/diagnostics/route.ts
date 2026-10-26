import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Reusable cached Supabase client with connection pooling and keep-alive
let cachedClient: ReturnType<typeof createSupabaseJsClient> | null = null;

function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;

  cachedClient = createSupabaseJsClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          cache: "no-store",
          keepalive: true,
        });
      },
    },
  });
  return cachedClient;
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "full"; // "edge" | "full"
  const timestamp = new Date().toISOString();

  // Mode 1: Pure Edge API Ping (tests client-to-Next.js latency with zero DB query overhead)
  if (mode === "edge") {
    return NextResponse.json(
      {
        success: true,
        mode: "edge",
        status: "HEALTHY",
        timestamp,
        message: "Next.js Edge API Server is operational",
      },
      { headers: NO_CACHE_HEADERS }
    );
  }

  // Mode 2: Full Database Connectivity Probe (optimized single-record probe)
  const dbStart = performance.now();
  let dbStatus: "HEALTHY" | "DEGRADED" | "UNREACHABLE" = "HEALTHY";
  let dbError: string | null = null;

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      dbStatus = "DEGRADED";
      dbError = "Supabase configuration missing in environment";
    } else {
      // Ultra-lightweight probe: select only id with limit(1) instead of dumping tables
      const { error } = await supabase
        .from("academic_terms")
        .select("id")
        .limit(1);

      if (error) {
        // Fallback probe
        const { error: fallbackError } = await supabase
          .from("system_settings")
          .select("key")
          .limit(1);

        if (fallbackError) {
          dbStatus = "DEGRADED";
          dbError = error.message || fallbackError.message;
        }
      }
    }
  } catch (err: any) {
    dbStatus = "UNREACHABLE";
    dbError = err?.message || "Database connection error";
  }

  const dbLatencyMs = Math.round(performance.now() - dbStart);

  return NextResponse.json(
    {
      success: true,
      mode: "full",
      status: dbStatus,
      dbLatencyMs,
      dbError,
      timestamp,
      projectRef: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "rskwdqvbwrqclrxuxjqp",
      regionNote: "Supabase Cloud Database (PostgreSQL)",
    },
    { headers: NO_CACHE_HEADERS }
  );
}
