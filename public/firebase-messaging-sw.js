// Firebase Cloud Messaging Service Worker
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// 古い sw.js が残っている場合でも即時に置き換える
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

firebase.initializeApp({
  apiKey: "AIzaSyDIpgZj68CdmN85wSuLFlyYQDcvFfQdr1E",
  authDomain: "donnatokiimo-6e7be.firebaseapp.com",
  projectId: "donnatokiimo-6e7be",
  storageBucket: "donnatokiimo-6e7be.firebasestorage.app",
  messagingSenderId: "154464848783",
  appId: "1:154464848783:web:e68ae3d04a193c20c659fa",
  measurementId: "G-4D7XK01FY0",
});

const messaging = firebase.messaging();

// バックグラウンド通知ハンドラ
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] バックグラウンド通知:", payload);

  // notification フィールド優先、なければ data フィールドで代替
  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || "どんなとき芋";
  const body = notif.body || data.body || "";

  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [200, 100, 200],
    data: payload.data || {},
  });
});

// 通知クリックで PWA を開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});