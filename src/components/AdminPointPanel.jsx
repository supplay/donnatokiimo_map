import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";

const AdminPointPanel = () => {
  const [pointsToConsume, setPointsToConsume] = useState(10); // 消費ptの初期値
  const [qrValue, setQrValue] = useState("");
  const [useQrValue, setUseQrValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateQR = () => {
      const now = new Date();
      // 3分（180秒）単位のタイムスタンプを作成（お客さん側と同期）
      const timestamp = Math.floor(now.getTime() / (1000 * 60 * 3)); 
      
      // 付与用QRの中身
      setQrValue(`POTATO-${timestamp}`);
      
      // 消費用QRの中身（店主が入力したポイント数を反映）
      setUseQrValue(`POTATO-${timestamp}-USE-${pointsToConsume}`);

      // 次の更新までのカウントダウン
      setTimeLeft(180 - (Math.floor(now.getTime() / 1000) % 180));
    };

    updateQR();
    const timer = setInterval(updateQR, 1000);
    return () => clearInterval(timer);
  }, [pointsToConsume]); // ポイント設定を変えたら即座にQRを再生成

  return (
    <div style={{
      marginTop: "20px",
      padding: "20px",
      backgroundColor: "#fff",
      borderRadius: "15px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      border: "3px solid #e67e22",
      textAlign: "center"
    }}>
      <h2 style={{ color: "#d35400", marginBottom: "20px" }}>🍠 ポイント発行パネル</h2>

      {/* 消費ポイントの設定入力 */}
      <div style={{ marginBottom: "25px", padding: "10px", background: "#fff3e0", borderRadius: "10px" }}>
        <label style={{ fontWeight: "bold" }}>特典交換の消費ポイント：</label>
        <input 
          type="number" 
          value={pointsToConsume} 
          onChange={(e) => setPointsToConsume(parseInt(e.target.value) || 0)}
          style={{ 
            width: "70px", 
            fontSize: "1.2rem", 
            textAlign: "center", 
            margin: "0 10px",
            border: "2px solid #e67e22",
            borderRadius: "5px"
          }}
        />
        <span style={{ fontWeight: "bold" }}>pt</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "20px" }}>
        {/* ポイント付与用 */}
        <div style={{ padding: "10px", border: "1px solid #eee", borderRadius: "10px" }}>
          <p style={{ fontWeight: "bold", marginBottom: "10px" }}>【 1pt 加算 】</p>
          <QRCodeCanvas value={qrValue} size={160} level="H" includeMargin={true} />
          <p style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>{qrValue}</p>
        </div>

        {/* ポイント消費用 */}
        <div style={{ padding: "10px", border: "1px solid #eee", borderRadius: "10px" }}>
          <p style={{ fontWeight: "bold", marginBottom: "10px", color: "#c0392b" }}>
            【 {pointsToConsume}pt 消費 】
          </p>
          <QRCodeCanvas 
            value={useQrValue} 
            size={160} 
            level="H" 
            includeMargin={true} 
            fgColor="#c0392b" // 消費用は赤色にして区別バイ！
          />
          <p style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>{useQrValue}</p>
        </div>
      </div>

      <div style={{ marginTop: "20px", color: "#e67e22", fontWeight: "bold" }}>
        <p>QRコード自動更新まで：<span style={{ fontSize: "1.4rem" }}>{timeLeft}</span> 秒</p>
        <p style={{ fontSize: "0.8rem", color: "#666" }}>
          ※3分経つと、お客さんの古いスクリーンショットは使えんくなるバイ！
        </p>
      </div>
    </div>
  );
};

export default AdminPointPanel;
