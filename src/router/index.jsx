// src/router/index.jsx
// Client-side routing with React Router v6.
// Mirrors the Next.js App Router routes:
//   /                  → redirect to /designer
//   /designer          → new design (no preloaded config)
//   /designer/:id      → load existing design from the API
//
// Install: npm install react-router-dom

import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import DesignerPage from "../pages/DesignerPage";
import DesignerWithDesign from "../pages/DesignerWithDesign";
import NotFoundScreen from "../components/NotFoundScreen";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/designer" replace />,
  },
  {
    path: "/designer",
    element: <DesignerPage />,
  },
  {
    path: "/designer/:id",
    element: <DesignerWithDesign />,
  },
  // Catch-all 404
  {
    path: "*",
    element: <NotFoundScreen />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
