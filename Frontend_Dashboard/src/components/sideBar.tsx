import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Hospital, Eye, Wifi, Battery, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"

import { GlassesAPI } from "../api/glassesApi";
import { useEffect, useState } from "react";

export function SidebarApp() {
  const location = useLocation();
  const [glassesStatus, setGlassesStatus] = useState<{
    glasses_connected: boolean;
    battery_level: number;
  } | null>(null);
  
  const navItems = [
    { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { name: "Sim Rooms", to: "/simrooms", icon: Hospital },
    { name: "Tracking Analysis", to: "/analyse", icon: Eye },
  ]

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


  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200 bg-slate-50"
    >
      {/* Header */}
      <SidebarHeader className="px-6 py-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Tobii Tool
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Eye-tracking platform
          </p>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">

              {navItems.map((item) => {
                const isActive = location.pathname === item.to
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`
                        group rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                        ${isActive
                          ? "bg-indigo-100 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }
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
                )
              })}

            </SidebarMenu>
          </SidebarGroupContent>
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

 {/* Tutorial Button with Dialog & Carousel */}
         <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="w-full flex items-center justify-center gap-2 bg-[#16B0A5] hover:bg-[#139488] text-white font-semibold shadow-md"
            >
              <Info size={16} /> Tutorial
            </Button>
          </DialogTrigger>
          <DialogContent>

            <div className="mt-4">
              <Carousel className="w-full max-w-[20rem] sm:max-w-lg">
                <CarouselContent>
                  {[
                    { title: "Step 1: download opname", desc: "op het dashboard onderaan vind u de opnames op de bril, nadat u verbinding hebt gemaakt met de brill over wifi zal u deze opnames kunnen zien en downloaden" },
                    { title: "Step 2: Sim Rooms", desc: "" },
                    { title: "Step 3: Tracking Analysis", desc: "Analyze eye-tracking data" },
                  ].map((slide, index) => (
                    <CarouselItem key={index}>
                      <div className="p-2">
                        <Card>
                          <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center">
                            <span className="text-lg font-semibold">{slide.title}</span>
                            <p className="text-sm text-slate-600">{slide.desc}</p>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                <div className="flex justify-between mt-4">
                  <CarouselPrevious>
                    <Button variant="outline">Prev</Button>
                  </CarouselPrevious>
                  <CarouselNext>
                    <Button variant="outline">Next</Button>
                  </CarouselNext>
                </div>
              </Carousel>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}