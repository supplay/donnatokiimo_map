import React from "react";
import ReactDOM from "react-dom/client";

import { Amplify } from "aws-amplify";
// ↓ ここを aws-exports から amplifyconfiguration に書き換えるバイ！
import amplifyconfig from "./amplifyconfiguration.json";
Amplify.configure(amplifyconfig);

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);