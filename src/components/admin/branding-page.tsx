"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { BrandingSettings } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Palette, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

// ============ HELPERS ============

function parseJsonString<T>(str: string): T[] {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toJsonString(arr: string[]): string {
  return JSON.stringify(arr);
}

function parseJsonObject<T extends Record<string, string>>(str: string): T {
  try {
    return JSON.parse(str);
  } catch {
    return {} as T;
  }
}

function toJsonObject(obj: Record<string, string>): string {
  return JSON.stringify(obj);
}

// ============ FORM STATE ============

interface BrandingFormState {
  logoUrls: string[];
  officeLocations: { address: string; lat: string; lng: string }[];
  contactEmails: string[];
  contactPhones: string[];
  socialMedia: { facebook: string; twitter: string; linkedin: string };
  primaryColor: string;
  secondaryColor: string;
}

const defaultForm: BrandingFormState = {
  logoUrls: [""],
  officeLocations: [{ address: "", lat: "", lng: "" }],
  contactEmails: [""],
  contactPhones: [""],
  socialMedia: { facebook: "", twitter: "", linkedin: "" },
  primaryColor: "#E0197A",
  secondaryColor: "#7B2FBE",
};

// ============ COMPONENT ============

export function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandingId, setBrandingId] = useState<string>("");
  const [form, setForm] = useState<BrandingFormState>(defaultForm);

  const fetchBranding = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<BrandingSettings>("/api/branding");
      setBrandingId(data.id);
      setForm({
        logoUrls: parseJsonString<string>(data.logoUrls).length > 0 ? parseJsonString<string>(data.logoUrls) : [""],
        officeLocations: parseJsonString(data.officeLocations).length > 0
          ? parseJsonString(data.officeLocations)
          : [{ address: "", lat: "", lng: "" }],
        contactEmails: parseJsonString<string>(data.contactEmails).length > 0
          ? parseJsonString<string>(data.contactEmails)
          : [""],
        contactPhones: parseJsonString<string>(data.contactPhones).length > 0
          ? parseJsonString<string>(data.contactPhones)
          : [""],
        socialMedia: parseJsonObject<{ facebook: string; twitter: string; linkedin: string }>(data.socialMediaLinks),
        primaryColor: data.primaryColor || "#E0197A",
        secondaryColor: data.secondaryColor || "#7B2FBE",
      });
    } catch {
      toast.error("Failed to load branding settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        logoUrls: toJsonString(form.logoUrls.filter((u) => u.trim())),
        officeLocations: toJsonString(form.officeLocations.filter((l) => l.address.trim())),
        contactEmails: toJsonString(form.contactEmails.filter((e) => e.trim())),
        contactPhones: toJsonString(form.contactPhones.filter((p) => p.trim())),
        socialMediaLinks: toJsonObject(form.socialMedia),
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
      };
      if (brandingId) {
        await api.put("/api/branding", payload);
      } else {
        await api.post("/api/branding", payload);
      }
      toast.success("Branding settings saved successfully");
    } catch {
      toast.error("Failed to save branding settings");
    } finally {
      setSaving(false);
    }
  };

  // List update helpers
  const updateListItem = (field: "logoUrls" | "contactEmails" | "contactPhones", index: number, value: string) => {
    const updated = [...form[field]];
    updated[index] = value;
    setForm({ ...form, [field]: updated });
  };

  const addListItem = (field: "logoUrls" | "contactEmails" | "contactPhones") => {
    setForm({ ...form, [field]: [...form[field], ""] });
  };

  const removeListItem = (field: "logoUrls" | "contactEmails" | "contactPhones", index: number) => {
    const updated = form[field].filter((_, i) => i !== index);
    if (updated.length === 0) updated.push("");
    setForm({ ...form, [field]: updated });
  };

  // Office location helpers
  const updateLocation = (index: number, key: "address" | "lat" | "lng", value: string) => {
    const updated = [...form.officeLocations];
    updated[index] = { ...updated[index], [key]: value };
    setForm({ ...form, officeLocations: updated });
  };

  const addLocation = () => {
    setForm({
      ...form,
      officeLocations: [...form.officeLocations, { address: "", lat: "", lng: "" }],
    });
  };

  const removeLocation = (index: number) => {
    const updated = form.officeLocations.filter((_, i) => i !== index);
    if (updated.length === 0) updated.push({ address: "", lat: "", lng: "" });
    setForm({ ...form, officeLocations: updated });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Branding Settings</h2>
            <p className="text-sm text-muted-foreground">
              Customize your organization&apos;s branding and appearance
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 w-fit">
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Logo URLs */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold mb-3">Logo URLs</h3>
          <div className="space-y-2">
            {form.logoUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={url}
                  onChange={(e) => updateListItem("logoUrls", idx, e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="flex-1"
                />
                {form.logoUrls.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeListItem("logoUrls", idx)}
                    aria-label="Remove logo URL"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => addListItem("logoUrls")}
              className="gap-1"
            >
              <Plus className="h-3 w-3" /> Add Logo URL
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold mb-3">Colors</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primary-color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-10 rounded cursor-pointer border border-input"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  placeholder="#E0197A"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="secondary-color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="h-10 w-10 rounded cursor-pointer border border-input"
                />
                <Input
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  placeholder="#7B2FBE"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Office Locations */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold mb-3">Office Locations</h3>
          <div className="space-y-4">
            {form.officeLocations.map((loc, idx) => (
              <div key={idx} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Location {idx + 1}</span>
                  {form.officeLocations.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLocation(idx)}
                      className="h-7 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input
                  value={loc.address}
                  onChange={(e) => updateLocation(idx, "address", e.target.value)}
                  placeholder="Address"
                  className="mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={loc.lat}
                    onChange={(e) => updateLocation(idx, "lat", e.target.value)}
                    placeholder="Latitude"
                    type="number"
                    step="any"
                  />
                  <Input
                    value={loc.lng}
                    onChange={(e) => updateLocation(idx, "lng", e.target.value)}
                    placeholder="Longitude"
                    type="number"
                    step="any"
                  />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addLocation}
              className="gap-1"
            >
              <Plus className="h-3 w-3" /> Add Location
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold mb-3">Contact Emails</h3>
            <div className="space-y-2">
              {form.contactEmails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={email}
                    onChange={(e) => updateListItem("contactEmails", idx, e.target.value)}
                    placeholder="contact@company.com"
                    type="email"
                    className="flex-1"
                  />
                  {form.contactEmails.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeListItem("contactEmails", idx)}
                      aria-label="Remove email"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addListItem("contactEmails")}
                className="gap-1"
              >
                <Plus className="h-3 w-3" /> Add Email
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold mb-3">Contact Phones</h3>
            <div className="space-y-2">
              {form.contactPhones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={phone}
                    onChange={(e) => updateListItem("contactPhones", idx, e.target.value)}
                    placeholder="+1 234 567 8900"
                    type="tel"
                    className="flex-1"
                  />
                  {form.contactPhones.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeListItem("contactPhones", idx)}
                      aria-label="Remove phone"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addListItem("contactPhones")}
                className="gap-1"
              >
                <Plus className="h-3 w-3" /> Add Phone
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Media */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold mb-3">Social Media</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="social-facebook">Facebook</Label>
              <Input
                id="social-facebook"
                value={form.socialMedia.facebook}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, facebook: e.target.value } })
                }
                placeholder="https://facebook.com/company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-twitter">Twitter</Label>
              <Input
                id="social-twitter"
                value={form.socialMedia.twitter}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, twitter: e.target.value } })
                }
                placeholder="https://twitter.com/company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-linkedin">LinkedIn</Label>
              <Input
                id="social-linkedin"
                value={form.socialMedia.linkedin}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, linkedin: e.target.value } })
                }
                placeholder="https://linkedin.com/company"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}