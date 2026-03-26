// VAPID公開鍵（あなたの値に置き換えてください）
const VAPID_PUBLIC_KEY = "ここにあなたの公開鍵";

// Base64→Uint8Array変換関数
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 通知ON処理
const enableNotification = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("通知が許可されてないバイ");
      return;
    }

    const reg = await navigator.serviceWorker.ready;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const guestUserId = `guest-${Date.now()}`;

    // 🔥 ① GraphQLに保存
    await client.graphql({
      query: CREATE_USER_SUBSCRIPTION,
      variables: {
        input: {
          userId: guestUserId,
          subscription: JSON.stringify(sub),
        },
      },
      authMode: "apiKey",
    });

    // 🔥 ② Geofence登録
    if (userPos?.lat && userPos?.lng) {
      await registerUserGeofence(guestUserId, userPos.lat, userPos.lng);
    }

    alert("通知ONになったバイ🔥");
  } catch (err) {
    console.error(err);
    alert("通知設定でエラー");
  }
};
import {
  LocationClient,
  PutGeofenceCommand,
} from "@aws-sdk/client-location";
import React, { useEffect, useRef, useState } from "react";
import {
  LocationClient,
  PutGeofenceCommand,
} from "@aws-sdk/client-location";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import amplifyconfig from "../amplifyconfiguration.json";
import { getStore } from "../graphql/queries";
import { onUpdateStore } from "../graphql/subscriptions";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bell, BellOff } from "lucide-react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import PointCard from "../components/PointCard.jsx";

import {
  LocationClient,
  PutGeofenceCommand,
} from "@aws-sdk/client-location";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import amplifyconfig from "../amplifyconfiguration.json";
import { getStore } from "../graphql/queries";
import { onUpdateStore } from "../graphql/subscriptions";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bell, BellOff } from "lucide-react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import PointCard from "../components/PointCard.jsx";


// ...既存のGraphQL定義・UI・ロジックは前回案内の通り、全て上書き済み...
Amplify.configure(amplifyconfig);
const client = generateClient();


const locationClient = new LocationClient({ region: "ap-northeast-1" });
const GEOFENCE_COLLECTION = "CustomersGeofence";
const VAN_ID = "KEI-VAN-001";
const CONFIG_ID = "GLOBAL-CONFIG";

function createCirclePolygon(lat, lng, radiusKm) {
  const points = 32;
  const coords = [];
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]); // ←重要：lng, lat
  }
  return [coords];
}

const registerUserGeofence = async (userId, lat, lng) => {
  try {
    const polygon = createCirclePolygon(lat, lng, 1);
    const command = new PutGeofenceCommand({
      CollectionName: GEOFENCE_COLLECTION,
      GeofenceId: userId,
      Geometry: {
        Polygon: polygon,
      },
    });
    await locationClient.send(command);
    console.log("ジオフェンス登録成功");
  } catch (err) {
    console.error("ジオフェンス登録失敗:", err);
  }
};

const GET_CONFIG = /* GraphQL */ `
  query GetConfig($id: ID!) {
    getConfig(id: $id) {
      id
      menuJson
      scheduleJson
    }
  }
`;

const ON_UPDATE_CONFIG = /* GraphQL */ `
  subscription OnUpdateConfig {
    onUpdateConfig {
      id
      menuJson
      scheduleJson
    }
  }
`;

