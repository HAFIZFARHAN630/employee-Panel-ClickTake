"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { Radio, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ActiveTimer {
  id: string;
  employeeId: string;
  employee?: { user: { fullName: string; email: string } };
  project: string;
  task: string;
  tag: string;
  startTime: string;
  endTime: string | null;
  duration: number;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LiveTrackingPage() {
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActiveTimers = useCallback(async () => {
    try {
      const data = await api.get<ActiveTimer[]>("/api/time-logs", {
        active: "true",
        all: "true",
      });
      // Filter for timers with no endTime (active)
      const active = (Array.isArray(data) ? data : []).filter(
        (t: ActiveTimer) => !t.endTime
      );
      setTimers(active);
    } catch {
      // silently fail on refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveTimers();
    // Auto-refresh every 10 seconds
    refreshRef.current = setInterval(fetchActiveTimers, 10000);
    // Tick every second for duration display
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActiveTimers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Radio className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Live Tracking</h2>
            <p className="text-sm text-muted-foreground">
              Real-time active timer monitoring
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </Badge>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : timers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Radio className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">
              No active timers right now
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Active time tracking sessions will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {timers.map((timer) => {
            const startMs = new Date(timer.startTime).getTime();
            const elapsed = now - startMs;
            const startFormatted = new Date(timer.startTime).toLocaleTimeString(
              [],
              { hour: "2-digit", minute: "2-digit" }
            );

            return (
              <Card key={timer.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                <CardHeader className="pb-2 pl-5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <CardTitle className="text-base font-semibold truncate">
                      {timer.employee?.user?.fullName || "Unknown Employee"}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pl-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Project</span>
                    <span className="font-medium truncate ml-2 max-w-[160px]">
                      {timer.project || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Task</span>
                    <span className="font-medium truncate ml-2 max-w-[160px]">
                      {timer.task || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Started</span>
                    <span className="font-medium">{startFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Duration
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {formatDuration(elapsed)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}