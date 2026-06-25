"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { VerificationRecord } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScanFace, CheckCircle2, XCircle, Clock, Play } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ============ HELPERS ============

function getStatusBadge(status: string) {
  switch (status) {
    case "verified":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">🟢 Verified</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">🟡 Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">🔴 Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ============ COMPONENT ============

export function VerificationPage() {
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<VerificationRecord[]>("/api/verification");
      setRecords(data);
    } catch {
      toast.error("Failed to load verification records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleOpenRecord = (record: VerificationRecord) => {
    setSelectedRecord(record);
    setShowDialog(true);
    setShowRejectForm(false);
    setRejectReason("");
  };

  const handleApprove = async () => {
    if (!selectedRecord) return;
    try {
      setActionLoading(true);
      await api.post(`/api/verification/${selectedRecord.id}/action`, {
        action: "approve",
      });
      toast.success("Verification approved successfully");
      setShowDialog(false);
      setSelectedRecord(null);
      fetchRecords();
    } catch {
      toast.error("Failed to approve verification");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRecord || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      setActionLoading(true);
      await api.post(`/api/verification/${selectedRecord.id}/action`, {
        action: "reject",
        reason: rejectReason.trim(),
      });
      toast.success("Verification rejected");
      setShowDialog(false);
      setSelectedRecord(null);
      setRejectReason("");
      fetchRecords();
    } catch {
      toast.error("Failed to reject verification");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <ScanFace className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Face Verification</h2>
          <p className="text-sm text-muted-foreground">
            Review and manage employee face verification submissions
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ScanFace className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No verification records</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Verification submissions will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((record) => (
            <Card
              key={record.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => record.status === "pending" && handleOpenRecord(record)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {record.user?.fullName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() ?? "???"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {record.user?.fullName ?? "Unknown User"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {record.user?.email ?? ""}
                    </p>
                  </div>
                </div>
                <div>{getStatusBadge(record.status)}</div>
                <div className="text-xs text-muted-foreground">
                  Submitted: {format(new Date(record.submittedAt), "MMM d, yyyy h:mm a")}
                </div>
                {record.status === "rejected" && record.rejectionReason && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-md p-2">
                    <span className="font-medium">Reason:</span> {record.rejectionReason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setShowRejectForm(false);
          setRejectReason("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Face Verification</DialogTitle>
            <DialogDescription>
              Review the video submission for {selectedRecord?.user?.fullName}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {selectedRecord.user?.fullName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() ?? "???"}
                </div>
                <div>
                  <p className="font-medium">{selectedRecord.user?.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRecord.user?.email}</p>
                </div>
              </div>

              {/* Video Player */}
              {selectedRecord.videoUrl ? (
                <div className="rounded-lg overflow-hidden bg-black">
                  <video
                    src={selectedRecord.videoUrl}
                    controls
                    className="w-full max-h-64 object-contain"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 rounded-lg bg-muted/50 border-2 border-dashed">
                  <div className="text-center">
                    <Play className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No video available</p>
                  </div>
                </div>
              )}

              {/* Submitted date */}
              <p className="text-xs text-muted-foreground">
                Submitted on {format(new Date(selectedRecord.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>

              {/* Reject reason form */}
              {showRejectForm && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rejection Reason</label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide a reason for rejecting this verification..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {!showRejectForm ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectForm(true)}
                      disabled={actionLoading}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="gap-2"
                    >
                      {actionLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason("");
                      }}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={actionLoading || !rejectReason.trim()}
                      className="gap-2"
                    >
                      {actionLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Confirm Rejection
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}