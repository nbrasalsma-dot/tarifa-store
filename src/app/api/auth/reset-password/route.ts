import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCode, hashPassword } from "@/lib/auth";
import { z } from "zod";

const resetPasswordSchema = z.object({
  userId: z.string(),
  code: z.string().length(6, "الكود يجب أن يكون 6 أرقام"),
  newPassword: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Verify the code
    const isValid = await verifyCode(
      validatedData.userId,
      validatedData.code,
      "PASSWORD_RESET"
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "الكود غير صحيح أو منتهي الصلاحية" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(validatedData.newPassword);

    // Update password
    await db.user.update({
      where: { id: validatedData.userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "تم إعادة تعيين كلمة المرور بنجاح",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "حدث خطأ أثناء إعادة تعيين كلمة المرور" },
      { status: 500 }
    );
  }
}
