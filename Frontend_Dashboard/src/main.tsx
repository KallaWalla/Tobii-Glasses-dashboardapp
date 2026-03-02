import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import Dashboard from "./pages/Dashboard.js"
import SimRooms from "./pages/Simrooms.js"
import Labeler from "./pages/Labeling.js"
import Layout from "./components/Layout.js"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import EyeTracking from "./pages/EyeTracking.js"

const router = createBrowserRouter([
  {
    element: <Layout />,
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
      {
        path: "/analyse",
        element: <EyeTracking />,
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