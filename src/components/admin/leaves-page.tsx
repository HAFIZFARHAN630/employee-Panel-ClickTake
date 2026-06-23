"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const STATUS_BADGE: Record<LeaveStatus, { className: string }> = {
  pending: { className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700" },
  approved: { className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" },
  rejected: { className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700" },
};

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  sick: "Sick",
  casual: "Casual",
  annual: "Annual",
  maternity: "Maternity",
  paternity: "Paternity",
  unpaid: "Unpaid",
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  sick: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  casual: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  annual: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  maternity: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  paternity: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  unpaid: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const TAB_VALUES = ["all", "pending", "approved", "rejected"] as const;
type TabValue = (typeof TAB_VALUES)[number];

const SUMMARY_CARDS = [
  { key: "pending" as LeaveStatus, label: "Pending", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/50", border: "border-yellow-200 dark:border-yellow-800" },
  { key: "approved" as LeaveStatus, label: "Approved", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/50", border: "border-green-200 dark:border-green-800" },
  { key: "rejected" as LeaveStatus, label: "Rejected", icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/50", border: "border-red-200 dark:border-red-800" },
];

export function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.status = activeTab;
      const data = await api.get<LeaveRequest[]>("/api/leaves", params);
      setLeaves(data);
    } catch {
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id);
      await api.patch(`/api/leaves/${id}`, { status: "approved" });
      fetchLeaves();
      setStatsLoading(true);
      setTimeout(() => setStatsLoading(false), 500);
    } catch {
      // handled by api wrapper
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoading(id);
      await api.patch(`/api/leaves/${id}`, { status: "rejected" });
      fetchLeaves();
      setStatsLoading(true);
      setTimeout(() => setStatsLoading(false), 500);
    } catch {
      // handled by api wrapper
    } finally {
      setActionLoading(null);
    }
  };

  // Leave statistics: count by type for this month
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const typeCounts: Record<string, { total: number; days: number }> = {};

    leaves.forEach((leave) => {
      try {
        const start = parseISO(leave.startDate);
        if (isWithinInterval(start, { start: monthStart, end: monthEnd })) {
          if (!typeCounts[leave.type]) {
            typeCounts[leave.type] = { total: 0, days: 0 };
          }
          typeCounts[leave.type].total += 1;
          typeCounts[leave.type].days += leave.days;
        }
      } catch {
        // skip invalid dates
      }
    });

    return typeCounts;
  }, [leaves]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and manage employee leave requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeaves} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SUMMARY_CARDS.map((card) => {
          const count = card.key === "all" ? leaves.length : leaves.filter((l) => l.status === card.key).length;
          return (
            <Card key={card.key} className={`border ${card.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="flex-wrap h-auto">
          {TAB_VALUES.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Start Date</TableHead>
                      <TableHead className="hidden sm:table-cell">End Date</TableHead>
                      <TableHead className="hidden md:table-cell">Days</TableHead>
                      <TableHead className="hidden lg:table-cell">Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-16" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : leaves.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No leave requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaves.map((leave) => {
                        const isActing = actionLoading === leave.id;
                        return (
                          <TableRow key={leave.id}>
                            <TableCell className="font-medium">
                              {leave.employee?.user.fullName ?? "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={LEAVE_TYPE_COLORS[leave.type]}>
                                {LEAVE_TYPE_LABELS[leave.type]}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {format(parseISO(leave.startDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {format(parseISO(leave.endDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {leave.days}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell max-w-[180px]">
                              <span className="text-sm text-muted-foreground line-clamp-1">
                                {leave.reason || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_BADGE[leave.status].className}>
                                {leave.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {leave.status === "pending" && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-950/50"
                                    onClick={() => handleApprove(leave.id)}
                                    disabled={isActing}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {isActing ? "..." : "Approve"}
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs text-red-700 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950/50"
                                        disabled={isActing}
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Reject
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Reject Leave Request</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to reject the leave request from{" "}
                                          <span className="font-medium text-foreground">
                                            {leave.employee?.user.fullName}
                                          </span>{" "}
                                          ({LEAVE_TYPE_LABELS[leave.type]}, {leave.days} day{leave.days > 1 ? "s" : ""})?
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleReject(leave.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Reject
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
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
        </TabsContent>
      </Tabs>

      {/* Leave Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Leave Statistics — This Month</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(monthlyStats).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No leave data for this month
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((type) => {
                const stat = monthlyStats[type];
                if (!stat) return null;
                return (
                  <div key={type} className="text-center space-y-1 p-3 rounded-lg border bg-muted/30">
                    <Badge variant="outline" className={LEAVE_TYPE_COLORS[type]}>
                      {LEAVE_TYPE_LABELS[type]}
                    </Badge>
                    <div className="text-lg font-bold">{stat.total}</div>
                    <p className="text-xs text-muted-foreground">{stat.days} day{stat.days !== 1 ? "s" : ""} total</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}