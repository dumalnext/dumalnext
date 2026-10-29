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

// GET: Retrieve teacher 2x2 photo
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ photoUrl: null }, { headers: NO_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId") || "";
    const email = (searchParams.get("email") || "").toLowerCase();

    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "teacher_profile_photos")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      const photos = data.value as Record<string, string>;
      const photoUrl = (teacherId && photos[teacherId]) || (email && photos[email]) || null;
      return NextResponse.json({ photoUrl }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ photoUrl: null }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ photoUrl: null }, { headers: NO_CACHE_HEADERS });
  }
}

// POST: Save or remove teacher 2x2 photo
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client is unavailable." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const action = body.action || "save";
    const teacherId = String(body.teacherId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const photoUrl = String(body.photoUrl || "").trim();

    if (!teacherId && !email) {
      return NextResponse.json(
        { error: "Faculty identification (teacherId or email) is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Load existing settings
    const { data: existing } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "teacher_profile_photos")
      .maybeSingle();

    let photos: Record<string, string> = {};
    if (existing?.value && typeof existing.value === "object") {
      photos = { ...(existing.value as Record<string, string>) };
    }

    if (action === "remove") {
      if (teacherId) delete photos[teacherId];
      if (email) delete photos[email];
    } else {
      if (!photoUrl) {
        return NextResponse.json(
          { error: "A valid photo URL or image data is required." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
      if (teacherId) photos[teacherId] = photoUrl;
      if (email) photos[email] = photoUrl;
    }

    const { error: upsertErr } = await supabase.from("system_settings").upsert({
      key: "teacher_profile_photos",
      value: photos,
      updated_at: new Date().toISOString(),
    });

    if (upsertErr) {
      return NextResponse.json(
        { error: "Failed to persist faculty photo: " + upsertErr.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        photoUrl: action === "remove" ? null : photoUrl,
        message: action === "remove" ? "2x2 Photo removed successfully." : "2x2 Photo updated successfully.",
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process faculty photo." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
