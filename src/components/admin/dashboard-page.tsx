"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  DashboardStats,
  ActivityLog,
  Project,
  ProjectStatus,
  ProjectPriority,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  FolderKanban,
  CalendarOff,
  UserCheck,
  TrendingUp,
  Activity,
  UserPlus,
  FileText,
  Shield,
  Clock,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ============ HELPERS ============

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("create") || lower.includes("add"))
    return <UserPlus className="h-4 w-4 text-green-500" />;
  if (lower.includes("update") || lower.includes("edit"))
    return <FileText className="h-4 w-4 text-blue-500" />;
  if (lower.includes("delete") || lower.includes("remove"))
    return <Shield className="h-4 w-4 text-red-500" />;
  if (lower.includes("login") || lower.includes("auth"))
    return <Clock className="h-4 w-4 text-purple-500" />;
  return <Activity className="h-4 w-4 text-orange-500" />;
}

function getStatusColor(status: ProjectStatus) {
  const map: Record<ProjectStatus, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    on_hold: "bg-yellow-100 text-yellow-700 border-yellow-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    archived: "bg-red-100 text-red-700 border-red-200",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

function getPriorityColor(priority: ProjectPriority) {
  const map: Record<ProjectPriority, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };
  return map[priority] || "bg-gray-100 text-gray-700";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============ STAT CARD ============

type CardAccent = "pink" | "purple" | "blue" | "amber";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend: string;
  accent: CardAccent;
  iconGradient?: string;
}

function getAccentClasses(accent: CardAccent) {
  const map: Record<CardAccent, { gradient: string; border: string; iconBg: string }> = {
    pink: {
      gradient: "bg-[var(--card-gradient-pink)]",
      border: "border-l-pink-accent",
      iconBg: "bg-pink-accent/15 text-pink-accent",
    },
    purple: {
      gradient: "bg-[var(--card-gradient-purple)]",
      border: "border-l-purple-accent",
      iconBg: "bg-purple-accent/15 text-purple-accent",
    },
    blue: {
      gradient: "bg-[var(--card-gradient-blue)]",
      border: "border-l-blue-accent",
      iconBg: "bg-blue-accent/15 text-blue-accent",
    },
    amber: {
      gradient: "bg-[var(--card-gradient-mixed)]",
      border: "border-l-yellow-500",
      iconBg: "bg-yellow-500/15 text-yellow-500",
    },
  };
  return map[accent];
}

function StatCard({ title, value, icon: Icon, trend, accent }: StatCardProps) {
  const classes = getAccentClasses(accent);
  return (
    <Card className={`hover:shadow-md transition-shadow border-l-4 ${classes.gradient} ${classes.border}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${classes.iconBg}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowUpRight className="h-3 w-3 text-green-500" />
          <span>{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ SKELETON LOADING ============

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function ProjectTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function DashboardPage() {
  const { setAdminPage } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get<DashboardStats>("/api/dashboard/stats");
      setStats(data);
    } catch {
      // silently fail
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const data = await api.get<ActivityLog[]>("/api/activity-logs", {
        limit: "10",
      });
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.get<Project[]>("/api/projects");
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchActivities();
    fetchProjects();
  }, [fetchStats, fetchActivities, fetchProjects]);

  const topProjects = projects.slice(0, 5);

  const [departmentAttendance, setDepartmentAttendance] = useState<{ name: string; rate: number }[]>([]);

  useEffect(() => {
    api.get<Record<string, number>>("/api/dashboard/stats").then((data) => {
      if (data?.departmentAttendance && Array.isArray(data.departmentAttendance)) {
        setDepartmentAttendance(data.departmentAttendance);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {loadingStats ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
            value={stats?.totalEmployees ?? 0}
            icon={Users}
            trend="+12% from last week"
            accent="pink"
          />
          <StatCard
            title="Active Projects"
            value={stats?.activeProjects ?? 0}
            icon={FolderKanban}
            trend="+8% from last month"
            accent="purple"
          />
          <StatCard
            title="Pending Leaves"
            value={stats?.pendingLeaves ?? 0}
            icon={CalendarOff}
            trend="-3% from last week"
            accent="blue"
          />
          <StatCard
            title="Pending Verifications"
            value={stats?.unverifiedFaces ?? 0}
            icon={UserCheck}
            trend="Needs attention"
            accent="amber"
          />
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {loadingActivities ? (
                <ActivitySkeleton />
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4 pr-3">
                  {activities.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {log.userEmail || "System"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.action}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {log.section}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Project Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-4 w-4" />
              Project Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {loadingProjects ? (
                <ProjectTableSkeleton />
              ) : topProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FolderKanban className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No projects found</p>
                </div>
              ) : (
                <div className="space-y-4 pr-3">
                  {topProjects.map((project) => (
                    <div
                      key={project.id}
                      className="space-y-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {project.name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            className={`text-[10px] ${getStatusColor(project.status)}`}
                          >
                            {project.status.replace("_", " ")}
                          </Badge>
                          <Badge
                            className={`text-[10px] ${getPriorityColor(project.priority)}`}
                          >
                            {project.priority}
                          </Badge>
                        </div>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{project.progress}% complete</span>
                        <span>{formatCurrency(project.budget)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-4 w-4" />
              Attendance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentAttendance.map((dept) => (
                <div key={dept.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{dept.name}</span>
                    <span className="text-muted-foreground">
                      {dept.rate}%
                    </span>
                  </div>
                  <Progress value={dept.rate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
                onClick={() => setAdminPage("users")}
              >
                <UserPlus className="h-5 w-5 text-green-600" />
                <span className="text-sm">Add Employee</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
                onClick={() => setAdminPage("projects")}
              >
                <FolderKanban className="h-5 w-5 text-purple-600" />
                <span className="text-sm">Create Project</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
              >
                <Eye className="h-5 w-5 text-blue-600" />
                <span className="text-sm">View Reports</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
                onClick={() => setAdminPage("rbac")}
              >
                <Shield className="h-5 w-5 text-orange-600" />
                <span className="text-sm">Manage Roles</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
