import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, message, url, tag } = body || {};

    const notificationPayload = {
      title: title || "Dumalneg National High School",
      body: message || "New official update from the school administration.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      url: url || "/",
      tag: tag || `dnhs-broadcast-${Date.now()}`,
    };

    return NextResponse.json({
      success: true,
      message: "Push alert dispatched",
      payload: notificationPayload,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
