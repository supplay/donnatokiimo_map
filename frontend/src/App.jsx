// App.jsx
import { useEffect, useRef, useState } from "react";
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// エラーバウンダリ
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🔴 ERROR BOUNDARY キャッチ:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: "100vh",
          width: "100%",
          background: "#fee",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "'M PLUS Rounded 1c', sans-serif",
          color: "#c00",
        }}>
          <h1>⚠️ エラーが発生したバイ</h1>
          <p style={{ fontSize: "1.1rem", whiteSpace: "pre-wrap" }}>
            {this.state.error?.toString()}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "12px 30px",
              fontSize: "1rem",
              background: "#c00",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// GraphQL（自動生成の queries/mutations を使うもの）
import { getShop } from "./graphql/queries";
import { updateShop, createShop } from "./graphql/mutations";
import { onUpdateShop } from "./graphql/subscriptions";

// QR関連
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Bell, BellOff } from "lucide-react";

import { Authenticator, translations } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { I18n } from "aws-amplify/utils";
import { Amplify } from "aws-amplify";
import { generateClient, post } from "aws-amplify/api";
import amplifyconfig from "./amplifyconfiguration.json";

/* -------------------------------------------------------------------------- */
/* 初期設定・グローバル変数                                                   */
/* -------------------------------------------------------------------------- */

// Google Fonts 読み込み（トップレベルでOKだけど、HMRで増えないように一応ガード）
if (typeof document !== "undefined") {
  const already = document.querySelector('link[data-app-font="1"]');
  if (!already) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Sawarabi+Mincho&family=M+PLUS+Rounded+1c:wght@500;700&family=Kiwi+Maru:wght@500&family=Kosugi+Maru&display=swap";
    link.setAttribute("data-app-font", "1");
    document.head.appendChild(link);

    document.documentElement.setAttribute("translate", "no");
    const metaAlready = document.querySelector('meta[name="google"][content="notranslate"]');
    if (!metaAlready) {
      const meta = document.createElement("meta");
      meta.name = "google";
      meta.content = "notranslate";
      document.head.appendChild(meta);
    }
  }
}

// Amplify 設定（1回だけ）
Amplify.configure(amplifyconfig);
I18n.putVocabularies(translations);
I18n.setLanguage("ja");

const VAN_ID = "KEI-VAN-001";
const CONFIG_ID = "GLOBAL-CONFIG";

// アイコン設定
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

/* -------------------------------------------------------------------------- */
/* ユーティリティ関数                                                         */
/* -------------------------------------------------------------------------- */

// お客さんのスマホから1kmの柵をAWSに登録
const registerUserGeofence = async (userId, lat, lng) => {
  const restOperation = post({
    path: "/location",
    options: {
      body: {
        action: "registerUserGeofence",
        userId,
        lat,
        lng,
        radiusKm: 1.0,
      },
    },
  });

  try {
    const { body } = await restOperation.response;
    await body.json();
    console.log("1kmの柵をAWSに立てたバイ！");
  } catch (err) {
    console.error("柵の登録に失敗したバイ…", err);
  }
};

// おじさんの位置情報をAWS Location Serviceに送信
const updateOjisanPosition = async (lat, lng) => {
  const restOperation = post({
    path: "/location",
    options: {
      body: {
        action: "updateOjisanPosition",
        lat,
        lng,
        deviceId: "Ojisan-Mobile-001",
      },
    },
  });

  try {
    const { body } = await restOperation.response;
    await body.json();
    console.log("おじさんの位置、AWSに届けたバイ！");
  } catch (err) {
    console.error("送信失敗…", err);
  }
};

/* -------------------------------------------------------------------------- */
/* GraphQL Queries & Mutations（手書き定義してるもの）                          */
/* ※ここはあなたのスキーマに合わせてる前提                                     */
/* -------------------------------------------------------------------------- */

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

// ポイント（あなたの定義に合わせて PointCard 側を修正する）
const LIST_POINTS = /* GraphQL */ `
  query ListUserPoints {
    listUserPoints {
      items {
        id
        points
      }
    }
  }
`;

const CREATE_POINT = /* GraphQL */ `
  mutation CreateUserPoint($input: CreateUserPointInput!) {
    createUserPoint(input: $input) {
      id
      points
    }
  }
`;

const UPDATE_POINT = /* GraphQL */ `
  mutation UpdateUserPoint($input: UpdateUserPointInput!) {
    updateUserPoint(input: $input) {
      id
      points
    }
  }
`;

/* -------------------------------------------------------------------------- */
/* 共通コンポーネント                                                         */
/* -------------------------------------------------------------------------- */

