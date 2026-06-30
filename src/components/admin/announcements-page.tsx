"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Announcement, AnnouncementPriority, AnnouncementStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const PRIORITY_CONFIG: Record<
  AnnouncementPriority,
  { label: string; variant: "secondary" | "default" | "outline" | "destructive"; className: string }
> = {
  low: { label: "Low", variant: "secondary", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  normal: { label: "Normal", variant: "outline", className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800" },
  high: { label: "High", variant: "default", className: "bg-orange-500 text-white hover:bg-orange-500" },
  urgent: { label: "Urgent", variant: "destructive", className: "" },
};

const STATUS_CONFIG: Record<AnnouncementStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  archived: { label: "Archived", variant: "outline" },
};

interface AnnouncementFormData {
  title: string;
  description: string;
  content: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  expiresAtDate: string;
  expiresAtTime: string;
}

const emptyForm: AnnouncementFormData = {
  title: "",
  description: "",
  content: "",
  priority: "normal",
  status: "draft",
  expiresAtDate: "",
  expiresAtTime: "",
};

export function AnnouncementsPage() {
  const [activeTab, setActiveTab] = useState<string>("active");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Announcement[]>(
        `/api/announcements?status=${activeTab}`
      );
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormData({ ...emptyForm, status: activeTab as AnnouncementStatus });
    setDialogOpen(true);
  };

  const openEditDialog = (a: Announcement) => {
    setEditing(a);
    const expiresAt = a.expiresAt ? new Date(a.expiresAt) : null;
    setFormData({
      title: a.title,
      description: a.description,
      content: a.content,
      priority: a.priority,
      status: a.status,
      expiresAtDate: expiresAt ? expiresAt.toISOString().slice(0, 10) : "",
      expiresAtTime: expiresAt ? `${String(expiresAt.getHours()).padStart(2, "0")}:${String(expiresAt.getMinutes()).padStart(2, "0")}` : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      setSaving(true);
      // Combine date + time into expiresAt
      let expiresAt: string | null = null;
      if (formData.expiresAtDate) {
        const time = formData.expiresAtTime || "00:00";
        expiresAt = `${formData.expiresAtDate}T${time}`;
      }

      const body = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        status: formData.status,
        expiresAt,
      };

      if (editing) {
        await api.put(`/api/announcements/${editing.id}`, body);
        toast.success("Announcement updated");
      } else {
        await api.post("/api/announcements", body);
        toast.success("Announcement created");
      }

      setDialogOpen(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/announcements/${id}`);
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch {
      toast.error("Failed to delete announcement");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage organization announcements
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        {/* Content is shared for all tabs - just filter changes */}
        {(["active", "draft", "archived"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-72" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Megaphone className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">
                    No {tab} announcements
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {tab === "active"
                      ? "Active announcements will appear here"
                      : tab === "draft"
                        ? "Draft announcements are saved but not published"
                        : "Archived announcements are stored here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {announcements.map((a) => {
                  const priorityConf = PRIORITY_CONFIG[a.priority];
                  const statusConf = STATUS_CONFIG[a.status];
                  const isExpanded = expandedId === a.id;
                  const hasLongContent = a.content && a.content.length > 150;

                  return (
                    <Card key={a.id} className="transition-shadow hover:shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Title */}
                            <h3 className="text-lg font-semibold leading-snug">
                              {a.title}
                            </h3>

                            {/* Description */}
                            {a.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {a.description}
                              </p>
                            )}

                            {/* Content (collapsible) */}
                            {a.content && (
                              <div className="mt-3">
                                <p
                                  className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ${
                                    !isExpanded && hasLongContent ? "line-clamp-2" : ""
                                  }`}
                                >
                                  {a.content}
                                </p>
                                {hasLongContent && (
                                  <button
                                    onClick={() => toggleExpand(a.id)}
                                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-1.5 cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-3 w-3" />
                                        Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3" />
                                        Read more
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <Badge
                                variant={priorityConf.variant}
                                className={`text-[11px] ${priorityConf.className}`}
                              >
                                {priorityConf.label}
                              </Badge>
                              <Badge
                                variant={statusConf.variant}
                                className="text-[11px]"
                              >
                                {statusConf.label}
                              </Badge>
                              {a.createdBy && (
                                <span className="text-xs text-muted-foreground">
                                  by {a.createdBy.fullName}
                                </span>
                              )}
                              {a.expiresAt && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  Expires: {new Date(a.expiresAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(a)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{a.title}
                                    &quot;? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(a.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Announcement" : "New Announcement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                placeholder="Announcement title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-desc">Description</Label>
              <Input
                id="ann-desc"
                placeholder="Brief description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-content">Content</Label>
              <Textarea
                id="ann-content"
                placeholder="Full announcement content..."
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={5}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ann-priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: val as AnnouncementPriority,
                    }))
                  }
                >
                  <SelectTrigger id="ann-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: val as AnnouncementStatus,
                    }))
                  }
                >
                  <SelectTrigger id="ann-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expires At</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={formData.expiresAtDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        expiresAtDate: e.target.value,
                      }))
                    }
                    className="flex-1"
                    placeholder="Date"
                  />
                  <Input
                    type="time"
                    value={formData.expiresAtTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        expiresAtTime: e.target.value,
                      }))
                    }
                    className="w-[130px]"
                    placeholder="Time"
                  />
                </div>
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
                : editing
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}