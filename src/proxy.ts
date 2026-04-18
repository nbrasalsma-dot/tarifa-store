/**
 * 🔒 Security Proxy - SECURED VERSION v2.0
 * Enhanced CORS + Security Headers + Rate Limiting
 */
import { NextRequest, NextResponse } from "next/server";

const config = {
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS || "http://localhost:3000"
  ).split(","),
  rateLimits: { general: 100, auth: 10, upload: 5 },
};
const rateStore = new Map<string, { count: number; resetTime: number }>();
const blockedIPs = new Set<string>();

function getClientIP(r: NextRequest): string {
  return (
    r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    r.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

function checkRate(ip: string, type = "general") {
  const now = Date.now();
  const k = `${type}:${ip}`;
  const max = config.rateLimits[type] || 100;
  let r = rateStore.get(k);
  if (!r || now > r.resetTime) {
    rateStore.set(k, { count: 1, resetTime: now + 60000 });
    return { allowed: true, remaining: max - 1 };
  }
  r.count++;
  return { allowed: r.count <= max, remaining: Math.max(0, max - r.count) };
}

function logSec(type, ip, req, details?) {
  console.warn(
    `[PROXY] ${type}`,
    JSON.stringify({
      ts: new Date().toISOString(),
      ip,
      url: req.nextUrl.pathname,
      method: req.method,
      details,
    }),
  );
}

export default function proxy(req: NextRequest) {
  const ip = getClientIP(req);
  const path = req.nextUrl.pathname;

  // Development mode - relaxed but safe
  if (process.env.NODE_ENV === "development") {
    const res = NextResponse.next();
    if (path.startsWith("/api/")) {
      res.headers.set(
        "Access-Control-Allow-Origin",
        req.headers.get("origin") || "*",
      );
      res.headers.set(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS",
      );
      res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization",
      );
    }
    return res;
  }

  // OPTIONS preflight
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set(
      "Access-Control-Allow-Origin",
      req.headers.get("origin") || config.allowedOrigins[0],
    );
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS",
    );
    return res;
  }

  // IP Blocking
  if (blockedIPs.has(ip)) {
    logSec("BLOCKED", ip, req);
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Suspicious patterns check
  if (/<script|javascript:|SELECT|UNION|DROP|--/.test(path)) {
    blockedIPs.add(ip);
    logSec("SUSPICIOUS", ip, req);
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Rate limiting for API
  if (path.startsWith("/api/")) {
    const rl = checkRate(
      ip,
      path.includes("/auth/")
        ? "auth"
        : path.includes("/upload")
          ? "upload"
          : "general",
    );
    if (!rl.allowed) {
      logSec("RATE_LIMITED", ip, req);
      return new NextResponse(
        JSON.stringify({ error: "تم تجاوز حد الطلبات" }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        },
      );
    }
  }

  const response = NextResponse.next();

  // Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1;mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(),microphone=(),geolocation=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' https://*.pusher.com wss://*.pusher.com https://*.imagekit.io; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-src 'self' https://*.instagram.com;",
  );

  if (process.env.NODE_ENV === "production")
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000;includeSubDomains;preload",
    );

  // CORS - Restricted
  if (path.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (
      config.allowedOrigins.some((o) => {
        try {
          return new URL(o.trim()).origin === new URL(origin).origin;
        } catch {
          return o.trim() === origin;
        }
      }) ||
      !origin
    ) {
      response.headers.set(
        "Access-Control-Allow-Origin",
        origin || config.allowedOrigins[0],
      );
    }
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS",
    );
    response.headers.set("Vary", "Origin");
  }

  response.headers.delete("X-Powered-By");
  return response;
}

export const matcherConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