function MapAutoPan({ pos, secondaryPos = null, lock = false }) {
  const map = useMap();
  useEffect(() => {
    const hasPrimary = pos?.lat != null && pos?.lng != null;
    const hasSecondary = secondaryPos?.lat != null && secondaryPos?.lng != null;

    if (hasPrimary && hasSecondary) {
      map.fitBounds(
        [
          [pos.lat, pos.lng],
          [secondaryPos.lat, secondaryPos.lng],
        ],
        {
          padding: [70, 70],
          maxZoom: 16,
          animate: !lock,
        }
      );
      return;
    }

    if (hasPrimary) {
      map.setView([pos.lat, pos.lng], map.getZoom(), { animate: !lock });
    }
  }, [lock, map, pos, secondaryPos]);

  return null;
}

const Modal = ({ title, content, onClose, color, paperStyle }) => (
  <div
    style={{
      position: "absolute",
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
    onClick={onClose}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: "15px",
        width: "85%",
        maxWidth: "420px",
        whiteSpace: "pre-wrap",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        ...paperStyle,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: color || "#F26C3A",
          color: "#fff",
          borderTopLeftRadius: "15px",
          borderTopRightRadius: "15px",
          padding: "16px 0 10px 0",
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "1.25rem",
        }}
      >
        {title}
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
        {content || "準備中バイ！"}
      </div>
      <button
        onClick={onClose}
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
);

/** --------------------------------------------------------------------------
 * 店主ページ (/kanri_aki)
 * ------------------------------------------------------------------------- */
