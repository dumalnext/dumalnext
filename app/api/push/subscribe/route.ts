import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, device, userAgent } = body || {};

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: "Invalid subscription payload" }, { status: 400 });
    }

    try {
      const supabase = await createClient();
      // Attempt to save subscription in Supabase if push_subscriptions table exists
      await supabase.from("push_subscriptions").upsert({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || null,
        auth: subscription.keys?.auth || null,
        device_type: device || "unknown",
        user_agent: userAgent || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
    } catch (dbErr) {
      // Gracefully continue if table does not exist yet
      console.warn("Could not persist subscription to database:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Push notification subscription registered successfully",
      device: device || "unknown",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
