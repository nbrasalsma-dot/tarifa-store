import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  hashPassword, 
  checkRateLimit,
  recordFailedAttempt,
  logSecurityEvent,
  sanitizeInput,
  sanitizeObject,
  checkPasswordStrength,
} from "@/lib/security";
import { createVerificationCode } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";

// International phone validation - supports multiple country formats
const phoneSchema = z.string()
  .min(6, "رقم الهاتف قصير جداً")
  .max(20, "رقم الهاتف طويل جداً")
  .refine(
    (phone) => {
      // Remove spaces, dashes, and parentheses
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
      
      // International format with country code
      const internationalRegex = /^\+[1-9]\d{5,19}$/;
      
      // Saudi local format (05XXXXXXXX)
      const saudiLocalRegex = /^05\d{8}$/;
      
      // Yemen local format (7XXXXXXXX or 7XXXXXXX)
      const yemenLocalRegex = /^7\d{7,8}$/;
      
      // Check if valid
      return internationalRegex.test(cleanPhone) || 
             saudiLocalRegex.test(cleanPhone) || 
             yemenLocalRegex.test(cleanPhone);
    },
    { message: "رقم الهاتف غير صحيح. مثال: +967XXXXXXXXX أو 05XXXXXXXX" }
  );

// Enhanced validation schema with strong password requirements
const registerSchema = z.object({
  name: z.string()
    .min(2, "الاسم يجب أن يكون حرفين على الأقل")
    .max(100, "الاسم طويل جداً")
    .regex(/^[\u0600-\u06FFa-zA-Z\s\-']+$/, "الاسم يجب أن يحتوي على أحرف فقط"),
  email: z.string()
    .email("البريد الإلكتروني غير صحيح")
    .max(255, "البريد الإلكتروني طويل جداً")
    .transform(val => val.toLowerCase()),
  password: z.string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .max(128, "كلمة المرور طويلة جداً"),
  phone: phoneSchema,
  address: z.string().max(500, "العنوان طويل جداً").optional(),
  role: z.enum(["CUSTOMER", "AGENT"]).default("CUSTOMER"),
  agentInviteToken: z.string().optional(),
});

/**
 * POST /api/auth/register
 * Secure registration with:
 * - Input validation and sanitization
 * - Rate limiting
 * - Strong password requirements
 * - Security logging
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const body = await request.json();
    
    // Sanitize input object
    const sanitizedBody = sanitizeObject(body);
    
    // Validate input
    const validatedData = registerSchema.parse(sanitizedBody);

    // Check rate limit for registration
    const rateLimitResult = checkRateLimit(`register_${ip}`);
    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        action: "REGISTER_BLOCKED",
        ip,
        email: validatedData.email,
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

    // Check password strength
    const strengthResult = checkPasswordStrength(validatedData.password);
    if (!strengthResult.isValid) {
      recordFailedAttempt(`register_${ip}`);
      return NextResponse.json(
        { 
          error: "كلمة المرور ضعيفة",
          details: strengthResult.errors,
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      recordFailedAttempt(`register_${ip}`);
      
      logSecurityEvent({
        action: "REGISTER_FAILED_EXISTS",
        ip,
        email: validatedData.email,
        userAgent,
        status: "FAILURE",
        details: "Email already registered",
      });

      // Generic message to prevent enumeration
      return NextResponse.json(
        { error: "البريد الإلكتروني مسجل مسبقاً" },
        { status: 400 }
      );
    }

    // Check phone uniqueness
    const existingPhone = await db.user.findFirst({
      where: { phone: validatedData.phone },
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: "رقم الجوال مسجل مسبقاً" },
        { status: 400 }
      );
    }

    // Validate agent invite token if role is AGENT
    if (validatedData.role === "AGENT") {
      if (!validatedData.agentInviteToken) {
        return NextResponse.json(
          { error: "رابط الدعوة مطلوب للتسجيل كمندوبة" },
          { status: 400 }
        );
      }

      // Verify invite token (stored in settings)
      const inviteToken = await db.setting.findUnique({
        where: { key: "agent_invite_token" },
      });

      if (!inviteToken || inviteToken.value !== validatedData.agentInviteToken) {
        logSecurityEvent({
          action: "REGISTER_FAILED_INVALID_INVITE",
          ip,
          email: validatedData.email,
          userAgent,
          status: "FAILURE",
          details: "Invalid agent invite token",
        });

        return NextResponse.json(
          { error: "رابط الدعوة غير صالح أو منتهي الصلاحية" },
          { status: 400 }
        );
      }
    }

    // Hash password with bcrypt
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await db.user.create({
      data: {
        name: sanitizeInput(validatedData.name),
        email: validatedData.email,
        password: hashedPassword,
        phone: validatedData.phone,
        address: validatedData.address ? sanitizeInput(validatedData.address) : "",
        role: validatedData.role,
        isVerified: false,
        isActive: true,
      },
    });

    // Create verification code
    const code = await createVerificationCode(user.id, "EMAIL_VERIFICATION");

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      code,
      user.name
    );

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      // Continue anyway - user can request resend
    }

    // Log successful registration
    logSecurityEvent({
      action: "REGISTER_SUCCESS",
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      status: "SUCCESS",
      details: `Role: ${user.role}, Email sent: ${emailResult.success}`,
    });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الحساب بنجاح. تم إرسال كود التحقق إلى بريدك الإلكتروني",
      userId: user.id,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0] || error.errors?.[0];
      return NextResponse.json(
        { error: firstError?.message || "بيانات غير صالحة" },
        { status: 400 }
      );
    }

    // Handle hash password errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الحساب" },
      { status: 500 }
    );
  }
}
