"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Integration } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Webhook, Plus, Pencil, Trash2, Link2, Info, Loader2 } from "lucide-react";
import { format } from "date-fns";

const PROVIDERS = ["slack", "discord", "teams", "google-sheets", "custom"];

const providerColors: Record<string, string> = {
  slack: "bg-[#E01E5A] text-white",
  discord: "bg-[#5865F2] text-white",
  teams: "bg-[#6264A7] text-white",
  "google-sheets": "bg-[#0F9D58] text-white",
  custom: "bg-muted text-muted-foreground",
};

const SETUP_INSTRUCTIONS: Record<string, string> = {
  slack: `1. Go to https://api.slack.com/apps and create a new app
2. Navigate to "Incoming Webhooks" in the left sidebar
3. Click "Add New Webhook to Workspace"
4. Select the channel and copy the Webhook URL
5. Paste the URL in the Webhook URL field above`,
  teams: `1. Go to https://teams.microsoft.com and open the target channel
2. Click the "..." menu > "Connectors"
3. Search for "Incoming Webhook" and add it
4. Name it "EMS Notifications" and copy the generated URL
5. Paste the URL in the Webhook URL field above`,
  discord: `1. Open your Discord server settings
2. Navigate to "Integrations" > "Webhooks"
3. Click "New Webhook"
4. Select the target channel and copy the Webhook URL
5. Paste the URL in the Webhook URL field above`,
  "google-sheets": `1. Open your Google Sheet and go to Extensions > Apps Script
2. Write a doPost(e) function to receive webhook data
3. Deploy as a web app and copy the deployment URL
4. Paste the URL in the Webhook URL field above`,
  custom: `1. Your webhook endpoint should accept POST requests with JSON body
2. The payload format is: { "text": "message", "timestamp": "ISO date", "source": "employee-panel" }
3. Make sure your endpoint returns 200 OK on success`,
};

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [deleting, setDeleting] = useState<Integration | null>(null);
  const [saving, setSaving] = useState(false);

  // Info modal state
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoProvider, setInfoProvider] = useState("slack");

  // Test webhook state
  const [testingId, setTestingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState("slack");
  const [formType, setFormType] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formWebhookUrl, setFormWebhookUrl] = useState("");
  const [formEvents, setFormEvents] = useState("");
  const [formActive, setFormActive] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Integration[]>("/api/integrations");
      setIntegrations(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  function resetForm() {
    setFormName("");
    setFormProvider("slack");
    setFormType("");
    setFormApiKey("");
    setFormWebhookUrl("");
    setFormEvents("");
    setFormActive(true);
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(integ: Integration) {
    setEditing(integ);
    setFormName(integ.name);
    setFormProvider(integ.provider);
    setFormType(integ.type);
    setFormApiKey("");
    setFormWebhookUrl(integ.webhookUrl);
    setFormEvents(integ.events.replace(/^\[|\]$/g, "").replace(/"/g, ""));
    setFormActive(integ.isActive);
    setDialogOpen(true);
  }

  function openInfoModal(provider: string) {
    setInfoProvider(provider);
    setInfoOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Integration name is required");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: formName.trim(),
        provider: formProvider,
        type: formType.trim(),
        webhookUrl: formWebhookUrl.trim(),
        events: formEvents.trim(),
        isActive: formActive,
      };

      if (editing) {
        await api.put(`/api/integrations/${editing.id}`, payload);
        toast.success("Integration updated");
      } else {
        await api.post("/api/integrations", payload);
        toast.success("Integration created");
      }
      setDialogOpen(false);
      fetchIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(integ: Integration) {
    try {
      await api.put(`/api/integrations/${integ.id}`, {
        ...integ,
        isActive: !integ.isActive,
      });
      fetchIntegrations();
    } catch {
      toast.error("Failed to toggle integration");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await api.delete(`/api/integrations/${deleting.id}`);
      toast.success("Integration deleted");
      setDeleteOpen(false);
      setDeleting(null);
      fetchIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleTestWebhook(integ: Integration) {
    if (!integ.webhookUrl) {
      toast.error("No webhook URL configured for this integration");
      return;
    }
    setTestingId(integ.id);
    try {
      const result = await api.post<{ success: boolean; statusCode?: number; error?: string }>(
        "/api/integrations/test-webhook",
        { webhookUrl: integ.webhookUrl, provider: integ.provider }
      );
      if (result.success && result.statusCode) {
        toast.success(`Connection successful! (Status ${result.statusCode})`);
      } else {
        toast.error(`Connection failed: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      toast.error(`Connection failed: ${err instanceof Error ? err.message : "Request error"}`);
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Webhook className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Integrations</h2>
            <p className="text-sm text-muted-foreground">
              Manage webhook integrations
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Webhook className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">
              No integrations configured
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Connect your favorite tools with webhooks
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integ) => (
            <Card key={integ.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-1.5">
                      {integ.name}
                      <button
                        onClick={() => openInfoModal(integ.provider)}
                        className="inline-flex text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        aria-label={`Setup instructions for ${integ.provider}`}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </CardTitle>
                    <div className="flex gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${providerColors[integ.provider] || providerColors.custom}`}
                      >
                        {integ.provider}
                      </Badge>
                      {integ.type && (
                        <Badge variant="outline" className="text-[10px]">
                          {integ.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={integ.isActive}
                    onCheckedChange={() => handleToggle(integ)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {integ.webhookUrl && (
                  <div className="flex items-start gap-2 text-sm">
                    <Link2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground truncate font-mono text-xs">
                      {integ.webhookUrl.length > 40
                        ? integ.webhookUrl.substring(0, 40) + "..."
                        : integ.webhookUrl}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(integ.createdAt), "MMM d, yyyy")}
                </p>
                <div className="flex gap-1">
                  {integ.webhookUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleTestWebhook(integ)}
                      disabled={testingId === integ.id}
                    >
                      {testingId === integ.id ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : null}
                      Test
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(integ)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleting(integ);
                      setDeleteOpen(true);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Integration" : "Add Integration"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Integration name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label>Provider</Label>
                <button
                  onClick={() => openInfoModal(formProvider)}
                  className="inline-flex text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="View setup instructions"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <Select value={formProvider} onValueChange={setFormProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input
                placeholder="e.g. webhook, polling"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Leave blank to keep existing"
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                placeholder="https://..."
                value={formWebhookUrl}
                onChange={(e) => setFormWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Events (comma-separated)</Label>
              <Input
                placeholder="push, pull_request, issues"
                value={formEvents}
                onChange={(e) => setFormEvents(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleting?.name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Setup Info Modal */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Setup Guide —{" "}
              {infoProvider.charAt(0).toUpperCase() +
                infoProvider.slice(1).replace("-", " ")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="bg-muted rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line font-mono">
              {SETUP_INSTRUCTIONS[infoProvider] || SETUP_INSTRUCTIONS.custom}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}