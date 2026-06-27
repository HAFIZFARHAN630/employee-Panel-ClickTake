"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardDrive, Trash2, Image as ImageIcon, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TimeProof {
  id: string;
  timeLogId: string;
  imageUrl: string;
  capturedAt: string;
  timeLog?: { user?: { fullName: string; email: string } } | null;
}

export function StoragePage() {
  const [proofs, setProofs] = useState<TimeProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageFilter, setAgeFilter] = useState("all");

  const fetchProofs = useCallback(async () => {
    try {
      setLoading(true);
      // Since there's no dedicated proofs API, we'll use time-logs with proof included
      // For now fetch from a generic endpoint
      const data = await api.get<TimeProof[]>("/api/time-logs?includeProofs=true");
      // Flatten proofs from time logs
      const allProofs: TimeProof[] = [];
      if (Array.isArray(data)) {
        for (const item of data) {
          if ((item as Record<string, unknown>).proofs) {
            allProofs.push(...((item as Record<string, unknown>).proofs as TimeProof[]));
          }
        }
      }
      setProofs(allProofs);
    } catch {
      // If the endpoint doesn't support proofs, show empty
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProofs(); }, [fetchProofs]);

  const filteredProofs = proofs.filter(p => {
    if (ageFilter === "7d") return new Date().getTime() - new Date(p.capturedAt).getTime() < 7 * 86400000;
    if (ageFilter === "30d") return new Date().getTime() - new Date(p.capturedAt).getTime() < 30 * 86400000;
    if (ageFilter === "90d") return new Date().getTime() - new Date(p.capturedAt).getTime() < 90 * 86400000;
    return true;
  });

  const handleBulkDelete = async () => {
    try {
      toast.info("Bulk delete would remove old proofs (implementation needs Cloudinary API)");
    } catch {
      toast.error("Failed to delete proofs");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <HardDrive className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Storage Management</h2>
            <p className="text-sm text-muted-foreground">
              View and manage time tracking proofs and screenshots
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={filteredProofs.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Bulk Delete Old
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Old Proofs?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete time proof screenshots older than the selected period. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ImageIcon className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-2xl font-bold">{filteredProofs.length}</p>
              <p className="text-xs text-muted-foreground">Total Proofs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-2xl font-bold">{filteredProofs.filter(p => new Date().getTime() - new Date(p.capturedAt).getTime() < 86400000).length}</p>
              <p className="text-xs text-muted-foreground">Today&apos;s Proofs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <HardDrive className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-2xl font-bold">~{(filteredProofs.length * 0.5).toFixed(1)} MB</p>
              <p className="text-xs text-muted-foreground">Estimated Storage</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proofs Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : filteredProofs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <HardDrive className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No proofs found</p>
            <p className="text-xs mt-1">Time tracking proofs will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredProofs.map(proof => (
            <Card key={proof.id} className="overflow-hidden group">
              <div className="aspect-square bg-muted relative">
                {proof.imageUrl ? (
                  <img src={proof.imageUrl} alt="Time proof screenshot" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <CardContent className="p-2">
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(proof.capturedAt), "MMM d, yyyy HH:mm")}
                </p>
                {proof.timeLog?.user?.fullName && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {proof.timeLog.user.fullName}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}