import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { CharacterProvider } from "./contexts/CharacterContext";
import { TutorialProvider } from "./contexts/TutorialContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CharacterProvider>
      <TutorialProvider>
        <RouterProvider router={router} />
      </TutorialProvider>
    </CharacterProvider>
  </React.StrictMode>
);