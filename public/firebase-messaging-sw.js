// Firebase Cloud Messaging Service Worker
// Firebase compat SDK への依存を排除し、push イベントを直接処理する。
// これにより SDK バージョン不一致の問題を回避し、スリープ時の通知を確実に届ける。

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }

  // FCM の webpush ペイロード形式: payload.notification または payload.data に情報が入る
  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || "どんなとき芋";
  const body = notif.body || data.body || "";
  const icon = notif.icon || data.icon || "https://dev.d3nlv05moq0vc5.amplifyapp.com/icon-192.png";

// event.waitUntil を必ず呼ぶことで、スリープ中でも SW が終了される前に通知を表示する
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "https://dev.d3nlv05moq0vc5.amplifyapp.com/icon-192.png",
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: payload.data || {},
    }).then(() => {
      // バックグラウンドにいるアプリに通知受信を伝える（BroadcastChannel）
      try {
        const bc = new BroadcastChannel("fcm-push-received");
        bc.postMessage({ type: "push-received" });
        bc.close();
      } catch (e) {}
    })
  );
});

// 通知クリックで PWA を開く（?notified=1 を付けてアプリ側でOFFにさせる）
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 既に開いているウィンドウがあれば通知受信メッセージを送ってフォーカス
      for (const client of clientList) {
        try {
          const bc = new BroadcastChannel("fcm-push-received");
          bc.postMessage({ type: "push-received" });
          bc.close();
        } catch (e) {}
        return client.focus();
      }
      // 開いていなければ新しく開く
      return clients.openWindow("/?notified=1");
    })
  );
});