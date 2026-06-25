"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { format, startOfWeek, isToday, parseISO } from "date-fns";
import type { TimeLog, EmployeeProject } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Square, Clock, Timer, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const TAG_OPTIONS = [
  "frontend",
  "backend",
  "design",
  "meeting",
  "review",
  "documentation",
  "testing",
  "other",
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatHours(seconds: number): string {
  const h = seconds / 3600;
  return `${h.toFixed(1)}h`;
}

export function TimeTrackingPage() {
  const { user } = useAuth();
  const employeeId = user?.employee?.id ?? "";

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [selectedProject, setSelectedProject] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [selectedTag, setSelectedTag] = useState("other");
  const [stopping, setStopping] = useState(false);

  // Data state
  const [assignments, setAssignments] = useState<EmployeeProject[]>([]);
  const [todayLogs, setTodayLogs] = useState<TimeLog[]>([]);
  const [historyLogs, setHistoryLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Restore timer from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("ems_timer");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.isRunning && data.startTime) {
          setIsRunning(true);
          setStartTime(new Date(data.startTime));
          setElapsed(Date.now() - new Date(data.startTime).getTime());
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Timer interval
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startTime) {
          setElapsed(Date.now() - startTime.getTime());
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, startTime]);

  // Persist timer state
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isRunning && startTime) {
      localStorage.setItem(
        "ems_timer",
        JSON.stringify({ isRunning: true, startTime: startTime.toISOString() })
      );
    } else {
      localStorage.removeItem("ems_timer");
    }
  }, [isRunning, startTime]);

  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [assignRes, logRes] = await Promise.all([
        api.get<EmployeeProject[]>("/api/assignments", { employeeId }),
        api.get<TimeLog[]>("/api/time-logs", { employeeId }),
      ]);

      const allAssignments = Array.isArray(assignRes) ? assignRes : [];
      const allLogs = Array.isArray(logRes) ? logRes : [];

      // Only accepted projects for the dropdown
      setAssignments(
        allAssignments.filter((a) => a.status === "accepted" && a.project)
      );

      // Today's logs
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const today = allLogs.filter((l) => {
        try {
          return format(new Date(l.startTime), "yyyy-MM-dd") === todayStr;
        } catch {
          return false;
        }
      });
      setTodayLogs(today);

      // Last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const history = allLogs
        .filter((l) => new Date(l.startTime) >= thirtyDaysAgo)
        .sort((a, b) => b.startTime.localeCompare(a.startTime));
      setHistoryLogs(history);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStart = () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }
    const now = new Date();
    setStartTime(now);
    setElapsed(0);
    setIsRunning(true);
  };

  const handleStop = async () => {
    if (!startTime || !employeeId) return;
    setStopping(true);
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    try {
      const proj = assignments.find((a) => a.projectId === selectedProject);
      await api.post("/api/time-logs", {
        employeeId,
        project: proj?.project?.name ?? selectedProject,
        task: taskInput || "General work",
        tag: selectedTag,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
      });
      toast.success(`Time logged: ${formatDuration(duration)}`);

      // Reset timer
      setIsRunning(false);
      setStartTime(null);
      setElapsed(0);
      setTaskInput("");
      setSelectedTag("other");
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save time log");
    } finally {
      setStopping(false);
    }
  };

  // Weekly summary
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weeklyLogs = historyLogs.filter((l) => new Date(l.startTime) >= weekStart);
  const totalWeeklySeconds = weeklyLogs.reduce((s, l) => s + (l.duration || 0), 0);

  // Breakdown by project
  const projectBreakdown: Record<string, number> = {};
  weeklyLogs.forEach((l) => {
    projectBreakdown[l.project] = (projectBreakdown[l.project] || 0) + (l.duration || 0);
  });
  const maxProjectSeconds = Math.max(...Object.values(projectBreakdown), 1);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Timer Card */}
      <Card className={isRunning ? "border-green-300 dark:border-green-800" : ""}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Time Tracker
          </CardTitle>
          <CardDescription>
            {isRunning ? "Timer is running..." : "Start tracking your work time"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Timer Display */}
          <div className="flex flex-col items-center gap-6 py-4">
            <div
              className={`text-5xl sm:text-6xl font-mono font-bold tabular-nums ${
                isRunning ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              }`}
            >
              {formatDuration(Math.floor(elapsed / 1000))}
            </div>

            {isRunning && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
                <span className="text-sm text-muted-foreground">Recording</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Project</Label>
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
                disabled={isRunning || assignments.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={assignments.length === 0 ? "Loading projects..." : "Select project"} />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((a) => (
                    <SelectItem key={a.projectId} value={a.projectId}>
                      {a.project?.name ?? "Select project..."}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Task</Label>
              <Input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="What are you working on?"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tag</Label>
              <Select
                value={selectedTag}
                onValueChange={setSelectedTag}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {isRunning ? (
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleStop}
                  disabled={stopping}
                >
                  <Square className="h-4 w-4 mr-2" />
                  {stopping ? "Stopping..." : "Stop"}
                </Button>
              ) : (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleStart}
                >
                  <Play className="h-4 w-4 mr-2" /> Start
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> Today&apos;s Log
            </CardTitle>
            <CardDescription>
              {todayLogs.length} {todayLogs.length === 1 ? "entry" : "entries"} •{" "}
              {formatHours(todayLogs.reduce((s, l) => s + (l.duration || 0), 0))} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No time entries today. Start the timer to begin tracking.
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {todayLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{log.project}</p>
                      <p className="text-xs text-muted-foreground">{log.task}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-mono font-medium">
                        {formatDuration(log.duration)}
                      </p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {log.tag}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Weekly Summary
            </CardTitle>
            <CardDescription>
              {formatHours(totalWeeklySeconds)} this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(projectBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No time entries this week.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(projectBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([project, seconds]) => (
                    <div key={project} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{project}</span>
                        <span className="text-muted-foreground">
                          {formatHours(seconds)}
                        </span>
                      </div>
                      <Progress
                        value={(seconds / maxProjectSeconds) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Log History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Log History</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No time logs yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="hidden sm:table-cell">Task</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead className="hidden md:table-cell">Start</TableHead>
                    <TableHead className="hidden md:table-cell">End</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {format(new Date(log.startTime), "MMM d")}
                      </TableCell>
                      <TableCell>{log.project}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[150px] truncate">
                        {log.task}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {log.tag}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {format(new Date(log.startTime), "h:mm a")}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {log.endTime
                          ? format(new Date(log.endTime), "h:mm a")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatDuration(log.duration)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}