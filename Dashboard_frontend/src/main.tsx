import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import Dashboard from "./pages/Dashboard.js"
import SimRooms from "./pages/Simrooms.js"
import Labeler from "./pages/Labeling.js"
import AppLayout from "./components/Applayout.js"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"

const router = createBrowserRouter([
  {
    element: <AppLayout />, // 🔥 layout wrapper
    children: [
      {
        path: "/",
        element: <Navigate to="/dashboard" />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/simrooms",
        element: <SimRooms />,
      },
      {
        path: "/labeling",
        element: <Labeler />,
      },
    ],
  },
])

const rootElement = document.getElementById("root")

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
} else {
  console.error("Root element not found")
}