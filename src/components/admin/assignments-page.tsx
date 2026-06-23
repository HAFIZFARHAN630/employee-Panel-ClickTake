"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { EmployeeProject, AssignmentStatus, User, Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

const STATUS_VARIANT: Record<AssignmentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  accepted: "default",
  rejected: "destructive",
  completed: "secondary",
};

const STATUS_CLASS: Record<AssignmentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700",
  accepted: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  rejected: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
};

const TAB_VALUES: ("all" | AssignmentStatus)[] = ["all", "pending", "accepted", "rejected", "completed"];

interface EmployeeOption {
  id: string;
  fullName: string;
  department: string;
}

export function AssignmentsPage() {
  const [assignments, setAssignments] = useState<EmployeeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");

  // New assignment dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Update status dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<EmployeeProject | null>(null);
  const [updateStatus, setUpdateStatus] = useState<AssignmentStatus>("pending");
  const [updateReport, setUpdateReport] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.status = activeTab;
      const data = await api.get<EmployeeProject[]>("/api/assignments", params);
      setAssignments(data);
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await api.get<User[]>("/api/users", { type: "employee" });
      setEmployees(
        data.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          department: u.employee?.department ?? "N/A",
        }))
      );
    } catch {
      setEmployees([]);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.get<Project[]>("/api/projects", { status: "active" });
      setProjects(data);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    if (newDialogOpen) {
      fetchEmployees();
      fetchProjects();
    }
  }, [newDialogOpen, fetchEmployees, fetchProjects]);

  const handleCreateAssignment = async () => {
    if (!selectedEmployee || !selectedProject) return;
    try {
      setSubmitting(true);
      await api.post("/api/assignments", {
        employeeId: selectedEmployee,
        projectId: selectedProject,
      });
      setNewDialogOpen(false);
      setSelectedEmployee("");
      setSelectedProject("");
      fetchAssignments();
    } catch {
      // error handled by api wrapper
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateDialog = (assignment: EmployeeProject) => {
    setUpdateTarget(assignment);
    setUpdateStatus(assignment.status);
    setUpdateReport(assignment.progressReport || "");
    setUpdateDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!updateTarget) return;
    try {
      setUpdating(true);
      await api.patch(`/api/assignments/${updateTarget.id}`, {
        status: updateStatus,
        progressReport: updateReport,
      });
      setUpdateDialogOpen(false);
      setUpdateTarget(null);
      fetchAssignments();
    } catch {
      // error handled by api wrapper
    } finally {
      setUpdating(false);
    }
  };

  const filtered = assignments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.employee?.user.fullName.toLowerCase().includes(q) ||
      a.project?.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Assignments</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage employee-project assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchAssignments} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.fullName} — {emp.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAssignment}
                  disabled={!selectedEmployee || !selectedProject || submitting}
                >
                  {submitting ? "Assigning..." : "Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by employee or project..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Progress Report</TableHead>
                      <TableHead className="hidden sm:table-cell">Assigned Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No assignments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {assignment.employee?.user.fullName ?? "Unknown"}
                          </TableCell>
                          <TableCell>{assignment.project?.name ?? "Unknown"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={STATUS_VARIANT[assignment.status]}
                              className={STATUS_CLASS[assignment.status]}
                            >
                              {assignment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[200px]">
                            <span className="text-sm text-muted-foreground line-clamp-1">
                              {assignment.progressReport || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {format(new Date(assignment.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUpdateDialog(assignment)}
                            >
                              Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Assignment</DialogTitle>
          </DialogHeader>
          {updateTarget && (
            <div className="space-y-4 py-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {updateTarget.employee?.user.fullName}
                </span>{" "}
                →{" "}
                <span className="font-medium text-foreground">
                  {updateTarget.project?.name}
                </span>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={updateStatus}
                  onValueChange={(v) => setUpdateStatus(v as AssignmentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Progress Report</Label>
                <Textarea
                  placeholder="Add a progress report..."
                  value={updateReport}
                  onChange={(e) => setUpdateReport(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}