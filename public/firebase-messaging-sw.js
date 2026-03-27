// Firebase Cloud Messaging Service Worker
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

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