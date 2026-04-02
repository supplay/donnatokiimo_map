import React from "react";
import ReactDOM from "react-dom/client";

import { Amplify } from "aws-amplify";
import config from "./amplifyConfig";
import App from "./App.jsx";

Amplify.configure(config);

// PWA でホーム画面から /admin/ で起動したとき /kanri_aki へ移動
if (!window.location.pathname.startsWith("/kanri_aki")) {
  window.history.replaceState(null, "", "/kanri_aki");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
