import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createVerificationCode } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);

    // Find user
    const user = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({
        success: true,
        message: "إذا كان البريد مسجل، ستصلك رسالة لإعادة تعيين كلمة المرور",
      });
    }

    // Create verification code for password reset
    const code = await createVerificationCode(user.id, "PASSWORD_RESET");

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(user.email, code, user.name);

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: "إذا كان البريد مسجل، ستصلك رسالة لإعادة تعيين كلمة المرور",
      // Remove this in production - only for testing
      userId: user.id,
      verificationCode: code,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "حدث خطأ" },
      { status: 500 }
    );
  }
}
