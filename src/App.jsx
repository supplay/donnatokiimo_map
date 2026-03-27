
import { Authenticator } from "@aws-amplify/ui-react";
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminSignup from "./pages/AdminSignup.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import CustomerPage from "./pages/CustomerPage.jsx";
import PointCard from "./components/PointCard.jsx";


/** --------------------------------------------------------------------------
 * アプリケーションルート
 * ------------------------------------------------------------------------- */
function LaunchSplash() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#fdf5e6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="/splash.png"
        alt="どんなとき芋"
        style={{ width: "min(88vw, 420px)", height: "auto", objectFit: "contain" }}
      />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker 登録成功バイ！", registration);
        })
        .catch((error) => {
          console.error("Service Worker 登録失敗:", error);
        });
    }

    return () => window.clearTimeout(timerId);
  }, []);

  return (
    <ErrorBoundary>
      {showSplash && <LaunchSplash />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CustomerPage />} />

          <Route
            path="/kanri_aki"
            element={
              <Authenticator hideSignUp={true}>
                {({ signOut }) => <AdminPage signOut={signOut} />}
              </Authenticator>
            }
          />

          <Route
            path="/admin/*"
            element={
              <Authenticator hideSignUp={true}>
                {({ signOut }) => <AdminPage signOut={signOut} />}
              </Authenticator>
            }
          />

          {/* 管理者アカウント作成画面 */}
          <Route path="/admin-signup" element={<AdminSignup />} />

          <Route
            path="/mypage"
            element={
              <Authenticator>{({ signOut, user }) => <PointCard user={user} signOut={signOut} />}</Authenticator>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}