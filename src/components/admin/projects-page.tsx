"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getStatusColor, getPriorityColor, formatCurrency, getStatusLabel } from "@/lib/utils";
import type {
  Project,
  ProjectTask,
  ProjectStatus,
  ProjectPriority,
  EmployeeProject,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderKanban,
  Plus,
  Search,
  Sparkles,
  Eye,
  Pencil,
  X,
  Tag,
  CheckCircle2,
  Circle,
  Loader2,
  Users,
  DollarSign,
  ListTodo,
  Inbox,
  Trash2,
  Copy,
  UserPlus,
  Check,
} from "lucide-react";

import { toast } from "sonner";

interface SimpleUser {
  id: string;
  fullName: string;
  email: string;
  employee?: { id: string } | null;
}

// ============ FORM TYPES ============

interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  budget: number;
  tags: string;
}

const defaultProjectForm: ProjectFormData = {
  name: "",
  description: "",
  status: "draft",
  priority: "medium",
  budget: 0,
  tags: "",
};

// ============ SKELETON ============

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </CardContent>
          <CardFooter className="pt-3">
            <div className="flex gap-2 w-full">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function ProjectsPage() {
  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");

  // Create/Edit dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(defaultProjectForm);
  const [formErrors, setFormErrors] = useState<Partial<ProjectFormData>>({});
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [detailTasks, setDetailTasks] = useState<ProjectTask[]>([]);
  const [detailAssignments, setDetailAssignments] = useState<EmployeeProject[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);

  // Generate tasks state
  const [generatingTasks, setGeneratingTasks] = useState<string | null>(null);

  // User search state for multi-employee assignment
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<SimpleUser[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedEmployeeNames, setSelectedEmployeeNames] = useState<Map<string, string>>(new Map());
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [assigningEmployees, setAssigningEmployees] = useState(false);

  // Delete state
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [duplicatingProject, setDuplicatingProject] = useState<string | null>(null);

  // ============ FETCH ============

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (filterPriority !== "all") params.priority = filterPriority;
      if (activeTab !== "all") params.status = activeTab;

      const data = await api.get<Project[]>("/api/projects", params);
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterPriority, activeTab]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ============ FILTERED PROJECTS ============

  const filteredProjects = projects;

  // ============ FORM HANDLERS ============

  function openCreateDialog() {
    setEditingProject(null);
    setFormData(defaultProjectForm);
    setFormErrors({});
    setFormDialogOpen(true);
  }

  function openEditDialog(project: Project) {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      budget: project.budget,
      tags: project.tags,
    });
    setFormErrors({});
    setFormDialogOpen(true);
  }

  function validateForm(): boolean {
    const errors: Partial<ProjectFormData> = {};
    if (!formData.name.trim()) errors.name = "Project name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleFormSubmit() {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingProject) {
        await api.put(`/api/projects/${editingProject.id}`, formData);
      } else {
        const newProject = await api.post<Project>("/api/projects", formData);

        // Create assignments for selected employees
        if (selectedEmployeeIds.length > 0 && newProject?.id) {
          setAssigningEmployees(true);
          await Promise.all(
            selectedEmployeeIds.map((empId) =>
              api.post("/api/assignments", {
                employeeId: empId,
                projectId: newProject.id,
                status: "accepted",
              }).catch(() => {
                // Silently fail individual assignment errors
              })
            )
          );
          setAssigningEmployees(false);
        }
      }
      toast.success(editingProject ? "Project updated successfully" : "Project created successfully");
      setFormDialogOpen(false);
      setSelectedEmployeeIds([]);
      fetchProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSubmitting(false);
      setAssigningEmployees(false);
    }
  }

  // ============ DETAIL / TASKS ============

  async function openDetailDialog(project: Project) {
    setDetailProject(project);
    setDetailTasks([]);
    setDetailAssignments([]);
    setDetailDialogOpen(true);
    setLoadingDetail(true);

    try {
      const [tasksData, assignData] = await Promise.all([
        api.get<ProjectTask[]>(`/api/projects/${project.id}/tasks`),
        api.get<EmployeeProject[]>(`/api/projects/${project.id}/assignments`).catch(() => []),
      ]);
      setDetailTasks(Array.isArray(tasksData) ? tasksData : []);
      setDetailAssignments(Array.isArray(assignData) ? assignData : []);
    } catch {
      // silently handle
    } finally {
      setLoadingDetail(false);
    }
  }

  async function toggleTask(task: ProjectTask) {
    if (!detailProject) return;
    setTogglingTask(task.id);
    try {
      const updated = await api.patch<ProjectTask>(
        `/api/projects/${detailProject.id}/tasks`,
        { taskId: task.id, isCompleted: !task.isCompleted }
      );

      // Update local state
      setDetailTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t))
      );

      // Update progress
      const allTasks = detailTasks.map((t) =>
        t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t
      );
      const completed = allTasks.filter((t) => t.isCompleted).length;
      const total = allTasks.length;
      const newProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

      setDetailProject((prev) =>
        prev ? { ...prev, progress: newProgress } : null
      );

      // Also refresh the project list
      fetchProjects();
    } catch {
      // silently handle
    } finally {
      setTogglingTask(null);
    }
  }

  // ============ GENERATE TASKS ============

  async function handleGenerateTasks(project: Project) {
    if (generatingTasks === project.id) return;
    setGeneratingTasks(project.id);
    try {
      // First generate task suggestions
      const suggestions = await api.post<{ tasks: { title: string; description: string }[] }>(
        `/api/projects/${project.id}/generate-tasks`
      );

      // Then create the tasks
      if (suggestions.tasks && suggestions.tasks.length > 0) {
        await api.post(`/api/projects/${project.id}/tasks`, {
          tasks: suggestions.tasks,
        });
      }

      // Refresh projects
      fetchProjects();
    } catch {
      // silently handle
    } finally {
      setGeneratingTasks(null);
    }
  }

  // ============ DELETE / DUPLICATE ============

  async function handleDeleteProject(projectId: string) {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    setDeletingProject(projectId);
    try {
      await api.delete(`/api/projects/${projectId}`);
      toast.success("Project deleted successfully");
      fetchProjects();
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeletingProject(null);
    }
  }

  async function handleDuplicateProject(projectId: string) {
    setDuplicatingProject(projectId);
    try {
      await api.post(`/api/projects/${projectId}/duplicate`);
      toast.success("Project duplicated successfully");
      fetchProjects();
    } catch {
      toast.error("Failed to duplicate project");
    } finally {
      setDuplicatingProject(null);
    }
  }

  // ============ USER SEARCH FOR ASSIGNMENT ============

  async function searchUsers(query: string) {
    setUserSearchQuery(query);
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const data = await api.get<SimpleUser[]>("/api/users", { search: query, type: "employee" });
      const users = Array.isArray(data) ? data : [];
      setUserSearchResults(users);
    } catch {
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  }

  function addEmployeeToAssignment(user: SimpleUser) {
    if (!user.employee?.id) {
      toast.error("This user has no employee record");
      return;
    }
    if (selectedEmployeeIds.includes(user.employee.id)) {
      toast.error("Already added");
      return;
    }
    setSelectedEmployeeIds((prev) => [...prev, user.employee!.id]);
    setSelectedEmployeeNames((prev) => new Map(prev).set(user.employee!.id, user.fullName || user.email));
    setUserSearchQuery("");
    setUserSearchResults([]);
  }

  function removeEmployeeFromAssignment(empId: string) {
    setSelectedEmployeeIds((prev) => prev.filter((id) => id !== empId));
    setSelectedEmployeeNames((prev) => { const m = new Map(prev); m.delete(empId); return m; });
  }

  // ============ TAB DEFINITIONS ============

  const tabs = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Project Management</h2>
          <p className="text-sm text-muted-foreground">
            Track and manage all projects
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Tabs + Filters */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || filterPriority !== "all") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchQuery("");
                setFilterPriority("all");
              }}
              className="shrink-0"
              title="Clear filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Project Cards Grid */}
      {loading ? (
        <CardGridSkeleton />
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderKanban className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No projects found</p>
          <p className="text-sm mt-1">
            {searchQuery || filterPriority !== "all" || activeTab !== "all"
              ? "Try adjusting your filters"
              : "Click 'New Project' to create one"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="flex flex-col hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-tight">
                    {project.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={`text-[10px] ${getStatusColor(project.status)}`}
                    >
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={`text-[10px] ${getPriorityColor(project.priority)}`}
                  >
                    {project.priority}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                {/* Tags */}
                {project.tags && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags
                      .split(",")
                      .filter(Boolean)
                      .map((tag) => (
                        <Badge
                          key={tag.trim()}
                          variant="outline"
                          className="text-[10px] px-1.5"
                        >
                          {tag.trim()}
                        </Badge>
                      ))}
                  </div>
                )}

                {/* Meta info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ListTodo className="h-3 w-3" />
                    {project._count?.tasks ?? 0} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {project._count?.assignments ?? 0} assigned
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(project.budget)}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="pt-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openDetailDialog(project)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(project)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicateProject(project.id)}
                  disabled={duplicatingProject === project.id}
                >
                  {duplicatingProject === project.id ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteProject(project.id)}
                  disabled={deletingProject === project.id}
                >
                  {deletingProject === project.id ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Project Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "Create New Project"}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update the project details below."
                : "Fill in the details to create a new project."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDesc">Description</Label>
              <Textarea
                id="projectDesc"
                placeholder="Describe the project..."
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((f) => ({
                      ...f,
                      status: v as ProjectStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) =>
                    setFormData((f) => ({
                      ...f,
                      priority: v as ProjectPriority,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={formData.budget || ""}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      budget: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="tag1, tag2, tag3"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, tags: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Multi-Employee Assignment (only on create) */}
            {!editingProject && (
              <div className="space-y-3">
                <Label>Assign Employees</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search employees by name or email..."
                      value={userSearchQuery}
                      onChange={(e) => searchUsers(e.target.value)}
                      className="flex-1"
                    />
                    {searchingUsers && (
                      <Loader2 className="h-4 w-4 animate-spin mt-3 absolute right-3 top-0" />
                    )}
                  </div>
                  {userSearchResults.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full border rounded-lg bg-popover shadow-md max-h-48 overflow-y-auto">
                      {userSearchResults.map((u) => (
                        <button
                          key={u.id}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left transition-colors"
                          onClick={() => addEmployeeToAssignment(u)}
                          disabled={!u.employee?.id}
                        >
                          <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{u.fullName}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedEmployeeIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedEmployeeIds.map((empId) => {
                      const name = selectedEmployeeNames.get(empId);
                      return (
                        <Badge
                          key={empId}
                          variant="secondary"
                          className="flex items-center gap-1.5 pl-2.5 pr-1 py-1"
                        >
                          <span className="text-xs">{name ?? empId.slice(0, 6)}</span>
                          <button
                            className="h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted-foreground/20"
                            onClick={() => removeEmployeeFromAssignment(empId)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={submitting || assigningEmployees}>
              {submitting || assigningEmployees
                ? assigningEmployees
                  ? "Creating & Assigning..."
                  : "Saving..."
                : editingProject
                  ? "Save Changes"
                  : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {detailProject?.name}
            </DialogTitle>
            <DialogDescription>
              Project details and task management
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Separator />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : detailProject ? (
            <div className="space-y-5">
              {/* Project Info */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  className={`text-xs ${getStatusColor(detailProject.status)}`}
                >
                  {getStatusLabel(detailProject.status)}
                </Badge>
                <Badge
                  className={`text-xs ${getPriorityColor(detailProject.priority)}`}
                >
                  {detailProject.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatCurrency(detailProject.budget)}
                </Badge>
              </div>

              {detailProject.description && (
                <p className="text-sm text-muted-foreground">
                  {detailProject.description}
                </p>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{detailProject.progress}%</span>
                </div>
                <Progress value={detailProject.progress} className="h-2.5" />
              </div>

              <Separator />

              {/* Tasks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Tasks ({detailTasks.length})
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={generatingTasks === detailProject.id}
                    onClick={() => handleGenerateTasks(detailProject)}
                  >
                    {generatingTasks === detailProject.id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Generate
                  </Button>
                </div>

                <ScrollArea className="h-64">
                  {detailTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Inbox className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">No tasks yet</p>
                      <p className="text-xs mt-1">
                        Click "Generate" to create tasks with AI
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 pr-3">
                      {detailTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => toggleTask(task)}
                        >
                          <div className="shrink-0">
                            {togglingTask === task.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : task.isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${
                                task.isCompleted
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <Separator />

              {/* Assigned Employees */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assigned Members ({detailAssignments.length})
                </h3>

                {detailAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No members assigned to this project yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detailAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {assignment.employee?.user?.fullName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {assignment.employee?.user?.fullName ?? "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {assignment.employee?.user?.email ?? ""}
                          </p>
                        </div>
                        <Badge
                          variant={
                            assignment.status === "accepted"
                              ? "default"
                              : "secondary"
                          }
                          className={`text-[10px] ${
                            assignment.status === "accepted"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : assignment.status === "pending"
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                : assignment.status === "rejected"
                                  ? "bg-red-100 text-red-700 hover:bg-red-100"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {assignment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
