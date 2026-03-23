import React from "react";
import ReactDOM from "react-dom/client";




import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json"; // Gen2形式の最新設定

Amplify.configure(outputs);

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
