// الاستماع لحدث الإشعارات (Push Event)
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/logo.png", // أيقونة المتجر
      badge: "/favicon.png", // أيقونة صغيرة لشريط الحالة
      vibrate: [100, 50, 100], // نمط الاهتزاز
      data: {
        url: data.url || "/", // الرابط الذي سيفتح عند النقر
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// التعامل مع النقر على الإشعار
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
