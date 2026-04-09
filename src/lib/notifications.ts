import { db } from "./db";
import { pusherServer } from "./pusher";
import { NotificationType } from "@prisma/client"; // استيراد الأنواع من Prisma

// دالة مساعدة داخلية لإرسال الإشعار المنبثق عبر الـ API
// الدالة بعد التعديل الجراحي
async function triggerWebPush(userId: string, title: string, message: string) {
  try {
    // استخدمنا رابط الموقع الحقيقي من متغيرات البيئة أو الرابط الافتراضي
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    await fetch(`${baseUrl}/api/web-push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title,
        message,
        url: "/notifications",
      }),
    });
  } catch (err) {
    console.error("⚠️ فشل إرسال الـ Web Push:", err);
  }
}
export async function sendNotificationToUser({
  userId,
  type,
  title,
  message,
  data,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // بيانات إضافية اختيارية مثل رقم الطلب
}) {
  try {
    // 1. حفظ الإشعار في قاعدة البيانات لكي يبقى محفوظاً لو كان المستخدم "أوفلاين"
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });

    // 2. إرسال الإشعار لحظياً عبر Pusher إذا كان المستخدم متصلاً الآن
    if (pusherServer) {
      await pusherServer.trigger(
        `user-${userId}`, // القناة المخصصة والمعزولة لهذا المستخدم فقط
        "new-notification",
        notification,
      );
    }
    // إرسال إشعار منبثق (Web Push) للجهاز مباشرة
    await triggerWebPush(userId, title, message);
    return notification;
  } catch (error) {
    console.error("❌ خطأ في إرسال الإشعار للمستخدم:", error);
    return null;
  }
}

export async function sendNotificationToAdmins({
  type,
  title,
  message,
  data,
}: {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}) {
  try {
    // 1. البحث عن كل المستخدمين الذين يملكون رتبة ADMIN
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length === 0) return;

    // 2. حلقة تكرار: نستخدم "الموزع الفردي" لإرسال الإشعار لكل مدير وجدناه
    const promises = admins.map((admin) =>
      sendNotificationToUser({
        userId: admin.id,
        type,
        title,
        message,
        data,
      }),
    );

    // تنفيذ الإرسال للجميع في نفس اللحظة
    await Promise.all(promises);
  } catch (error) {
    console.error("❌ خطأ في إرسال الإشعارات للإدارة:", error);
  }
}
