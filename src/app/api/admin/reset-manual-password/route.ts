import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { verifyAuth, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        // 1. التحقق من صلاحية الأدمن
        const currentUser = await verifyAuth(req);
        if (!currentUser || currentUser.role !== "ADMIN") {
            return NextResponse.json({ success: false, error: "غير مصرح لك بهذا الإجراء" }, { status: 401 });
        }

        // 2. جلب البيانات من الطلب (البريد والباسورد الجديد)
        const body = await req.json();
        const { email, newPassword } = body;

        if (!email || !newPassword) {
            return NextResponse.json({ success: false, error: "البيانات ناقصة" }, { status: 400 });
        }

        // 3. تشفير كلمة المرور الجديدة
        const hashedPassword = await hashPassword(newPassword.trim());

        // 4. تحديث كلمة المرور في قاعدة البيانات
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ success: true, message: "تم تحديث كلمة المرور بنجاح" });

    } catch (error: any) {
        console.error("RESET_PASSWORD_ERROR:", error);
        return NextResponse.json({ success: false, error: "حدث خطأ في السيرفر" }, { status: 500 });
    }
}