function AdminPage({ signOut }) {
  const [isTracking, setIsTracking] = useState(false);
  const [myPos, setMyPos] = useState([33.321, 130.941]);
  const [editType, setEditType] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);

  const [showQR, setShowQR] = useState(false);
  const [qrType, setQrType] = useState("add");
  const [useAmount, setUseAmount] = useState(10);
  const lastShopUpdateAtRef = useRef(0);
  const isSendingShopUpdateRef = useRef(false);
  const trackingErrorShownRef = useRef(false);

  // Manifest を管理画面用に切り替え
  useEffect(() => {
    const manifestTag = document.querySelector('link[rel="manifest"]');
    
    if (manifestTag) {
      manifestTag.setAttribute('href', '/manifest-admin.json');
    }

    // ページを離れるときに元に戻す
    return () => {
      if (manifestTag) {
        manifestTag.setAttribute('href', '/manifest.json');
      }
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.graphql({
          query: GET_CONFIG,
          variables: { id: CONFIG_ID },
          authMode: "userPool",
        });
        if (res.data.getConfig) {
          setMenuItems(JSON.parse(res.data.getConfig.menuJson || "[]"));
          setScheduleItems(JSON.parse(res.data.getConfig.scheduleJson || "[]"));
        }
      } catch (e) {
        console.error("Config Load Error", e);
      }
    };
    load();
  }, []);

  const saveConfig = async () => {
    const input = {
      id: CONFIG_ID,
      menuJson: JSON.stringify(menuItems),
      scheduleJson: JSON.stringify(scheduleItems),
      dummy: "updated-" + Date.now(),
    };

    try {
      await apiClient.graphql({
        query: UPDATE_CONFIG,
        variables: { input },
        authMode: "userPool",
      });
      alert("保存したバイ！");
      setEditType(null);
    } catch (e) {
      try {
        await apiClient.graphql({
          query: CREATE_CONFIG,
          variables: { input },
          authMode: "userPool",
        });
        alert("初めての保存に成功！");
        setEditType(null);
      } catch (err2) {
        alert("保存エラーバイ");
      }
    }
  };

  // ✅ ここが構文エラーになってたので、useEffect を正しく閉じた版
  useEffect(() => {
    if (!isTracking) {
      isSendingShopUpdateRef.current = false;
      apiClient
        .graphql({
          query: updateShop,
          variables: { input: { id: VAN_ID, isOperating: false } },
          authMode: "userPool",
        })
        .catch(() => {});
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyPos([latitude, longitude]);

        const now = Date.now();
        if (now - lastShopUpdateAtRef.current < 2500 || isSendingShopUpdateRef.current) {
          return;
        }

        lastShopUpdateAtRef.current = now;
        isSendingShopUpdateRef.current = true;

        const input = {
          id: VAN_ID,
          name: "どんなとき芋",
          latitude,
          longitude,
          isOperating: true,
          lastUpdated: new Date().toISOString(),
        };

        try {
          await apiClient.graphql({
            query: updateShop,
            variables: { input },
            authMode: "userPool",
          });
          console.log("おじさんの位置を更新したバイ！");
        } catch (err) {
          try {
            await apiClient.graphql({
              query: createShop,
              variables: { input },
              authMode: "userPool",
            });
            console.log("おじさんを新しく登録したバイ！");
          } catch (createErr) {
            console.error("位置の送信に完全に失敗したバイ…", createErr);
          }
        } finally {
          isSendingShopUpdateRef.current = false;
        }

        updateOjisanPosition(latitude, longitude).catch((e) => {
          console.error("Location Service 送信失敗:", e);
        });
      },
      (error) => {
        console.error("位置取得エラー:", error);
        if (error?.code === 1 && !trackingErrorShownRef.current) {
          trackingErrorShownRef.current = true;
          alert("位置情報の権限がOFFです。設定で位置情報を許可してください。");
        }
        if (error?.code === 1) {
          setIsTracking(false);
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
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
          onClick={async () => {
            if (!isTracking && "Notification" in window && Notification.permission === "default") {
              await Notification.requestPermission();
            }
            setIsTracking(!isTracking);
          }}
          style={{
            background: isTracking ? "#e74c3c" : "#27ae60",
            color: "white",
            padding: 10,
            borderRadius: 8,
            border: "none",
            fontWeight: "bold",
          }}
        >
          {isTracking ? "🔴 配信停止" : "✅ 営業開始"}
        </button>

        <div style={{ marginTop: "10px", display: "flex", gap: "5px" }}>
          <button
            onClick={() => {
              setQrType("add");
              setShowQR(true);
            }}
            style={{
              flex: 1,
              padding: 8,
              background: "#e71337e8",
              color: "white",
              borderRadius: 5,
              border: "none",
              fontWeight: "bold",
              fontSize: "0.8rem",
            }}
          >
            ➕付与QR
          </button>
          <button
            onClick={() => {
              setQrType("use");
              setShowQR(true);
            }}
            style={{
              flex: 1,
              padding: 8,
              background: "#d35400",
              color: "white",
              borderRadius: 5,
              border: "none",
              fontWeight: "bold",
              fontSize: "0.8rem",
            }}
          >
            🎁消費QR
          </button>
        </div>

        <button
          onClick={signOut}
          style={{
            width: "100%",
            marginTop: "10px",
            padding: 8,
            background: "#e74c3c",
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

      {showQR && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.85)",
            zIndex: 3000,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
          }}
        >
          {qrType === "use" ? (
            <>
              <div
                style={{
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(255,255,255,0.2)",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              >
                <input
                  type="number"
                  value={useAmount}
                  onChange={(e) => setUseAmount(Number(e.target.value))}
                  style={{
                    width: "80px",
                    fontSize: "1.8rem",
                    textAlign: "center",
                    borderRadius: "8px",
                    border: "none",
                    padding: "5px",
                  }}
                />
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>pt 消費する</span>
              </div>
              <QRCodeCanvas value={`POTATO-${Math.floor(Date.now() / 180000)}-USE-${useAmount}`} size={256} />
              <p style={{ marginTop: 20, fontSize: "1.2rem", fontWeight: "bold", color: "#f1c40f" }}>
                【特典交換用】お客さんのポイントを減らします
              </p>
            </>
          ) : (
            <>
              <QRCodeCanvas value={`POTATO-${Math.floor(Date.now() / 180000)}`} size={256} />
              <p style={{ marginTop: 20, fontSize: "1.2rem", fontWeight: "bold", color: "#2ecc71" }}>
                【ポイント付与】お客さんに読み取ってもらってね！
              </p>
            </>
          )}
          <button
            onClick={() => setShowQR(false)}
            style={{
              padding: "12px 40px",
              fontSize: "1.1rem",
              borderRadius: "8px",
              border: "none",
              marginTop: "20px",
              background: "#eee",
              color: "#333",
              fontWeight: "bold",
            }}
          >
            閉じる
          </button>
        </div>
      )}

      {editType && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "0 0 20px 0",
              borderRadius: "15px",
              width: "92%",
              maxWidth: "420px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                background: "#F26C3A",
                color: "#fff",
                borderTopLeftRadius: "15px",
                borderTopRightRadius: "15px",
                padding: "16px 0 10px 0",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "1.25rem",
              }}
            >
              {editType === "menu" ? "メニュー編集" : "出店予定編集"}
            </div>

            <div style={{ maxHeight: "50vh", overflowY: "auto", margin: "18px 0 10px 0", padding: "0 18px" }}>
              {editType === "menu" ? (
                menuItems.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "5px", marginBottom: "8px" }}>
                    <input
                      placeholder="品名"
                      value={it.label}
                      onChange={(e) =>
                        setMenuItems(menuItems.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                      }
                      style={{ flex: 2, padding: "8px", border: "1px solid #ccc", borderRadius: "5px" }}
                    />
                    <input
                      type="number"
                      placeholder="価格"
                      value={it.price === "" || it.price === 0 ? "" : Number(it.price)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMenuItems(
                          menuItems.map((x, i) => (i === idx ? { ...x, price: val === "" ? "" : Number(val) } : x))
                        );
                      }}
                      style={{ flex: 1, padding: "8px", border: "1px solid #ccc", borderRadius: "5px" }}
                    />
                    <button
                      onClick={() => setMenuItems(menuItems.filter((_, i) => i !== idx))}
                      style={{ background: "#e74c3c", color: "white", border: "none", borderRadius: "5px", width: "40px" }}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                scheduleItems.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      marginBottom: "12px",
                      padding: "10px",
                      border: "1px solid #eee",
                      borderRadius: "8px",
                      background: "#fdfdfd",
                    }}
                  >
                    <input
                      type="date"
                      value={it.date}
                      onChange={(e) =>
                        setScheduleItems(scheduleItems.map((x, i) => (i === idx ? { ...x, date: e.target.value } : x)))
                      }
                      style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "5px" }}
                    />
                    <input
                      placeholder="場所"
                      value={it.place}
                      onChange={(e) =>
                        setScheduleItems(scheduleItems.map((x, i) => (i === idx ? { ...x, place: e.target.value } : x)))
                      }
                      style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "5px" }}
                    />
                    <button
                      onClick={() => setScheduleItems(scheduleItems.filter((_, i) => i !== idx))}
                      style={{
                        background: "#fee",
                        color: "red",
                        border: "none",
                        padding: "5px",
                        borderRadius: "5px",
                        fontSize: "0.85rem",
                      }}
                    >
                      この予定を消す
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() =>
                editType === "menu"
                  ? setMenuItems([...menuItems, { label: "", price: "" }])
                  : setScheduleItems([...scheduleItems, { date: "", place: "" }])
              }
              style={{
                width: "94%",
                margin: "0 auto 8px auto",
                display: "block",
                padding: 10,
                background: "#f6f8fa",
                color: "#3a3a3a",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              ＋ 追加
            </button>

            <div style={{ display: "flex", gap: "10px", padding: "0 10px" }}>
              <button
                onClick={saveConfig}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#8DD36F",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                }}
              >
                保存する
              </button>
              <button
                onClick={() => setEditType(null)}
                style={{ flex: 1, padding: 10, background: "#e6ecf1", color: "#444", border: "none", borderRadius: "8px" }}
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
          bottom: "20px",
          width: "100%",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          gap: "10px",
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

      <MapContainer center={myPos} zoom={15} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={myPos} icon={sweetPotatoIcon} />
        <MapAutoPan pos={{ lat: myPos[0], lng: myPos[1] }} />
      </MapContainer>
    </div>
  );
}

