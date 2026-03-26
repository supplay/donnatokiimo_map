import React from "react";

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

export default Modal;
