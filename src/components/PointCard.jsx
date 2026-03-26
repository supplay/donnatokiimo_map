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

    setPoints(res.data.updateUserPoint.points);
    alert(`やったバイ！${res.data.updateUserPoint.points}ポイントになったよ！🍠`);
  } catch (err) {
    alert("保存に失敗したバイ。");
  } finally {
    setIsUpdating(false);
  }
};
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
import React, { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QRCodeCanvas } from "qrcode.react";
// GraphQL queries/mutations
// LIST_POINTS, CREATE_POINT, UPDATE_POINT は適切な場所からimportまたは定義してください

function PointCard({ user, signOut }) {
  const [points, setPoints] = useState(0);
  const [pointDataId, setPointDataId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const client = generateClient();

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const res = await client.graphql({ query: LIST_POINTS, authMode: "userPool" });
        const items = res.data.listUserPoints.items;
        if (items.length > 0) {
          setPoints(items[0].points);
          setPointDataId(items[0].id);
        } else {
          const createRes = await client.graphql({
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
      const res = await client.graphql({
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
          sc = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
          sc.render(
            (text) => {
              const parts = text.split("-");
              const prefix = parts[0];
              const tick = parseInt(parts[1], 10);
              const mode = parts[2];
              const currentTick = Math.floor(Date.now() / 180000);
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
            () => {}
          );
        } catch (err) {
          setIsScanning(false);
        }
      };
      startScanner();
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
      {/* ...UI部分は既存のまま... */}
    </div>
  );
}

export default PointCard;
