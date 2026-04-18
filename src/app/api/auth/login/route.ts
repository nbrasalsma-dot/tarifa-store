import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  logSecurityEvent,
  sanitizeInput,
  generateAuthTokens,
} from "@/lib/security";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

/**
 * POST /api/auth/login
 * Secure login with:
 * - Rate limiting
 * - Password verification with bcrypt
 * - JWT session management
 * - Security logging
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const body = await request.json();

    // Validate input
    const validatedData = loginSchema.parse(body);

    // Sanitize email
    const sanitizedEmail = sanitizeInput(validatedData.email.toLowerCase());

    // Check rate limit by IP and email
    const ipRateLimit = checkRateLimit(ip);
    const emailRateLimit = checkRateLimit(sanitizedEmail);

    if (!ipRateLimit.allowed) {
      logSecurityEvent({
        action: "LOGIN_BLOCKED_IP",
        ip,
        email: sanitizedEmail,
        userAgent,
        status: "BLOCKED",
        details: "IP rate limit exceeded",
      });

      return NextResponse.json(
        {
          error: ipRateLimit.message || "تم حظر الوصول مؤقتاً",
          lockedUntil: ipRateLimit.lockedUntil,
        },
        { status: 429 },
      );
    }

    if (!emailRateLimit.allowed) {
      logSecurityEvent({
        action: "LOGIN_BLOCKED_EMAIL",
        ip,
        email: sanitizedEmail,
        userAgent,
        status: "BLOCKED",
        details: "Email rate limit exceeded",
      });

      return NextResponse.json(
        {
          error: emailRateLimit.message || "تم حظر الحساب مؤقتاً",
          lockedUntil: emailRateLimit.lockedUntil,
        },
        { status: 429 },
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: sanitizedEmail },
    });

    // Use generic error message to prevent user enumeration
    const genericError = "البريد الإلكتروني أو كلمة المرور غير صحيحة";

    if (!user) {
      recordFailedAttempt(ip);
      recordFailedAttempt(sanitizedEmail);

      logSecurityEvent({
        action: "LOGIN_FAILED_USER_NOT_FOUND",
        ip,
        email: sanitizedEmail,
        userAgent,
        status: "FAILURE",
      });

      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    // Check if user is active
    if (!user.isActive) {
      logSecurityEvent({
        action: "LOGIN_FAILED_INACTIVE",
        userId: user.id,
        email: sanitizedEmail,
        ip,
        userAgent,
        status: "FAILURE",
        details: "Account is deactivated",
      });

      return NextResponse.json(
        { error: "تم تعطيل حسابك. يرجى التواصل مع الإدارة" },
        { status: 403 },
      );
    }

    // Verify password using bcrypt
    const isValidPassword = await verifyPassword(
      validatedData.password,
      user.password,
    );

    if (!isValidPassword) {
      recordFailedAttempt(ip);
      recordFailedAttempt(sanitizedEmail);

      logSecurityEvent({
        action: "LOGIN_FAILED_WRONG_PASSWORD",
        userId: user.id,
        email: sanitizedEmail,
        ip,
        userAgent,
        status: "FAILURE",
      });

      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return NextResponse.json(
        {
          error: "يرجى التحقق من بريدك الإلكتروني أولاً",
          needsVerification: true,
          userId: user.id,
        },
        { status: 403 },
      );
    }

    // Clear rate limits on successful login
    clearRateLimit(ip);
    clearRateLimit(sanitizedEmail);

    // Generate tokens
    const tokens = await generateAuthTokens(user);

    // Log successful login
    logSecurityEvent({
      action: "LOGIN_SUCCESS",
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      status: "SUCCESS",
    });

    // Return user data with tokens
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: userWithoutPassword,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 },
    );
  }
}
