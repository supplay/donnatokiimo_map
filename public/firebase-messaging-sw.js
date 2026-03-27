// Firebase Cloud Messaging Service Worker
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "...",            // TODO: Firebase コンソールの値を入力（src/firebase.js と同じ値）
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
});

const messaging = firebase.messaging();

// バックグラウンド通知ハンドラ
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] バックグラウンド通知:", payload);

  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "どんなとき芋", {
    body: body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [200, 100, 200],
  });
});

// 通知クリックで PWA を開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});