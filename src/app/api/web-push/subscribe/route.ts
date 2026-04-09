import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// تهيئة الاتصال بقاعدة البيانات
const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 1. استلام البيانات القادمة من المتصفح
    const body = await request.json();

    // 2. التحقق من وجود البيانات الأساسية للاشتراك
    if (!body.endpoint || !body.keys || !body.keys.p256dh || !body.keys.auth) {
      return NextResponse.json(
        { error: "بيانات الاشتراك غير مكتملة" },
        { status: 400 },
      );
    }

    // 3. الحفظ الذكي (Upsert): تحديث الجهاز إذا كان موجوداً، أو إضافته إذا كان جديداً
    const subscription = await prisma.pushSubscription.upsert({
      where: {
        endpoint: body.endpoint,
      },
      update: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
      create: {
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        // ملاحظة: يمكننا لاحقاً ربط userId هنا إذا كان المستخدم مسجلاً للدخول
      },
    });

    // 4. إرسال رسالة نجاح للمتصفح
    return NextResponse.json(
      { message: "تم حفظ بيانات الجهاز بنجاح", id: subscription.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ [API Error] خطأ في حفظ الاشتراك:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي في الخادم أثناء حفظ الاشتراك" },
      { status: 500 },
    );
  } finally {
    // إغلاق الاتصال بقاعدة البيانات بشكل نظيف
    await prisma.$disconnect();
  }
}
