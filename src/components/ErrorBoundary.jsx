import React from "react";

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
          <p style={{
            fontSize: "1.1rem",
            whiteSpace: "pre-wrap",
          }}>
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

export default ErrorBoundary;
