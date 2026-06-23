"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import type { Attendance, AttendanceStatus } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LogIn, LogOut, Clock, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

function statusColor(status: AttendanceStatus): string {
  switch (status) {
    case "present":
      return "bg-green-500";
    case "late":
      return "bg-amber-500";
    case "absent":
      return "bg-red-500";
    case "half_day":
      return "bg-orange-500";
    case "on_leave":
      return "bg-sky-500";
    default:
      return "bg-gray-400";
  }
}

function statusBadge(status: AttendanceStatus) {
  switch (status) {
    case "present":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-400">Present</Badge>;
    case "late":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400">Late</Badge>;
    case "absent":
      return <Badge variant="destructive">Absent</Badge>;
    case "half_day":
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-400">Half Day</Badge>;
    case "on_leave":
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-400">On Leave</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function AttendancePage() {
  const { user } = useAuth();
  const employeeId = user?.employee?.id ?? "";

  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [weekAttendance, setWeekAttendance] = useState<Attendance[]>([]);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await api.get<Attendance[]>("/api/attendance", {
        employeeId,
      });
      const records = Array.isArray(res) ? res : [];

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const today = records.find((r) => r.date === todayStr) ?? null;
      setTodayAttendance(today);

      // Last 7 days
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekDays: Attendance[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const ds = format(d, "yyyy-MM-dd");
        const found = records.find((r) => r.date === ds);
        weekDays.push(
          found ?? {
            id: `placeholder-${i}`,
            employeeId,
            date: ds,
            checkIn: null,
            checkOut: null,
            status: "absent",
            hours: 0,
          }
        );
      }
      setWeekAttendance(weekDays);

      // History: last 30 days
      const thirtyAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const hist = records
        .filter((r) => r.date >= thirtyAgo)
        .sort((a, b) => b.date.localeCompare(a.date));
      setHistory(hist);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleCheckIn = async () => {
    if (!employeeId) return;
    setActionLoading(true);
    try {
      await api.post("/api/attendance", { employeeId, action: "checkIn" });
      toast.success("Checked in successfully");
      fetchAttendance();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId) return;
    setActionLoading(true);
    try {
      await api.post("/api/attendance", { employeeId, action: "checkOut" });
      toast.success("Checked out successfully");
      fetchAttendance();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setActionLoading(false);
    }
  };

  const hasCheckedIn = todayAttendance?.checkIn != null;
  const hasCheckedOut = todayAttendance?.checkOut != null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Status</CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              {todayAttendance ? (
                statusBadge(todayAttendance.status)
              ) : (
                <Badge variant="secondary">Not Checked In</Badge>
              )}
              <Button
                size="lg"
                onClick={hasCheckedIn ? handleCheckOut : handleCheckIn}
                disabled={actionLoading || hasCheckedOut}
                className="mt-2"
              >
                {hasCheckedOut ? (
                  <>
                    <LogOut className="h-4 w-4 mr-2" /> Day Complete
                  </>
                ) : hasCheckedIn ? (
                  <>
                    <LogOut className="h-4 w-4 mr-2" /> Check Out
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" /> Check In
                  </>
                )}
              </Button>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <LogIn className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Check In</p>
                  <p className="text-sm font-medium">
                    {todayAttendance?.checkIn
                      ? format(new Date(todayAttendance.checkIn), "h:mm a")
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <LogOut className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Check Out</p>
                  <p className="text-sm font-medium">
                    {todayAttendance?.checkOut
                      ? format(new Date(todayAttendance.checkOut), "h:mm a")
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Hours Today</p>
                  <p className="text-sm font-medium">
                    {todayAttendance?.hours
                      ? `${todayAttendance.hours.toFixed(1)}h`
                      : "0h"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Week's Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">This Week</CardTitle>
          <CardDescription>
            {format(weekAttendance[0]?.date ? new Date(weekAttendance[0].date + "T00:00:00") : new Date(), "MMM d")} – {format(weekAttendance[6]?.date ? new Date(weekAttendance[6].date + "T00:00:00") : new Date(), "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekAttendance.map((day) => {
              const dayDate = new Date(day.date + "T00:00:00");
              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card"
                >
                  <span className="text-xs text-muted-foreground font-medium">
                    {format(dayDate, "EEE")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(dayDate, "d")}
                  </span>
                  <div className={`h-2.5 w-2.5 rounded-full ${statusColor(day.status)}`} />
                  <span className="text-xs font-medium">
                    {day.hours > 0 ? `${day.hours.toFixed(1)}h` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attendance History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance History</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarCheck className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No attendance records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date + "T00:00:00"), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {record.checkIn
                          ? format(new Date(record.checkIn), "h:mm a")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {record.checkOut
                          ? format(new Date(record.checkOut), "h:mm a")
                          : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(record.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {record.hours > 0 ? `${record.hours.toFixed(1)}h` : "—"}
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