/** --------------------------------------------------------------------------
 * ポイントカードコンポーネント
 * ------------------------------------------------------------------------- */
function PointCard({ user, signOut }) {
  const [points, setPoints] = useState(0);
  const [pointDataId, setPointDataId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        // ✅ 未定義だった query 名を LIST_POINTS / CREATE_POINT に統一
        const res = await apiClient.graphql({ query: LIST_POINTS, authMode: "userPool" });
        const items = res.data.listUserPoints.items;

        if (items.length > 0) {
          setPoints(items[0].points);
          setPointDataId(items[0].id);
        } else {
          const createRes = await apiClient.graphql({
            query: CREATE_POINT,
            variables: { input: { points: 0 } },
            authMode: "userPool",
          });
          setPoints(0);
          setPointDataId(createRes.data.createUserPoint.id);
        }
      } catch (e) {
        console.error("Point Load Error", e);
      }
    };
    fetchPoints();
  }, []);

  const handleUpdate = async () => {
    if (isUpdating || !pointDataId) return;
    setIsUpdating(true);

    const nextValue = points + 1;

    try {
      const res = await apiClient.graphql({
        query: UPDATE_POINT,
        variables: { input: { id: pointDataId, points: nextValue } },
        authMode: "userPool",
      });

      setPoints(res.data.updateUserPoint.points);
      alert(`やったバイ！${res.data.updateUserPoint.points}ポイントになったよ！🍠`);
    } catch (err) {
      alert("保存に失敗したバイ。");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrement = async (amount) => {
    if (isUpdating || !pointDataId) return;
    setIsUpdating(true);

    const nextValue = points - amount;

    try {
      const res = await apiClient.graphql({
        query: UPDATE_POINT,
        variables: { input: { id: pointDataId, points: nextValue } },
        authMode: "userPool",
      });

      setPoints(res.data.updateUserPoint.points);
      alert(`${amount}ポイント使って特典と交換したバイ！ありがとう！🍠`);
    } catch (err) {
      alert("エラーでポイントが引けんかったバイ。");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    let sc = null;

    if (isScanning) {
      const getCameraPermissionGuide = () => {
        const ua = navigator.userAgent || "";
        if (/iPhone|iPad|iPod/i.test(ua)) {
          return "iPhone/iPadの設定手順:\n設定 > Safari > カメラ > 許可";
        }
        if (/Android/i.test(ua)) {
          return "Androidの設定手順:\nブラウザメニュー > サイト設定 > カメラ > 許可";
        }
        return "ブラウザのサイト設定で、このページのカメラ権限を「許可」に変更してください。";
      };

      const showCameraPermissionHelp = (reason) => {
        alert(`カメラを起動できませんでした。\n${reason}\n\n${getCameraPermissionGuide()}`);
      };

      const startScanner = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showCameraPermissionHelp("このブラウザはカメラ機能に対応していません。");
            setIsScanning(false);
            return;
          }

          if (navigator.permissions?.query) {
            const status = await navigator.permissions.query({ name: "camera" });
            if (status.state === "denied") {
              showCameraPermissionHelp("このサイトのカメラ権限が拒否されています。");
              setIsScanning(false);
              return;
            }
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
          });
          stream.getTracks().forEach((track) => track.stop());

          console.log("✅ カメラアクセス許可を取得");

          sc = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });

          sc.render(
            (text) => {
              const parts = text.split("-");
              const prefix = parts[0];
              const tick = parseInt(parts[1], 10);
              const mode = parts[2];
              const currentTick = Math.floor(Date.now() / 180000); // 3分単位
              const timeDiff = Math.abs(currentTick - tick);
              if (prefix === "POTATO" && timeDiff <= 1) {
                sc.clear().then(() => {
                  setIsScanning(false);

                  if (mode === "USE") {
                    const amount = parseInt(parts[3], 10);
                    if (points < amount) {
                      alert(`ポイントが足りんバイ！あと ${amount - points}pt 必要よ。`);
                      return;
                    }
                    handleDecrement(amount);
                  } else {
                    handleUpdate();
                  }
                });
              } else {
                alert("QRコードが古いみたいバイ！");
                sc.clear();
                setIsScanning(false);
              }
            },
            (errorMessage) => {
              console.error("❌ QRスキャンエラー:", errorMessage);
            }
          );
        } catch (err) {
          console.error("❌ カメラ/QR初期化エラー:", err);
          const reason = err?.name === "NotAllowedError"
            ? "カメラへのアクセスが拒否されています。"
            : err?.name === "NotFoundError"
              ? "この端末で利用できるカメラが見つかりません。"
              : err?.name === "NotReadableError"
                ? "カメラが他のアプリで使用中の可能性があります。"
                : "カメラの起動に失敗しました。";
          showCameraPermissionHelp(reason);
          setIsScanning(false);
        }
      };

      startScanner();

      // 🗑 HTML5 QrCode の UI を日本語化
      setTimeout(() => {
        const readerDiv = document.getElementById("reader");
        if (readerDiv) {
          readerDiv.querySelectorAll("*").forEach(el => {
            if (el.textContent) {
              el.textContent = el.textContent
                .replace(/Allow camera/gi, "カメラを許可")
                .replace(/Camera is disabled/gi, "カメラが無効です")
                .replace(/Camera is required/gi, "カメラが必要です")
                .replace(/No permission/gi, "権限がありません")
                .replace(/Camera error/gi, "カメラエラー")
                .replace(/Scan an image file/gi, "画像ファイルをスキャンしてください")
                .replace(/Your camera may be blocked/gi, "カメラがブロックされている可能性があります")
                .replace(/Request camera/gi, "カメラをリクエスト")
                .replace(/Stop scanning/gi, "スキャンを停止")
                .replace(/Scan QR/gi, "QRをスキャン")
                .replace(/Back/gi, "戻る");
            }
          });
        }
      }, 100);
    }

    return () => {
      if (sc) sc.clear().catch(() => {});
    };
  }, [isScanning, pointDataId, points]);

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", fontFamily: "'M PLUS Rounded 1c', sans-serif", color: "#4a2c2a" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #fff9e6 0%, #ffecb3 100%)",
          borderRadius: "25px",
          padding: "30px 20px",
          boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
          border: "4px solid #d35400",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: "-10px", bottom: "-10px", fontSize: "80px", opacity: 0.1, transform: "rotate(-15deg)" }}>
          🍠
        </div>

        <h2 style={{ fontSize: "1.2rem", margin: "0 0 10px 0", color: "#8e44ad" }}>
          {user.username} さんの<br />
          <span style={{ fontSize: "1.5rem", fontWeight: "900" }}>芋ポイントカード</span>
        </h2>

        <div style={{ background: "white", borderRadius: "15px", padding: "20px", margin: "15px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "0.9rem", color: "#666" }}>現在のたまり具合</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
            <span style={{ fontSize: "4rem", fontWeight: "900", color: "#d35400" }}>{isUpdating ? "..." : points}</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#d35400" }}>pt</span>
          </div>
        </div>

        {!isScanning && !isUpdating && (
          <button
            onClick={() => setIsScanning(true)}
            style={{
              width: "100%",
              padding: "16px",
              background: "#8e44ad",
              color: "#fff",
              borderRadius: "50px",
              border: "none",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 0 #6c3483",
            }}
          >
            📷 お店のQRを読み取る
          </button>
        )}

        {isScanning && (
          <div style={{ borderRadius: "15px", overflow: "hidden", border: "2px solid #8e44ad", background: "white" }}>
            <div id="reader"></div>
            <button onClick={() => setIsScanning(false)} style={{ width: "100%", padding: "10px", background: "#eee", border: "none" }}>
              キャンセル
            </button>
          </div>
        )}
      </div>

      <button
        onClick={signOut}
        style={{ marginTop: "30px", color: "#999", background: "none", border: "none", textDecoration: "underline", fontSize: "0.8rem", width: "100%" }}
      >
        ログアウト
      </button>
    </div>
  );
}

