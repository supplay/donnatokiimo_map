import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { generateClient } from "aws-amplify/api";

const GET_USER_POINT = /* GraphQL */ `
  query GetUserPoint($id: ID!) {
    getUserPoint(id: $id) {
      id
      points
    }
  }
`;

const UPDATE_USER_POINT = /* GraphQL */ `
  mutation UpdateUserPoint($input: UpdateUserPointInput!) {
    updateUserPoint(input: $input) {
      id
      points
    }
  }
`;

const CREATE_USER_POINT = /* GraphQL */ `
  mutation CreateUserPoint($input: CreateUserPointInput!) {
    createUserPoint(input: $input) {
      id
      points
    }
  }
`;

const client = generateClient();

export default function PointCard({ user, signOut }) {
  const [points, setPoints] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPoints();
  }, [user]);

  const fetchPoints = async () => {
    try {
      const res = await client.graphql({
        query: GET_USER_POINT,
        variables: { id: user.userId },
      });
      if (res.data.getUserPoint) {
        setPoints(res.data.getUserPoint.points);
      } else {
        await client.graphql({
          query: CREATE_USER_POINT,
          variables: { input: { id: user.userId, points: 0 } },
        });
      }
    } catch (err) {
      console.error("ポイント取得エラー:", err);
    }
  };

  const updatePointsInDB = async (newPoints) => {
    await client.graphql({
      query: UPDATE_USER_POINT,
      variables: { input: { id: user.userId, points: newPoints } },
    });
    setPoints(newPoints);
  };

  const startScan = () => {
    setIsScanning(true);
    setMessage("");

    const scanner = new Html5QrcodeScanner("reader", { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0 
    });

    scanner.render(async (decodedText) => {
      if (!decodedText.startsWith("POTATO-")) {
        setMessage("これはお芋のQRじゃないバイ！");
        return;
      }

      const parts = decodedText.split("-");
      const timestamp = parseInt(parts[1]);
      const nowTimestamp = Math.floor(new Date().getTime() / (1000 * 60 * 3));

      if (Math.abs(nowTimestamp - timestamp) > 1) {
        setMessage("QRコードの期限が切れとるバイ。店主に新しく出してもらってね！");
        scanner.clear();
        setIsScanning(false);
        return;
      }

      try {
        if (parts[2] === "USE") {
          const usePoints = parseInt(parts[3]);
          if (points < usePoints) {
            setMessage(`ポイントが足りんバイ！（あと${usePoints - points}pt必要）`);
          } else {
            await updatePointsInDB(points - usePoints);
            setMessage(`${usePoints}pt 使ったバイ！ありがとう！`);
          }
        } else {
          await updatePointsInDB(points + 1);
          setMessage("1pt ゲットバイ！ホクホクのうちに食べてね！");
        }
      } catch (err) {
        setMessage("更新に失敗したバイ...");
      }

      scanner.clear();
      setIsScanning(false);
    }, (error) => {});
  };

  return (
    <div style={{ textAlign: "center", fontFamily: "'M PLUS Rounded 1c'" }}>
      <div style={{ background: "#f39c12", padding: "30px", borderRadius: "20px", color: "white", marginBottom: "20px" }}>
        <p style={{ margin: 0 }}>現在のポイント</p>
        <h1 style={{ fontSize: "4rem", margin: "10px 0" }}>{points}<span style={{ fontSize: "1.5rem" }}> pt</span></h1>
      </div>

      {isScanning ? (
        <div id="reader" style={{ width: "100%", maxWidth: "400px", margin: "auto" }}></div>
      ) : (
        <button onClick={startScan} style={{ width: "100%", padding: "20px", background: "#d35400", color: "#fff", border: "none", borderRadius: "15px", fontSize: "1.2rem", fontWeight: "bold" }}>
          📷 QRをスキャンする
        </button>
      )}

      {message && <div style={{ marginTop: "20px", padding: "15px", background: "#fff3e0", borderRadius: "10px", color: "#d35400", fontWeight: "bold" }}>{message}</div>}

      <button onClick={signOut} style={{ marginTop: "40px", background: "none", border: "none", color: "#999", textDecoration: "underline" }}>
        ログアウト
      </button>
    </div>
  );
}