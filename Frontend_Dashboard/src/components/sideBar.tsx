import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Hospital, Eye, Wifi, Battery, ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GlassesAPI } from "../api/glassesApi";
import { useEffect, useState } from "react";

export function SidebarApp() {
  const location = useLocation();
  const [glassesStatus, setGlassesStatus] = useState<{
    glasses_connected: boolean;
    battery_level: number;
  } | null>(null);

  const [userOpen, setUserOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  const userNavItems = [
    { name: "Stap 1", to: "/dashboard", icon: LayoutDashboard },
    { name: "Stap 2", to: "/analyse", icon: Eye },
  ];

  const adminNavItems = [
    { name: "Calibratie", to: "/simrooms", icon: Hospital },
  ];

    useEffect(() => {
    const fetchGlassesStatus = async () => {
      try {
        const data = await GlassesAPI.getGlassesConnection();
        setGlassesStatus(data);
      } catch (err) {
        console.error("Failed to fetch glasses status", err);
      }
    };

    fetchGlassesStatus();

    const interval = setInterval(fetchGlassesStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const renderNavItems = (items:any) => {
    return items.map((item:any) => {
      const isActive = location.pathname === item.to;
      const Icon = item.icon;

      return (
        <SidebarMenuItem key={item.name}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className={`
              group rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
              ${isActive
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"}
            `}
          >
            <NavLink to={item.to} className="flex items-center gap-3">
              <Icon
                size={18}
                className={`transition-colors ${
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-400 group-hover:text-slate-700"
                }`}
              />
              <span>{item.name}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };
  return (
    <Sidebar className="w-56 border-r border-slate-200 bg-slate-50">
      {/* Header */}
      <SidebarHeader className="px-6 py-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Tobii Tool</h2>
          <p className="text-xs text-slate-500 mt-1">Eye-tracking platform</p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        {/* User Section */}
        <SidebarGroup>
          <Collapsible open={userOpen} onOpenChange={setUserOpen}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="group rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 w-full flex items-center justify-between">
                <span>Eye Tracking</span>
                <ChevronDown
                  size={18}
                  className={`${userOpen ? "rotate-180" : ""} transition-transform`}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarGroupContent className="pl-4">
                <SidebarMenu>{renderNavItems(userNavItems)}</SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Admin Section */}
        <SidebarGroup>
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="group rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 w-full flex items-center justify-between">
                <span>Admin</span>
                <ChevronDown
                  size={18}
                  className={`${adminOpen ? "rotate-180" : ""} transition-transform`}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarGroupContent className="pl-4">
                <SidebarMenu>{renderNavItems(adminNavItems)}</SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

     {/* Footer */}
      <SidebarFooter className="p-6 text-xs text-slate-400 border-t border-slate-200 flex flex-col gap-2">
        {/* Glasses Status */}
        {glassesStatus && (
          <div className="flex items-center justify-between text-sm text-slate-700">
            <div className="flex items-center gap-1">
              <Wifi size={16} className={glassesStatus.glasses_connected ? "text-green-600" : "text-red-500"} />
              <span>{glassesStatus.glasses_connected ? "Connected" : "Disconnected"}</span>
            </div>
            {glassesStatus.glasses_connected ? 
              <div className="flex items-center gap-1">
                <Battery size={16} />
                <span>{glassesStatus.battery_level}%</span>
              </div>
            : null }
          </div>
        )}  
      </SidebarFooter>
    </Sidebar>
  );
}