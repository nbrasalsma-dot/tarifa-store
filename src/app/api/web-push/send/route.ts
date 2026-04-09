import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

const prisma = new PrismaClient();

// إعداد مفاتيح التشفير للمحطة (التوقيع الرسمي لمتجر ترفة)
webpush.setVapidDetails(
  "mailto:admin@tarifa.com", // بريد الإدارة للتواصل في حال وجود مشكلة في الإشعارات
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: Request) {
  try {
    // 1. استلام محتوى الإشعار الذي تريد إرساله
    const body = await request.json();
    const { title, message, url } = body;

    // 2. سحب جميع اشتراكات المستخدمين من قاعدة البيانات
    const subscriptions = await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { message: "لا يوجد مشتركون لإرسال الإشعارات لهم حالياً." },
        { status: 404 },
      );
    }

    // 3. تجهيز الطرد (شكل الإشعار كما سيظهر في الجوال)
    const payload = JSON.stringify({
      title: title || "تَرِفَة ✨",
      body: message || "اكتشف أحدث العروض والمنتجات الفاخرة!",
      icon: "/favicon.png",
      badge: "/favicon.png",
      url: url || "/", // الصفحة التي ستفتح عند الضغط على الإشعار
    });

    // 4. إرسال الإشعار لكل المشتركين وتصفية المنسحبين
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        );
      } catch (error: any) {
        // ذكاء اصطناعي في التنظيف: إذا قام المستخدم بإلغاء الاشتراك من إعدادات جواله، نحذفه من قاعدة البيانات لنوفر المساحة
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(
            `🗑️ تنظيف: تم حذف اشتراك غير صالح للجهاز (${sub.endpoint})`,
          );
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
        } else {
          console.error("❌ فشل إرسال الإشعار لجهاز معين:", error);
        }
      }
    });

    // الانتظار حتى تنتهي جميع عمليات الإرسال
    await Promise.all(sendPromises);

    return NextResponse.json(
      { message: `✅ تم بث الإشعار بنجاح إلى ${subscriptions.length} جهاز!` },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ [API Error] خطأ عام في محطة البث:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء محاولة إرسال الإشعارات." },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
