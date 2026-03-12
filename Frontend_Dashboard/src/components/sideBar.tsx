import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Hospital, Eye, Wifi, Battery, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GlassesAPI } from "../api/glassesApi";
import { useEffect, useState } from "react";

export function SidebarApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [glassesStatus, setGlassesStatus] = useState<{
    glasses_connected: boolean;
    battery_level: number;
  } | null>(null);

  const [userOpen, setUserOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);
  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [pendingAdminPath, setPendingAdminPath] = useState<string | null>(null);

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

  const renderNavItems = (items: any, requireConfirm = false) => {
    return items.map((item: any) => {
      const isActive = location.pathname === item.to;
      const Icon = item.icon;

      const handleClick = (e: React.MouseEvent) => {
        if (requireConfirm) {
          e.preventDefault();
          setPendingAdminPath(item.to);
          setShowAdminWarning(true);
        }
      };

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
            <NavLink to={item.to} className="flex items-center gap-3" onClick={handleClick}>
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
    <>
      {/* Admin Warning Dialog */}
      <AlertDialog open={showAdminWarning} onOpenChange={setShowAdminWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Waarschuwing</AlertDialogTitle>
            <AlertDialogDescription>
                Dit gedeelte is alleen bedoeld voor beheerders. Verkeerde configuratie van kalibratie-instellingen kan de eye-tracking-instellingen verstoren. Weet u zeker dat u wilt doorgaan?            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAdminPath(null)}>
              Terug
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (pendingAdminPath) navigate(pendingAdminPath);
                setPendingAdminPath(null);
              }}
            >
              Ga verder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sidebar className="w-56 border-r border-slate-200 bg-slate-50">
        {/* Header */}
        <SidebarHeader className="px-6 py-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Tobii Tool</h2>
            <p className="text-xs text-slate-500 mt-1">Eye-tracking platform</p>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 flex flex-col">
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

          <div className="flex-1" />

          {/* Admin Section */}
          <SidebarGroup>
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="group rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 w-full flex items-center justify-between">
                  <span>Admin</span>
                  <ChevronRight
                    size={18}
                    className={`${adminOpen ? "rotate-90" : ""} transition-transform duration-200`}
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent className="pl-4">
                  <SidebarMenu>{renderNavItems(adminNavItems, true)}</SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="p-6 text-xs text-slate-400 border-t border-slate-200 flex flex-col gap-2">
          {glassesStatus && (
            <div className="flex items-center justify-between text-sm text-slate-700">
              <div className="flex items-center gap-1">
                <Wifi size={16} className={glassesStatus.glasses_connected ? "text-green-600" : "text-red-500"} />
                <span>{glassesStatus.glasses_connected ? "Connected" : "Disconnected"}</span>
              </div>
              {glassesStatus.glasses_connected &&
                <div className="flex items-center gap-1">
                  <Battery size={16} />
                  <span>{glassesStatus.battery_level}%</span>
                </div>
              }
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}