/** --------------------------------------------------------------------------
 * お客さんページ (/)
 * ------------------------------------------------------------------------- */
function CustomerPage() {
  const [vanPos, setVanPos] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [isGeofenceOn, setIsGeofenceOn] = useState(false);
  const [userSubscriptionId, setUserSubscriptionId] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [weatherPhrase, setWeatherPhrase] = useState("");
  const [config, setConfig] = useState({ menu: [], schedule: [] });
  const lastToggleAtRef = useRef(0);
  const isMountedRef = useRef(true); // マウント状態を追跡

  const handleNotifyButtonPress = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - lastToggleAtRef.current < 500) return;
    lastToggleAtRef.current = now;

    toggleGeofence();
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
        setIsGeofenceOn(true);
        alert("通知ON！焼きいも屋さんが近くに来たらお知らせするバイ！");

        navigator.serviceWorker.ready
          .then(async (reg) => {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey:
                "BCChLacMJSRTPwWYs6zPm-gY6VE6mNAChA2dPLTwanWwsOWK5BZzGg7Du58yChAHMkSpGKNuPDGP7pCVL3D9OLA",
            });

            const subObj = sub.toJSON ? sub.toJSON() : sub;
            const currentLat = userPos?.lat ?? null;
            const currentLng = userPos?.lng ?? null;
            const guestUserId = `guest-${Date.now()}`;
            const response = await apiClient.graphql({
              query: CREATE_USER_SUBSCRIPTION,
              variables: {
                input: {
                  userId: guestUserId,
                  subscription: JSON.stringify(subObj),
                  userLat: currentLat,
                  userLng: currentLng,
                },
              },
              authMode: "apiKey", // 未認証ユーザーでもアクセス可能
            });

            if (response.data?.createUserSubscription?.id) {
              setUserSubscriptionId(response.data.createUserSubscription.id);
            }
          })
          .catch((e) => console.log("SW準備中...", e));
      } else if (permission === "denied") {
        alert("通知がブロックされてるバイ！\n\nブラウザの設定から「通知」を許可してね！");
      } else {
        alert("通知を許可してもらわないとONにできんバイ...");
      }
    } catch (err) {
      console.error("通知許可エラー:", err);
      alert("通知の設定に失敗したバイ...");
      setIsGeofenceOn(false);
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (isGeofenceOn && vanPos && userPos) {
      const dist = getDistance(userPos.lat, userPos.lng, vanPos.latitude, vanPos.longitude);
      if (dist <= 1000) {
        // Service Worker 経由で通知を表示
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification("ホカホカのお知らせ！🍠", {
              body: `焼き芋屋さんが1km圏内に来たバイ！今の距離は約${Math.round(dist)}m。`,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              vibrate: [200, 100, 200],
            });
          }).catch(err => {
            console.error("通知表示エラー:", err);
          });
        }
        setIsGeofenceOn(false);
      }
    }
  }, [vanPos, userPos, isGeofenceOn]);

  useEffect(() => {
    const fetchLatestShop = async () => {
      try {
        const latest = await apiClient.graphql({
          query: getShop,
          variables: { id: VAN_ID },
          authMode: "apiKey",
        });
        const shop = latest.data?.getShop;
        if (shop?.id === VAN_ID) {
          setVanPos(shop.isOperating ? shop : null);
        }
      } catch (e) {
        console.error("店主位置の再取得エラー:", e);
      }
    };

    const init = async () => {
      try {
        const res = await apiClient.graphql({ 
          query: getShop, 
          variables: { id: VAN_ID },
          authMode: "apiKey" 
        });
        if (res.data.getShop?.isOperating) setVanPos(res.data.getShop);

        const cRes = await apiClient.graphql({ 
          query: GET_CONFIG, 
          variables: { id: CONFIG_ID },
          authMode: "apiKey"
        });
        if (cRes.data.getConfig) {
          setConfig({
            menu: JSON.parse(cRes.data.getConfig.menuJson || "[]"),
            schedule: JSON.parse(cRes.data.getConfig.scheduleJson || "[]"),
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    init();

    // ✅ 自動生成された onUpdateShop subscription を使用
    console.log("🔵 店主位置購読を開始");
    const subShopObs = apiClient.graphql({ 
      query: onUpdateShop,
      authMode: "apiKey"
    });

    const subShop = subShopObs.subscribe({
      next: ({ data }) => {
        console.log("📍 店主位置更新受信:", data);
        if (!isMountedRef.current) {
          console.warn("📍 コンポーネントがアンマウント済み、スキップ");
          return;
        }
        try {
          const updated = data?.onUpdateShop;
          console.log("📍 解析後:", updated);
          if (!updated) {
            console.warn("📍 更新データが null");
            return;
          }
          if (updated?.id === VAN_ID && updated?.isOperating) {
            console.log("📍 営業中に更新:", updated);
            setVanPos(updated);
          } else if (updated?.id === VAN_ID && !updated?.isOperating) {
            console.log("📍 営業終了");
            setVanPos(null);
          }
        } catch (parseErr) {
          console.error("🔴 店主位置の設定中にエラー:", parseErr);
          throw parseErr; // Error Boundary へ
        }
      },
      error: (err) => {
        console.error("🔴 店主位置の購読エラー:", err);
        // エラー時もポーリングでカバー
      },
      complete: () => {
        console.log("✅ 店主位置購読完了");
      }
    });

    console.log("🟢 設定更新購読を開始");
    const subConfigObs = apiClient.graphql({ 
      query: ON_UPDATE_CONFIG,
      authMode: "apiKey"
    });

    const subConfig = subConfigObs.subscribe({
      next: ({ data }) => {
        console.log("⚙️ 設定更新受信:", data);
        if (!isMountedRef.current) {
          console.warn("⚙️ コンポーネントがアンマウント済み、スキップ");
          return;
        }
        try {
          if (!data?.onUpdateConfig) {
            console.warn("⚙️ 設定データが null");
            return;
          }
          if (data.onUpdateConfig.id === CONFIG_ID) {
            const menuJson = data.onUpdateConfig.menuJson || "[]";
            const scheduleJson = data.onUpdateConfig.scheduleJson || "[]";
            console.log("⚙️ JSON解析前:", { menuJson, scheduleJson });
            const menu = JSON.parse(menuJson);
            const schedule = JSON.parse(scheduleJson);
            console.log("⚙️ 解析後:", { menu, schedule });
            setConfig({ menu, schedule });
          }
        } catch (parseErr) {
          console.error("🔴 設定データ解析エラー:", parseErr);
          throw parseErr; // Error Boundary へ
        }
      },
      error: (err) => {
        console.error("🔴 設定更新購読エラー:", err);
      },
      complete: () => {
        console.log("✅ 設定更新購読完了");
      }
    });

    let watchId;
    const pollingId = window.setInterval(fetchLatestShop, 10000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const tempUserId = `guest-${Math.floor(Math.random() * 100000)}`;

        try {
          await registerUserGeofence(tempUserId, latitude, longitude);
        } catch (e) {
          console.error("geofence登録失敗(いったん無視して続行)", e);
        }
      });

      let lastUpdateTime = 0;

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserPos({ lat: latitude, lng: longitude });

          const now = Date.now();
          if (now - lastUpdateTime > 5000) {
            lastUpdateTime = now;
            if (userSubscriptionId) {
              apiClient
                .graphql({
                  query: UPDATE_USER_SUBSCRIPTION,
                  variables: {
                    input: {
                      id: userSubscriptionId,
                      userLat: latitude,
                      userLng: longitude,
                    },
                  },
                  authMode: "apiKey",
                })
                .catch((err) => console.log("位置更新エラー:", err));
            }
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      console.log("🟠 CustomerPage クリーンアップ開始");
      isMountedRef.current = false; // アンマウント状態
      subShop.unsubscribe();
      subConfig.unsubscribe();
      window.clearInterval(pollingId);
      if (watchId) navigator.geolocation.clearWatch(watchId);
      console.log("🟠 CustomerPage クリーンアップ完了");
    };
  }, [userSubscriptionId]);

  const fetchWeatherPhrase = async () => {
    setWeatherPhrase("おじさん考え中じゃ...");
    try {
      const weatherRes = await fetch(`https://weather.tsukumijima.net/api/forecast/city/440020?cache=${Date.now()}`);
      const wData = await weatherRes.json();

      const restOperation = post({
        path: "/location",
        options: {
          body: {
            weather: wData.forecasts?.[0]?.telop ?? "晴れ",
            temp: wData.forecasts?.[0]?.temperature?.max?.celsius || "20",
            random: Math.random(),
          },
        },
      });

      const { body } = await restOperation.response;
      const responseData = await body.json();
      setWeatherPhrase(responseData.message);
    } catch (err) {
      setWeatherPhrase("おっと、通信がよくなかみたいじゃ。焼き芋は熱々バイ！");
    }
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative", backgroundColor: "#fdf5e6" }}>
      {/* 衛星ボタン */}
      <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 999999, textAlign: "center", pointerEvents: "auto", padding: "10px" }}>
        <button
          type="button"
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            handleNotifyButtonPress(e);
          }}
          onClick={handleNotifyButtonPress}
          onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.85)"; }}
          onTouchCancel={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
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
          {isGeofenceOn ? <Bell size={30} color="#ffffff" strokeWidth={3} /> : <BellOff size={30} color="#d35400" strokeWidth={3} />}
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

      {/* 看板風ヘッダー */}
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
        <h1 style={{ margin: 0, fontSize: "1.1rem", fontFamily: "'M PLUS Rounded 1c'", letterSpacing: "1px" }}>
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

      {/* 下部ボタン */}
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
          { label: "おしながき", icon: "📙", color: "#8e44ad", action: () => setShowMenu(true) },
          { label: "EVENT", icon: "🗓️", color: "#8e44ad", action: () => setShowCalendar(true) },
          { label: "MY POINT", icon: "✨", color: "#8e44ad", action: () => setShowMyPage(true) },
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
              border: "3px solid #d35400",
              boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>{btn.icon}</span>
            <span style={{ fontSize: "0.75rem", fontWeight: "900", color: "#d35400" }}>
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      <MapContainer center={[33.321, 130.941]} zoom={15} style={{ height: "100%", width: "100%", zIndex: 0 }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {/* 営業中の店主位置へ自動で寄せて、芋ポインターが地図内に入るようにする */}
        <MapAutoPan
          pos={
            vanPos?.isOperating
              ? { lat: vanPos.latitude, lng: vanPos.longitude }
              : userPos
          }
          secondaryPos={vanPos?.isOperating && userPos ? userPos : null}
          lock={Boolean(vanPos?.isOperating)}
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
        {vanPos?.isOperating && (
          <Marker
            position={[vanPos.latitude, vanPos.longitude]}
            icon={sweetPotatoIcon}
            eventHandlers={{ click: fetchWeatherPhrase }}
          >
            <Popup>
              <div style={{ textAlign: "center", padding: "5px" }}>
                <strong style={{ color: "#9913b7" }}>どんなとき芋 巡り店</strong>
                <br />
                <hr />
                <p style={{ margin: "5px 0 0", color: "#d35400", fontWeight: "bold" }}>
                  {weatherPhrase || "ほっこり焼けちょるバイ！"}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* モーダル類 */}
      {showMenu && (
        <Modal
          title="おしながき"
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
                      borderBottom: idx < config.menu.length - 1 ? "1px solid #eee" : "none",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>{item.label}</span>
                    <span style={{ fontSize: "1.1rem", color: "#d35400", fontWeight: "bold" }}>
                      ¥{item.price}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", color: "#999" }}>メニュー準備中バイ！</p>
              )}
            </div>
          }
          onClose={() => setShowMenu(false)}
          color="#d35400"
        />
      )}
      {showCalendar && (
        <Modal
          title="出店予定"
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
          }
          onClose={() => setShowCalendar(false)}
          color="#91D370"
        />
      )}

      {/* マイページ */}
      {showMyPage && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "white", zIndex: 3000, overflowY: "auto", padding: "20px" }}>
          <button onClick={() => setShowMyPage(false)} style={{ marginBottom: "20px" }}>
            ← 戻る
          </button>
          <Authenticator>{({ signOut, user }) => <PointCard user={user} signOut={signOut} />}</Authenticator>
        </div>
      )}
    </div>
  );
}

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
  const apiClientRef = useRef(null);
if (!apiClientRef.current) {
  apiClientRef.current = generateClient();
}
const apiClient = apiClientRef.current;
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