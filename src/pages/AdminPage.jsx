import React, { useEffect, useRef, useState } from "react";
import {
  LocationClient,
  BatchUpdateDevicePositionCommand,
} from "@aws-sdk/client-location";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import amplifyconfig from "../amplifyconfiguration.json";
import { getStore } from "../graphql/queries";
import { updateStore, createStore } from "../graphql/mutations";

Amplify.configure(amplifyconfig);
const client = generateClient();


const locationClient = new LocationClient({ region: "ap-northeast-1" });
const TRACKER_NAME = "DonnatokiimoTracker";
const VAN_ID = "KEI-VAN-001";
const CONFIG_ID = "GLOBAL-CONFIG";

const sendLocationToTracker = async (lat, lng) => {
  try {
    const command = new BatchUpdateDevicePositionCommand({
      TrackerName: TRACKER_NAME,
      Updates: [
        {
          DeviceId: VAN_ID,
          Position: [lng, lat], // Location Serviceは [lng, lat]
          SampleTime: new Date(),
        },
      ],
    });
    await locationClient.send(command);
    console.log("Location Serviceへ位置送信したバイ！");
  } catch (err) {
    console.error("Location Service送信失敗:", err);
  }
};

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

function AdminPage({ signOut }) {
  const [editType, setEditType] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [myPos, setMyPos] = useState([33.321, 130.941]);
  const [menuItems, setMenuItems] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);

  const watchIdRef = useRef(null);
  const lastStoreUpdateAtRef = useRef(0);
  const isSendingStoreUpdateRef = useRef(false);
  const trackingErrorShownRef = useRef(false);

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
    const loadConfig = async () => {
      try {
        const res = await client.graphql({
          query: GET_CONFIG,
          variables: { id: CONFIG_ID },
          authMode: "userPool",
        });

        if (res.data?.getConfig) {
          setMenuItems(JSON.parse(res.data.getConfig.menuJson || "[]"));
          setScheduleItems(JSON.parse(res.data.getConfig.scheduleJson || "[]"));
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

        const store = res.data?.getStore;
        if (store?.lat && store?.lng) {
          setMyPos([store.lat, store.lng]);
        }
        if (store?.isOperating) {
          setIsTracking(true);
        }
      } catch (e) {
        console.error("Store Load Error", e);
      }
    };

    loadConfig();
    loadStore();
  }, []);

  const saveConfig = async () => {
    const input = {
      id: CONFIG_ID,
      menuJson: JSON.stringify(menuItems),
      scheduleJson: JSON.stringify(scheduleItems),
      dummy: "updated-" + Date.now(),
    };

    try {
      await client.graphql({
        query: UPDATE_CONFIG,
        variables: { input },
        authMode: "userPool",
      });
      alert("保存したバイ！");
      setEditType(null);
    } catch (e) {
      try {
        await client.graphql({
          query: CREATE_CONFIG,
          variables: { input },
          authMode: "userPool",
        });
        alert("初回保存に成功したバイ！");
        setEditType(null);
      } catch (err) {
        console.error("Config Save Error", err);
        alert("保存エラーバイ");
      }
    }
  };

  const stopTracking = async () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsTracking(false);
    isSendingStoreUpdateRef.current = false;

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
      console.log("営業停止を保存したバイ");
    } catch (err) {
      console.error("営業停止保存エラー:", err);
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
    setIsTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setMyPos([lat, lng]);

        const now = Date.now();
        if (
          now - lastStoreUpdateAtRef.current < 2500 ||
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
          console.log("店主位置を更新したバイ！");
        } catch (err) {
          try {
            await client.graphql({
              query: createStore,
              variables: { input },
              authMode: "userPool",
            });
            console.log("Storeを新規作成したバイ！");
          } catch (createErr) {
            console.error("Store更新/作成エラー:", createErr);
          }
        } finally {
          await sendLocationToTracker(lat, lng);
          isSendingStoreUpdateRef.current = false;
        }
      },
      (error) => {
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
      }
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
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    value={it.label}
                    placeholder="品名"
                    onChange={(e) =>
                      setMenuItems(
                        menuItems.map((x, i) =>
                          i === idx ? { ...x, label: e.target.value } : x
                        )
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
                          i === idx ? { ...x, price: e.target.value } : x
                        )
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
                          i === idx ? { ...x, date: e.target.value } : x
                        )
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
                          i === idx ? { ...x, place: e.target.value } : x
                        )
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
      </div>

      <MapContainer
        center={myPos}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={myPos} icon={sweetPotatoIcon} />
      </MapContainer>
    </div>
  );
}

export default AdminPage;