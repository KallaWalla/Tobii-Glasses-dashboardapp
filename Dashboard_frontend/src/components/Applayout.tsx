import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, Hospital } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 border-r bg-background">
        <div className="p-6">
          <h2 className="text-lg font-semibold">Labeling Tool</h2>
        </div>

        <nav className="px-3 space-y-1">
          <SidebarItem
            to="/dashboard"
            icon={<LayoutDashboard size={18} />}
          >
            Dashboard
          </SidebarItem>

          <SidebarItem
            to="/simrooms"
            icon={<Hospital size={18} />}
          >
            Sim Rooms
          </SidebarItem>
        </nav>
      </aside>

      {/* PAGE CONTENT */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}

function SidebarItem({
  to,
  icon,
  children,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground"
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}