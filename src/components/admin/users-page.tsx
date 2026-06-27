"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getInitials, getUserTypeColor } from "@/lib/utils";
import type { User, UserType } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Filter,
  X,
  Clock,
  Check,
  UserX,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getInitials, getUserTypeColor } from "@/lib/utils";

// ============ HELPERS ============

function getUserTypeLabel(type: UserType) {
  return type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============ FORM TYPES ============

interface UserFormData {
  fullName: string;
  email: string;
  password: string;
  userType: UserType;
  role: string;
  isActive: boolean;
}

const defaultFormData: UserFormData = {
  fullName: "",
  email: "",
  password: "",
  userType: "employee",
  role: "",
  isActive: true,
};

// ============ TABLE SKELETON ============

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function UsersPage() {
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(defaultFormData);
  const [formErrors, setFormErrors] = useState<Partial<UserFormData>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pending approvals state
  const [pendingUsers, setPendingUsers] = useState<{ id: string; email: string; fullName: string; requestedRole: string | null; createdAt: string }[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // ============ FETCH ============

  const fetchPendingUsers = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await api.get<{ id: string; email: string; fullName: string; requestedRole: string | null; createdAt: string }[]>("/api/auth/pending-approvals");
      setPendingUsers(data);
    } catch {
      setPendingUsers([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(pageSize),
      };
      if (searchQuery) params.search = searchQuery;
      if (filterType !== "all") params.type = filterType;
      if (filterRole !== "all") params.role = filterRole;
      if (filterStatus !== "all") params.status = filterStatus;

      const data = await api.get<User[] | { data: User[]; total: number }>(
        "/api/users",
        params
      );

      if (Array.isArray(data)) {
        setUsers(data);
        setTotalUsers(data.length);
      } else {
        setUsers(data.data);
        setTotalUsers(data.total);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterType, filterRole, filterStatus, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ============ FORM HANDLERS ============

  function openCreateDialog() {
    setEditingUser(null);
    setFormData(defaultFormData);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: "",
      userType: user.userType,
      role: user.role,
      isActive: user.isActive,
    });
    setFormErrors({});
    setDialogOpen(true);
  }

  function validateForm(): boolean {
    const errors: Partial<UserFormData> = {};

    if (!formData.fullName.trim()) errors.fullName = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Invalid email format";
    if (!editingUser && !formData.password.trim())
      errors.password = "Password is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingUser) {
        const body: Record<string, unknown> = {
          fullName: formData.fullName,
          email: formData.email,
          userType: formData.userType,
          role: formData.role,
          isActive: formData.isActive,
        };
        if (formData.password) body.password = formData.password;
        await api.put(`/api/users/${editingUser.id}`, body);
      } else {
        await api.post("/api/users", formData);
      }
      setDialogOpen(false);
      fetchUsers();
      toast.success(editingUser ? "User updated" : "User created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await api.delete(`/api/users/${deletingUser.id}`);
      setDeletingUser(null);
      fetchUsers();
      toast.success("User deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  async function handleApprove(userId: string) {
    try {
      await api.post(`/api/auth/pending-approvals/${userId}?action=approve`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      // silently handle
    }
  }

  async function handleReject(userId: string) {
    setRejectingId(userId);
    try {
      await api.delete(`/api/auth/pending-approvals/${userId}`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      // silently handle
    } finally {
      setRejectingId(null);
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setFilterType("all");
    setFilterRole("all");
    setFilterStatus("all");
    setPage(1);
  }

  const hasFilters = searchQuery || filterType !== "all" || filterRole !== "all" || filterStatus !== "all";
  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage all users in the system
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Pending Approvals */}
      {pendingLoading ? (
        <Card className="border-l-4 border-l-yellow-500" style={{ background: "var(--card-gradient-purple, var(--card))" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-5 rounded ml-auto" />
            </div>
          </CardContent>
        </Card>
      ) : pendingUsers.length > 0 ? (
        <Card className="border-l-4 border-l-yellow-500 overflow-hidden" style={{ background: "var(--card-gradient-purple, var(--card))" }}>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <h3 className="text-sm font-semibold">Pending Approvals</h3>
              <Badge variant="outline" className="text-yellow-600 border-yellow-500/40 bg-yellow-500/10 text-xs">
                {pendingUsers.length}
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Requested Role</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Date Requested</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((pu) => (
                    <TableRow key={pu.id}>
                      <TableCell className="font-medium text-sm">{pu.fullName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{pu.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {pu.requestedRole?.replace("_", " ") || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                        {new Date(pu.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={() => handleApprove(pu.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-destructive hover:bg-destructive/10"
                                disabled={rejectingId === pu.id}
                              >
                                {rejectingId === pu.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserX className="h-4 w-4 mr-1" />
                                )}
                                Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Registration?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to reject <strong>{pu.fullName}</strong> ({pu.email})? This will permanently delete their account.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleReject(pu.id)}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  Delete Account
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="shrink-0"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-background">
                  <TableHead className="w-[240px]">User</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="py-8 px-4">
                        <TableSkeleton />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Users className="h-12 w-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No users found</p>
                        <p className="text-xs mt-1">
                          {hasFilters
                            ? "Try adjusting your filters"
                            : "Click 'Add User' to create one"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {user.avatarUrl && (
                              <AvatarImage
                                src={user.avatarUrl}
                                alt={user.fullName}
                              />
                            )}
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(user.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate md:hidden">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${getUserTypeColor(user.userType)}`}
                        >
                          {getUserTypeLabel(user.userType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {user.employee?.department || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                          className={`text-[10px] ${
                            user.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(user)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingUser(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && users.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalUsers)} of{" "}
                {totalUsers}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const p = i + 1;
                  return (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, fullName: e.target.value }))
                }
              />
              {formErrors.fullName && (
                <p className="text-xs text-destructive">{formErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, email: e.target.value }))
                }
              />
              {formErrors.email && (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingUser ? "(leave blank to keep)" : ""}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={
                  editingUser
                    ? "Leave blank to keep current password"
                    : "Enter password"
                }
                value={formData.password}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, password: e.target.value }))
                }
              />
              {formErrors.password && (
                <p className="text-xs text-destructive">{formErrors.password}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>User Type</Label>
                <Select
                  value={formData.userType}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, userType: v as UserType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, role: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="isActive" className="text-sm font-medium">
                  Active Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isActive
                    ? "User can log in and access the system"
                    : "User account is suspended"}
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((f) => ({ ...f, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingUser
                  ? "Save Changes"
                  : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingUser?.fullName}
              </span>
              ? This action cannot be undone. All associated data will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
