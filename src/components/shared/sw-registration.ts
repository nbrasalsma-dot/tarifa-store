"use client";

import { useEffect } from "react";

// دالة لتحويل المفتاح العام لصيغة يفهمها المتصفح
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function SWRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && "Notification" in window) {
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicVapidKey) {
        console.warn("⚠️ VAPID Public Key missing!");
        return;
      }

      navigator.serviceWorker
        .register("/sw.js")
        .then(async (registration) => {
          console.log("✅ [Service Worker] تم التسجيل بنجاح");

          // طلب الإذن
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            // البدء في عملية الاشتراك (Subscription)
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
            });

            console.log(
              "🔔 [Subscription] جاهز للاستخدام:",
              JSON.stringify(subscription),
            );

            // ================= التعديل الجراحي يبدأ هنا =================
            try {
              // إرسال بيانات الجهاز إلى السيرفر الخاص بنا
              const response = await fetch("/api/web-push/subscribe", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(subscription),
              });

              const data = await response.json();

              if (response.ok) {
                console.log(
                  "✅ [API] تم حفظ اشتراك الجهاز في قاعدة البيانات بنجاح:",
                  data,
                );
              } else {
                console.error("❌ [API] فشل حفظ الاشتراك:", data.error);
              }
            } catch (apiError) {
              console.error("❌ [API] خطأ في الاتصال بالسيرفر:", apiError);
            }
            // ================= التعديل الجراحي ينتهي هنا =================
          }
        })
        .catch((err) => console.error("❌ فشل التسجيل:", err));
    }
  }, []);

  return null;
}
