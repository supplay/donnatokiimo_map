import React from "react";
import ReactDOM from "react-dom/client";

import { Amplify } from "aws-amplify";
import awsmobile from "../../src/aws-exports";

Amplify.configure({
  ...awsmobile,
  Storage: {
    S3: {
      bucket: awsmobile.aws_user_files_s3_bucket,
      region: awsmobile.aws_user_files_s3_bucket_region
    }
  }
});

console.log("設定されたバケット(main):", Amplify.getConfig().Storage?.S3?.bucket);

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);