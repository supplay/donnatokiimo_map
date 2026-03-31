import React, { useEffect, useRef, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

import { getStore } from "../graphql/queries";
import { onUpdateStore } from "../graphql/subscriptions";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bell, BellOff } from "lucide-react";

import PointCard from "../components/PointCard.jsx";
import { messaging, getToken } from "../firebase.js";

// Firebase コンソール > プロジェクト設定 > Cloud Messaging > ウェブプッシュ証明書 の鍵ペア
const FCM_VAPID_KEY = "BN2AwI13slGtx56om9P68uGilFCIkb8B82yHzKIPYsTD8YLc2N9OdDhTF0W7LhvoShJQr0xaaaieCSOEt30bRso";
const AWS_API_URL = "https://a79c454sgh.execute-api.us-east-1.amazonaws.com/v1/tokens";
const VAN_ID = "KEI-VAN-001";
const CONFIG_ID = "GLOBAL-CONFIG";

const GET_CONFIG = /* GraphQL */ `
  query GetConfig($id: ID!) {
    getConfig(id: $id) {
      id
      menuJson
      scheduleJson
      dummy
    }
  }
`;

const ON_UPDATE_CONFIG = /* GraphQL */ `
  subscription OnUpdateConfig {
    onUpdateConfig {
      id
      menuJson
      scheduleJson
      dummy
    }
  }
`;

const CREATE_USER_SUBSCRIPTION = /* GraphQL */ `
  mutation CreateUserSubscription($input: CreateUserSubscriptionInput!) {
    createUserSubscription(input: $input) {
      id
      userId
      subscription
      userLat
      userLng
    }
  }
`;

const UPDATE_USER_SUBSCRIPTION = /* GraphQL */ `
  mutation UpdateUserSubscription($input: UpdateUserSubscriptionInput!) {
    updateUserSubscription(input: $input) {
      id
      userLat
      userLng
    }
  }
`;

const sweetPotatoIcon = L.divIcon({
  html: '<div style="font-size: 35px; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3));">🍠</div>',
  className: "empty-class",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -18],
});

const userLocationIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 28px; height: 28px; border-radius: 999px; background: rgba(58, 134, 255, 0.24); border: 2px solid rgba(255, 255, 255, 0.95);"></div>
      <div style="position: relative; width: 14px; height: 14px; border-radius: 999px; background: #3a86ff; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.25);"></div>
    </div>
  `,
  className: "empty-class",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});



function Modal({ title, content, onClose, color = "#d35400" }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(92vw, 440px)",
          maxHeight: "82vh",
          overflowY: "auto",
          background: "#fffaf2",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
          border: `4px solid ${color}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: "1.2rem",
            fontWeight: "bold",
            color,
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          {title}
        </div>

        <div>{content}</div>

        <div style={{ marginTop: "18px", textAlign: "center" }}>
          <button
            onClick={onClose}
            style={{
              background: color,
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 28px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function MapAutoPan({ vanPos, userPos }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  // 初回のみ: 芋マーカーとユーザー位置を両方表示
  useEffect(() => {
    if (hasFittedRef.current) return;
    if (vanPos?.lat && vanPos?.lng && userPos?.lat && userPos?.lng) {
      const bounds = L.latLngBounds(
        [
          [vanPos.lat, vanPos.lng],
          [userPos.lat, userPos.lng],
        ],
      );
      map.fitBounds(bounds.pad(0.35), { animate: true });
      hasFittedRef.current = true;
    } else if (vanPos?.lat && vanPos?.lng) {
      map.setView([vanPos.lat, vanPos.lng], 15, { animate: true });
      hasFittedRef.current = true;
    }
  }, [map, vanPos, userPos]);

  // 以降は常に芋マーカーを中心に追従
  useEffect(() => {
    if (!hasFittedRef.current) return;
    if (vanPos?.lat && vanPos?.lng) {
      map.setView([vanPos.lat, vanPos.lng], map.getZoom(), { animate: true });
    }
  }, [map, vanPos]);

  return null;
}

export default function CustomerPage() {
  const clientRef = useRef(null);
  if (!clientRef.current) {
    clientRef.current = generateClient();
  }
  const client = clientRef.current;

  const [vanPos, setVanPos] = useState(null);
  const [vanHistory, setVanHistory] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [isGeofenceOn, setIsGeofenceOn] = useState(false);
  const [userSubscriptionId, setUserSubscriptionId] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [weatherPhrase, setWeatherPhrase] = useState("");
  const [config, setConfig] = useState({ menu: [], schedule: [] });
  const [showNotifyInfo, setShowNotifyInfo] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState(null);

  const lastToggleAtRef = useRef(0);
  const isMountedRef = useRef(true);
  const userSubscriptionIdRef = useRef(null);

  useEffect(() => {
    userSubscriptionIdRef.current = userSubscriptionId;
  }, [userSubscriptionId]);

  const handleNotifyButtonPress = (e) => {
    e.preventDefault();
    e.stopPropagation();

    toggleGeofence();
  };

  const toggleGeofence = async () => {
    if (isGeofenceOn) {
      setIsGeofenceOn(false);
      setNotifyStatus("通知OFFにしたバイ！");
      setTimeout(() => setNotifyStatus(null), 2000);
      return;
    }

    if (!("Notification" in window)) {
      setNotifyStatus("このブラウザは通知機能に対応してないバイ...");
      setTimeout(() => setNotifyStatus(null), 3000);
      return;
    }

    try {
      const now = Date.now();
      if (now - lastToggleAtRef.current < 500) return;
      lastToggleAtRef.current = now;

      // 1. 先にUIを動かす（体感速度アップ）
      setNotifyStatus("通知ONにしたバイ！...（登録中）");

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        if (permission === "denied") {
          setNotifyStatus("通知がブロックされてるバイ！設定から許可してね！");
        } else {
          setNotifyStatus("通知を許可してもらわないとONにできんバイ...");
        }
        setTimeout(() => setNotifyStatus(null), 3000);
        return;
      }

      // 2. 裏で非同期にFCMトークン取得・保存
      // firebase-messaging-sw.js を明示的に登録・取得（sw.js との混同を防ぐ）
      let reg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
      if (!reg) {
        reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      }
      // アクティブになるまで待つ
      if (reg.installing || reg.waiting) {
        await new Promise((resolve) => {
          const worker = reg.installing || reg.waiting;
          worker.addEventListener("statechange", function onState() {
            if (worker.state === "activated") {
              worker.removeEventListener("statechange", onState);
              resolve();
            }
          });
        });
      }

      const fcmToken = await getToken(messaging, {
        vapidKey: FCM_VAPID_KEY,
        serviceWorkerRegistration: reg,
      });

      if (!fcmToken) {
        setNotifyStatus("FCMトークンの取得に失敗したバイ...");
        setTimeout(() => setNotifyStatus(null), 3000);
        return;
      }

      console.log("FCMトークン取得成功:", fcmToken);

      const gpsPos = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: userPos?.lat ?? null, lng: userPos?.lng ?? null }),
          { enableHighAccuracy: true, timeout: 10000 },
        );
      });

      await fetch(AWS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: gpsPos.lat,
          lng: gpsPos.lng,
          token: fcmToken,
        }),
      });
      console.log("あなたの周り1kmに柵を張ったバイ！");

      const currentLat = gpsPos.lat;
      const currentLng = gpsPos.lng;
      const guestUserId = `guest-${Date.now()}`;

      const response = await client.graphql({
        query: CREATE_USER_SUBSCRIPTION,
        variables: {
          input: {
            userId: guestUserId,
            subscription: fcmToken,
            userLat: currentLat,
            userLng: currentLng,
          },
        },
        authMode: "apiKey",
      });

      if (response?.data?.createUserSubscription?.id) {
        setUserSubscriptionId(response.data.createUserSubscription.id);
      }

      // 3. 完了したらメッセージを更新
      setIsGeofenceOn(true);
      setShowNotifyInfo(true);
      setNotifyStatus("通知ONになったバイ！準備万端バイ！");
    } catch (err) {
      console.error("通知許可エラー:", err);
      setNotifyStatus("通知の設定に失敗したバイ...");
      setIsGeofenceOn(false);
    } finally {
      setTimeout(() => setNotifyStatus(null), 2500);
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (vanPos && vanPos.lat && vanPos.lng && vanPos.isOperating) {
      setVanHistory((prev) => {
        const now = Date.now();
        const filtered = prev.filter((h) => now - h.timestamp < 60000);

        if (filtered.length > 0) {
          const last = filtered[filtered.length - 1];
          if (
            Math.abs(last.lat - vanPos.lat) < 0.00001 &&
            Math.abs(last.lng - vanPos.lng) < 0.00001
          ) {
            return filtered;
          }
        }

        return [
          ...filtered,
          { lat: vanPos.lat, lng: vanPos.lng, timestamp: now },
        ];
      });
    }
  }, [vanPos]);

  useEffect(() => {
    if (isGeofenceOn && vanPos && userPos) {
      const dist = getDistance(userPos.lat, userPos.lng, vanPos.lat, vanPos.lng);

      if (dist <= 1000) {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready
            .then((registration) => {
              registration.showNotification("ホカホカのお知らせ！🍠", {
                body: `焼き芋屋さんが1km圏内に来たバイ！今の距離は約${Math.round(dist)}m。`,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                vibrate: [200, 100, 200],
              });
            })
            .catch((err) => {
              console.error("通知表示エラー:", err);
            });
        }

        setIsGeofenceOn(false);
      }
    }
  }, [vanPos, userPos, isGeofenceOn]);

  useEffect(() => {
    isMountedRef.current = true;

    const loadStoreAndConfig = async () => {
      try {
        const latest = await client.graphql({
          query: getStore,
          variables: { id: VAN_ID },
          authMode: "apiKey",
        });

        const store = latest?.data?.getStore;
        if (store?.id === VAN_ID) {
          setVanPos(store.isOperating ? store : null);
        }

        const configResponse = await client.graphql({
          query: GET_CONFIG,
          variables: { id: CONFIG_ID },
          authMode: "apiKey",
        });

        if (configResponse?.data?.getConfig) {
          setConfig({
            menu: JSON.parse(configResponse.data.getConfig.menuJson || "[]"),
            schedule: JSON.parse(configResponse.data.getConfig.scheduleJson || "[]"),
          });
        }
      } catch (e) {
        console.error("公開データの取得エラー:", e);
      }
    };

    loadStoreAndConfig();

    console.log("🔵 店主位置購読を開始");
    const subShopObs = client.graphql({
      query: onUpdateStore,
      authMode: "apiKey",
    });

    const subShop = subShopObs.subscribe({
      next: ({ data }) => {
        console.log("📍 店主位置更新受信:", data);

        if (!isMountedRef.current) return;

        try {
          const updated = data?.onUpdateStore;
          if (!updated) return;

          if (updated.id === VAN_ID && updated.isOperating) {
            setVanPos(updated);
          } else if (updated.id === VAN_ID && !updated.isOperating) {
            setVanPos(null);
          }
        } catch (parseErr) {
          console.error("🔴 店主位置の設定中にエラー:", parseErr);
        }
      },
      error: (err) => {
        console.error("🔴 店主位置の購読エラー:", err);
      },
      complete: () => {
        console.log("✅ 店主位置購読完了");
      },
    });

    console.log("🟢 設定更新購読を開始");
    const subConfigObs = client.graphql({
      query: ON_UPDATE_CONFIG,
      authMode: "apiKey",
    });

    const subConfig = subConfigObs.subscribe({
      next: ({ data }) => {
        console.log("⚙️ 設定更新受信:", data);

        if (!isMountedRef.current) return;

        try {
          if (!data?.onUpdateConfig) return;
          if (data.onUpdateConfig.id === CONFIG_ID) {
            const menu = JSON.parse(data.onUpdateConfig.menuJson || "[]");
            const schedule = JSON.parse(data.onUpdateConfig.scheduleJson || "[]");
            setConfig({ menu, schedule });
          }
        } catch (parseErr) {
          console.error("🔴 設定データ解析エラー:", parseErr);
        }
      },
      error: (err) => {
        console.error("🔴 設定更新購読エラー:", err);
      },
      complete: () => {
        console.log("✅ 設定更新購読完了");
      },
    });

    let watchId;
    const pollingId = window.setInterval(loadStoreAndConfig, 10000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserPos({ lat, lng });
        },
        (err) => console.error(err),
        { enableHighAccuracy: true },
      );

      let lastUpdateTime = 0;

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserPos({ lat, lng });

          const now = Date.now();
          if (now - lastUpdateTime > 5000) {
            lastUpdateTime = now;
            const currentSubscriptionId = userSubscriptionIdRef.current;
            if (currentSubscriptionId) {
              client
                .graphql({
                  query: UPDATE_USER_SUBSCRIPTION,
                  variables: {
                    input: {
                      id: currentSubscriptionId,
                      userLat: lat,
                      userLng: lng,
                    },
                  },
                  authMode: "apiKey",
                })
                .catch((err) => console.log("位置更新エラー:", err));
            }
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true },
      );
    }

    return () => {
      console.log("🟠 CustomerPage クリーンアップ開始");
      isMountedRef.current = false;
      subShop.unsubscribe();
      subConfig.unsubscribe();
      window.clearInterval(pollingId);
      if (watchId) navigator.geolocation.clearWatch(watchId);
      console.log("🟠 CustomerPage クリーンアップ完了");
    };
  }, [client]);

  const fetchWeatherPhrase = async () => {
    setWeatherPhrase("おじさん考え中じゃ...");

    try {
      const weatherRes = await fetch(
        `https://weather.tsukumijima.net/api/forecast/city/440020?cache=${Date.now()}`,
      );
      const wData = await weatherRes.json();
      const telop = wData?.forecasts?.[0]?.telop ?? "晴れ";
      const temp = wData?.forecasts?.[0]?.temperature?.max?.celsius ?? "20";

      const candidates = [
        `${telop}の日も、焼き芋は心にしみるバイ！`,
        `最高気温${temp}℃。そんな日こそホクホクいも日和じゃ！`,
        `お天気は${telop}、お芋はいつでも食べごろバイ！`,
      ];

      setWeatherPhrase(candidates[Math.floor(Math.random() * candidates.length)]);
    } catch (err) {
      setWeatherPhrase("おっと、通信がよくなかみたいじゃ。焼き芋は熱々バイ！");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        position: "relative",
        backgroundColor: "#fdf5e6",
      }}
    >
      {notifyStatus && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999999,
            background: "#333",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 20,
            fontSize: "0.95rem",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {notifyStatus}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 999999,
          textAlign: "center",
          pointerEvents: "auto",
          padding: "10px",
        }}
      >
        <button
          type="button"
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            handleNotifyButtonPress(e);
          }}
          onClick={handleNotifyButtonPress}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = "scale(0.85)";
          }}
          onTouchCancel={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
          style={{
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            background: isGeofenceOn ? "#ff7e5f" : "#ffffff",
            border: isGeofenceOn ? "5px solid #fff" : "5px solid #d35400",
            boxShadow: isGeofenceOn
              ? "0 6px 20px rgba(255,126,95,0.6), 0 0 0 3px rgba(255,126,95,0.3)"
              : "0 6px 20px rgba(211,84,0,0.5), 0 0 0 3px rgba(211,84,0,0.2)",
            fontSize: "1.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease-out",
            touchAction: "manipulation",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
            transform: "scale(1)",
          }}
        >
          {isGeofenceOn ? (
            <Bell size={30} color="#ffffff" strokeWidth={3} />
          ) : (
            <BellOff size={30} color="#d35400" strokeWidth={3} />
          )}
        </button>

        <div
          style={{
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: "0.65rem",
            padding: "3px 8px",
            borderRadius: "12px",
            marginTop: "6px",
            fontWeight: "bold",
          }}
        >
          {isGeofenceOn ? "通知ON" : "通知OFF"}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "15px",
          left: "15px",
          zIndex: 1000,
          background: "linear-gradient(135deg, #d35400 0%, #e67e22 100%)",
          padding: "12px 20px",
          borderRadius: "18px",
          boxShadow: "0 6px 15px rgba(0,0,0,0.2)",
          border: "3px solid #fff",
          color: "#fff",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "1.1rem",
            fontFamily: "'M PLUS Rounded 1c'",
            letterSpacing: "1px",
          }}
        >
          🍠 どんなとき芋 巡り店
        </h1>

        <div
          style={{
            display: "inline-block",
            marginTop: "5px",
            padding: "2px 10px",
            borderRadius: "10px",
            background: vanPos ? "#2ecc71" : "#95a5a6",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}
        >
          {vanPos ? "● 営業中バイ！" : "● お休み中バイ"}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "30px",
          left: 0,
          width: "100%",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          padding: "0 15px",
        }}
      >
        {[
          {
            label: "おしながき",
            icon: "📙",
            color: "#d35400",
            action: () => setShowMenu(true),
          },
          {
            label: "EVENT",
            icon: "🗓️",
            color: "#2980b9",
            action: () => setShowCalendar(true),
          },
          {
            label: "MY POINT",
            icon: "✨",
            color: "#8e44ad",
            action: () => setShowMyPage(true),
          },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            style={{
              flex: 1,
              maxWidth: "110px",
              height: "75px",
              borderRadius: "20px",
              background: "#fff",
              border: `3px solid ${btn.color}`,
              boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>{btn.icon}</span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "900",
                color: btn.color,
              }}
            >
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      <MapContainer
        center={[33.321, 130.941]}
        zoom={15}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapAutoPan
          vanPos={vanPos?.isOperating ? { lat: vanPos.lat, lng: vanPos.lng } : null}
          userPos={userPos}
        />

        {userPos && (
          <Marker position={[userPos.lat, userPos.lng]} icon={userLocationIcon}>
            <Popup>
              <div style={{ textAlign: "center", padding: "4px 6px" }}>
                <strong style={{ color: "#1d4ed8" }}>あなたの現在地</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {vanHistory.map((h) => (
          <Marker
            key={h.timestamp}
            position={[h.lat, h.lng]}
            icon={L.divIcon({
              html: '<div style="width:18px;height:18px;border-radius:50%;background:rgba(255,220,40,0.85);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.18);"></div>',
              className: "empty-class",
              iconSize: [18, 18],
              iconAnchor: [9, 9],
              popupAnchor: [0, -8],
            })}
          />
        ))}

        {vanPos?.isOperating && (
          <Marker
            position={[vanPos.lat, vanPos.lng]}
            icon={sweetPotatoIcon}
            eventHandlers={{ click: fetchWeatherPhrase }}
          >
            <Popup>
              <div style={{ textAlign: "center", padding: "5px" }}>
                <strong style={{ color: "#9913b7" }}>どんなとき芋 巡り店</strong>
                <br />
                <hr />
                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#d35400",
                    fontWeight: "bold",
                  }}
                >
                  {weatherPhrase || "ほっこり焼けちょるバイ！"}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {showNotifyInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowNotifyInfo(false)}
        >
          <div
            style={{
              width: "min(80vw, 320px)",
              background: "#fffaf2",
              borderRadius: "20px",
              padding: "24px 20px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
              border: "4px solid #ff7e5f",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "#ff7e5f",
                marginBottom: "12px",
              }}
            >
              通知ONになったバイ！
            </div>

            <div style={{ fontSize: "1rem", color: "#333", marginBottom: "16px" }}>
              焼きいも屋さんが近く(1km圏内)に来たら
              <br />
              通知でお知らせするけんね！
            </div>

            <div
              style={{
                background: "#fff8f0",
                border: "2px solid #ffcc88",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "20px",
                textAlign: "left",
                fontSize: "0.88rem",
                color: "#555",
                lineHeight: "1.7",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "0.9rem", color: "#333" }}>
                【通知を届かせるためのお願い】
              </div>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ color: "#27ae60", fontWeight: "bold" }}>🙆 これなら届くバイ！</span>
                <br />
                ・別のアプリを使いよってもOK！
                <br />
                ・画面を真っ暗（スリープ）にしてもOK！
              </div>
              <div>
                <span style={{ color: "#e74c3c", fontWeight: "bold" }}>🙅 これだと届かんバイ…</span>
                <br />
                ・アプリを上にスワイプして
                <br />
                　「完全に終了」させること
              </div>
            </div>

            <button
              onClick={() => setShowNotifyInfo(false)}
              style={{
                background: "#ff7e5f",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 48px",
                fontSize: "1.1rem",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              OK！
            </button>
          </div>
        </div>
      )}

      {showMenu && (
        <Modal
          title="おしながき"
          color="#d35400"
          onClose={() => setShowMenu(false)}
          content={
            <div>
              {config.menu.length > 0 ? (
                config.menu.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom:
                        idx < config.menu.length - 1
                          ? "1px solid #eee"
                          : "none",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: "1.1rem",
                        color: "#d35400",
                        fontWeight: "bold",
                      }}
                    >
                      ¥{item.price}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", color: "#999" }}>
                  メニュー準備中バイ！
                </p>
              )}
            </div>
          }
        />
      )}

      {showCalendar && (
        <Modal
          title="出店予定"
          color="#91D370"
          onClose={() => setShowCalendar(false)}
          content={
            <div>
              {config.schedule.length > 0 ? (
                config.schedule.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px",
                      marginBottom: "10px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      borderLeft: "4px solid #91D370",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.9rem",
                        color: "#666",
                        marginBottom: "4px",
                      }}
                    >
                      📅 {item.date}
                    </div>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        color: "#333",
                      }}
                    >
                      📍 {item.place}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", color: "#999" }}>
                  イベント出店募集中！
                </p>
              )}
            </div>
          }
        />
      )}

      {showMyPage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "white",
            zIndex: 3000,
            overflowY: "auto",
            padding: "20px",
          }}
        >
          <button
            onClick={() => setShowMyPage(false)}
            style={{
              marginBottom: "20px",
              background: "#666",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              cursor: "pointer",
            }}
          >
            ← 戻る
          </button>

          <Authenticator>
            {({ signOut, user }) => (
              <PointCard user={user} signOut={signOut} />
            )}
          </Authenticator>
        </div>
      )}
    </div>
  );
}