<<<<<<< HEAD
// シンプルなPush通知ハンドラ
self.addEventListener("push", (event) => {
  const data = event.data.json();

  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon.png",
  });
=======
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Yakiimo arrived!', body: 'Its nearby now!' };

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
>>>>>>> 6bac5b2e4aea2b86dc790f324e461d8709455b31
  );
});
