"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Shift } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

// ============ HELPERS ============

function getTypeBadge(type: string) {
  switch (type) {
    case "office":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Office</Badge>;
    case "department":
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">Dept</Badge>;
    case "individual":
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">Individual</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

// ============ FORM TYPES ============

interface ShiftFormData {
  name: string;
  startTime: string;
  endTime: string;
  applicableType: string;
  applicableIds: string;
}

const emptyForm: ShiftFormData = {
  name: "",
  startTime: "09:00",
  endTime: "17:00",
  applicableType: "office",
  applicableIds: "",
};

// ============ COMPONENT ============

export function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);
  const [form, setForm] = useState<ShiftFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Shift[]>("/api/shifts");
      setShifts(data);
    } catch {
      toast.error("Failed to load shifts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleCreate = () => {
    setEditingShift(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      applicableType: shift.applicableType,
      applicableIds: shift.applicableIds,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Shift name is required");
      return;
    }
    if (form.applicableType !== "office" && !form.applicableIds.trim()) {
      toast.error("Please specify applicable IDs for department/individual shifts");
      return;
    }
    try {
      setSaving(true);
      if (editingShift) {
        await api.put(`/api/shifts/${editingShift.id}`, form);
        toast.success("Shift updated successfully");
      } else {
        await api.post("/api/shifts", form);
        toast.success("Shift created successfully");
      }
      setDialogOpen(false);
      fetchShifts();
    } catch {
      toast.error("Failed to save shift");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingShift) return;
    try {
      await api.delete(`/api/shifts/${deletingShift.id}`);
      toast.success("Shift deleted");
      setDeleteDialogOpen(false);
      setDeletingShift(null);
      fetchShifts();
    } catch {
      toast.error("Failed to delete shift");
    }
  };

  const handleToggleActive = async (shift: Shift) => {
    try {
      await api.patch(`/api/shifts/${shift.id}`, { isActive: !shift.isActive });
      toast.success(shift.isActive ? "Shift deactivated" : "Shift activated");
      fetchShifts();
    } catch {
      toast.error("Failed to update shift status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Shift Management</h2>
            <p className="text-sm text-muted-foreground">
              Configure work shifts for your organization
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="gap-2 w-fit">
          <Plus className="h-4 w-4" />
          Add Shift
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : shifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No shifts configured</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first shift to get started
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.name}</TableCell>
                      <TableCell>{shift.startTime}</TableCell>
                      <TableCell>{shift.endTime}</TableCell>
                      <TableCell>{getTypeBadge(shift.applicableType)}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={shift.isActive}
                          onCheckedChange={() => handleToggleActive(shift)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(shift)}
                            aria-label="Edit shift"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingShift(shift);
                              setDeleteDialogOpen(true);
                            }}
                            aria-label="Delete shift"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingShift ? "Edit Shift" : "Create Shift"}</DialogTitle>
            <DialogDescription>
              {editingShift ? "Update shift details" : "Configure a new work shift"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shift-name">Shift Name</Label>
              <Input
                id="shift-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Morning Shift"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applicable Type</Label>
              <RadioGroup
                value={form.applicableType}
                onValueChange={(val) => setForm({ ...form, applicableType: val, applicableIds: "" })}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="office" id="type-office" />
                  <Label htmlFor="type-office" className="cursor-pointer">Office</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="department" id="type-dept" />
                  <Label htmlFor="type-dept" className="cursor-pointer">Department</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="individual" id="type-ind" />
                  <Label htmlFor="type-ind" className="cursor-pointer">Individual</Label>
                </div>
              </RadioGroup>
            </div>
            {form.applicableType !== "office" && (
              <div className="space-y-2">
                <Label htmlFor="applicable-ids">
                  {form.applicableType === "department" ? "Department IDs" : "Employee IDs"} (comma-separated)
                </Label>
                <Input
                  id="applicable-ids"
                  value={form.applicableIds}
                  onChange={(e) => setForm({ ...form, applicableIds: e.target.value })}
                  placeholder={form.applicableType === "department" ? "dept-1, dept-2" : "emp-1, emp-2"}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                editingShift ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingShift?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}