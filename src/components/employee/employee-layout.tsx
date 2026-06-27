"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { EmployeePage, Notification } from "@/lib/types";
import { OverviewPage } from "./overview-page";
import { ProfilePage } from "./profile-page";
import { ProjectsPage } from "./projects-page";
import { AttendancePage } from "./attendance-page";
import { LeavePage } from "./leave-page";
import { TimeTrackingPage } from "./time-tracking-page";
import { AnnouncementsPage } from "./announcements-page";
import { NotificationsPage } from "./notifications-page";
import { SettingsPage } from "./settings-page";
import { ChatPage } from "./chat-page";
import { MySchedulePage } from "./my-schedule";
import { AgreementsPage } from "./agreements-page";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarCheck,
  CalendarOff,
  Clock,
  Bell,
  Megaphone,
  Settings,
  Menu,
  LogOut,
  User,
  Building2,
  MessageSquare,
  CalendarDays,
  FileText,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { KYCVerificationPopup } from "@/components/shared/kyc-verification-popup";

interface NavItem {
  id: EmployeePage;
  label: string;
  icon: React.ElementType;
}

const employeeNavItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "projects", label: "My Projects", icon: FolderKanban },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "leaves", label: "Leave Requests", icon: CalendarOff },
  { id: "time-tracking", label: "Time Tracking", icon: Clock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "my-schedule", label: "My Schedule", icon: CalendarDays },
  { id: "agreements", label: "Agreements", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

function getPageTitle(page: EmployeePage): string {
  const item = employeeNavItems.find((n) => n.id === page);
  return item?.label ?? "Overview";
}

function SidebarContent({
  currentPage,
  onNavigate,
  onLogout,
  userFullName,
  branding,
}: {
  currentPage: EmployeePage;
  onNavigate: (page: EmployeePage) => void;
  onLogout: () => void;
  userFullName: string;
  branding: { logoUrl?: string; companyName?: string } | null;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt="Logo" className="w-9 h-9 rounded-lg object-cover" />
        ) : (
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-[#E0197A] to-[#7B2FBE] text-white">
            <Building2 className="w-5 h-5" />
          </div>
        )}
        <div>
          <h2 className="text-base font-bold tracking-tight leading-none">
            {branding?.companyName || "EMS"}
          </h2>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            Employee Portal
          </p>
        </div>
      </div>
      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1">
          {employeeNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                  transition-colors cursor-pointer text-left w-full border
                  ${
                    isActive
                      ? "bg-[#E0197A]/15 text-[#E0197A] border border-[#E0197A]/20"
                      : "text-muted-foreground hover:bg-[#7B2FBE]/10 border border-transparent"
                  }
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section at bottom */}
      <Separator />
      <div className="px-3 py-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-gradient-to-br from-[#E0197A] to-[#7B2FBE] text-white">
              {userFullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userFullName}</p>
            <p className="text-xs text-muted-foreground truncate">Employee</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmployeeLayout() {
  const { user, employeePage, setEmployeePage, logout } = useAuth();
  const pageTitle = useMemo(() => getPageTitle(employeePage), [employeePage]);
  const [branding, setBranding] = useState<{ logoUrl?: string; companyName?: string } | null>(null);

  useEffect(() => {
    api.get<Record<string, string>>("/api/branding").then((data) => {
      let logoUrl: string | undefined;
      if (data.logoUrls) {
        try { const arr = JSON.parse(data.logoUrls); logoUrl = Array.isArray(arr) ? arr[0] : undefined; } catch {}
      }
      setBranding({ logoUrl, companyName: data.companyName });
    }).catch(() => {});
  }, []);

  const userFullName = user?.fullName ?? "User";
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    api.get<Notification[]>("/api/notifications", { userId: user.id, limit: "500" })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setUnreadCount(list.filter((n) => !n.isRead).length);
      })
      .catch(() => {});
  }, [user?.id]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-64 flex-col border-r bg-card h-screen sticky top-0">
        <SidebarContent
          currentPage={employeePage}
          onNavigate={setEmployeePage}
          onLogout={logout}
          userFullName={userFullName}
          branding={branding}
        />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent
                currentPage={employeePage}
                onNavigate={(page) => {
                  setEmployeePage(page);
                }}
                onLogout={logout}
                userFullName={userFullName}
                branding={branding}
              />
            </SheetContent>
          </Sheet>

          {/* Page Title */}
          <h1 className="text-lg font-semibold">{pageTitle}</h1>

          <div className="flex-1" />

          {/* Notification Bell */}
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Notifications"
                onClick={() => setEmployeePage("notifications")}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-gradient-to-br from-[#E0197A] to-[#7B2FBE] text-white">
                    {userFullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col gap-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {userFullName}
                </p>
                <p className="text-xs text-muted-foreground leading-none">
                  {user?.email ?? ""}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEmployeePage("profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEmployeePage("settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {employeePage === "overview" && <OverviewPage />}
          {employeePage === "profile" && <ProfilePage />}
          {employeePage === "projects" && <ProjectsPage />}
          {employeePage === "attendance" && <AttendancePage />}
          {employeePage === "leaves" && <LeavePage />}
          {employeePage === "time-tracking" && <TimeTrackingPage />}
          {employeePage === "announcements" && <AnnouncementsPage />}
          {employeePage === "notifications" && <NotificationsPage />}
          {employeePage === "chat" && <ChatPage />}
          {employeePage === "my-schedule" && <MySchedulePage />}
          {employeePage === "agreements" && <AgreementsPage />}
          {employeePage === "settings" && <SettingsPage />}
        </main>
      </div>
      <KYCVerificationPopup />
    </div>
  );
}