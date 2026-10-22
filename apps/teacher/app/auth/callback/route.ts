import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = sessionData?.user;
      const role = (
        user?.user_metadata?.role ||
        user?.user_metadata?.user_role ||
        user?.app_metadata?.role ||
        ""
      ).toLowerCase();

      const isLocal = request.url.includes("localhost") || request.url.includes("127.0.0.1");

      // Smart Cross-Portal Error Trapping & Routing
      let targetPortalUrl = origin;
      if (role === "teacher") {
        targetPortalUrl = isLocal ? "http://localhost:3001" : "https://dumalnext-teacher.vercel.app";
      } else if (role === "admin") {
        targetPortalUrl = isLocal ? "http://localhost:3000" : "https://dumalnext-admin.vercel.app";
      } else if (role === "it_support") {
        targetPortalUrl = isLocal ? "http://localhost:3003" : "https://dumalnext-it-support.vercel.app";
      }

      const destination = next || "/accept-invite";
      return NextResponse.redirect(`${targetPortalUrl}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/?notice=verification_failed`);
}
