import React, { useEffect, useRef, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QRCodeCanvas } from "qrcode.react";

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

function PointCard({ user, signOut }) {
  const [points, setPoints] = useState(0);
  const [pointDataId, setPointDataId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const clientRef = useRef(null);
  if (!clientRef.current) {
    clientRef.current = generateClient();
  }
  const client = clientRef.current;

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const res = await client.graphql({
          query: LIST_POINTS,
          authMode: "userPool",
        });

        const items = res?.data?.listUserPoints?.items ?? [];

        if (items.length > 0) {
          setPoints(items[0].points ?? 0);
          setPointDataId(items[0].id);
        } else {
          const createRes = await client.graphql({
            query: CREATE_POINT,
            variables: { input: { points: 0 } },
            authMode: "userPool",
          });

          setPoints(0);
          setPointDataId(createRes?.data?.createUserPoint?.id ?? null);
        }
      } catch (e) {
        console.error("Point Load Error", e);
      }
    };

    fetchPoints();
  }, [client]);

  const handleUpdate = async () => {
    if (isUpdating || !pointDataId) return;

    setIsUpdating(true);
    const nextValue = points + 1;

    try {
      const res = await client.graphql({
        query: UPDATE_POINT,
        variables: { input: { id: pointDataId, points: nextValue } },
        authMode: "userPool",
      });

      const updatedPoints = res?.data?.updateUserPoint?.points ?? nextValue;
      setPoints(updatedPoints);
      alert(`やったバイ！${updatedPoints}ポイントになったよ！🍠`);
    } catch (err) {
      console.error("Point Update Error", err);
      alert("保存に失敗したバイ。");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrement = async (amount) => {
    if (isUpdating || !pointDataId) return;

    setIsUpdating(true);

    const nextValue = points - amount;
    if (nextValue < 0) {
      setIsUpdating(false);
      return;
    }

    try {
      const res = await client.graphql({
        query: UPDATE_POINT,
        variables: { input: { id: pointDataId, points: nextValue } },
        authMode: "userPool",
      });

      const updatedPoints = res?.data?.updateUserPoint?.points ?? nextValue;
      setPoints(updatedPoints);
      alert(`${amount}ポイント使って特典と交換したバイ！ありがとう！🍠`);
    } catch (err) {
      console.error("Point Decrement Error", err);
      alert("エラーでポイントが引けんかったバイ。");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    let scanner = null;

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
        alert(
          `カメラを起動できませんでした。\n${reason}\n\n${getCameraPermissionGuide()}`
        );
      };

      const startScanner = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showCameraPermissionHelp("このブラウザはカメラ機能に対応していません。");
            setIsScanning(false);
            return;
          }

          if (navigator.permissions?.query) {
            try {
              const status = await navigator.permissions.query({
                name: "camera",
              });

              if (status.state === "denied") {
                showCameraPermissionHelp("このサイトのカメラ権限が拒否されています。");
                setIsScanning(false);
                return;
              }
            } catch (e) {
              console.log("permissions.query は使えない環境です", e);
            }
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
          });
          stream.getTracks().forEach((track) => track.stop());

          scanner = new Html5QrcodeScanner("reader", {
            fps: 10,
            qrbox: 250,
          });

          scanner.render(
            (text) => {
              const parts = text.split("-");
              const prefix = parts[0];
              const tick = parseInt(parts[1], 10);
              const mode = parts[2];
              const currentTick = Math.floor(Date.now() / 180000);
              const timeDiff = Math.abs(currentTick - tick);

              if (prefix === "POTATO" && timeDiff <= 1) {
                scanner
                  .clear()
                  .then(() => {
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
                  })
                  .catch((err) => {
                    console.error("Scanner Clear Error", err);
                    setIsScanning(false);
                  });
              } else {
                alert("QRコードが古いみたいバイ！");
                scanner.clear().catch(() => {});
                setIsScanning(false);
              }
            },
            () => {}
          );
        } catch (err) {
          console.error("Scanner Start Error", err);
          setIsScanning(false);
        }
      };

      startScanner();

      const translateTimer = window.setTimeout(() => {
        const readerDiv = document.getElementById("reader");
        if (readerDiv) {
          readerDiv.querySelectorAll("*").forEach((el) => {
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

      return () => {
        window.clearTimeout(translateTimer);
        if (scanner) {
          scanner.clear().catch(() => {});
        }
      };
    }

    return undefined;
  }, [isScanning, pointDataId, points]);

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
        color: "#4a2c2a",
      }}
    >
      <div
        style={{
          background: "#fffaf2",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
          border: "1px solid #f2dfc2",
        }}
      >
        <h1
          style={{
            fontSize: "1.6rem",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          🍠 ポイントカード
        </h1>

        <p style={{ textAlign: "center", marginBottom: "16px", color: "#7a5a45" }}>
          {user?.signInDetails?.loginId || "ログイン中"}
        </p>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "20px",
            textAlign: "center",
            marginBottom: "18px",
            border: "1px solid #f0e2cc",
          }}
        >
          <div style={{ fontSize: "0.95rem", color: "#7a5a45", marginBottom: "8px" }}>
            現在のポイント
          </div>
          <div style={{ fontSize: "2.4rem", fontWeight: "bold", color: "#d35400" }}>
            {points} pt
          </div>
        </div>

        <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
          <button
            onClick={() => setIsScanning(true)}
            disabled={isUpdating}
            style={{
              width: "100%",
              padding: "14px",
              background: "#d35400",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            QRを読み取る
          </button>

          <button
            onClick={signOut}
            style={{
              width: "100%",
              padding: "12px",
              background: "#666",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ログアウト
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "16px",
            border: "1px solid #f0e2cc",
          }}
        >
          <h2 style={{ fontSize: "1rem", marginBottom: "12px" }}>特典交換QR例</h2>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <QRCodeCanvas
              value={`POTATO-${Math.floor(Date.now() / 180000)}-USE-3`}
              size={140}
            />
          </div>

          <p
            style={{
              fontSize: "0.85rem",
              color: "#7a5a45",
              textAlign: "center",
              marginTop: "10px",
            }}
          >
            これは3ポイント交換用のサンプルQR
          </p>
        </div>
      </div>

      {isScanning && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "16px",
              width: "100%",
              maxWidth: "420px",
            }}
          >
            <h2 style={{ marginBottom: "12px", textAlign: "center" }}>
              QRコードを読み取る
            </h2>

            <div id="reader" style={{ width: "100%" }} />

            <button
              onClick={() => setIsScanning(false)}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "12px",
                background: "#666",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PointCard;