"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, User, Bell, Monitor, Info } from "lucide-react";
import { toast } from "sonner";

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile settings
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.individualUser?.phoneNumber ?? "");
  const [address, setAddress] = useState(user?.individualUser?.address ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Notification preferences (client-side only)
  const [notifPrefs, setNotifPrefs] = useState({
    taskUpdates: true,
    leaveStatus: true,
    projectUpdates: true,
    announcements: true,
    systemAlerts: false,
  });

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      await api.put(`/api/users/${user.id}`, {
        fullName,
        phoneNumber: phone,
        address,
      });
      toast.success("Profile settings saved");
      await refreshUser();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Profile Settings</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Full Name</Label>
            <Input
              id="settings-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-phone">Phone Number</Label>
            <Input
              id="settings-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-address">Address</Label>
            <Input
              id="settings-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button
            size="sm"
            onClick={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? "Saving..." : "Save Changes"}
            <Save className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>Choose which notifications you receive</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "taskUpdates" as const,
              label: "Task Updates",
              desc: "Get notified when tasks are assigned or updated",
            },
            {
              key: "leaveStatus" as const,
              label: "Leave Status",
              desc: "Notifications about your leave request status",
            },
            {
              key: "projectUpdates" as const,
              label: "Project Updates",
              desc: "Updates about project assignments and progress",
            },
            {
              key: "announcements" as const,
              label: "Announcements",
              desc: "Company-wide announcements and news",
            },
            {
              key: "systemAlerts" as const,
              label: "System Alerts",
              desc: "System maintenance and important alerts",
            },
          ].map((item, idx) => (
            <React.Fragment key={item.key}>
              {idx > 0 && <Separator />}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={notifPrefs[item.key]}
                  onCheckedChange={(checked) =>
                    setNotifPrefs((prev) => ({ ...prev, [item.key]: checked }))
                  }
                />
              </div>
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Display Settings</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
            <Select
              value={theme ?? "system"}
              onValueChange={(v) => setTheme(v)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Language</p>
              <p className="text-xs text-muted-foreground">
                Select your preferred language
              </p>
            </div>
            <Select defaultValue="en" disabled>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">About</CardTitle>
              <CardDescription>Application information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Application</span>
              <span className="font-medium">Employee Management System</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment</span>
              <span className="font-medium">Production</span>
            </div>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} Employee Management System. All rights
              reserved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}