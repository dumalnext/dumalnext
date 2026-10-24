import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully." },
    { headers: NO_CACHE_HEADERS }
  );

  // Clear session cookie across path variants
  response.cookies.set("dumalnext_itsupport_session", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax",
  });

  return response;
}
