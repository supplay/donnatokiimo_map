import React from "react";
import ReactDOM from "react-dom/client";


import { Amplify } from "aws-amplify";
import awsmobile from "../../src/aws-exports";
import App from "./App.jsx";

Amplify.configure({
  ...awsmobile,
  Storage: {
    S3: {
      bucket: awsmobile.aws_user_files_s3_bucket,
      region: awsmobile.aws_user_files_s3_bucket_region
    }
  }
});

console.log("設定されたバケット(admin):", Amplify.getConfig().Storage?.S3?.bucket);

// PWA でホーム画面から /admin/ で起動したとき /kanri_aki へ移動
if (!window.location.pathname.startsWith("/kanri_aki")) {
  window.history.replaceState(null, "", "/kanri_aki");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
