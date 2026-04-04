import { db } from "./db";
import { pusherServer } from "./pusher";
import { NotificationType } from "@prisma/client"; // استيراد الأنواع من Prisma


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
        notification
      );
    }

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
      })
    );

    // تنفيذ الإرسال للجميع في نفس اللحظة
    await Promise.all(promises);
    
  } catch (error) {
    console.error("❌ خطأ في إرسال الإشعارات للإدارة:", error);
  }
}