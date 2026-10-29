import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "./lib/rateLimiter";

export const config = {
  // Apply rate limiting strictly to API routes
  // Assets, icons, and client pages load unimpeded
  matcher: ["/api/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // -------------------------------------------------------------------------
  // TIER 1: High Sensitivity Routes (Auth, Credential Recovery, OTP & Security)
  // Limit: 5 requests per 60 seconds per IP (Blocks brute-force & OTP abuse)
  // -------------------------------------------------------------------------
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/profile/security")
  ) {
    const rateLimit = await checkRateLimit(`student_auth:${ip}`, {
      limit: 5,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: `Masyadong maraming kahilingan (Rate limit exceeded). Pakihintay ang ${rateLimit.retryAfter} segundo bago sumubok muli.`,
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": rateLimit.retryAfter.toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.reset.toString(),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    response.headers.set("X-RateLimit-Reset", rateLimit.reset.toString());
    return response;
  }

  // -------------------------------------------------------------------------
  // TIER 2: Moderate Sensitivity Routes (Document Uploads & Support Concerns)
  // Limit: 10 requests per 60 seconds per IP (Prevents storage & ticket flood)
  // -------------------------------------------------------------------------
  if (
    pathname.startsWith("/api/upload-document") ||
    pathname.startsWith("/api/concerns")
  ) {
    const rateLimit = await checkRateLimit(`student_submissions:${ip}`, {
      limit: 10,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: `Masyadong mabilis ang pagpapadala ng file o concern. Pakihintay ang ${rateLimit.retryAfter} segundo bago mag-upload muli.`,
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": rateLimit.retryAfter.toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.reset.toString(),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    response.headers.set("X-RateLimit-Reset", rateLimit.reset.toString());
    return response;
  }

  // -------------------------------------------------------------------------
  // TIER 3: General API Routes (Schedules, Subjects, Status checks)
  // Limit: 60 requests per 60 seconds per IP
  // -------------------------------------------------------------------------
  const rateLimit = await checkRateLimit(`student_api:${ip}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.success) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: `Masyadong mabilis ang pag-access sa system. Pakihintay ang ${rateLimit.retryAfter} segundo.`,
        retryAfter: rateLimit.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": rateLimit.retryAfter.toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.reset.toString(),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
  response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
  response.headers.set("X-RateLimit-Reset", rateLimit.reset.toString());
  return response;
}
