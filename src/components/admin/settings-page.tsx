"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { SessionSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
  Settings,
  Clock,
  Building2,
  Bell,
  Download,
  RotateCcw,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Kolkata", label: "Kolkata (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (EU)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
];

export function SettingsPage() {
  // Session settings (from API)
  const [sessionSettings, setSessionSettings] = useState<SessionSettings | null>(null);
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [warningMinutes, setWarningMinutes] = useState(5);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionSaving, setSessionSaving] = useState(false);

  // General settings (client-side only)
  const [companyName, setCompanyName] = useState("My Organization");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");

  // Notification settings (client-side only)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);

  // General/Notification saving
  const [generalSaving, setGeneralSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  // Danger zone
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchSettings = async () => {
    try {
      setSessionLoading(true);
      const data = await api.get<SessionSettings>("/api/settings");
      setSessionSettings(data);
      setTimeoutMinutes(data.timeTrackingTimeoutMinutes);
      setWarningMinutes(data.timeTrackingWarningMinutes);
    } catch {
      // Use defaults if settings endpoint fails
      setTimeoutMinutes(30);
      setWarningMinutes(5);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSessionSettings = async () => {
    try {
      setSessionSaving(true);
      await api.put("/api/settings", {
        timeTrackingTimeoutMinutes: timeoutMinutes,
        timeTrackingWarningMinutes: warningMinutes,
      });
      toast.success("Session settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSessionSaving(false);
    }
  };

  const saveGeneralSettings = async () => {
    try {
      setGeneralSaving(true);
      await api.put("/api/settings", {
        companyName,
        timezone,
        dateFormat,
        emailNotifs,
        pushNotifs,
        inAppNotifs,
      });
      toast.success("General settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setGeneralSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      setNotifSaving(true);
      await api.put("/api/settings", {
        companyName,
        timezone,
        dateFormat,
        emailNotifs,
        pushNotifs,
        inAppNotifs,
      });
      toast.success("Notification settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setNotifSaving(false);
    }
  };

  const handleResetAll = async () => {
    try {
      setResetting(true);
      await api.post("/api/settings/reset-all");
      toast.success("All data has been reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset data");
    } finally {
      setResetting(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const data = await api.get<{ data: string }>("/api/settings/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ems-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure system preferences and session parameters
        </p>
      </div>

      {/* Session Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Session Settings</CardTitle>
          </div>
          <CardDescription>
            Configure time tracking session timeout and warning thresholds
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {sessionLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeout">
                  Time Tracking Timeout
                  <span className="text-muted-foreground font-normal"> (minutes)</span>
                </Label>
                <Input
                  id="timeout"
                  type="number"
                  min={1}
                  max={480}
                  value={timeoutMinutes}
                  onChange={(e) =>
                    setTimeoutMinutes(parseInt(e.target.value, 10) || 0)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Auto-stop timer after inactivity
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warning">
                  Time Tracking Warning
                  <span className="text-muted-foreground font-normal"> (minutes)</span>
                </Label>
                <Input
                  id="warning"
                  type="number"
                  min={1}
                  max={120}
                  value={warningMinutes}
                  onChange={(e) =>
                    setWarningMinutes(parseInt(e.target.value, 10) || 0)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Show warning before timeout
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <Separator />
        <CardFooter className="justify-end pt-4">
          <Button onClick={saveSessionSettings} disabled={sessionSaving || sessionLoading}>
            <Save className="h-4 w-4 mr-2" />
            {sessionSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      {/* General Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">General Settings</CardTitle>
          </div>
          <CardDescription>
            Basic organization and display preferences
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Default Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-format">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger id="date-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((df) => (
                    <SelectItem key={df.value} value={df.value}>
                      {df.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="justify-end pt-4">
          <Button onClick={saveGeneralSettings} disabled={generalSaving}>
            {generalSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {generalSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      {/* Notification Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Notification Settings</CardTitle>
          </div>
          <CardDescription>
            Control how notifications are delivered to users
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifs" className="cursor-pointer">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send notification emails to users
              </p>
            </div>
            <Switch
              id="email-notifs"
              checked={emailNotifs}
              onCheckedChange={setEmailNotifs}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifs" className="cursor-pointer">Push Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send browser push notifications
              </p>
            </div>
            <Switch
              id="push-notifs"
              checked={pushNotifs}
              onCheckedChange={setPushNotifs}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="inapp-notifs" className="cursor-pointer">In-App Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show notifications within the application
              </p>
            </div>
            <Switch
              id="inapp-notifs"
              checked={inAppNotifs}
              onCheckedChange={setInAppNotifs}
            />
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="justify-end pt-4">
          <Button onClick={saveNotificationSettings} disabled={notifSaving}>
            {notifSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {notifSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      {/* Danger Zone Card */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <Separator className="bg-destructive/20" />
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download all system data as a JSON file
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={exporting}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Exporting..." : "Export Data"}
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Reset All Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete all data from the system. This cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={resetting}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {resetting ? "Resetting..." : "Reset All Data"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all data from the system,
                    including users, projects, attendance records, leaves, and all
                    other information. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}