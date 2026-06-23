"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";
import type { Announcement, AnnouncementPriority } from "@/lib/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Megaphone, ChevronDown, AlertTriangle } from "lucide-react";

function priorityBadge(priority: AnnouncementPriority) {
  switch (priority) {
    case "urgent":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-400">Urgent</Badge>;
    case "high":
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-400">High</Badge>;
    case "normal":
      return <Badge variant="secondary">Normal</Badge>;
    case "low":
      return <Badge variant="outline">Low</Badge>;
    default:
      return <Badge variant="secondary">{priority}</Badge>;
  }
}

const priorityOrder: Record<AnnouncementPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastOpen, setPastOpen] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Announcement[]>("/api/announcements");
      const list = Array.isArray(res) ? res : [];
      // Sort by priority (urgent first), then by date
      list.sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 3;
        const pb = priorityOrder[b.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        return b.createdAt.localeCompare(a.createdAt);
      });
      setAnnouncements(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const activeAnnouncements = announcements.filter(
    (a) => a.status === "active"
  );
  const pastAnnouncements = announcements.filter(
    (a) => a.status === "archived"
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Announcements</h2>
        <p className="text-sm text-muted-foreground">
          Stay updated with the latest company announcements
        </p>
      </div>

      {/* Active Announcements */}
      <div className="space-y-4">
        {activeAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Megaphone className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No active announcements.</p>
            </CardContent>
          </Card>
        ) : (
          activeAnnouncements.map((ann) => (
            <Card
              key={ann.id}
              className={
                ann.priority === "urgent"
                  ? "border-l-4 border-l-red-500"
                  : ""
              }
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {ann.priority === "urgent" && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <h3 className="font-semibold text-base">{ann.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {priorityBadge(ann.priority)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ann.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                {ann.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {ann.description}
                  </p>
                )}
                {ann.content && (
                  <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {ann.content}
                  </div>
                )}
                {ann.createdBy && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Posted by{" "}
                    <span className="font-medium text-foreground">
                      {ann.createdBy.fullName}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Past Announcements (collapsible) */}
      {pastAnnouncements.length > 0 && (
        <Collapsible open={pastOpen} onOpenChange={setPastOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="text-sm font-medium">
                Past Announcements ({pastAnnouncements.length})
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  pastOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-2">
            {pastAnnouncements.map((ann) => (
              <Card key={ann.id} className="opacity-70">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <h3 className="font-medium text-sm">{ann.title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {priorityBadge(ann.priority)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(ann.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  {ann.description && (
                    <p className="text-xs text-muted-foreground">
                      {ann.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}