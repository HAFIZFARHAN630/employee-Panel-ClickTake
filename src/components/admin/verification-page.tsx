"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { VerificationRecord } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScanFace, CheckCircle2, XCircle, Clock, Play, Eye, RotateCcw, ImageIcon } from "lucide-react";
import { safeFormat } from "@/lib/date-utils";
import { toast } from "sonner";

// ============ HELPERS ============

function parseJsonString<T>(str: string | unknown): T[] {
  if (!str) return [];
  if (Array.isArray(str)) return str as T[];
  try {
    const parsed = JSON.parse(str as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "verified":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Verified</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "verified":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "rejected":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-yellow-500" />;
  }
}

// Extended type for API response with nested data
interface VerificationRecordFull extends VerificationRecord {
  reviewer?: { id: string; fullName: string } | null;
  user?: VerificationRecord["user"] & {
    employee?: {
      department: string;
      designation: string;
      facePhotoUrls: string;
    } | null;
  };
}

// ============ COMPONENT ============

export function VerificationPage() {
  const [records, setRecords] = useState<VerificationRecordFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecordFull | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<VerificationRecordFull[]>("/api/verification");
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

  const handleOpenRecord = (record: VerificationRecordFull, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRecord(record);
    setShowDialog(true);
    setShowRejectForm(false);
    setShowResubmitForm(false);
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

  const handleResubmit = async () => {
    if (!selectedRecord || !rejectReason.trim()) {
      toast.error("Please provide a reason for resubmission request");
      return;
    }
    try {
      setActionLoading(true);
      await api.post(`/api/verification/${selectedRecord.id}/action`, {
        action: "resubmit",
        reason: rejectReason.trim(),
      });
      toast.success("Resubmission request sent");
      setShowDialog(false);
      setSelectedRecord(null);
      setRejectReason("");
      fetchRecords();
    } catch {
      toast.error("Failed to request resubmission");
    } finally {
      setActionLoading(false);
    }
  };

  const getFacePhotoUrl = (record: VerificationRecordFull): string | null => {
    const photoUrls = parseJsonString<string>(record.user?.employee?.facePhotoUrls);
    return photoUrls.length > 0 ? photoUrls[0] : null;
  };

  const getInitials = (record: VerificationRecordFull): string => {
    return record.user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "??";
  };

  const Spinner = () => (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );

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
          {records.map((record) => {
            const facePhoto = getFacePhotoUrl(record);
            const isResolved = record.status === "verified" || record.status === "rejected";

            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {facePhoto ? (
                      <img
                        src={facePhoto}
                        alt={record.user?.fullName ?? "User"}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {getInitials(record)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {record.user?.fullName ?? "Unknown User"}
                        </p>
                        {isResolved && getStatusIcon(record.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {record.user?.employee?.department ?? record.user?.email ?? ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {getStatusBadge(record.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={(e) => handleOpenRecord(record, e)}
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Submitted: {safeFormat(record.submittedAt, "MMM d, yyyy h:mm a")}
                  </div>
                  {record.status === "rejected" && record.rejectionReason && (
                    <div className="text-xs text-red-600 bg-red-50 rounded-md p-2">
                      <span className="font-medium">Reason:</span> {record.rejectionReason}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review / View Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setShowRejectForm(false);
          setShowResubmitForm(false);
          setRejectReason("");
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord?.status === "pending"
                ? "Review Face Verification"
                : "View Verification Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedRecord?.status === "pending"
                ? `Review the video submission for ${selectedRecord?.user?.fullName}`
                : `Verification details for ${selectedRecord?.user?.fullName}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {getFacePhotoUrl(selectedRecord) ? (
                  <img
                    src={getFacePhotoUrl(selectedRecord)!}
                    alt={selectedRecord.user?.fullName ?? "User"}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-semibold">
                    {getInitials(selectedRecord)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{selectedRecord.user?.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRecord.user?.email}</p>
                  {selectedRecord.user?.employee?.department && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Department: {selectedRecord.user.employee.department}
                    </p>
                  )}
                </div>
                <div>
                  {getStatusBadge(selectedRecord.status)}
                </div>
              </div>

              {/* Face Photos */}
              {(() => {
                const photos = parseJsonString<string>(selectedRecord.user?.employee?.facePhotoUrls);
                if (photos.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ImageIcon className="h-4 w-4" />
                      Face Photos
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {photos.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Face photo ${idx + 1}`}
                          className="h-24 w-24 rounded-lg object-cover border"
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Video Player */}
              {selectedRecord.videoUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Play className="h-4 w-4" />
                    Verification Video
                  </div>
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
                Submitted on {safeFormat(selectedRecord.submittedAt, "MMMM d, yyyy 'at' h:mm a")}
              </p>

              {/* Reviewer info (for resolved) */}
              {selectedRecord.status !== "pending" && selectedRecord.reviewer && (
                <p className="text-xs text-muted-foreground">
                  Reviewed by {selectedRecord.reviewer.fullName}
                </p>
              )}

              {/* Rejection reason (for rejected) */}
              {selectedRecord.status === "rejected" && selectedRecord.rejectionReason && (
                <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
                  <span className="font-medium">Rejection Reason:</span>{" "}
                  {selectedRecord.rejectionReason}
                </div>
              )}

              {/* Pending: action forms */}
              {selectedRecord.status === "pending" && (
                <>
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

                  {showResubmitForm && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Resubmission Reason</label>
                      <Textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Provide guidance for resubmission (e.g., better lighting, clearer face angle)..."
                        className="min-h-[80px]"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    {!showRejectForm && !showResubmitForm ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowResubmitForm(true);
                            setShowRejectForm(false);
                            setRejectReason("");
                          }}
                          disabled={actionLoading}
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Request Resubmit
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setShowRejectForm(true);
                            setShowResubmitForm(false);
                            setRejectReason("");
                          }}
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
                          {actionLoading ? <Spinner /> : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                      </>
                    ) : showRejectForm ? (
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
                          {actionLoading ? <Spinner /> : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Confirm Rejection
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowResubmitForm(false);
                            setRejectReason("");
                          }}
                          disabled={actionLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleResubmit}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="gap-2"
                        >
                          {actionLoading ? <Spinner /> : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Request Resubmit
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </>
              )}

              {/* Non-pending: just close button */}
              {selectedRecord.status !== "pending" && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Close
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}