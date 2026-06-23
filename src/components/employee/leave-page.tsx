"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, CalendarOff, FileText, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

function statusBadge(status: LeaveStatus) {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-400">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

const leaveTypes: LeaveType[] = [
  "sick",
  "casual",
  "annual",
  "maternity",
  "paternity",
  "unpaid",
];

export function LeavePage() {
  const { user } = useAuth();
  const employeeId = user?.employee?.id ?? "";

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>("sick");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [calculatedDays, setCalculatedDays] = useState(0);

  const fetchLeaves = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await api.get<LeaveRequest[]>("/api/leaves", {
        employeeId,
      });
      setLeaves(Array.isArray(res) ? res : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Calculate days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      try {
        const days = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
        setCalculatedDays(days > 0 ? days : 0);
      } catch {
        setCalculatedDays(0);
      }
    } else {
      setCalculatedDays(0);
    }
  }, [startDate, endDate]);

  const handleSubmit = async () => {
    if (!employeeId || !startDate || !endDate || !reason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (calculatedDays <= 0) {
      toast.error("End date must be after start date");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/leaves", {
        employeeId,
        type: leaveType,
        startDate,
        endDate,
        reason,
        days: calculatedDays,
      });
      toast.success("Leave request submitted");
      setDialogOpen(false);
      setLeaveType("sick");
      setStartDate("");
      setEndDate("");
      setReason("");
      setCalculatedDays(0);
      fetchLeaves();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  // Summary stats
  const totalRequests = leaves.length;
  const approvedCount = leaves.filter((l) => l.status === "approved").length;
  const pendingCount = leaves.filter((l) => l.status === "pending").length;
  const rejectedCount = leaves.filter((l) => l.status === "rejected").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">My Leave Requests</h2>
          <p className="text-sm text-muted-foreground">
            Manage your leave requests and check status
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={leaveType}
                  onValueChange={(v) => setLeaveType(v as LeaveType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt} value={lt} className="capitalize">
                        {lt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              {calculatedDays > 0 && (
                <p className="text-sm text-muted-foreground">
                  Duration: <span className="font-medium">{calculatedDays} day{calculatedDays !== 1 ? "s" : ""}</span>
                </p>
              )}
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Enter the reason for your leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalRequests}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-green-50 text-green-600 dark:bg-green-950">
              <CalendarOff className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-red-50 text-red-600 dark:bg-red-950">
              <XCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <CardContent className="p-0">
          {leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarOff className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No leave requests yet.</p>
              <p className="text-xs mt-1">Click &quot;New Request&quot; to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead className="hidden sm:table-cell">Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="capitalize font-medium">
                          {leave.type}
                        </TableCell>
                        <TableCell>
                          {format(new Date(leave.startDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(leave.endDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-muted-foreground">
                          {leave.reason}
                        </TableCell>
                        <TableCell>{statusBadge(leave.status)}</TableCell>
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