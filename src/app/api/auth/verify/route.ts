import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCode, createVerificationCode } from "@/lib/auth";
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  logSecurityEvent, 
  sanitizeInput 
} from "@/lib/security";
import { z } from "zod";

const verifySchema = z.object({
  userId: z.string().min(1, "معرف المستخدم مطلوب"),
  code: z.string().length(6, "الكود يجب أن يكون 6 أرقام"),
  type: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET"]).default("EMAIL_VERIFICATION"),
});

/**
 * POST /api/auth/verify
 * Verify email or reset password code
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const body = await request.json();
    const validatedData = verifySchema.parse(body);
    
    const sanitizedUserId = sanitizeInput(validatedData.userId);
    const sanitizedCode = sanitizeInput(validatedData.code);

    // Check rate limit for verification attempts
    const rateLimitResult = checkRateLimit(`verify_${sanitizedUserId}_${ip}`);
    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        action: "VERIFY_BLOCKED",
        userId: sanitizedUserId,
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

    const isValid = await verifyCode(
      sanitizedUserId,
      sanitizedCode,
      validatedData.type
    );

    if (!isValid) {
      recordFailedAttempt(`verify_${sanitizedUserId}_${ip}`);
      
      logSecurityEvent({
        action: "VERIFY_FAILED",
        userId: sanitizedUserId,
        ip,
        userAgent,
        status: "FAILURE",
        details: `Invalid ${validatedData.type} code`,
      });

      return NextResponse.json(
        { error: "الكود غير صحيح أو منتهي الصلاحية" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم التحقق بنجاح",
    });
  } catch (error) {
    console.error("Verification error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "حدث خطأ أثناء التحقق" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/verify
 * Resend verification code
 */
export async function PUT(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const body = await request.json();
    const { userId, type = "EMAIL_VERIFICATION" } = body;
    
    const sanitizedUserId = sanitizeInput(userId);

    // Check rate limit for resend
    const rateLimitResult = checkRateLimit(`resend_${sanitizedUserId}_${ip}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "يرجى الانتظار قبل طلب كود جديد",
          lockedUntil: rateLimitResult.lockedUntil,
        },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: sanitizedUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // Create new verification code
    const code = await createVerificationCode(sanitizedUserId, type);

    logSecurityEvent({
      action: "VERIFY_CODE_RESENT",
      userId: sanitizedUserId,
      email: user.email,
      ip,
      userAgent,
      status: "SUCCESS",
      details: type,
    });

    // TODO: Send verification email using email service

    return NextResponse.json({
      success: true,
      message: "تم إرسال كود التحقق الجديد",
      // Remove this in production - only for testing
      verificationCode: code,
    });
  } catch (error) {
    console.error("Resend code error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الكود" },
      { status: 500 }
    );
  }
}
