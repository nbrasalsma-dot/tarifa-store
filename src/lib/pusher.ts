import PusherServer from "pusher";
import PusherClient from "pusher-js";

// إعدادات السيرفر (تعمل دائماً)
export const pusherServer = new PusherServer({
  appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID || "2135756",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "6270ff76cee464632aa4",
  secret: process.env.PUSHER_SECRET || "e21fcfb6298962dfe7c8",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
  useTLS: true,
});

// إعدادات الكلينت (لا تعمل إلا في المتصفح)
export const pusherClient = 
  typeof window !== "undefined" 
    ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || "6270ff76cee464632aa4", {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
      }) 
    : null;