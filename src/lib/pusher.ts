import PusherServer from "pusher";
import PusherClient from "pusher-js";

// إعدادات السيرفر (تستخدم الأسماء الصحيحة من فيرسال)
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || "2135756",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "6270ff76cee464632aa4",
  secret: process.env.PUSHER_SECRET || "e21fcfb6298962dfe7c8",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
  useTLS: true,
});

// إعدادات الكلينت (للمتصفح)
export const pusherClient =
  typeof window !== "undefined"
    ? new PusherClient(
        process.env.NEXT_PUBLIC_PUSHER_KEY || "6270ff76cee464632aa4",
        {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
          forceTLS: true, // أجبر المتصفح على الاتصال الآمن
        },
      )
    : null;
