import React, { useEffect, useRef, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AdminPointPanel from "../components/AdminPointPanel.jsx";

import { getStore } from "../graphql/queries";
import { updateStore, createStore } from "../graphql/mutations";

function MapFollow({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (pos) {
      map.setView(pos, map.getZoom(), { animate: true });
    }
  }, [map, pos]);
  return null;
}

const VAN_ID = "KEI-VAN-001";
const CONFIG_ID = "GLOBAL-CONFIG";
const TRACKER_SYNC_URL = "https://72flap745ckwg2dk7by7rvlqmm0rvupv.lambda-url.ap-northeast-1.on.aws/";

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

const UPDATE_CONFIG = /* GraphQL */ `
  mutation UpdateConfig($input: UpdateConfigInput!) {
    updateConfig(input: $input) {
      id
      menuJson
      scheduleJson
      dummy
    }
  }
`;

const CREATE_CONFIG = /* GraphQL */ `
  mutation CreateConfig($input: CreateConfigInput!) {
    createConfig(input: $input) {
      id
      menuJson
      scheduleJson
      dummy
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

async function syncTracker(id, lat, lng, isOperating, forceEnter = false) {
  try {
    await fetch(TRACKER_SYNC_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify({
        id,
        lat,
        lng,
        isOperating,
        forceEnter,
      }),
    });
  } catch (err) {
    console.error("Tracker同期エラー:", err);
  }
}

function AdminPage({ signOut }) {
  const [editType, setEditType] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [myPos, setMyPos] = useState([33.321, 130.941]);
  const [menuItems, setMenuItems] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const clientRef = useRef(null);
  if (!clientRef.current) {
    clientRef.current = generateClient();
  }
  const client = clientRef.current;

  const watchIdRef = useRef(null);
  const lastStoreUpdateAtRef = useRef(0);
  const isSendingStoreUpdateRef = useRef(false);
  const trackingErrorShownRef = useRef(false);
  const isFirstPositionRef = useRef(true);

  useEffect(() => {
    const manifestTag = document.querySelector('link[rel="manifest"]');
    if (manifestTag) {
      manifestTag.setAttribute("href", "/manifest-admin.json");
    }

    return () => {
      if (manifestTag) {
        manifestTag.setAttribute("href", "/manifest.json");
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const res = await client.graphql({
          query: GET_CONFIG,
          variables: { id: CONFIG_ID },
          authMode: "userPool",
        });

        const conf = res?.data?.getConfig;
        if (!cancelled && conf) {
          setMenuItems(JSON.parse(conf.menuJson || "[]"));
          setScheduleItems(JSON.parse(conf.scheduleJson || "[]"));
        }
      } catch (e) {
        console.error("Config Load Error", e);
      }
    };

    const loadStore = async () => {
      try {
        const res = await client.graphql({
          query: getStore,
          variables: { id: VAN_ID },
          authMode: "userPool",
        });

        const store = res?.data?.getStore;
        if (!cancelled && store) {
          if (typeof store.lat === "number" && typeof store.lng === "number") {
            setMyPos([store.lat, store.lng]);
          }
          if (store.isOperating) {
            setIsTracking(true);
          }
        }
      } catch (e) {
        console.error("Store Load Error", e);
      }
    };

    loadConfig();
    loadStore();

    return () => {
      cancelled = true;
    };
  }, [client]);

  const saveConfig = async () => {
    // 1. 先にUIを更新（体感速度アップ）
    setStatusMessage("保存中バイ...");

    const input = {
      id: CONFIG_ID,
      menuJson: JSON.stringify(menuItems),
      scheduleJson: JSON.stringify(scheduleItems),
      dummy: `updated-${Date.now()}`,
    };

    try {
      await client.graphql({
        query: UPDATE_CONFIG,
        variables: { input },
        authMode: "userPool",
      });
      setStatusMessage("保存したバイ！");
      setEditType(null);
    } catch (e) {
      try {
        await client.graphql({
          query: CREATE_CONFIG,
          variables: { input },
          authMode: "userPool",
        });
        setStatusMessage("初回保存に成功したバイ！");
        setEditType(null);
      } catch (err) {
        console.error("Config Save Error", err);
        setStatusMessage("保存エラーバイ...");
      }
    } finally {
      setTimeout(() => setStatusMessage(null), 2000);
    }
  };

  const stopTracking = async () => {
    // 1. 先にUIを即座に更新
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsTracking(false);
    isSendingStoreUpdateRef.current = false;
    setStatusMessage("営業停止中バイ...");

    // 2. 裏で非同期にサーバー更新
    try {
      await client.graphql({
        query: updateStore,
        variables: {
          input: {
            id: VAN_ID,
            isOperating: false,
          },
        },
        authMode: "userPool",
      });
      await syncTracker(VAN_ID, myPos[0], myPos[1], false);
      setStatusMessage("営業停止を保存したバイ");
    } catch (err) {
      console.error("営業停止保存エラー:", err);
      setStatusMessage("営業停止の保存に失敗したバイ...");
    } finally {
      setTimeout(() => setStatusMessage(null), 2000);
    }
  };

  const startTracking = async () => {
    if (!navigator.geolocation) {
      alert("この端末では位置情報が使えんバイ。");
      return;
    }

    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.log("通知許可スキップ", e);
      }
    }

    trackingErrorShownRef.current = false;
    isFirstPositionRef.current = true;
    // 1. 先にUIを即座に更新（体感速度アップ）
    setIsTracking(true);
    setStatusMessage("営業開始バイ！位置情報を取得中...");
    setTimeout(() => setStatusMessage(null), 2000);

    // 2a. 即座にキャッシュ位置を取得してforceEnterを送信（GPS冷起動待ちを回避）
    //     enableHighAccuracy:false + maximumAge:60000 = キャッシュ位置を即時返す
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyPos([lat, lng]);
        // watchPosition側がforceEnterを重複送信しないよう先にフラグを落とす
        isFirstPositionRef.current = false;
        lastStoreUpdateAtRef.current = Date.now();
        isSendingStoreUpdateRef.current = true;
        const input = {
          id: VAN_ID,
          name: "どんなとき芋",
          lat,
          lng,
          isOperating: true,
        };
        try {
          await client.graphql({
            query: updateStore,
            variables: { input },
            authMode: "userPool",
          });
          await syncTracker(VAN_ID, lat, lng, true, true); // forceEnter=true
          console.log("営業開始: キャッシュ位置を即時送信したバイ！（forceEnter）");
        } catch (err) {
          console.error("即時位置送信エラー:", err);
          // 失敗した場合はwatchPositionにforceEnterを任せる
          isFirstPositionRef.current = true;
        } finally {
          isSendingStoreUpdateRef.current = false;
        }
      },
      (err) => {
        // キャッシュ位置取得失敗 → watchPositionが代わりにforceEnterする（fallback）
        console.warn("即時位置取得失敗、watchPositionに委任:", err);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 },
    );

    // 2b. 継続的な高精度GPS追跡（watchPosition）
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setMyPos([lat, lng]);

        const now = Date.now();
        if (
          now - lastStoreUpdateAtRef.current < 20000 ||
          isSendingStoreUpdateRef.current
        ) {
          return;
        }

        lastStoreUpdateAtRef.current = now;
        isSendingStoreUpdateRef.current = true;

        const input = {
          id: VAN_ID,
          name: "どんなとき芋",
          lat,
          lng,
          isOperating: true,
        };

        try {
          await client.graphql({
            query: updateStore,
            variables: { input },
            authMode: "userPool",
          });
          const shouldForceEnter = isFirstPositionRef.current;
          isFirstPositionRef.current = false;
          await syncTracker(VAN_ID, lat, lng, true, shouldForceEnter);
          console.log("店主位置を更新したバイ！" + (shouldForceEnter ? "（forceEnter）" : ""));
        } catch (err) {
          try {
            await client.graphql({
              query: createStore,
              variables: { input },
              authMode: "userPool",
            });
            const shouldForceEnter = isFirstPositionRef.current;
            isFirstPositionRef.current = false;
            await syncTracker(VAN_ID, lat, lng, true, shouldForceEnter);
            console.log("Storeを新規作成したバイ！");
          } catch (createErr) {
            console.error("Store更新/作成エラー:", createErr);
          }
        } finally {
          isSendingStoreUpdateRef.current = false;
        }
      },
      (error) => {
        if (error?.code === 3) {
          // タイムアウトは一時的なもの。watchPosition は継続する
          console.warn("位置取得タイムアウト（リトライ中）:", error);
          return;
        }
        console.error("位置取得エラー:", error);

        if (error?.code === 1 && !trackingErrorShownRef.current) {
          trackingErrorShownRef.current = true;
          alert("位置情報の権限がOFFです。設定で位置情報を許可してください。");
        }

        if (error?.code === 1) {
          stopTracking();
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      },
    );

    watchIdRef.current = watchId;
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);


  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      {statusMessage && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3000,
            background: "#333",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 20,
            fontSize: "0.95rem",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {statusMessage}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
          background: "white",
          padding: 15,
          borderRadius: 10,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ margin: "0 0 5px 0", fontSize: "18px" }}>店主モード</h2>

        <button
          onClick={() => {
            if (isTracking) {
              stopTracking();
            } else {
              startTracking();
            }
          }}
          style={{
            width: "100%",
            background: isTracking ? "#e74c3c" : "#27ae60",
            color: "white",
            padding: 10,
            borderRadius: 8,
            border: "none",
            fontWeight: "bold",
            marginTop: "6px",
          }}
        >
          {isTracking ? "🔴 配信停止" : "✅ 営業開始"}
        </button>

        <button
          onClick={signOut}
          style={{
            width: "100%",
            marginTop: "10px",
            padding: 8,
            background: "#666",
            color: "white",
            borderRadius: 5,
            border: "none",
            fontWeight: "bold",
            fontSize: "0.8rem",
          }}
        >
          🚪 ログアウト
        </button>
      </div>

      {editType === "menu" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              minWidth: 320,
              maxWidth: 480,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h2>📙 メニュー編集</h2>

            <div style={{ margin: "16px 0" }}>
              {menuItems.map((it, idx) => (
                <div
                  key={idx}
                  style={{ display: "flex", gap: 8, marginBottom: 8 }}
                >
                  <input
                    value={it.label}
                    placeholder="品名"
                    onChange={(e) =>
                      setMenuItems(
                        menuItems.map((x, i) =>
                          i === idx ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                    style={{ flex: 2, padding: 8 }}
                  />
                  <input
                    value={it.price}
                    placeholder="価格"
                    onChange={(e) =>
                      setMenuItems(
                        menuItems.map((x, i) =>
                          i === idx ? { ...x, price: e.target.value } : x,
                        ),
                      )
                    }
                    style={{ flex: 1, padding: 8 }}
                  />
                  <button
                    onClick={() =>
                      setMenuItems(menuItems.filter((_, i) => i !== idx))
                    }
                    style={{
                      background: "#e74c3c",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "0 10px",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setMenuItems([...menuItems, { label: "", price: "" }])}
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 10,
                background: "#f6f8fa",
                border: "none",
                borderRadius: 8,
              }}
            >
              ＋ 追加
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={saveConfig}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#8DD36F",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: "bold",
                }}
              >
                保存する
              </button>
              <button
                onClick={() => setEditType(null)}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#e6ecf1",
                  color: "#444",
                  border: "none",
                  borderRadius: 8,
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {editType === "schedule" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              minWidth: 320,
              maxWidth: 480,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h2>🗓️ 予定編集</h2>

            <div style={{ margin: "16px 0" }}>
              {scheduleItems.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 12,
                    padding: 10,
                    border: "1px solid #eee",
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="date"
                    value={it.date}
                    onChange={(e) =>
                      setScheduleItems(
                        scheduleItems.map((x, i) =>
                          i === idx ? { ...x, date: e.target.value } : x,
                        ),
                      )
                    }
                    style={{ padding: 8 }}
                  />
                  <input
                    value={it.place}
                    placeholder="場所"
                    onChange={(e) =>
                      setScheduleItems(
                        scheduleItems.map((x, i) =>
                          i === idx ? { ...x, place: e.target.value } : x,
                        ),
                      )
                    }
                    style={{ padding: 8 }}
                  />
                  <button
                    onClick={() =>
                      setScheduleItems(scheduleItems.filter((_, i) => i !== idx))
                    }
                    style={{
                      background: "#fee",
                      color: "red",
                      border: "none",
                      borderRadius: 6,
                      padding: 8,
                    }}
                  >
                    この予定を消す
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setScheduleItems([...scheduleItems, { date: "", place: "" }])
              }
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 10,
                background: "#f6f8fa",
                border: "none",
                borderRadius: 8,
              }}
            >
              ＋ 追加
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={saveConfig}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#8DD36F",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: "bold",
                }}
              >
                保存する
              </button>
              <button
                onClick={() => setEditType(null)}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#e6ecf1",
                  color: "#444",
                  border: "none",
                  borderRadius: 8,
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 20,
          width: "100%",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <button
          onClick={() => setEditType("menu")}
          style={{
            padding: "12px 20px",
            background: "#d35400",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontWeight: "bold",
            fontSize: "1rem",
          }}
        >
          📙 メニュー編集
        </button>

        <button
          onClick={() => setEditType("schedule")}
          style={{
            padding: "12px 20px",
            background: "#2980b9",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontWeight: "bold",
            fontSize: "1rem",
          }}
        >
          🗓️ 予定編集
        </button>

        <button
          onClick={() => setShowQR(true)}
          style={{
            padding: "12px 20px",
            background: "#8e44ad",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontWeight: "bold",
            fontSize: "1rem",
          }}
        >
          🍠 QRコード
        </button>
      </div>

      {showQR && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fffaf2",
              borderRadius: 15,
              padding: 24,
              minWidth: 320,
              maxWidth: 500,
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <AdminPointPanel />

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                onClick={() => setShowQR(false)}
                style={{
                  padding: "10px 30px",
                  background: "#e6ecf1",
                  color: "#444",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: "bold",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={myPos}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapFollow pos={myPos} />
        <Marker position={myPos} icon={sweetPotatoIcon} />
      </MapContainer>
    </div>
  );
}

export default AdminPage;