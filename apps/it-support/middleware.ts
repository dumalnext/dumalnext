import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "./lib/rateLimiter";

export const config = {
  matcher: ["/api/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // Sensitive IT Support operations (system resets, backups, concerns)
  if (
    pathname.startsWith("/api/concerns") ||
    pathname.startsWith("/api/invitations")
  ) {
    const rateLimit = await checkRateLimit(`it_support_actions:${ip}`, {
      limit: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: `Masyadong maraming kahilingan sa IT Support portal. Pakihintay ang ${rateLimit.retryAfter} segundo.`,
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

    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
    res.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    res.headers.set("X-RateLimit-Reset", rateLimit.reset.toString());
    return res;
  }

  // General IT Support APIs
  const rateLimit = await checkRateLimit(`it_support_api:${ip}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.success) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: `Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`,
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

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
  res.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
  res.headers.set("X-RateLimit-Reset", rateLimit.reset.toString());
  return res;
}
