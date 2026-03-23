import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin, checkRateLimit, logSecurityEvent } from "@/lib/security";

/**
 * POST /api/admin/init
 * Initialize admin account - can only be called once
 * 
 * Security measures:
 * - Rate limiting
 * - One-time initialization
 * - Generates strong random password
 * - Logs the event
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Check rate limit
    const rateLimitResult = checkRateLimit(`admin_init_${ip}`);
    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        action: "ADMIN_INIT_BLOCKED",
        ip,
        userAgent,
        status: "BLOCKED",
        details: "Rate limit exceeded",
      });

      return NextResponse.json(
        { 
          error: rateLimitResult.message || "تم تجاوز عدد المحاولات المسموحة",
          lockedUntil: rateLimitResult.lockedUntil,
        },
        { status: 429 }
      );
    }

    // Initialize admin
    const result = await initializeAdmin();

    if (!result.success) {
      logSecurityEvent({
        action: "ADMIN_INIT_FAILED",
        ip,
        userAgent,
        status: "FAILURE",
        details: result.message,
      });

      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    // Log successful initialization
    logSecurityEvent({
      action: "ADMIN_INIT_SUCCESS",
      ip,
      userAgent,
      status: "SUCCESS",
      details: result.credentials ? "New admin created" : "Admin already exists",
    });

    // Return credentials only on first creation
    if (result.credentials) {
      return NextResponse.json({
        success: true,
        message: "تم إنشاء حساب الإدارة بنجاح",
        credentials: result.credentials,
        warning: "احفظ هذه البيانات في مكان آمن - لن تظهر مرة أخرى!",
      });
    }

    return NextResponse.json({
      success: true,
      message: "حساب الإدارة موجود مسبقاً",
    });
  } catch (error) {
    console.error("Admin init error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء حساب الإدارة" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/init
 * Check if admin account exists
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await import("@/lib/db");
    
    const adminCount = await db.user.count({
      where: { role: "ADMIN" },
    });

    return NextResponse.json({
      adminExists: adminCount > 0,
    });
  } catch (error) {
    console.error("Check admin error:", error);
    return NextResponse.json(
      { error: "حدث خطأ" },
      { status: 500 }
    );
  }
}
