"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@/lib/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCircle2, CalendarOff, FolderKanban, Megaphone, Info, CheckCheck } from "lucide-react";
import { toast } from "sonner";

function getNotifIcon(type: string) {
  if (type.includes("task"))
    return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (type.includes("leave"))
    return <CalendarOff className="h-4 w-4 text-amber-500 shrink-0" />;
  if (type.includes("project") || type.includes("assignment"))
    return <FolderKanban className="h-4 w-4 text-blue-500 shrink-0" />;
  if (type.includes("announcement"))
    return <Megaphone className="h-4 w-4 text-purple-500 shrink-0" />;
  return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function getNotifBorder(type: string): string {
  if (type.includes("task")) return "border-l-green-500";
  if (type.includes("leave")) return "border-l-amber-500";
  if (type.includes("project") || type.includes("assignment"))
    return "border-l-blue-500";
  if (type.includes("announcement")) return "border-l-purple-500";
  return "border-l-muted-foreground";
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.get<Notification[]>("/api/notifications", {
        userId: user.id,
      });
      const list = Array.isArray(res) ? res : [];
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setNotifications(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}`, { isRead: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    try {
      await Promise.all(
        unread.map((n) =>
          api.patch(`/api/notifications/${n.id}`, { isRead: true })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    switch (activeTab) {
      case "unread":
        return !n.isRead;
      case "tasks":
        return n.notificationType.includes("task");
      case "leaves":
        return n.notificationType.includes("leave");
      case "system":
        return (
          !n.notificationType.includes("task") &&
          !n.notificationType.includes("leave") &&
          !n.notificationType.includes("project") &&
          !n.notificationType.includes("announcement") &&
          !n.notificationType.includes("assignment")
        );
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-4 w-4 mr-1" /> Mark All Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">
                  {activeTab === "all"
                    ? "No notifications yet."
                    : `No ${activeTab} notifications.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filtered.map((notif) => (
                <Card
                  key={notif.id}
                  className={`cursor-pointer transition-colors hover:bg-accent/30 ${
                    !notif.isRead
                      ? `border-l-4 ${getNotifBorder(notif.notificationType)}`
                      : ""
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                  }}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    {getNotifIcon(notif.notificationType)}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          !notif.isRead ? "font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}