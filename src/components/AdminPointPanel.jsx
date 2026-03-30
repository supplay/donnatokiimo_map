import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";

const AdminPointPanel = () => {
  const [mode, setMode] = useState("add"); // "add" (付与) か "use" (使用)
  const [pointsToConsume, setPointsToConsume] = useState(10);
  const [qrValue, setQrValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateQR = () => {
      const now = new Date();
      const timestamp = Math.floor(now.getTime() / (1000 * 60 * 3)); 
      
      if (mode === "add") {
        setQrValue(`POTATO-${timestamp}`);
      } else {
        setQrValue(`POTATO-${timestamp}-USE-${pointsToConsume}`);
      }

      setTimeLeft(180 - (Math.floor(now.getTime() / 1000) % 180));
    };

    updateQR();
    const timer = setInterval(updateQR, 1000);
    return () => clearInterval(timer);
  }, [mode, pointsToConsume]);

  return (
    <div style={{
      marginTop: "20px",
      padding: "20px",
      backgroundColor: "#fff",
      borderRadius: "20px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
      border: `6px solid ${mode === "add" ? "#e67e22" : "#c0392b"}`,
      textAlign: "center",
      transition: "all 0.3s ease"
    }}>
      {/* モード切替タブ */}
      <div style={{ display: "flex", marginBottom: "20px", borderRadius: "12px", overflow: "hidden", border: "2px solid #eee" }}>
        <button 
          onClick={() => setMode("add")}
          style={{
            flex: 1, padding: "15px", border: "none", fontSize: "1.1rem", fontWeight: "bold",
            background: mode === "add" ? "#e67e22" : "#f8f8f8",
            color: mode === "add" ? "#fff" : "#666",
            cursor: "pointer"
          }}
        >
          🎁 ポイントをあげる
        </button>
        <button 
          onClick={() => setMode("use")}
          style={{
            flex: 1, padding: "15px", border: "none", fontSize: "1.1rem", fontWeight: "bold",
            background: mode === "use" ? "#c0392b" : "#f8f8f8",
            color: mode === "use" ? "#fff" : "#666",
            cursor: "pointer"
          }}
        >
          ✨ ポイントを使う
        </button>
      </div>

      {/* メイン表示エリア */}
      <div>
        <h2 style={{ color: mode === "add" ? "#e67e22" : "#c0392b", fontSize: "1.5rem", marginBottom: "10px" }}>
          {mode === "add" ? "【 1pt プレゼント 】" : `【 ${pointsToConsume}pt つかう 】`}
        </h2>

        {mode === "use" && (
          <div style={{ marginBottom: "15px" }}>
            <label style={{ fontSize: "0.9rem", color: "#666" }}>消費ポイント設定：</label>
            <input 
              type="number" 
              value={pointsToConsume} 
              onChange={(e) => setPointsToConsume(parseInt(e.target.value) || 0)}
              style={{ width: "80px", fontSize: "1.2rem", textAlign: "center", border: "2px solid #c0392b", borderRadius: "8px" }}
            />
          </div>
        )}

        {/* QRコード表示部 */}
        <div style={{ 
          background: "#fff", 
          padding: "12px", 
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: "15px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}>
          <QRCodeCanvas 
            value={qrValue} 
            size={Math.min(window.innerWidth - 120, 300)}
            level="H" 
            includeMargin={true} 
            fgColor={mode === "add" ? "#333" : "#c0392b"}
            style={{ display: "block", maxWidth: "100%", height: "auto" }}
          />
        </div>

        <div style={{ marginTop: "15px", color: "#999", fontSize: "0.8rem" }}>
          自動更新まで: <strong>{timeLeft}</strong> 秒
        </div>
      </div>

      <p style={{ marginTop: "15px", fontSize: "0.9rem", color: "#666", lineHeight: "1.4" }}>
        {mode === "add" 
          ? "お客さんにスキャンしてもらうと1pt増えるバイ！" 
          : "スキャンしたお客さんのポイントが減るけん注意してね！"}
      </p>
    </div>
  );
};

export default AdminPointPanel;
