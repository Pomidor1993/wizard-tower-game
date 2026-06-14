import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { CharacterProvider } from "./contexts/CharacterContext";
import { router } from "./router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CharacterProvider>
      <RouterProvider router={router} />
    </CharacterProvider>
  </React.StrictMode>
);