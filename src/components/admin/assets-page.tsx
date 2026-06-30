"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { EmployeeSearchDropdown } from "@/components/shared/employee-search-dropdown";
import { toast } from "sonner";
import { format } from "date-fns";

// ============ HELPERS ============

function getConditionBadge(condition: string) {
  switch (condition) {
    case "new":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">New</Badge>;
    case "good":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Good</Badge>;
    case "fair":
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">Fair</Badge>;
    case "poor":
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">Poor</Badge>;
    case "damaged":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Damaged</Badge>;
    default:
      return <Badge variant="secondary">{condition}</Badge>;
  }
}

// ============ FORM TYPES ============

interface AssetFormData {
  name: string;
  serialNumber: string;
  category: string;
  condition: string;
  assignedTo: string;
  purchaseDate: string;
}

const emptyForm: AssetFormData = {
  name: "",
  serialNumber: "",
  category: "",
  condition: "new",
  assignedTo: "",
  purchaseDate: "",
};

// ============ COMPONENT ============

export function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Asset[]>("/api/assets");
      setAssets(data);
    } catch {
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleCreate = () => {
    setEditingAsset(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name,
      serialNumber: asset.serialNumber,
      category: asset.category,
      condition: asset.condition,
      assignedTo: asset.assignedTo ?? "",
      purchaseDate: asset.purchaseDate ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Asset name is required");
      return;
    }
    try {
      setSaving(true);
      if (editingAsset) {
        await api.put(`/api/assets/${editingAsset.id}`, form);
        toast.success("Asset updated successfully");
      } else {
        await api.post("/api/assets", form);
        toast.success("Asset created successfully");
      }
      setDialogOpen(false);
      fetchAssets();
    } catch {
      toast.error("Failed to save asset");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAsset) return;
    try {
      await api.delete(`/api/assets/${deletingAsset.id}`);
      toast.success("Asset deleted");
      setDeleteDialogOpen(false);
      setDeletingAsset(null);
      fetchAssets();
    } catch {
      toast.error("Failed to delete asset");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Asset Management</h2>
            <p className="text-sm text-muted-foreground">
              Track and manage organizational assets
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="gap-2 w-fit">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No assets found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first asset to start tracking
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Serial</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs">
                        {asset.serialNumber}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{asset.category}</Badge>
                      </TableCell>
                      <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {asset.assignee?.user?.fullName ?? "Unassigned"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {asset.purchaseDate
                          ? format(new Date(asset.purchaseDate), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(asset)}
                            aria-label="Edit asset"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingAsset(asset);
                              setDeleteDialogOpen(true);
                            }}
                            aria-label="Delete asset"
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
            <DialogTitle>{editingAsset ? "Edit Asset" : "Add Asset"}</DialogTitle>
            <DialogDescription>
              {editingAsset ? "Update asset details" : "Register a new asset"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Asset Name</Label>
              <Input
                id="asset-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., MacBook Pro 16&quot;"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset-serial">Serial Number</Label>
                <Input
                  id="asset-serial"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  placeholder="ABC123XYZ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-category">Category</Label>
                <Input
                  id="asset-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g., Laptop"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={(val) => setForm({ ...form, condition: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-date">Purchase Date</Label>
                <Input
                  id="asset-date"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <EmployeeSearchDropdown
                value={form.assignedTo}
                onChange={(val) => setForm({ ...form, assignedTo: val })}
                placeholder="Search employee..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                editingAsset ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAsset?.name}&quot;? This action cannot be undone.
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