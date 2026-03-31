import React from "react";
import ReactDOM from "react-dom/client";
<<<<<<< HEAD
import { Amplify } from "aws-amplify";
import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";
import App from "./App.jsx";
import config from "./amplifyConfig";

Amplify.configure(config);
I18n.putVocabularies(translations);
I18n.setLanguage("ja");
=======

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
>>>>>>> main

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);