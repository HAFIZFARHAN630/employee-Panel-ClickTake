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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn, LogOut, Clock, CalendarCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
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

function formatDurationHours(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function AttendancePage() {
  const { user } = useAuth();
  const employeeId = user?.employee?.id ?? "";

  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [weekAttendance, setWeekAttendance] = useState<Attendance[]>([]);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [unclosedSession, setUnclosedSession] = useState<{ id: string; date: string; checkIn: string } | null>(null);
  const [autoClosing, setAutoClosing] = useState(false);

  const fetchAttendance = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await api.get<Attendance[]>("/api/attendance", {
        employeeId,
      });
      const records = Array.isArray(res) ? res : [];

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const today = records.find((r) => {
        try {
          return format(new Date(r.date), "yyyy-MM-dd") === todayStr;
        } catch {
          return false;
        }
      }) ?? null;
      setTodayAttendance(today);

      // Check for unclosed sessions from previous days
      const unclosed = records.find((r) => {
        if (!r.checkIn || r.checkOut) return false;
        try {
          const recDate = format(new Date(r.date), "yyyy-MM-dd");
          return recDate < todayStr;
        } catch {
          return false;
        }
      });
      if (unclosed && unclosed.checkIn) {
        setUnclosedSession({
          id: unclosed.id,
          date: unclosed.date,
          checkIn: unclosed.checkIn,
        });
      }

      // Last 7 days
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekDays: Attendance[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const ds = format(d, "yyyy-MM-dd");
        const found = records.find((r) => {
          try {
            return format(new Date(r.date), "yyyy-MM-dd") === ds;
          } catch {
            return false;
          }
        });
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
        .filter((r) => {
          try {
            return format(new Date(r.date), "yyyy-MM-dd") >= thirtyAgo;
          } catch {
            return false;
          }
        })
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

  const getGeoLocation = async (): Promise<{ latitude: number | null; longitude: number | null; gpsFailed: boolean }> => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        gpsFailed: false,
      };
    } catch {
      return { latitude: null, longitude: null, gpsFailed: true };
    }
  };

  const handleAutoCloseUnclosedSession = async () => {
    if (!unclosedSession || !employeeId) return;
    setAutoClosing(true);
    try {
      // Use the attendance check_out API for the old record
      await api.post("/api/attendance", {
        employeeId,
        action: "check_out",
        // Pass the date so the backend knows which record to close
        overrideDate: unclosedSession.date,
      });
      toast.success("Unclosed session has been auto-closed");
      setUnclosedSession(null);
      fetchAttendance();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to auto-close session");
    } finally {
      setAutoClosing(false);
    }
  };

  const handleCheckIn = async () => {
    if (!employeeId) return;
    setActionLoading(true);
    const { latitude, longitude, gpsFailed } = await getGeoLocation();

    try {
      await api.post("/api/attendance", {
        employeeId,
        action: "check_in",
        latitude,
        longitude,
      });
      if (gpsFailed) {
        toast.warning("Checked in successfully, but location could not be verified.");
      } else {
        toast.success("Checked in successfully");
      }
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
    const { latitude, longitude } = await getGeoLocation();

    try {
      await api.post("/api/attendance", {
        employeeId,
        action: "check_out",
        latitude,
        longitude,
      });
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

  // Calculate live duration if checked in but not out
  const liveDurationMs = hasCheckedIn && !hasCheckedOut && todayAttendance?.checkIn
    ? Date.now() - new Date(todayAttendance.checkIn).getTime()
    : null;

  // Determine status text
  const getStatusText = (): string => {
    if (!todayAttendance) return "Not Checked In";
    if (hasCheckedOut) {
      const h = todayAttendance.hours;
      return `Checked Out (${h.toFixed(1)}h)`;
    }
    return `Checked In at ${format(new Date(todayAttendance.checkIn!), "h:mm a")}`;
  };

  const getStatusVariant = (): "default" | "success" | "warning" | "destructive" => {
    if (!todayAttendance) return "default";
    if (hasCheckedOut) return "success";
    return "warning";
  };

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
      {/* Unclosed Session Warning */}
      {unclosedSession && (
        <Alert variant="destructive" className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">Unclosed Session Detected</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <p>
              You have an unclosed session from{" "}
              <span className="font-semibold">
                {format(new Date(unclosedSession.date), "EEEE, MMMM d, yyyy")}
              </span>
              . Auto-checkout at midnight will be applied.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950"
              onClick={handleAutoCloseUnclosedSession}
              disabled={autoClosing}
            >
              {autoClosing ? "Closing..." : "Close Session Now"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Today's Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Today&apos;s Status</CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant()} className="text-sm px-3 py-1">
              {getStatusText()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              {todayAttendance ? (
                <div className="flex items-center gap-2">
                  {hasCheckedOut ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : hasCheckedIn ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                  ) : null}
                  {statusBadge(todayAttendance.status)}
                </div>
              ) : (
                <Badge variant="secondary">Not Checked In</Badge>
              )}

              {/* Check In / Check Out Button */}
              {!hasCheckedOut && (
                <Button
                  size="lg"
                  onClick={hasCheckedIn ? handleCheckOut : handleCheckIn}
                  disabled={actionLoading}
                  className={
                    hasCheckedIn
                      ? "bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]"
                      : "bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
                  }
                >
                  {actionLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing...
                    </span>
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
              )}

              {hasCheckedOut && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Day Complete
                </div>
              )}
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
                      : liveDurationMs
                        ? "In progress..."
                        : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Hours Today</p>
                  <p className="text-sm font-medium">
                    {hasCheckedIn && !hasCheckedOut && liveDurationMs
                      ? formatDurationHours(liveDurationMs)
                      : todayAttendance?.hours
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
                    <TableHead>Location</TableHead>
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
                      <TableCell>
                        {record.isLocationVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-950/50 dark:text-green-400 px-2 py-0.5 rounded-full">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full">
                            Unverified
                          </span>
                        )}
                      </TableCell>
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