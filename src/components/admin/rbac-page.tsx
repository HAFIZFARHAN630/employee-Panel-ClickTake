"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { RBACRole, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pencil,
  Plus,
  Trash2,
  Shield,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

const ALL_PERMISSIONS = [
  "users",
  "projects",
  "attendance",
  "leaves",
  "timeTracking",
  "notifications",
  "announcements",
  "rbac",
  "settings",
  "reports",
  "view",
] as const;

type Permission = (typeof ALL_PERMISSIONS)[number];

interface TempAccess {
  id: string;
  email: string;
  roleId: string;
  roleName?: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

interface RoleFormData {
  roleId: string;
  name: string;
  description: string;
  color: string;
  parentRole: string;
  permissions: string[];
}

const emptyForm: RoleFormData = {
  roleId: "",
  name: "",
  description: "",
  color: "#6366f1",
  parentRole: "",
  permissions: [],
};

function parsePermissions(permStr: string): string[] {
  try {
    const parsed = JSON.parse(permStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

function formatPermission(p: string): string {
  return p
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function RBACPage() {
  const [roles, setRoles] = useState<RBACRole[]>([]);
  const [tempAccess, setTempAccess] = useState<TempAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RBACRole | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<RBACRole[]>("/api/rbac/roles");
      setRoles(data);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTempAccess = useCallback(async () => {
    try {
      const data = await api.get<TempAccess[]>("/api/rbac/temporary-access");
      setTempAccess(data);
    } catch {
      // Silently fail - endpoint might not exist yet
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchTempAccess();
  }, [fetchRoles, fetchTempAccess]);

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (role: RBACRole) => {
    setEditingRole(role);
    setFormData({
      roleId: role.roleId,
      name: role.name,
      description: role.description,
      color: role.color,
      parentRole: role.parentRole ?? "",
      permissions: parsePermissions(role.permissions),
    });
    setDialogOpen(true);
  };

  const togglePermission = (perm: Permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSave = async () => {
    if (!formData.roleId.trim() || !formData.name.trim()) {
      toast.error("Role ID and Name are required");
      return;
    }

    try {
      setSaving(true);
      const body = {
        roleId: formData.roleId,
        name: formData.name,
        description: formData.description,
        color: formData.color,
        parentRole: formData.parentRole || null,
        permissions: JSON.stringify(formData.permissions),
      };

      if (editingRole) {
        await api.put(`/api/rbac/roles/${editingRole.id}`, body);
        toast.success("Role updated successfully");
      } else {
        await api.post("/api/rbac/roles", body);
        toast.success("Role created successfully");
      }

      setDialogOpen(false);
      fetchRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: RBACRole) => {
    try {
      await api.delete(`/api/rbac/roles/${role.id}`);
      toast.success("Role deleted successfully");
      fetchRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete role");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Role & Access Management</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage roles, permissions, and temporary access grants
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Role Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No roles configured yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Create your first role to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roles.map((role) => {
            const perms = parsePermissions(role.permissions);
            const parentRole = roles.find((r) => r.id === role.parentRole);
            return (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: role.color }}
                      />
                      <CardTitle className="text-base truncate">{role.name}</CardTitle>
                      {role.isSystem && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          System
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(role)}
                        disabled={role.isSystem}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={role.isSystem}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Role</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{role.name}&quot;? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(role)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <CardDescription className="mt-1">{role.description || "No description"}</CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {role.roleId}
                    </Badge>
                    {parentRole && (
                      <Badge variant="outline" className="text-[11px]">
                        Parent: {parentRole.name}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Permissions</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ALL_PERMISSIONS.map((perm) => {
                      const hasPermission = perms.includes(perm);
                      return (
                        <div
                          key={perm}
                          className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 ${
                            hasPermission
                              ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {hasPermission ? (
                            <Check className="h-3 w-3 shrink-0" />
                          ) : (
                            <X className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{formatPermission(perm)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Temporary Access Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Temporary Access Grants</CardTitle>
          <CardDescription>
            Manage temporary role assignments that automatically expire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tempAccess.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No temporary access grants
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tempAccess.map((ta) => (
                    <TableRow key={ta.id}>
                      <TableCell className="font-mono text-sm">{ta.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ta.roleName ?? ta.roleId}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(ta.expiresAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ta.isActive ? "default" : "secondary"}>
                          {ta.isActive ? "Active" : "Expired"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            try {
                              await api.delete(`/api/rbac/temporary-access/${ta.id}`);
                              toast.success("Temporary access revoked");
                              fetchTempAccess();
                            } catch {
                              toast.error("Failed to revoke access");
                            }
                          }}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Create New Role"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roleId">Role ID</Label>
                <Input
                  id="roleId"
                  placeholder="e.g. manager"
                  value={formData.roleId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, roleId: e.target.value }))
                  }
                  disabled={!!editingRole}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Manager"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Role description..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentRole">Parent Role</Label>
                <Select
                  value={formData.parentRole}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, parentRole: val }))
                  }
                >
                  <SelectTrigger id="parentRole">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {roles
                      .filter((r) => r.id !== editingRole?.id)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = formData.permissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className="flex items-center gap-2 text-sm rounded-md border px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary/30"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => togglePermission(perm)}
                      />
                      <span className="truncate">{formatPermission(perm)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving..."
                : editingRole
                  ? "Update Role"
                  : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}