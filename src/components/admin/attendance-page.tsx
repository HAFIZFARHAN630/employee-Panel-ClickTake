"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Attendance, AttendanceStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  UserX,
  Clock,
  CalendarOff,
  RefreshCw,
  CalendarIcon,
  LogIn,
  LogOut,
  MapPin,
} from "lucide-react";
import { format, isToday, parseISO, startOfDay, endOfDay } from "date-fns";

const STATUS_BADGE: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: "Present", className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" },
  absent: { label: "Absent", className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700" },
  late: { label: "Late", className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700" },
  half_day: { label: "Half Day", className: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700" },
  on_leave: { label: "On Leave", className: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700" },
};

interface TodayOverview {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
}

const SUMMARY_CARDS = [
  { key: "present" as const, label: "Present Today", icon: Users, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/50", border: "border-green-200 dark:border-green-800" },
  { key: "absent" as const, label: "Absent", icon: UserX, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/50", border: "border-red-200 dark:border-red-800" },
  { key: "late" as const, label: "Late", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/50", border: "border-yellow-200 dark:border-yellow-800" },
  { key: "onLeave" as const, label: "On Leave", icon: CalendarOff, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-950/50", border: "border-gray-200 dark:border-gray-800" },
];

export function AttendancePage() {
  const [todayOverview, setTodayOverview] = useState<TodayOverview>({ present: 0, absent: 0, late: 0, onLeave: 0 });
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [records, setRecords] = useState<Attendance[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [fromDate, setFromDate] = useState<Date>(startOfDay(new Date()));
  const [toDate, setToDate] = useState<Date>(endOfDay(new Date()));
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTodayOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const data = await api.get<TodayOverview>("/api/attendance/today");
      setTodayOverview(data);
    } catch {
      setTodayOverview({ present: 0, absent: 0, late: 0, onLeave: 0 });
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      setRecordsLoading(true);
      const data = await api.get<Attendance[]>("/api/attendance", {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      });
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchTodayOverview();
  }, [fetchTodayOverview]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleManualAction = async (employeeId: string, action: "check_in" | "check_out") => {
    try {
      setActionLoading(`${employeeId}-${action}`);
      await api.post("/api/attendance", { employeeId, action });
      fetchRecords();
      fetchTodayOverview();
    } catch {
      // handled by api wrapper
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "—";
    try {
      return format(parseISO(time), "h:mm a");
    } catch {
      return time;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage employee attendance</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchTodayOverview(); fetchRecords(); }} disabled={overviewLoading || recordsLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${overviewLoading || recordsLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Today's Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map((card) => (
          <Card key={card.key} className={`border ${card.border}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  {overviewLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-1">{todayOverview[card.key]}</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          </div>

          {/* Table */}
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Hours</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => {
                    const statusInfo = STATUS_BADGE[record.status];
                    const isCheckInLoading = actionLoading === `${record.employeeId}-check_in`;
                    const isCheckOutLoading = actionLoading === `${record.employeeId}-check_out`;

                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.employee?.user.fullName ?? "Unknown"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {format(parseISO(record.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.checkIn ? formatTime(record.checkIn) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.checkOut ? formatTime(record.checkOut) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {record.hours > 0 ? `${record.hours.toFixed(1)}h` : "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {record.isLocationVerified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-950/50 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                              🟢 Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800" title="GPS denied or out of bounds">
                              🔴 Unverified
                            </span>
                          )}
                          {record.latitude != null && record.longitude != null && (
                            <a
                              href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1.5 inline-flex text-muted-foreground hover:text-primary"
                              title="View on Google Maps"
                            >
                              <MapPin className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleManualAction(record.employeeId, "check_in")}
                              disabled={!!record.checkIn || isCheckInLoading}
                            >
                              <LogIn className="h-3 w-3 mr-1" />
                              {isCheckInLoading ? "..." : "In"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleManualAction(record.employeeId, "check_out")}
                              disabled={!!record.checkOut || isCheckOutLoading}
                            >
                              <LogOut className="h-3 w-3 mr-1" />
                              {isCheckOutLoading ? "..." : "Out"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

