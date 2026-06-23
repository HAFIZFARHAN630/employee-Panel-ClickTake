"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { EmployeeProject, ProjectTask, AssignmentStatus } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { FolderKanban, CheckCircle2, Circle, Save } from "lucide-react";
import { toast } from "sonner";

function getStatusVariant(status: AssignmentStatus) {
  switch (status) {
    case "accepted":
      return "default" as const;
    case "pending":
      return "secondary" as const;
    case "rejected":
      return "destructive" as const;
    case "completed":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

export function ProjectsPage() {
  const { user } = useAuth();
  const employeeId = user?.employee?.id ?? "";

  const [assignments, setAssignments] = useState<EmployeeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingReport, setSavingReport] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await api.get<EmployeeProject[]>("/api/assignments", {
        employeeId,
      });
      setAssignments(Array.isArray(res) ? res : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const activeAssignments = assignments.filter((a) => a.status === "accepted");
  const pendingAssignments = assignments.filter((a) => a.status === "pending");
  const completedAssignments = assignments.filter(
    (a) => a.status === "completed"
  );

  const toggleTask = async (projectId: string, task: ProjectTask) => {
    try {
      await api.patch(`/api/projects/${projectId}/tasks`, {
        taskId: task.id,
        isCompleted: !task.isCompleted,
      });
      // Update local state
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.projectId !== projectId) return a;
          return {
            ...a,
            project: a.project
              ? {
                  ...a.project,
                  tasks: a.project.tasks?.map((t) =>
                    t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t
                  ),
                }
              : a.project,
          };
        })
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const handleAccept = async (assignmentId: string) => {
    try {
      await api.patch(`/api/assignments/${assignmentId}`, {
        status: "accepted",
      });
      toast.success("Project accepted");
      fetchAssignments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
    }
  };

  const handleReject = async (assignmentId: string) => {
    try {
      await api.patch(`/api/assignments/${assignmentId}`, {
        status: "rejected",
      });
      toast.success("Project rejected");
      fetchAssignments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    }
  };

  const handleSaveReport = async (assignmentId: string, report: string) => {
    setSavingReport(assignmentId);
    try {
      await api.patch(`/api/assignments/${assignmentId}`, {
        progressReport: report,
      });
      toast.success("Progress report saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save report");
    } finally {
      setSavingReport(null);
    }
  };

  function renderProjectCard(assignment: EmployeeProject) {
    const proj = assignment.project;
    if (!proj) return null;

    const totalTasks = proj.tasks?.length ?? 0;
    const doneTasks = proj.tasks?.filter((t) => t.isCompleted).length ?? 0;
    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return (
      <Card key={assignment.id}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{proj.name}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {proj.description || "No description"}
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(assignment.status)} className="shrink-0 capitalize">
              {assignment.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{doneTasks}/{totalTasks} tasks</span>
            <Progress value={pct} className="h-2 flex-1" />
            <span className="font-medium">{pct}%</span>
          </div>

          {/* Task List (only for accepted assignments) */}
          {assignment.status === "accepted" && proj.tasks && proj.tasks.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {proj.tasks.map((task) => (
                <label
                  key={task.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded px-2 py-1"
                >
                  <Checkbox
                    checked={task.isCompleted}
                    onCheckedChange={() => toggleTask(proj.id, task)}
                  />
                  <span className={task.isCompleted ? "line-through text-muted-foreground" : ""}>
                    {task.title}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Progress Report (for accepted assignments) */}
          {assignment.status === "accepted" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Progress Report</Label>
              <Textarea
                placeholder="Write your progress report..."
                defaultValue={assignment.progressReport ?? ""}
                rows={3}
                className="text-sm"
                id={`report-${assignment.id}`}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={savingReport === assignment.id}
                onClick={() => {
                  const el = document.getElementById(`report-${assignment.id}`) as HTMLTextAreaElement;
                  handleSaveReport(assignment.id, el.value);
                }}
              >
                {savingReport === assignment.id ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" /> Save Report
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Pending: Accept / Reject */}
          {assignment.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleAccept(assignment.id)}>
                Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(assignment.id)}
              >
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderEmpty(tab: string) {
    const messages: Record<string, string> = {
      active: "No active projects assigned to you.",
      pending: "No pending project invitations.",
      completed: "No completed projects yet.",
    };
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FolderKanban className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">{messages[tab] ?? "No projects found."}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {activeAssignments.length === 0
            ? renderEmpty("active")
            : activeAssignments.map(renderProjectCard)}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {pendingAssignments.length === 0
            ? renderEmpty("pending")
            : pendingAssignments.map(renderProjectCard)}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-4">
          {completedAssignments.length === 0
            ? renderEmpty("completed")
            : completedAssignments.map(renderProjectCard)}
        </TabsContent>
      </Tabs>
    </div>
  );
}