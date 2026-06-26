"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AgreementTemplate, Department, EmployeeSignature } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, FileText, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ============ HELPERS ============

function getStatusBadge(isActive: boolean) {
  return isActive ? (
    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Active</Badge>
  ) : (
    <Badge variant="secondary">Inactive</Badge>
  );
}

function parseList(val: string | unknown): string[] {
  const str = typeof val === "string" ? val : JSON.stringify(val || []);
  if (!str.trim() || str === "[]") return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* not JSON, treat as comma-separated */ }
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

// ============ FORM TYPES ============

interface AgreementFormData {
  title: string;
  content: string;
  applicableRoles: string;
  applicableDepartments: string;
  version: string;
  isActive: boolean;
  departmentId: string;
}

const emptyForm: AgreementFormData = {
  title: "",
  content: "",
  applicableRoles: "",
  applicableDepartments: "",
  version: "1.0",
  isActive: true,
  departmentId: "",
};

// ============ COMPONENT ============

export function AgreementsPage() {
  const [agreements, setAgreements] = useState<AgreementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<AgreementTemplate | null>(null);
  const [deletingAgreement, setDeletingAgreement] = useState<AgreementTemplate | null>(null);
  const [form, setForm] = useState<AgreementFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [signaturesDialogOpen, setSignaturesDialogOpen] = useState(false);
  const [signaturesAgreement, setSignaturesAgreement] = useState<AgreementTemplate | null>(null);
  const [signatures, setSignatures] = useState<(EmployeeSignature & { employee?: { user: { fullName: string; email: string } } })[]>([]);
  const [signaturesLoading, setSignaturesLoading] = useState(false);
  const [printAgreement, setPrintAgreement] = useState<AgreementTemplate | null>(null);

  const fetchAgreements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<AgreementTemplate[]>("/api/agreements");
      setAgreements(data);
    } catch {
      toast.error("Failed to load agreement templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgreements();
    api.get<Department[]>("/api/departments").then(setDepartments).catch(() => {});
  }, [fetchAgreements]);

  const handleCreate = () => {
    setEditingAgreement(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (agreement: AgreementTemplate) => {
    setEditingAgreement(agreement);
    setForm({
      title: agreement.title,
      content: agreement.content,
      applicableRoles: parseList(agreement.applicableRoles).join(", "),
      applicableDepartments: parseList(agreement.applicableDepartments).join(", "),
      version: agreement.version,
      isActive: agreement.isActive,
      departmentId: (agreement as unknown as Record<string, unknown>).departmentId as string || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Content is required");
      return;
    }
    try {
      setSaving(true);
      if (editingAgreement) {
        await api.put(`/api/agreements/${editingAgreement.id}`, form);
        toast.success("Agreement updated successfully");
      } else {
        await api.post("/api/agreements", form);
        toast.success("Agreement created successfully");
      }
      setDialogOpen(false);
      fetchAgreements();
    } catch {
      toast.error("Failed to save agreement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAgreement) return;
    try {
      await api.delete(`/api/agreements/${deletingAgreement.id}`);
      toast.success("Agreement deleted");
      setDeleteDialogOpen(false);
      setDeletingAgreement(null);
      fetchAgreements();
    } catch {
      toast.error("Failed to delete agreement");
    }
  };

  const handleViewSignatures = async (agreement: AgreementTemplate) => {
    setSignaturesAgreement(agreement);
    setSignaturesDialogOpen(true);
    setSignaturesLoading(true);
    try {
      const data = await api.get<(EmployeeSignature & { employee?: { user: { fullName: string; email: string } } })[]>(`/api/agreements/${agreement.id}/signatures`);
      setSignatures(data || []);
    } catch {
      setSignatures([]);
    } finally {
      setSignaturesLoading(false);
    }
  };

  const handlePrintAgreement = (agreement: AgreementTemplate) => {
    setPrintAgreement(agreement);
    setTimeout(() => window.print(), 100);
  };

  const sigCount = (agreement: AgreementTemplate) =>
    ((agreement as unknown as Record<string, unknown>)._count as { signatures: number } | undefined)?.signatures || 0;

  const deptName = (agreement: AgreementTemplate) =>
    ((agreement as unknown as Record<string, unknown>).department as { name: string } | undefined)?.name || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Agreement Templates</h2>
            <p className="text-sm text-muted-foreground">
              Manage employment agreement and document templates
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="gap-2 w-fit">
          <Plus className="h-4 w-4" />
          Add Agreement
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
          ) : agreements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No agreement templates</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first agreement template
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signatures</TableHead>
                    <TableHead className="hidden sm:table-cell">Roles / Depts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map((agreement) => {
                    const roles = parseList(agreement.applicableRoles);
                    const depts = parseList(agreement.applicableDepartments);
                    return (
                      <TableRow key={agreement.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                            {agreement.title}
                            {deptName(agreement) && (
                              <span className="text-xs text-muted-foreground">{deptName(agreement)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">v{agreement.version}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(agreement.isActive)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            Signatures: {sigCount(agreement)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {roles.map((role) => (
                              <Badge key={role} variant="outline" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                            {depts.map((dept) => (
                              <Badge key={dept} className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                                {dept}
                              </Badge>
                            ))}
                            {roles.length === 0 && depts.length === 0 && (
                              <span className="text-sm text-muted-foreground">Everyone</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewSignatures(agreement)}
                              aria-label="View signatures"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintAgreement(agreement)}
                              aria-label="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(agreement)}
                              aria-label="Edit agreement"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingAgreement(agreement);
                                setDeleteDialogOpen(true);
                              }}
                              aria-label="Delete agreement"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgreement ? "Edit Agreement" : "Create Agreement"}</DialogTitle>
            <DialogDescription>
              {editingAgreement ? "Update the agreement template" : "Create a new agreement template"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agreement-title">Title</Label>
                <Input
                  id="agreement-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Employment Contract"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreement-version">Version</Label>
                <Input
                  id="agreement-version"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  placeholder="1.0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agreement-content">Content</Label>
              <Textarea
                id="agreement-content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Enter the agreement content..."
                className="min-h-[180px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agreement-roles">Applicable Roles (comma-separated)</Label>
                <Input
                  id="agreement-roles"
                  value={form.applicableRoles}
                  onChange={(e) => setForm({ ...form, applicableRoles: e.target.value })}
                  placeholder="employee, manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreement-depts">Applicable Departments (comma-separated)</Label>
                <Input
                  id="agreement-depts"
                  value={form.applicableDepartments}
                  onChange={(e) => setForm({ ...form, applicableDepartments: e.target.value })}
                  placeholder="Engineering, Design"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
              <Label className="cursor-pointer">Active</Label>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={form.departmentId}
                onValueChange={(val) => setForm({ ...form, departmentId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                editingAgreement ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAgreement?.title}&quot;? This action cannot be undone.
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

      {/* View Signatures Dialog */}
      <Dialog open={signaturesDialogOpen} onOpenChange={setSignaturesDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Signatures - {signaturesAgreement?.title}</DialogTitle>
            <DialogDescription>
              {signaturesLoading
                ? "Loading signatures..."
                : `${signatures.length} signature${signatures.length !== 1 ? "s" : ""} recorded`}
            </DialogDescription>
          </DialogHeader>
          {signaturesLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : signatures.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">No signatures recorded yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {signatures.map((sig) => (
                  <div key={sig.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{sig.employee?.user?.fullName || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{sig.employee?.user?.email || ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sig.signedAt), "MMM d, yyyy")}
                      </p>
                      {sig.signatureImageUrl && (
                        <img src={sig.signatureImageUrl} alt="Signature" className="h-6 mt-1 ml-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Print-friendly layout (hidden on screen, shown in print) */}
      {printAgreement && (
        <div className="hidden print:block print:p-8 print:text-black print:bg-white">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">{printAgreement.title}</h1>
            <p className="text-sm text-gray-500 mb-6">Version {printAgreement.version} | Generated on {format(new Date(), "MMMM d, yyyy")}</p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed border-t border-b py-6 my-6">
              {printAgreement.content}
            </div>
            <div className="text-xs text-gray-400 mt-8">
              This document was generated from the Employee Management System.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}