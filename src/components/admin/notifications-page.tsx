"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Notification, AdminPage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ListTodo,
  CalendarOff,
  Megaphone,
  Bell,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { EmployeeSearchDropdown } from "@/components/shared/employee-search-dropdown";

type NotificationType =
  | "info"
  | "warning"
  | "success"
  | "error"
  | "task"
  | "leave"
  | "announcement"
  | "all";

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; border: string; bg: string }
> = {
  info: {
    icon: Info,
    color: "text-sky-600",
    border: "border-l-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  success: {
    icon: CheckCircle,
    color: "text-emerald-600",
    border: "border-l-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  error: {
    icon: XCircle,
    color: "text-red-600",
    border: "border-l-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
  },
  task: {
    icon: ListTodo,
    color: "text-violet-600",
    border: "border-l-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/20",
  },
  leave: {
    icon: CalendarOff,
    color: "text-orange-600",
    border: "border-l-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/20",
  },
  announcement: {
    icon: Megaphone,
    color: "text-pink-600",
    border: "border-l-pink-500",
    bg: "bg-pink-50 dark:bg-pink-950/20",
  },
};

interface NotificationWithUser extends Notification {
  user?: { id: string; fullName: string; email: string } | null;
}

const ACTION_URL_MAP: Record<string, AdminPage> = {
  "admin:dashboard": "dashboard",
  "admin:users": "users",
  "admin:projects": "projects",
  "admin:assignments": "assignments",
  "admin:attendance": "attendance",
  "admin:leaves": "leaves",
  "admin:time-tracking": "time-tracking",
  "admin:notifications": "notifications",
  "admin:announcements": "announcements",
  "admin:rbac": "rbac",
  "admin:activity-log": "activity-log",
  "admin:settings": "settings",
  "admin:verification": "verification",
  "admin:agreements": "agreements",
  "admin:chat": "chat",
  "admin:branding": "branding",
  "admin:integrations": "integrations",
  "admin:business-data": "business-data",
  "admin:departments": "departments",
  "admin:shifts": "shifts",
  "admin:ai-config": "ai-config",
  "admin:hr-training": "hr-training",
  "admin:awards": "awards",
  "admin:assets": "assets",
  "admin:live-tracking": "live-tracking",
};

export function NotificationsPage() {
  const { setAdminPage } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationType>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formUserId, setFormUserId] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType, setFormType] = useState("info");
  const [sending, setSending] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<NotificationWithUser[]>(
        filter === "all" ? "/api/notifications" : `/api/notifications?type=${filter}`
      );
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleCreate = async () => {
    if (!formUserId || !formMessage.trim()) {
      toast.error("User and message are required");
      return;
    }
    try {
      setSending(true);
      await api.post("/api/notifications", {
        userId: formUserId,
        message: formMessage.trim(),
        notificationType: formType,
      });
      toast.success("Notification sent");
      setDialogOpen(false);
      setFormUserId("");
      setFormMessage("");
      setFormType("info");
      fetchNotifications();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await api.post("/api/notifications/read-all");
      toast.success("All notifications marked as read");
      fetchNotifications();
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: NotificationWithUser) => {
    const url = (notification as Record<string, unknown>).actionUrl as string | undefined;
    if (!url) return;
    const page = ACTION_URL_MAP[url];
    if (page) setAdminPage(page);
    if (!notification.isRead) {
      api.patch(`/api/notifications/${notification.id}`).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    }
  };

  const filtered = filter === "all"
    ? notifications
    : notifications.filter((n) => n.notificationType === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage system notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            {markingAll ? "Marking..." : "Mark All as Read"}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Notification
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "info", "warning", "success", "error", "task", "leave", "announcement"] as const).map(
          (type) => {
            const config = TYPE_CONFIG[type];
            const Icon = config?.icon ?? Bell;
            const isActive = filter === type;
            return (
              <Button
                key={type}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(type)}
                className="capitalize"
              >
                {type !== "all" && <Icon className="h-3.5 w-3.5 mr-1.5" />}
                {type === "all" ? "All" : type}
              </Button>
            );
          }
        )}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted">
              <CardContent className="p-4 flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No notifications found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {filter === "all"
                ? "Notifications will appear here when created"
                : `No ${filter} notifications to show`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-3 pr-2">
            {filtered.map((notification) => {
              const config = TYPE_CONFIG[notification.notificationType] ?? TYPE_CONFIG.info;
              const Icon = config.icon;
              return (
                <Card
                  key={notification.id}
                  className={`border-l-4 ${config.border} transition-shadow hover:shadow-sm ${notification.actionUrl ? 'cursor-pointer hover:bg-accent/30' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm leading-relaxed ${
                            notification.isRead
                              ? "text-muted-foreground"
                              : "text-foreground font-medium"
                          }`}
                        >
                          {notification.message}
                        </p>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {notification.notificationType}
                        </Badge>
                        {notification.user && (
                          <span className="text-xs text-muted-foreground">
                            {notification.user.fullName} ({notification.user.email})
                          </span>
                        )}
                        {notification.actionUrl && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Create Notification Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormUserId("");
            setFormMessage("");
            setFormType("info");
          }
          setDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>User</Label>
              <EmployeeSearchDropdown
                value={formUserId}
                onChange={setFormUserId}
                placeholder="Search and select a user..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-type">Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger id="notif-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["info", "warning", "success", "error", "task", "leave", "announcement"] as const).map(
                    (t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-message">Message</Label>
              <Textarea
                id="notif-message"
                placeholder="Write notification message..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={sending || !formUserId || !formMessage.trim()}>
              {sending ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}