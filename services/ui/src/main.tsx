import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { BalancePage } from "./pages/BalancePage";
import { TransferPage } from "./pages/TransferPage";
import { AdminObservabilityPage } from "./pages/AdminObservabilityPage";
import "./styles.css";

type AuthPayload = {
  role: "user" | "admin";
};

function getAuthPayload(): AuthPayload | null {
  const rawAuth = localStorage.getItem("auth");
  if (!rawAuth) {
    return null;
  }

  try {
    return JSON.parse(rawAuth) as AuthPayload;
  } catch {
    return null;
  }
}

function UserOnlyRoute({ element }: { element: JSX.Element }) {
  const auth = getAuthPayload();
  if (!auth) {
    return <Navigate to="/" replace />;
  }
  if (auth.role === "admin") {
    return <Navigate to="/admin/observability" replace />;
  }
  return element;
}

function AdminOnlyRoute({ element }: { element: JSX.Element }) {
  const auth = getAuthPayload();
  if (!auth) {
    return <Navigate to="/" replace />;
  }
  if (auth.role !== "admin") {
    return <Navigate to="/balance" replace />;
  }
  return element;
}

const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/balance", element: <UserOnlyRoute element={<BalancePage />} /> },
  { path: "/transfer", element: <UserOnlyRoute element={<TransferPage />} /> },
  {
    path: "/admin/observability",
    element: <AdminOnlyRoute element={<AdminObservabilityPage />} />
  }
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