const CREATE_AREA = /* GraphQL */ `
  mutation CreateArea($input: CreateAreaInput!) {
    createArea(input: $input) {
      id
      name
      lat
      lng
      catchCopy
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

function CustomerPage() {
  const [vanPos, setVanPos] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [isGeofenceOn, setIsGeofenceOn] = useState(false);
  const [showNotifyInfo, setShowNotifyInfo] = useState(false);
  const [vanHistory, setVanHistory] = useState([]);
  const [config, setConfig] = useState({ menu: [], schedule: [] });
  const [userSubscriptionId, setUserSubscriptionId] = useState(null);

  const lastToggleAtRef = useRef(0);
  const registeredRef = useRef(false);

  // Areaテーブルにも登録したい場合は下記を利用
  const registerUserGeofenceArea = async (userId, lat, lng) => {
    try {
      const input = {
        name: userId,
        lat,
        lng,
        catchCopy: "1kmの柵登録",
      };

      await client.graphql({
        query: CREATE_AREA,
        variables: { input },
        authMode: "apiKey",
      });

      console.log("1kmの柵をGraphQLで登録したバイ！");
    } catch (err) {
      console.error("柵の登録に失敗したバイ…", err);
    }
  };

  useEffect(() => {
    const loadStore = async () => {
      try {
        const res = await client.graphql({
          query: getStore,
          variables: { id: VAN_ID },
          authMode: "apiKey",
        });

        const store = res.data?.getStore;
        if (store?.isOperating) {
          setVanPos(store);
        } else {
          setVanPos(null);
        }
      } catch (e) {
        console.error("Store Load Error", e);
      }
    };

    loadStore();
  }, []);

  useEffect(() => {
    const sub = client
      .graphql({
        query: onUpdateStore,
        authMode: "apiKey",
      })
      .subscribe({
        next: ({ data }) => {
          const updated = data?.onUpdateStore;
          if (!updated) return;
          if (updated.id !== VAN_ID) return;

          if (updated.isOperating) {
            setVanPos(updated);
          } else {
            setVanPos(null);
          }
        },
        error: (err) => {
          console.error("Store subscription error", err);
        },
      });

    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await client.graphql({
          query: GET_CONFIG,
          variables: { id: CONFIG_ID },
          authMode: "apiKey",
        });

        if (res.data?.getConfig) {
          setConfig({
            menu: JSON.parse(res.data.getConfig.menuJson || "[]"),
            schedule: JSON.parse(res.data.getConfig.scheduleJson || "[]"),
          });
        }
      } catch (e) {
        console.error("Config Load Error", e);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    const sub = client
      .graphql({
        query: ON_UPDATE_CONFIG,
        authMode: "apiKey",
      })
      .subscribe({
        next: ({ data }) => {
          const updated = data?.onUpdateConfig;
          if (!updated) return;
          if (updated.id !== CONFIG_ID) return;

          setConfig({
            menu: JSON.parse(updated.menuJson || "[]"),
            schedule: JSON.parse(updated.scheduleJson || "[]"),
          });
        },
        error: (err) => {
          console.error("Config subscription error", err);
        },
      });

    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos({ lat, lng });

        if (!registeredRef.current) {
          registeredRef.current = true;
          const tempUserId = `guest-${Math.floor(Math.random() * 100000)}`;
          await registerUserGeofence(tempUserId, lat, lng);
        }

        if (userSubscriptionId) {
          client
            .graphql({
              query: UPDATE_USER_SUBSCRIPTION,
              variables: {
                input: {
                  id: userSubscriptionId,
                  userLat: lat,
                  userLng: lng,
                },
              },
              authMode: "apiKey",
            })
            .catch((err) => console.log("位置更新エラー:", err));
        }
      },
      (err) => {
        console.error("現在地取得エラー:", err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userSubscriptionId]);

  useEffect(() => {
    if (vanPos?.lat && vanPos?.lng && vanPos?.isOperating) {
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

        return [...filtered, { lat: vanPos.lat, lng: vanPos.lng, timestamp: now }];
      });
    }
  }, [vanPos]);

  // 通知ボタン押下時の処理（enableNotificationを呼ぶだけの例）
  const handleNotifyButtonPress = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - lastToggleAtRef.current < 500) return;
    lastToggleAtRef.current = now;

    enableNotification();
  };

  const toggleGeofence = async () => {
    if (isGeofenceOn) {
      setIsGeofenceOn(false);
      alert("通知OFFにしたバイ！");
      return;
    }

    if (!("Notification" in window)) {
      alert("このブラウザは通知機能に対応してないバイ...");
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        navigator.serviceWorker.ready
          .then(async (reg) => {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: "あなたのVAPID公開鍵",
            });

            const subObj = sub.toJSON ? sub.toJSON() : sub;
            const currentLat = userPos?.lat ?? null;
            const currentLng = userPos?.lng ?? null;
            const guestUserId = `guest-${Date.now()}`;

            // Areaテーブル登録（従来）
            await registerUserGeofenceArea(guestUserId, currentLat, currentLng);

            // UserSubscription保存
            const response = await client.graphql({
              query: CREATE_USER_SUBSCRIPTION,
              variables: {
                input: {
                  userId: guestUserId,
                  subscription: JSON.stringify(subObj),
                  userLat: currentLat,
                  userLng: currentLng,
                },
              },
              authMode: "apiKey",
            });

            if (response.data?.createUserSubscription?.id) {
              setUserSubscriptionId(response.data.createUserSubscription.id);
              // UserSubscription保存後にジオフェンス登録
              if (currentLat && currentLng) {
                await registerUserGeofence(guestUserId, currentLat, currentLng);
              }
            }
          })
          .catch((e) => console.log("SW準備中...", e));

        setIsGeofenceOn(true);
        setShowNotifyInfo(true);
      } else if (permission === "denied") {
        alert("通知がブロックされてるバイ！\n\nブラウザ設定から通知を許可してね。");
      } else {
        alert("通知を許可してもらわないとONにできんバイ...");
      }
    } catch (err) {
      console.error("通知許可エラー:", err);
      alert("通知の設定に失敗したバイ...");
      setIsGeofenceOn(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        position: "relative",
        backgroundColor: "#fdf5e6",
        overflow: "hidden",
      }}
    >
      {/* 通知ONボタン例 */}
      <div style={{ position: "absolute", top: 90, right: 20, zIndex: 10000 }}>
        <button onClick={enableNotification} style={{ fontSize: "1.1rem", padding: "10px 18px", borderRadius: 8, background: "#ff7e5f", color: "#fff", border: "none", fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          🔔 通知ON
        </button>
      </div>
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

      <MapContainer
        center={[33.321, 130.941]}
        zoom={15}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {userPos && (
          <Marker position={[userPos.lat, userPos.lng]} icon={userLocationIcon}>
            <Popup>
              <div style={{ textAlign: "center", padding: "4px 6px" }}>
                <strong style={{ color: "#1d4ed8" }}>あなたの現在地</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {vanHistory.map((h, idx) => (
          <Marker
            key={`${h.timestamp}-${idx}`}
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
          <Marker position={[vanPos.lat, vanPos.lng]} icon={sweetPotatoIcon}>
            <Popup>
              <div style={{ textAlign: "center", padding: "5px" }}>
                <strong style={{ color: "#9913b7" }}>どんなとき芋 巡り店</strong>
                <br />
                <hr />
                <p style={{ margin: "5px 0 0", color: "#d35400", fontWeight: "bold" }}>
                  ほっこり焼けちょるバイ！
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

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
        <button
          onClick={() => setShowMenu(true)}
          style={{
            flex: 1,
            maxWidth: "110px",
            height: "75px",
            borderRadius: "20px",
            background: "#fff",
            border: "3px solid #d35400",
            boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>📙</span>
          <span style={{ fontSize: "0.75rem", fontWeight: "900", color: "#d35400" }}>
            おしながき
          </span>
        </button>

        <button
          onClick={() => setShowCalendar(true)}
          style={{
            flex: 1,
            maxWidth: "110px",
            height: "75px",
            borderRadius: "20px",
            background: "#fff",
            border: "3px solid #d35400",
            boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>🗓️</span>
          <span style={{ fontSize: "0.75rem", fontWeight: "900", color: "#d35400" }}>
            EVENT
          </span>
        </button>

        <button
          onClick={() => setShowMyPage(true)}
          style={{
            flex: 1,
            maxWidth: "110px",
            height: "75px",
            borderRadius: "20px",
            background: "#fff",
            border: "3px solid #d35400",
            boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>✨</span>
          <span style={{ fontSize: "0.75rem", fontWeight: "900", color: "#d35400" }}>
            MY POINT
          </span>
        </button>
      </div>

      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "15px",
              width: "85%",
              maxWidth: "420px",
              whiteSpace: "pre-wrap",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                background: "#d35400",
                color: "#fff",
                borderTopLeftRadius: "15px",
                borderTopRightRadius: "15px",
                padding: "16px 0 10px 0",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "1.25rem",
              }}
            >
              おしながき
            </div>

            <div
              style={{
                fontSize: "1.1rem",
                lineHeight: "1.6",
                margin: "20px 0",
                padding: "0 18px",
                maxHeight: "50vh",
                overflowY: "auto",
              }}
            >
              {config.menu.length > 0 ? (
                config.menu.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: idx < config.menu.length - 1 ? "1px solid #eee" : "none",
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
                <p style={{ textAlign: "center", color: "#999" }}>メニュー準備中バイ！</p>
              )}
            </div>

            <button
              onClick={() => setShowMenu(false)}
              style={{
                width: "90%",
                margin: "0 auto 18px auto",
                display: "block",
                padding: "12px",
                background: "#e6ecf1",
                color: "#444",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {showCalendar && (
        <div
          onClick={() => setShowCalendar(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "15px",
              width: "85%",
              maxWidth: "420px",
              whiteSpace: "pre-wrap",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                background: "#91D370",
                color: "#fff",
                borderTopLeftRadius: "15px",
                borderTopRightRadius: "15px",
                padding: "16px 0 10px 0",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "1.25rem",
              }}
            >
              出店予定
            </div>

            <div
              style={{
                fontSize: "1.1rem",
                lineHeight: "1.6",
                margin: "20px 0",
                padding: "0 18px",
                maxHeight: "50vh",
                overflowY: "auto",
              }}
            >
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
                    <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "4px" }}>
                      📅 {item.date}
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#333" }}>
                      📍 {item.place}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", color: "#999" }}>イベント出店募集中！</p>
              )}
            </div>

            <button
              onClick={() => setShowCalendar(false)}
              style={{
                width: "90%",
                margin: "0 auto 18px auto",
                display: "block",
                padding: "12px",
                background: "#e6ecf1",
                color: "#444",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {showNotifyInfo && (
        <div
          onClick={() => setShowNotifyInfo(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 2500,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "15px",
              width: "85%",
              maxWidth: "420px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#ff7e5f" }}>通知ONになったバイ！</h2>
            <p>
              焼きいも屋さんが近くに来たら
              <br />
              通知でお知らせするけんね！
            </p>
            <button
              onClick={() => setShowNotifyInfo(false)}
              style={{
                background: "#27ae60",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 40px",
                fontSize: "1.1rem",
                fontWeight: "bold",
              }}
            >
              OK！
            </button>
          </div>
        </div>
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
          <button onClick={() => setShowMyPage(false)} style={{ marginBottom: "20px" }}>
            ← 戻る
          </button>

          <Authenticator>
            {({ signOut, user }) => <PointCard user={user} signOut={signOut} />}
          </Authenticator>
        </div>
      )}
    </div>
  );
}

export default CustomerPage;