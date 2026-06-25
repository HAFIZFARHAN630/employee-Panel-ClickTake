"use client";

import React, { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import type { AdminPage } from "@/lib/types";
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
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  id: AdminPage;
  label: string;
  icon: React.ElementType;
}

const adminNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "awards", label: "Awards", icon: Trophy },
  { id: "assets", label: "Assets", icon: Package },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "assignments", label: "Assignments", icon: UserCheck },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "shifts", label: "Shifts", icon: Clock },
  { id: "leaves", label: "Leave Management", icon: CalendarOff },
  { id: "time-tracking", label: "Time Tracking", icon: Timer },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "rbac", label: "RBAC", icon: Shield },
  { id: "ai-config", label: "AI Config", icon: Brain },
  { id: "hr-training", label: "HR Training", icon: GraduationCap },
  { id: "activity-log", label: "Activity Log", icon: ScrollText },
  { id: "verification", label: "Verification", icon: ScanFace },
  { id: "agreements", label: "Agreements", icon: FileText },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "settings", label: "Settings", icon: Settings },
];

function getPageTitle(page: AdminPage): string {
  const item = adminNavItems.find((n) => n.id === page);
  return item?.label ?? "Dashboard";
}

function SidebarContent({
  currentPage,
  onNavigate,
  onLogout,
  userFullName,
}: {
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  userFullName: string;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight leading-none">
            EMS
          </h2>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            Admin Panel
          </p>
        </div>
      </div>
      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                  transition-colors cursor-pointer text-left w-full
                  ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
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
  );
}

export function AdminLayout() {
  const { user, adminPage, setAdminPage, logout } = useAuth();
  const pageTitle = useMemo(() => getPageTitle(adminPage), [adminPage]);

  const userFullName = user?.fullName ?? "User";
  const unreadCount = 3; // placeholder

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-64 flex-col border-r bg-card h-screen sticky top-0">
        <SidebarContent
          currentPage={adminPage}
          onNavigate={setAdminPage}
          onLogout={logout}
          userFullName={userFullName}
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
                currentPage={adminPage}
                onNavigate={(page) => {
                  setAdminPage(page);
                }}
                onLogout={logout}
                userFullName={userFullName}
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
          {adminPage === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}