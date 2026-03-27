import { Authenticator } from "@aws-amplify/ui-react";
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

    // 2. Firebase Messaging Service Worker の登録
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((reg) => console.log("Firebase SW 登録成功バイ！", reg))
        .catch((err) => console.error("Firebase SW 登録失敗:", err));
    }

    // 3. フォアグラウンド通知ハンドラ
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("📩 フォアグラウンド通知:", payload);
      const { title, body } = payload.notification || {};
      if (title) {
        new Notification(title, { body, icon: "/favicon.ico" });
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
          <Route path="/" element={<CustomerPage />} />
          <Route path="/kanri_aki" element={
            <Authenticator hideSignUp={true}>
              {({ signOut }) => <AdminPage signOut={signOut} />}
            </Authenticator>
          } />
          <Route path="/admin-signup" element={<AdminSignup />} />
          <Route path="/mypage" element={
            <Authenticator>{({ signOut, user }) => <PointCard user={user} signOut={signOut} />}</Authenticator>
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}