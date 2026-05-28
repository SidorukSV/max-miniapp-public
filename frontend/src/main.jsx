import React from "react";
import ReactDOM from "react-dom/client";

import "@maxhub/max-ui/dist/styles.css";
import { MaxUI } from "@maxhub/max-ui";

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  //<React.StrictMode>
    <MaxUI>
      <App />
    </MaxUI>
  //</React.StrictMode>
);