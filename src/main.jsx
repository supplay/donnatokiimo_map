import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";
import App from "./App.jsx";
import config from "./amplifyconfiguration.json";

Amplify.configure(config);
I18n.putVocabularies(translations);
I18n.setLanguage("ja");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);