import React from "react";
import ReactDOM from "react-dom/client";

<<<<<<< HEAD
=======
import { Amplify } from "aws-amplify";
import awsExports from "./aws-exports";
Amplify.configure(awsExports);
>>>>>>> 6bac5b2e4aea2b86dc790f324e461d8709455b31

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
