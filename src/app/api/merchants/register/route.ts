import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    hashPassword,
    checkRateLimit,
    recordFailedAttempt,
    logSecurityEvent,
    sanitizeInput,
    sanitizeObject,
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
            const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
            const internationalRegex = /^\+[1-9]\d{5,19}$/;
            const saudiLocalRegex = /^05\d{8}$/;
            const yemenLocalRegex = /^7\d{7,8}$/;

            return internationalRegex.test(cleanPhone) ||
                saudiLocalRegex.test(cleanPhone) ||
                yemenLocalRegex.test(cleanPhone);
        },
        { message: "رقم الهاتف غير صحيح. مثال: +967XXXXXXXXX أو 05XXXXXXXX" }
    );

// Merchant registration validation schema
const merchantRegisterSchema = z.object({
    storeName: z.string()
        .min(2, "اسم المحل يجب أن يكون حرفين على الأقل")
        .max(100, "اسم المحل طويل جداً"),
    storeType: z.string()
        .min(2, "نوع المنتجات مطلوب")
        .max(100, "نوع المنتجات طويل جداً"),
    fullName: z.string()
        .min(2, "الاسم الكامل يجب أن يكون حرفين على الأقل")
        .max(100, "الاسم الكامل طويل جداً")
        .regex(/^[\u0600-\u06FFa-zA-Z\s\-']+$/, "الاسم يجب أن يحتوي على أحرف فقط"),
    phone: phoneSchema,
    email: z.string()
        .email("البريد الإلكتروني غير صحيح")
        .max(255, "البريد الإلكتروني طويل جداً")
        .transform(val => val.toLowerCase()),
    address: z.string()
        .min(3, "العنوان يجب أن يكون 3 أحرف على الأقل")
        .max(500, "العنوان طويل جداً"),
    identityCardImage: z.string()
        .min(1, "صورة البطاقة مطلوبة"),
    jeibWallet: z.string().max(50, "رقم المحفظة طويل جداً").optional(),
    kashWallet: z.string().max(50, "رقم المحفظة طويل جداً").optional(),
    jawaliWallet: z.string().max(50, "رقم المحفظة طويل جداً").optional(),
    transferInfo: z.string().max(200, "معلومات الحوالة طويلة جداً").optional(),
    password: z.string()
        .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    confirmPassword: z.string()
        .min(1, "تأكيد كلمة المرور مطلوب"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "كلمة المرور وتأكيدها غير متطابقتين",
    path: ["confirmPassword"],
});

/**
 * POST /api/merchants/register
 * Secure merchant registration with:
 * - Input validation and sanitization
 * - Rate limiting
 * - Security logging
 * - Auto-create user with MERCHANT role
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
        const validatedData = merchantRegisterSchema.parse(sanitizedBody);

        // Check rate limit for registration
        const rateLimitResult = checkRateLimit(`merchant_register_${ip}`);
        if (!rateLimitResult.allowed) {
            logSecurityEvent({
                action: "MERCHANT_REGISTER_BLOCKED",
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

        // Check if user already exists with this email
        const existingUser = await db.user.findUnique({
            where: { email: validatedData.email },
        });

        if (existingUser) {
            recordFailedAttempt(`merchant_register_${ip}`);

            logSecurityEvent({
                action: "MERCHANT_REGISTER_FAILED_EXISTS",
                ip,
                email: validatedData.email,
                userAgent,
                status: "FAILURE",
                details: "Email already registered",
            });

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

        // Hash the password provided by the merchant
        const hashedPassword = await hashPassword(validatedData.password);

        // Create user with MERCHANT role and merchant profile in a transaction
        const result = await db.$transaction(async (tx) => {
            // Create user
            const user = await tx.user.create({
                data: {
                    name: sanitizeInput(validatedData.fullName),
                    email: validatedData.email,
                    password: hashedPassword,
                    phone: validatedData.phone,
                    address: sanitizeInput(validatedData.address),
                    role: "MERCHANT",
                    isVerified: false,
                    isActive: true,
                },
            });

            // Create merchant profile
            const merchant = await tx.merchant.create({
                data: {
                    userId: user.id,
                    storeName: sanitizeInput(validatedData.storeName),
                    storeType: sanitizeInput(validatedData.storeType),
                    fullName: sanitizeInput(validatedData.fullName),
                    phone: validatedData.phone,
                    email: validatedData.email,
                    address: sanitizeInput(validatedData.address),
                    identityCardImage: validatedData.identityCardImage,
                    jeibWallet: validatedData.jeibWallet || null,
                    kashWallet: validatedData.kashWallet || null,
                    jawaliWallet: validatedData.jawaliWallet || null,
                    transferInfo: validatedData.transferInfo || null,
                    isApproved: false, // Requires admin approval
                    isActive: true,
                },
            });

            return { user, merchant };
        });

        // Create verification code
        const code = await createVerificationCode(result.user.id, "EMAIL_VERIFICATION");

        // Send verification email
        const emailResult = await sendVerificationEmail(
            result.user.email,
            code,
            result.user.name
        );

        if (!emailResult.success) {
            console.error("Failed to send verification email:", emailResult.error);
        }

        // Log successful registration
        logSecurityEvent({
            action: "MERCHANT_REGISTER_SUCCESS",
            userId: result.user.id,
            email: result.user.email,
            ip,
            userAgent,
            status: "SUCCESS",
            details: `Store: ${validatedData.storeName}, Email sent: ${emailResult.success}`,
        });

        return NextResponse.json({
            success: true,
            requiresVerification: true,
            message: "تم إنشاء حسابك بنجاح، يرجى إدخال كود التحقق المرسل إلى بريدك الإلكتروني",
            userId: result.user.id,
            merchantId: result.merchant.id,
            emailSent: emailResult.success,
        });
    } catch (error) {
        console.error("Merchant registration error:", error);

        if (error instanceof z.ZodError) {
            const firstError = error.issues[0] || error.errors?.[0];
            return NextResponse.json(
                { error: firstError?.message || "بيانات غير صالحة" },
                { status: 400 }
            );
        }

        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "حدث خطأ أثناء تسجيل التاجر" },
            { status: 500 }
        );
    }
}