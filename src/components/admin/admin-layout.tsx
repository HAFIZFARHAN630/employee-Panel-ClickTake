"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminPage, Notification } from "@/lib/types";
import { DashboardPage } from "./dashboard-page";
import { UsersPage } from "./users-page";
import { AwardsPage } from "./awards-page";
import { AssetsPage } from "./assets-page";
import { ProjectsPage } from "./projects-page";
import { AssignmentsPage } from "./assignments-page";
import { AttendancePage } from "./attendance-page";
import { ShiftsPage } from "./shifts-page";
import { LeavesPage } from "./leaves-page";
import { TimeTrackingPage } from "./time-tracking-page";
import { NotificationsPage } from "./notifications-page";
import { AnnouncementsPage } from "./announcements-page";
import { RBACPage } from "./rbac-page";
import { AIConfigPage } from "./ai-config-page";
import { HRTrainingPage } from "./hr-training-page";
import { ActivityLogPage } from "./activity-log-page";
import { VerificationPage } from "./verification-page";
import { AgreementsPage } from "./agreements-page";
import { BrandingPage } from "./branding-page";
import { SettingsPage } from "./settings-page";
import { StoragePage } from "./storage-page";
import { DepartmentsPage } from "./departments-page";
import { LiveTrackingPage } from "./live-tracking-page";
import { ChatPage } from "./chat-page";
import { IntegrationsPage } from "./integrations-page";
import { BusinessDataPage } from "./business-data-page";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  UserCheck,
  CalendarCheck,
  CalendarOff,
  Clock,
  Timer,
  Bell,
  Megaphone,
  Shield,
  ScrollText,
  FileText,
  Settings,
  Menu,
  LogOut,
  User,
  Building2,
  ScanFace,
  Trophy,
  Package,
  Brain,
  GraduationCap,
  Palette,
  Radio,
  MessageSquare,
  Webhook,
  Store,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  id: AdminPage;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    group: "MAIN",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "WORKFORCE",
    items: [
      { id: "users", label: "Users", icon: Users },
      { id: "departments", label: "Departments", icon: Building2 },
      { id: "awards", label: "Awards", icon: Trophy },
      { id: "assets", label: "Assets", icon: Package },
      { id: "verification", label: "Verification", icon: ScanFace },
    ],
  },
  {
    group: "WORK MANAGEMENT",
    items: [
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "assignments", label: "Assignments", icon: UserCheck },
      { id: "time-tracking", label: "Time Tracking", icon: Timer },
      { id: "live-tracking", label: "Live Tracking", icon: Radio },
    ],
  },
  {
    group: "HR & ATTENDANCE",
    items: [
      { id: "attendance", label: "Attendance", icon: CalendarCheck },
      { id: "shifts", label: "Shifts", icon: Clock },
      { id: "leaves", label: "Leave Management", icon: CalendarOff },
    ],
  },
  {
    group: "COMMUNICATION",
    items: [
      { id: "chat", label: "Chat", icon: MessageSquare },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    group: "ADMIN & SECURITY",
    items: [
      { id: "rbac", label: "RBAC", icon: Shield },
      { id: "agreements", label: "Agreements", icon: FileText },
      { id: "activity-log", label: "Activity Log", icon: ScrollText },
    ],
  },
  {
    group: "SYSTEM & AI",
    items: [
      { id: "ai-config", label: "AI Config", icon: Brain },
      { id: "hr-training", label: "HR Training", icon: GraduationCap },
      { id: "integrations", label: "Integrations", icon: Webhook },
    ],
  },
  {
    group: "DATA & SETTINGS",
    items: [
      { id: "business-data", label: "Business Data", icon: Store },
      { id: "storage", label: "Storage", icon: HardDrive },
      { id: "branding", label: "Branding", icon: Palette },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

function getPageTitle(page: AdminPage): string {
  for (const group of adminNavGroups) {
    const item = group.items.find((n) => n.id === page);
    if (item) return item.label;
  }
  return "Dashboard";
}

function NavItemButton({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onNavigate: (page: AdminPage) => void;
}) {
  const Icon = item.icon;

  const button = (
    <button
      onClick={() => onNavigate(item.id)}
      className={`
        flex items-center gap-3 rounded-lg text-sm font-medium
        transition-all duration-200 cursor-pointer text-left w-full
        ${
          isActive
            ? "text-white border-l-[3px]"
            : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-foreground border-l-[3px] border-transparent"
        }
        ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"}
      `}
      style={
        isActive
          ? {
              background: "linear-gradient(135deg, var(--color-purple), #a855f7)",
              borderColor: "var(--color-purple)",
            }
          : undefined
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

function SidebarContent({
  currentPage,
  onNavigate,
  collapsed,
}: {
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  collapsed: boolean;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full px-2 py-3">
        <nav className="flex flex-col gap-1">
          {adminNavGroups.map((group) => (
            <div key={group.group} className="mb-1">
              {!collapsed && (
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] select-none">
                  {group.group}
                </p>
              )}
              {group.items.map((item) => (
                <NavItemButton
                  key={item.id}
                  item={item}
                  isActive={currentPage === item.id}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}

export function AdminLayout() {
  const { user, adminPage, setAdminPage, logout } = useAuth();
  const pageTitle = useMemo(() => getPageTitle(adminPage), [adminPage]);
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

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("admin-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Mobile sheet state
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileNavigate = useCallback(
    (page: AdminPage) => {
      setAdminPage(page);
      setMobileOpen(false);
    },
    [setAdminPage]
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <TooltipProvider delayDuration={0}>
        <aside
          className="hidden md:flex flex-col border-r h-screen sticky top-0 transition-[width] duration-300 ease-in-out"
          style={{
            width: sidebarCollapsed ? 70 : 256,
            background: "var(--bg-secondary)",
          }}
        >
          {/* Logo area */}
          <div
            className="flex items-center gap-3 px-4 py-5 shrink-0"
            style={{ justifyContent: sidebarCollapsed ? "center" : "flex-start" }}
          >
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="w-9 h-9 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h2 className="text-base font-bold tracking-tight leading-none truncate">
                  {branding?.companyName || "EMS"}
                </h2>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  Admin Panel
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Navigation */}
          <SidebarContent
            currentPage={adminPage}
            onNavigate={setAdminPage}
            collapsed={sidebarCollapsed}
          />

          {/* Bottom: User + Collapse toggle */}
          <Separator />
          <div className="shrink-0 px-2 py-3 flex flex-col gap-1">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
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
                  <p className="text-xs text-muted-foreground truncate">Administrator</p>
                </div>
              </div>
            )}

            {sidebarCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center py-1">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {userFullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {userFullName}
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={sidebarCollapsed ? "icon" : "sm"}
                  onClick={toggleSidebar}
                  className={sidebarCollapsed ? "mx-auto w-9 h-9" : "w-full justify-start gap-3 px-3"}
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <>
                      <PanelLeftClose className="h-4 w-4" />
                      <span className="text-sm">Collapse</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  Expand sidebar
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
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
            <SheetContent side="left" className="w-64 p-0" style={{ background: "var(--bg-secondary)" }}>
              <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 py-5">
                  {branding?.logoUrl ? (
                    <img src={branding.logoUrl} alt="Logo" className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-bold tracking-tight leading-none">
                      {branding?.companyName || "EMS"}
                    </h2>
                    <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                      Admin Panel
                    </p>
                  </div>
                </div>
                <Separator />
                <SidebarContent
                  currentPage={adminPage}
                  onNavigate={handleMobileNavigate}
                  collapsed={false}
                />
                <Separator />
                <div className="px-3 py-3">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
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
                      <p className="text-xs text-muted-foreground truncate">Administrator</p>
                    </div>
                  </div>
                </div>
              </div>
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
                onClick={() => setAdminPage("notifications")}
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
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
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
              <DropdownMenuItem onClick={() => setAdminPage("notifications")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAdminPage("settings")}>
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
          {adminPage === "dashboard" && <DashboardPage />}
          {adminPage === "users" && <UsersPage />}
          {adminPage === "awards" && <AwardsPage />}
          {adminPage === "assets" && <AssetsPage />}
          {adminPage === "projects" && <ProjectsPage />}
          {adminPage === "assignments" && <AssignmentsPage />}
          {adminPage === "attendance" && <AttendancePage />}
          {adminPage === "shifts" && <ShiftsPage />}
          {adminPage === "leaves" && <LeavesPage />}
          {adminPage === "time-tracking" && <TimeTrackingPage />}
          {adminPage === "notifications" && <NotificationsPage />}
          {adminPage === "announcements" && <AnnouncementsPage />}
          {adminPage === "rbac" && <RBACPage />}
          {adminPage === "ai-config" && <AIConfigPage />}
          {adminPage === "hr-training" && <HRTrainingPage />}
          {adminPage === "activity-log" && <ActivityLogPage />}
          {adminPage === "verification" && <VerificationPage />}
          {adminPage === "agreements" && <AgreementsPage />}
          {adminPage === "branding" && <BrandingPage />}
          {adminPage === "departments" && <DepartmentsPage />}
          {adminPage === "live-tracking" && <LiveTrackingPage />}
          {adminPage === "chat" && <ChatPage />}
          {adminPage === "integrations" && <IntegrationsPage />}
          {adminPage === "business-data" && <BusinessDataPage />}
          {adminPage === "storage" && <StoragePage />}
          {adminPage === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}