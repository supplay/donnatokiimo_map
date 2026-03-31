import { Authenticator } from "@aws-amplify/ui-react";
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminSignup from "./pages/AdminSignup.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import CustomerPage from "./pages/CustomerPage.jsx";
import PointCard from "./components/PointCard.jsx";
import { messaging, onMessage } from "./firebase.js";

/** --------------------------------------------------------------------------
 * コンポーネント
 * ------------------------------------------------------------------------- */
function LaunchSplash() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999, background: "#fdf5e6",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <img src="/splash.png" alt="どんなとき芋" style={{ width: "min(88vw, 420px)", height: "auto", objectFit: "contain" }} />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // 1. スプラッシュ画面のタイマー
    const timerId = window.setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    // 2. 古い sw.js を登録解除 → Firebase Messaging Service Worker を登録
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => {
          if (r.active?.scriptURL?.includes("/sw.js")) {
            r.unregister();
            console.log("古い sw.js を登録解除したバイ！");
          }
        });
      });
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((reg) => console.log("Firebase SW 登録成功バイ！", reg))
        .catch((err) => console.error("Firebase SW 登録失敗:", err));
    }

    // 3. フォアグラウンド通知ハンドラ（SW経由でないと Chrome では表示されないため registration を使う）
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("📩 フォアグラウンド通知:", payload);
      const notif = payload.notification || {};
      const data = payload.data || {};
      const title = notif.title || data.title || "どんなとき芋";
      const body = notif.body || data.body || "";
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => reg.showNotification(title, { body, icon: "/favicon.ico" }))
          .catch(() => {
            if (Notification.permission === "granted") {
              new Notification(title, { body, icon: "/favicon.ico" });
            }
          });
      }
    });

    return () => {
      window.clearTimeout(timerId);
      unsubscribe();
    };
  }, []);

  return (
    <ErrorBoundary>
      {showSplash && <LaunchSplash />}
      <BrowserRouter>
        <Routes>
          {/* お客さん用トップページ */}
          <Route path="/" element={<CustomerPage />} />

          {/* 【新】管理画面の入り口 */}
          <Route
            path="/kanri_aki"
            element={
              <Authenticator hideSignUp={true}>
                {({ signOut }) => <AdminPage signOut={signOut} />}
              </Authenticator>
            }
          />

          {/* 旧 /admin へのアクセスを /kanri_aki へリダイレクト（転送） */}
          <Route path="/admin/*" element={<Navigate to="/kanri_aki" replace />} />

          {/* 指定外のURLはすべてトップページへ飛ばす */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}