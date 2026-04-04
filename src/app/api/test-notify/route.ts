import { NextRequest, NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";
import { db } from "@/lib/db";

export async function GET() {
    try {
        // جلب أول مستخدم (أنت غالباً) لتجربة الإرسال له مباشرة
        const user = await db.user.findFirst();

        if (!user) return NextResponse.json({ error: "لا يوجد مستخدمين في القاعدة" });

        await sendNotification({
            userId: user.id,
            type: "SYSTEM",
            title: "نجاح الربط! 🎉",
            message: "هذا الإشعار وصلك لأن النظام أصبح متصلاً بالكامل.",
        });

        return NextResponse.json({ success: "تم الإرسال لـ: " + user.email });
    } catch (error) {
        return NextResponse.json({ error: "فشل الإرسال" });
    }
}