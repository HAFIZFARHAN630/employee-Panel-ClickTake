"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { format } from "date-fns";
import type {
  EmployeeProject,
  Notification,
  Attendance,
  LeaveRequest,
  TimeLog,
} from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  CalendarOff,
  LogIn,
  CalendarPlus,
  Timer,
  Megaphone,
  Bell,
  ChevronRight,
} from "lucide-react";

export function OverviewPage() {
  const { user, setEmployeePage } = useAuth();
  const employeeId = user?.employee?.id ?? "";

  const [assignments, setAssignments] = useState<EmployeeProject[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeProjects, setActiveProjects] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [hoursThisWeek, setHoursThisWeek] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);

  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [assignRes, notifRes] = await Promise.all([
        api.get<EmployeeProject[]>("/api/assignments", {
          employeeId,
        }),
        api.get<Notification[]>("/api/notifications", {
          userId: user!.id,
        }),
      ]);

      const allAssignments = Array.isArray(assignRes) ? assignRes : [];
      const allNotifications = Array.isArray(notifRes) ? notifRes : [];

      setAssignments(allAssignments);
      setNotifications(allNotifications);

      // Active projects
      const active = allAssignments.filter(
        (a) => a.status === "accepted"
      ).length;
      setActiveProjects(active);

      // Completed tasks across accepted assignments
      let tasksCompleted = 0;
      allAssignments
        .filter((a) => a.status === "accepted" && a.project?.tasks)
        .forEach((a) => {
          tasksCompleted += a.project!.tasks!.filter(
            (t) => t.isCompleted
          ).length;
        });
      setCompletedTasks(tasksCompleted);

      // Hours this week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      try {
        const timeRes = await api.get<TimeLog[]>("/api/time-logs", {
          employeeId,
        });
        const logs = Array.isArray(timeRes) ? timeRes : [];
        const weekHours = logs
          .filter((l) => new Date(l.startTime) >= weekStart)
          .reduce((sum, l) => sum + (l.duration || 0), 0);
        setHoursThisWeek(weekHours / 3600);
      } catch {
        // ignore
      }

      // Pending leaves
      try {
        const leaveRes = await api.get<LeaveRequest[]>("/api/leaves", {
          employeeId,
        });
        const leaves = Array.isArray(leaveRes) ? leaveRes : [];
        setPendingLeaves(leaves.filter((l) => l.status === "pending").length);
      } catch {
        // ignore
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [employeeId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeAssignments = assignments.filter(
    (a) => a.status === "accepted" && a.project
  );
  const recentNotifs = notifications.slice(0, 5);

  const todayStr = format(new Date(), "EEEE, MMMM d, yyyy");

  function getNotifIcon(type: string) {
    if (type.includes("task")) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (type.includes("leave")) return <CalendarOff className="h-4 w-4 text-amber-500" />;
    if (type.includes("project")) return <FolderKanban className="h-4 w-4 text-blue-500" />;
    if (type.includes("announcement")) return <Megaphone className="h-4 w-4 text-purple-500" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  }

  function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Welcome back, {user?.fullName}!
              </h2>
              <p className="text-muted-foreground mt-1">{todayStr}</p>
            </div>
            <Badge variant="outline" className="w-fit text-sm px-3 py-1">
              {user?.employee?.department ?? "Employee"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeProjects}</p>
              <p className="text-xs text-muted-foreground">My Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-50 text-green-600 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks}</p>
              <p className="text-xs text-muted-foreground">Tasks Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{hoursThisWeek.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Hours This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950">
              <CalendarOff className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingLeaves}</p>
              <p className="text-xs text-muted-foreground">Pending Leaves</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Active Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">My Active Projects</CardTitle>
            <CardDescription>Projects you are currently working on</CardDescription>
          </CardHeader>
          <CardContent>
            {activeAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No active projects assigned.
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {activeAssignments.map((assignment) => {
                  const proj = assignment.project!;
                  const totalTasks = proj.tasks?.length ?? 0;
                  const doneTasks =
                    proj.tasks?.filter((t) => t.isCompleted).length ?? 0;
                  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                  return (
                    <div
                      key={assignment.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{proj.name}</h4>
                          <Badge
                            variant={
                              proj.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px] shrink-0"
                          >
                            {proj.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                          {proj.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {doneTasks}/{totalTasks} tasks
                          </span>
                          <Progress value={pct} className="h-2 w-24" />
                          <span className="font-medium">{pct}%</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setEmployeePage("projects")}
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Notifications</CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setEmployeePage("notifications")}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentNotifs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No notifications yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 p-2 rounded-lg text-sm ${
                        !notif.isRead
                          ? "bg-accent/50 border-l-2 border-l-primary"
                          : ""
                      }`}
                    >
                      {getNotifIcon(notif.notificationType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs"
                onClick={() => setEmployeePage("attendance")}
              >
                <LogIn className="h-4 w-4" />
                Check In
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs"
                onClick={() => setEmployeePage("leaves")}
              >
                <CalendarPlus className="h-4 w-4" />
                Request Leave
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs"
                onClick={() => setEmployeePage("time-tracking")}
              >
                <Timer className="h-4 w-4" />
                Start Timer
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs"
                onClick={() => setEmployeePage("announcements")}
              >
                <Megaphone className="h-4 w-4" />
                Announcements
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}