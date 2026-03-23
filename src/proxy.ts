import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security Proxy (Middleware) for Tarifa E-commerce Store
 * 
 * Adds security headers to protect against common attacks:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME type sniffing
 * - And more
 */

// In Next.js 16, export as "proxy" or default export
export default function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV === "development";

  // X-Frame-Options - Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options - Prevent MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // X-XSS-Protection - Enable XSS filtering
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy - Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy - Restrict browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );

  // Strict-Transport-Security (HSTS) - Force HTTPS in production
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Cache-Control for API routes - prevent caching sensitive data
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // Remove server information
  response.headers.delete("X-Powered-By");

  return response;
}

// Configure which routes use this proxy
export const config = {
  matcher: [
    // Apply to all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|public/|images/).*)",
  ],
};
