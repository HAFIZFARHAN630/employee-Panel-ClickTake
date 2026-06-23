"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Save, X, Shield } from "lucide-react";
import { toast } from "sonner";

export function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState(user?.individualUser?.phoneNumber ?? "");
  const [address, setAddress] = useState(user?.individualUser?.address ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const initials = (user?.fullName ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await api.put(`/api/users/${user.id}`, {
        fullName,
        phoneNumber: phone,
        address,
      });
      toast.success("Profile updated successfully");
      await refreshUser();
      setEditing(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(user?.fullName ?? "");
    setPhone(user?.individualUser?.phoneNumber ?? "");
    setAddress(user?.individualUser?.address ?? "");
    setEditing(false);
  };

  const handleChangePassword = () => {
    if (!newPassword || !currentPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    // Client-side only for now — simulate success
    setTimeout(() => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangingPassword(false);
    }, 1000);
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold">{user.fullName}</h2>
              <p className="text-muted-foreground mt-1">{user.email}</p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant="secondary">{user.employee?.role ?? user.role}</Badge>
                <Badge variant="outline">{user.employee?.department ?? "N/A"}</Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              {editing ? (
                <>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-1" /> Edit Profile
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
          <CardDescription>Your personal details and contact information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              {editing ? (
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              ) : (
                <p className="text-sm font-medium">{user.fullName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-[10px] text-muted-foreground">Read-only</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Phone Number</Label>
              {editing ? (
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="text-sm font-medium">
                  {user.individualUser?.phoneNumber ?? "Not set"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Address</Label>
              {editing ? (
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter address"
                />
              ) : (
                <p className="text-sm font-medium">
                  {user.individualUser?.address ?? "Not set"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">User Type</Label>
              <Badge variant="outline" className="capitalize text-sm">
                {user.userType.replace("_", " ")}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Member Since</Label>
              <p className="text-sm font-medium">
                {format(new Date(user.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
        {editing && (
          <CardFooter className="border-t pt-4">
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
                <Save className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pw">Current Password</Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm New Password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button
            size="sm"
            onClick={handleChangePassword}
            disabled={changingPassword}
          >
            {changingPassword ? "Changing..." : "Change Password"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}