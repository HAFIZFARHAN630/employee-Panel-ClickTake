"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type { TimeLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings, RefreshCw, CalendarIcon, Clock, User, FolderOpen } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getMinutesFromLog(log: TimeLog): number {
  if (log.duration) return log.duration;
  if (log.startTime && log.endTime) {
    return differenceInMinutes(parseISO(log.endTime), parseISO(log.startTime));
  }
  return 0;
}

interface GroupedEntry {
  key: string;
  label: string;
  sublabel?: string;
  logs: TimeLog[];
  totalMinutes: number;
}

export function TimeTrackingPage() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const [fromDate, setFromDate] = useState<Date>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date>(endOfMonth(new Date()));
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      };
      const data = await api.get<TimeLog[]>("/api/time-logs", params);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Group by employee
  const byEmployee = useMemo((): GroupedEntry[] => {
    const map = new Map<string, GroupedEntry>();
    logs.forEach((log) => {
      const key = log.employeeId;
      const name = log.employee?.user.fullName ?? "Unknown";
      const email = log.employee?.user.email ?? "";
      const existing = map.get(key);
      const mins = getMinutesFromLog(log);
      if (existing) {
        existing.logs.push(log);
        existing.totalMinutes += mins;
      } else {
        map.set(key, { key, label: name, sublabel: email, logs: [log], totalMinutes: mins });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [logs]);

  // Group by project
  const byProject = useMemo((): GroupedEntry[] => {
    const map = new Map<string, GroupedEntry>();
    logs.forEach((log) => {
      const key = log.project || "Unassigned";
      const existing = map.get(key);
      const mins = getMinutesFromLog(log);
      if (existing) {
        existing.logs.push(log);
        existing.totalMinutes += mins;
      } else {
        map.set(key, { key, label: key, logs: [log], totalMinutes: mins });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [logs]);

  const totalMinutes = useMemo(() => {
    return logs.reduce((sum, log) => sum + getMinutesFromLog(log), 0);
  }, [logs]);

  const renderTimeLogRow = (log: TimeLog, showEmployee = false, showProject = false) => {
    const mins = getMinutesFromLog(log);
    const startTimeStr = log.startTime ? format(parseISO(log.startTime), "h:mm a") : "—";
    const endTimeStr = log.endTime ? format(parseISO(log.endTime), "h:mm a") : "—";
    const dateStr = log.startTime ? format(parseISO(log.startTime), "MMM d, yyyy") : "—";

    return (
      <TableRow key={log.id}>
        {showEmployee && (
          <TableCell className="font-medium">
            {log.employee?.user.fullName ?? "Unknown"}
          </TableCell>
        )}
        {showProject && (
          <TableCell>
            <span className="text-sm">{log.project || "Unassigned"}</span>
          </TableCell>
        )}
        <TableCell className="hidden sm:table-cell text-sm">{log.task || "—"}</TableCell>
        <TableCell>
          {log.tag ? (
            <Badge variant="secondary" className="text-xs font-normal">
              {log.tag}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{startTimeStr}</TableCell>
        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{endTimeStr}</TableCell>
        <TableCell className="text-sm font-medium">{formatDuration(mins)}</TableCell>
        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{dateStr}</TableCell>
      </TableRow>
    );
  };

  const renderSkeleton = (cols: number) =>
    Array.from({ length: 6 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: cols }).map((_, j) => (
          <TableCell key={j}>
            <Skeleton className="h-4 w-16" />
          </TableCell>
        ))}
      </TableRow>
    ));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor and analyze time logs across the organization</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">From:</Label>
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(fromDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(d) => { if (d) { setFromDate(startOfDay(d)); setFromOpen(false); } }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">To:</Label>
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(toDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(d) => { if (d) { setToDate(endOfDay(d)); setToOpen(false); } }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Total hours summary */}
            <div className="sm:ml-auto flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{formatDuration(totalMinutes)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All Time Logs</TabsTrigger>
          <TabsTrigger value="employee" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">By Employee</span>
            <span className="sm:hidden">Employee</span>
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">By Project</span>
            <span className="sm:hidden">Project</span>
          </TabsTrigger>
        </TabsList>

        {/* All Time Logs */}
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="hidden lg:table-cell">Project</TableHead>
                      <TableHead className="hidden sm:table-cell">Task</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead className="hidden md:table-cell">Start</TableHead>
                      <TableHead className="hidden md:table-cell">End</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      renderSkeleton(8)
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No time logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {logs.map((log) => renderTimeLogRow(log, true, true))}
                        {/* Total row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={6} className="text-right">
                            Total
                          </TableCell>
                          <TableCell>{formatDuration(totalMinutes)}</TableCell>
                          <TableCell className="hidden sm:table-cell" />
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Employee */}
        <TabsContent value="employee" className="mt-4 space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <div className="ml-4 space-y-1">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : byEmployee.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No time logs found
              </CardContent>
            </Card>
          ) : (
            byEmployee.map((group) => (
              <Card key={group.key}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{group.label}</CardTitle>
                      {group.sublabel && (
                        <span className="text-sm text-muted-foreground">({group.sublabel})</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {formatDuration(group.totalMinutes)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="hidden lg:table-cell">Project</TableHead>
                          <TableHead className="hidden sm:table-cell">Task</TableHead>
                          <TableHead>Tag</TableHead>
                          <TableHead className="hidden md:table-cell">Start</TableHead>
                          <TableHead className="hidden md:table-cell">End</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead className="hidden sm:table-cell">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.logs.map((log) => renderTimeLogRow(log, false, true))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={5} className="text-right">
                            Subtotal
                          </TableCell>
                          <TableCell>{formatDuration(group.totalMinutes)}</TableCell>
                          <TableCell className="hidden sm:table-cell" />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* By Project */}
        <TabsContent value="project" className="mt-4 space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <div className="ml-4 space-y-1">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : byProject.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No time logs found
              </CardContent>
            </Card>
          ) : (
            byProject.map((group) => (
              <Card key={group.key}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{group.label}</CardTitle>
                      <Badge variant="outline" className="text-xs font-normal">
                        {group.logs.length} log{group.logs.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {formatDuration(group.totalMinutes)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead className="hidden sm:table-cell">Task</TableHead>
                          <TableHead>Tag</TableHead>
                          <TableHead className="hidden md:table-cell">Start</TableHead>
                          <TableHead className="hidden md:table-cell">End</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead className="hidden sm:table-cell">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.logs.map((log) => renderTimeLogRow(log, true, false))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={5} className="text-right">
                            Subtotal
                          </TableCell>
                          <TableCell>{formatDuration(group.totalMinutes)}</TableCell>
                          <TableCell className="hidden sm:table-cell" />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}