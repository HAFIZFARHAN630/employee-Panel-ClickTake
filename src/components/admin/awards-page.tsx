"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AwardPoint } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trophy, Award, Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ============ TYPES ============

interface EmployeeOption {
  id: string;
  fullName: string;
  email: string;
  department?: string;
}

interface AwardFormData {
  targetType: string;
  employeeId: string;
  points: number;
  reason: string;
}

// ============ COMPONENT ============

export function AwardsPage() {
  const [awards, setAwards] = useState<AwardPoint[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AwardFormData>({
    targetType: "individual",
    employeeId: "",
    points: 0,
    reason: "",
  });

  const fetchAwards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<AwardPoint[]>("/api/awards");
      setAwards(data);
    } catch {
      toast.error("Failed to load award records");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await api.get<EmployeeOption[]>("/api/awards/employees");
      setEmployees(data);
    } catch {
      toast.error("Failed to load employees");
    }
  }, []);

  useEffect(() => {
    fetchAwards();
    fetchEmployees();
  }, [fetchAwards, fetchEmployees]);

  const handleAward = async () => {
    if (form.targetType === "individual" && !form.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (form.points <= 0) {
      toast.error("Points must be greater than zero");
      return;
    }
    try {
      setSaving(true);
      await api.post("/api/awards", form);
      toast.success(`${form.points} point${form.points > 1 ? "s" : ""} awarded successfully`);
      setForm({ targetType: "individual", employeeId: "", points: 0, reason: "" });
      fetchAwards();
    } catch {
      toast.error("Failed to award points");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Trophy className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Award Points</h2>
          <p className="text-sm text-muted-foreground">
            Recognize and reward employees with points
          </p>
        </div>
      </div>

      {/* Award Form */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Award Points</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Award Type</Label>
              <RadioGroup
                value={form.targetType}
                onValueChange={(val) => setForm({ ...form, targetType: val })}
                className="flex flex-wrap gap-3 pt-1"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="individual" id="award-individual" />
                  <Label htmlFor="award-individual" className="text-xs cursor-pointer">Individual</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="team" id="award-team" />
                  <Label htmlFor="award-team" className="text-xs cursor-pointer">Team</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="department" id="award-dept" />
                  <Label htmlFor="award-dept" className="text-xs cursor-pointer">Department</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="all" id="award-all" />
                  <Label htmlFor="award-all" className="text-xs cursor-pointer">All</Label>
                </div>
              </RadioGroup>
            </div>
            {form.targetType === "individual" && (
              <div className="space-y-2">
                <Label htmlFor="award-employee">Employee</Label>
                <Select value={form.employeeId} onValueChange={(val) => setForm({ ...form, employeeId: val })}>
                  <SelectTrigger id="award-employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="award-points">Points</Label>
              <Input
                id="award-points"
                type="number"
                min={1}
                value={form.points || ""}
                onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="award-reason">Reason</Label>
              <Textarea
                id="award-reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g., Excellent performance"
                className="min-h-[38px]"
                rows={1}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAward} disabled={saving} className="gap-2">
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Star className="h-4 w-4" />
              )}
              Award Points
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Awards History */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 sm:p-6 pb-0">
            <h3 className="font-semibold">Award History</h3>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : awards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No awards given yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="hidden sm:table-cell">Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awards.map((award) => (
                    <TableRow key={award.id}>
                      <TableCell className="font-medium">
                        {award.employee?.user?.fullName ?? "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 gap-1">
                          <Star className="h-3 w-3" />
                          {award.points}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-xs truncate">
                        {award.reason || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(award.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}