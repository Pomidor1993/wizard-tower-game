import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Overview from "./pages/Overview";
import Training from "./pages/Training";
import ChaosVault from "./pages/ChaosVault";
import Spellbook from "./pages/Spellbook";
import Tower from "./pages/Tower";
import Study from "./pages/Study";
import Exploration from "./pages/Exploration";
import Combat from "./pages/Combat";
import MagicSchool from "./pages/MagicSchool";
import Settings from "./pages/Settings";
import Premium from "./pages/Premium";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/overview" replace /> },
          { path: "overview", element: <Overview /> },
      { path: "training",    element: <Training /> },
      { path: "vault",       element: <ChaosVault /> },
      { path: "spellbook",   element: <Spellbook /> },
      { path: "tower",       element: <Tower /> },
      { path: "study",       element: <Study studyActions={0} studyActionsMax={0} activeActions={[]} onRefresh={() => {}} /> },
      { path: "exploration", element: <Exploration onRefresh={() => {}} /> },
      { path: "combat",      element: <Combat onRefresh={() => {}} /> },
      { path: "school",      element: <MagicSchool /> },
      { path: "settings",    element: <Settings /> },
      { path: "premium",     element: <Premium /> },
        ],
      },
    ],
  },
]);