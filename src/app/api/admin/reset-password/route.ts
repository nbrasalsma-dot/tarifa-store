import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, checkRateLimit, logSecurityEvent } from "@/lib/security";

/**
 * POST /api/admin/reset-password
 * Reset admin password - secure endpoint
 * 
 * Security:
 * - Rate limited
 * - Only works if admin exists
 * - Returns new password only once
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Rate limit
    const rateLimit = checkRateLimit(`admin_reset_${ip}`, 3, 300000); // 3 attempts per 5 minutes
    if (!rateLimit.allowed) {
      logSecurityEvent({
        action: "ADMIN_RESET_BLOCKED",
        ip,
        userAgent,
        status: "BLOCKED",
        details: "Rate limit exceeded",
      });

      return NextResponse.json(
        { error: "تم تجاوز عدد المحاولات المسموحة" },
        { status: 429 }
      );
    }

    // Get secret key from request body
    const body = await request.json();
    const { secretKey } = body;

    // Verify secret key (use environment variable in production)
    const validSecretKey = process.env.ADMIN_RESET_KEY || "tarifa-admin-reset-2024";
    
    if (!secretKey || secretKey !== validSecretKey) {
      logSecurityEvent({
        action: "ADMIN_RESET_INVALID_KEY",
        ip,
        userAgent,
        status: "FAILURE",
        details: "Invalid secret key attempt",
      });

      return NextResponse.json(
        { error: "مفتاح غير صالح" },
        { status: 401 }
      );
    }

    // Find admin user
    const admin = await db.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "لا يوجد حساب إدارة" },
        { status: 404 }
      );
    }

    // Generate new password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let newPassword = '';
    for (let i = 0; i < 16; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update admin password
    await db.user.update({
      where: { id: admin.id },
      data: { 
        password: hashedPassword,
        isVerified: true,
        isActive: true,
      },
    });

    logSecurityEvent({
      action: "ADMIN_PASSWORD_RESET",
      userId: admin.id,
      ip,
      userAgent,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      message: "تم إعادة تعيين كلمة المرور",
      credentials: {
        email: admin.email,
        password: newPassword,
        name: admin.name,
      },
      warning: "احفظ هذه البيانات - لن تظهر مرة أخرى!",
    });
  } catch (error) {
    console.error("Admin reset error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إعادة التعيين" },
      { status: 500 }
    );
  }
}
