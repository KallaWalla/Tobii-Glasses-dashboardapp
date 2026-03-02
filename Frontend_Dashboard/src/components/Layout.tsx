import { Outlet } from "react-router-dom"
import { SidebarApp } from "./sideBar.tsx"
import { SidebarProvider } from "./ui/sidebar.tsx"

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen bg-[#F4F9FC]">

        {/* ================= SIDEBAR ================= */}
        <div className="flex-shrink-0 h-screen">
          <SidebarApp />
        </div>

        {/* ================= PAGE CONTENT ================= */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-10 min-w-0">
            <Outlet />
          </div>
        </main>

      </div>
    </SidebarProvider>
  )
}