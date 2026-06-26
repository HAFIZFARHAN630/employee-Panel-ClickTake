"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AIModelConfig } from "@/lib/types";
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
import { Plus, Pencil, Trash2, Brain, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// ============ HELPERS ============

function getProviderBadge(provider: string) {
  switch (provider) {
    case "openai":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">OpenAI</Badge>;
    case "gemini":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Gemini</Badge>;
    default:
      return <Badge variant="secondary">{provider}</Badge>;
  }
}

// ============ FORM TYPES ============

interface AIConfigFormData {
  modelName: string;
  provider: string;
  purpose: string;
  apiKey: string;
  isActive: boolean;
}

const emptyForm: AIConfigFormData = {
  modelName: "",
  provider: "openai",
  purpose: "",
  apiKey: "",
  isActive: true,
};

// ============ COMPONENT ============

export function AIConfigPage() {
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIModelConfig | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<AIModelConfig | null>(null);
  const [form, setForm] = useState<AIConfigFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<AIModelConfig[]>("/api/ai-models");
      setConfigs(data);
    } catch {
      toast.error("Failed to load AI model configurations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleCreate = () => {
    setEditingConfig(null);
    setForm(emptyForm);
    setShowApiKey(false);
    setDialogOpen(true);
  };

  const handleEdit = (config: AIModelConfig) => {
    setEditingConfig(config);
    setForm({
      modelName: config.modelName,
      provider: config.provider,
      purpose: config.purpose,
      apiKey: config.apiKey,
      isActive: config.isActive,
    });
    setShowApiKey(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.modelName.trim()) {
      toast.error("Model name is required");
      return;
    }
    if (!form.apiKey.trim()) {
      toast.error("API key is required");
      return;
    }
    try {
      setSaving(true);
      if (editingConfig) {
        await api.put(`/api/ai-models/${editingConfig.id}`, form);
        toast.success("AI model config updated");
      } else {
        await api.post("/api/ai-models", form);
        toast.success("AI model config created");
      }
      setDialogOpen(false);
      fetchConfigs();
    } catch {
      toast.error("Failed to save AI model config");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingConfig) return;
    try {
      await api.delete(`/api/ai-models/${deletingConfig.id}`);
      toast.success("AI model config deleted");
      setDeleteDialogOpen(false);
      setDeletingConfig(null);
      fetchConfigs();
    } catch {
      toast.error("Failed to delete AI model config");
    }
  };

  const handleToggleActive = async (config: AIModelConfig) => {
    try {
      await api.patch(`/api/ai-models/${config.id}`, { isActive: !config.isActive });
      toast.success(config.isActive ? "Model deactivated" : "Model activated");
      fetchConfigs();
    } catch {
      toast.error("Failed to update model status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">AI Model Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Configure AI models for your organization
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="gap-2 w-fit">
          <Plus className="h-4 w-4" />
          Add Model
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Brain className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No AI models configured</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first AI model to get started
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="hidden sm:table-cell">Purpose</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.modelName}</TableCell>
                      <TableCell>{getProviderBadge(config.provider)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {config.purpose || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={config.isActive}
                          onCheckedChange={() => handleToggleActive(config)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(config)}
                            aria-label="Edit config"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingConfig(config);
                              setDeleteDialogOpen(true);
                            }}
                            aria-label="Delete config"
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
            <DialogTitle>{editingConfig ? "Edit AI Model" : "Add AI Model"}</DialogTitle>
            <DialogDescription>
              {editingConfig ? "Update model configuration" : "Configure a new AI model"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={form.modelName}
                onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                placeholder="e.g., gpt-4o"
              />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(val) => setForm({ ...form, provider: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-purpose">Purpose</Label>
              <Input
                id="model-purpose"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g., HR assistant, code review"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="model-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
              <Label className="cursor-pointer">Active</Label>
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
                editingConfig ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Model Config</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{deletingConfig?.modelName}&quot; model? This action cannot be undone.
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