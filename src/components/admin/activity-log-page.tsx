"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { ActivityLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Shield,
  FolderKanban,
  Users,
  GitBranch,
  CalendarOff,
  Settings,
  ArrowDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type LogSection = "all" | "auth" | "projects" | "users" | "workflows" | "leaves" | "settings";

const SECTION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; border: string; badgeClass: string }
> = {
  auth: {
    icon: Shield,
    color: "text-amber-600",
    border: "border-l-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  },
  projects: {
    icon: FolderKanban,
    color: "text-violet-600",
    border: "border-l-violet-500",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400",
  },
  users: {
    icon: Users,
    color: "text-sky-600",
    border: "border-l-sky-500",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400",
  },
  workflows: {
    icon: GitBranch,
    color: "text-emerald-600",
    border: "border-l-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  leaves: {
    icon: CalendarOff,
    color: "text-orange-600",
    border: "border-l-orange-500",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  },
  settings: {
    icon: Settings,
    color: "text-gray-600",
    border: "border-l-gray-500",
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
};

const SECTION_OPTIONS: LogSection[] = [
  "all",
  "auth",
  "projects",
  "users",
  "workflows",
  "leaves",
  "settings",
];

function parseDetails(detailsStr: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(detailsStr);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
  } catch {
    // ignore
  }
  return {};
}

function getInitials(email: string): string {
  return email
    .split("@")[0]
    .split(".")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDetailValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}

export function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogSection>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 50;

  const fetchLogs = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : offset;
      try {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const params: Record<string, string> = {
          limit: String(limit),
          offset: String(currentOffset),
        };
        if (filter !== "all") {
          params.section = filter;
        }

        const data = await api.get<ActivityLog[]>("/api/activity-logs", params);
        const items = Array.isArray(data) ? data : [];

        if (reset) {
          setLogs(items);
        } else {
          setLogs((prev) => [...prev, ...items]);
        }
        setHasMore(items.length === limit);
        setOffset(currentOffset + limit);
      } catch {
        toast.error("Failed to load activity logs");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, offset, limit]
  );

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchLogs(true);
  }, [filter]);

  const handleLoadMore = () => {
    fetchLogs(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Track all system actions and changes
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {SECTION_OPTIONS.map((section) => {
          const config = SECTION_CONFIG[section];
          const Icon = config?.icon ?? FileText;
          const isActive = filter === section;
          return (
            <Button
              key={section}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(section)}
            >
              {section !== "all" && <Icon className="h-3.5 w-3.5 mr-1.5" />}
              {section === "all" ? "All" : section.charAt(0).toUpperCase() + section.slice(1)}
            </Button>
          );
        })}
      </div>

      {/* Timeline List */}
      {loading ? (
        <Card>
          <CardContent className="p-6 space-y-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No activity logs found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {filter === "all"
                ? "Activity will be recorded here as users interact with the system"
                : `No ${filter} activity to show`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ScrollArea className="max-h-[72vh]">
            <div className="space-y-0">
              {logs.map((log, index) => {
                const sectionConf = SECTION_CONFIG[log.section] ?? SECTION_CONFIG.settings;
                const details = parseDetails(log.details);
                const isSystem = !log.userId;
                const email = isSystem ? "System" : log.userEmail || "Unknown";

                return (
                  <div
                    key={log.id}
                    className={`relative pl-8 pb-6 last:pb-0 ${
                      index < logs.length - 1
                        ? "border-l-2 border-l-muted ml-4"
                        : "ml-4 border-l-2 border-l-transparent"
                    }`}
                    style={{
                      borderLeftColor:
                        index < logs.length - 1 ? undefined : "transparent",
                    }}
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background ${
                        log.section && SECTION_CONFIG[log.section]
                          ? SECTION_CONFIG[log.section].color.replace("text-", "bg-")
                          : "bg-muted-foreground"
                      }`}
                    />

                    <Card
                      className={`border-l-4 ${sectionConf.border} transition-shadow hover:shadow-sm`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback
                              className={`text-xs ${
                                isSystem
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {isSystem ? (
                                <Settings className="h-4 w-4" />
                              ) : (
                                getInitials(email)
                              )}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            {/* Action + Section */}
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">{log.action}</p>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${sectionConf.badgeClass} border-0`}
                              >
                                {log.section}
                              </Badge>
                            </div>

                            {/* User */}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {email}
                            </p>

                            {/* Details */}
                            {Object.keys(details).length > 0 && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                {Object.entries(details)
                                  .slice(0, 5)
                                  .map(([key, value]) => (
                                    <span
                                      key={key}
                                      className="text-xs text-muted-foreground"
                                    >
                                      <span className="font-medium text-foreground/70">
                                        {key}:
                                      </span>{" "}
                                      {formatDetailValue(value)}
                                    </span>
                                  ))}
                                {Object.keys(details).length > 5 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{Object.keys(details).length - 5} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Timestamp */}
                            <p className="text-xs text-muted-foreground/70 mt-1.5">
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  "Loading..."
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}