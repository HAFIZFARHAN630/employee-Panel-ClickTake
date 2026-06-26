"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { BusinessData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Store, Save } from "lucide-react";

function parseJsonField(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join(", ");
    if (typeof parsed === "object") return JSON.stringify(parsed, null, 2);
    return String(parsed);
  } catch {
    return value;
  }
}

function toJsonString(value: string): string {
  if (!value.trim()) return "[]";
  const items = value.split(",").map((s) => s.trim()).filter(Boolean);
  return JSON.stringify(items);
}

function toJsonObjectString(value: string, existing: string): string {
  if (!value.trim() && !existing.trim()) return "{}";
  try {
    const obj = JSON.parse(existing);
    return JSON.stringify(obj);
  } catch {
    return "{}";
  }
}

const defaultData: BusinessData = {
  id: "",
  businessName: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
  contactNumber: "",
  email: "",
  website: "",
  googleMapLink: "",
  gmbProfileLink: "",
  openingHours: "",
  socialMedia: "{}",
  services: "[]",
  targetAreas: "[]",
  shortDescription: "",
  longDescription: "",
  workTargets: "{}",
  hashtags: "[]",
  seoKeywords: "[]",
  createdAt: "",
  updatedAt: "",
};

export function BusinessDataPage() {
  const [data, setData] = useState<BusinessData>(defaultData);
  const [rawData, setRawData] = useState<BusinessData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Social media individual fields
  const [socialFields, setSocialFields] = useState({
    facebook: "",
    instagram: "",
    tiktok: "",
    pinterest: "",
    youtube: "",
    linkedin: "",
    blog: "",
  });

  // Work targets individual fields
  const [workFields, setWorkFields] = useState({
    dailyCalls: "",
    dailyCustomers: "",
    focusAreas: "",
  });

  const fetchBusinessData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.get<BusinessData>("/api/business-data");
      if (result && result.id) {
        setRawData(result);
        setData(result);

        // Parse social media JSON
        try {
          const social = JSON.parse(result.socialMedia);
          setSocialFields({
            facebook: social.facebook || "",
            instagram: social.instagram || "",
            tiktok: social.tiktok || "",
            pinterest: social.pinterest || "",
            youtube: social.youtube || "",
            linkedin: social.linkedin || "",
            blog: social.blog || "",
          });
        } catch {
          // keep defaults
        }

        // Parse work targets JSON
        try {
          const wt = JSON.parse(result.workTargets);
          setWorkFields({
            dailyCalls: wt.dailyCalls || "",
            dailyCustomers: wt.dailyCustomers || "",
            focusAreas: wt.focusAreas || "",
          });
        } catch {
          // keep defaults
        }
      }
    } catch {
      toast.error("Failed to load business data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinessData();
  }, [fetchBusinessData]);

  function updateField(field: keyof BusinessData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    try {
      setSaving(true);

      const socialObj = { ...socialFields };
      const wtObj = {
        dailyCalls: workFields.dailyCalls,
        dailyCustomers: workFields.dailyCustomers,
        focusAreas: workFields.focusAreas,
      };

      const payload = {
        ...data,
        socialMedia: JSON.stringify(socialObj),
        workTargets: JSON.stringify(wtObj),
      };

      await api.put("/api/business-data", payload);
      toast.success("Business data saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Business Data</h2>
            <p className="text-sm text-muted-foreground">
              Manage business information and SEO settings
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Business Name</Label>
            <Input
              value={data.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              placeholder="Your business name"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea
              value={data.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Full business address"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={data.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="City"
            />
          </div>
          <div className="space-y-2">
            <Label>Postal Code</Label>
            <Input
              value={data.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              placeholder="Postal code"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Country</Label>
            <Input
              value={data.country}
              onChange={(e) => updateField("country", e.target.value)}
              placeholder="Country"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input
              value={data.contactNumber}
              onChange={(e) => updateField("contactNumber", e.target.value)}
              placeholder="+1 234 567 890"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="contact@business.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={data.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://yourbusiness.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Online Presence */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Online Presence</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Google Map Link</Label>
            <Input
              value={data.googleMapLink}
              onChange={(e) => updateField("googleMapLink", e.target.value)}
              placeholder="https://maps.google.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label>GMB Profile Link</Label>
            <Input
              value={data.gmbProfileLink}
              onChange={(e) => updateField("gmbProfileLink", e.target.value)}
              placeholder="https://g.page/..."
            />
          </div>
          <div className="space-y-2">
            <Label>Opening Hours</Label>
            <Input
              value={data.openingHours}
              onChange={(e) => updateField("openingHours", e.target.value)}
              placeholder="Mon-Fri 9:00 AM - 5:00 PM, Sat 10:00 AM - 2:00 PM"
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Social Media</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {Object.entries(socialFields).map(([key, val]) => (
            <div key={key} className="space-y-2">
              <Label className="capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
              <Input
                value={val}
                onChange={(e) =>
                  setSocialFields((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={`https://${key}.com/...`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Services & Target Areas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Services & Target Areas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Services (comma-separated)</Label>
            <Input
              value={parseJsonField(data.services)}
              onChange={(e) => updateField("services", toJsonString(e.target.value))}
              placeholder="Web Design, SEO, Social Media Marketing"
            />
          </div>
          <div className="space-y-2">
            <Label>Target Areas (comma-separated)</Label>
            <Input
              value={parseJsonField(data.targetAreas)}
              onChange={(e) => updateField("targetAreas", toJsonString(e.target.value))}
              placeholder="New York, Los Angeles, Chicago"
            />
          </div>
        </CardContent>
      </Card>

      {/* Descriptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Short Description</Label>
            <Textarea
              value={data.shortDescription}
              onChange={(e) => updateField("shortDescription", e.target.value)}
              placeholder="A brief summary of your business (1-2 sentences)"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Long Description</Label>
            <Textarea
              value={data.longDescription}
              onChange={(e) => updateField("longDescription", e.target.value)}
              placeholder="Detailed description of your business, mission, and values"
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Work Targets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Work Targets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Daily Calls</Label>
            <Input
              value={workFields.dailyCalls}
              onChange={(e) =>
                setWorkFields((prev) => ({ ...prev, dailyCalls: e.target.value }))
              }
              placeholder="50"
            />
          </div>
          <div className="space-y-2">
            <Label>Daily Customers</Label>
            <Input
              value={workFields.dailyCustomers}
              onChange={(e) =>
                setWorkFields((prev) => ({
                  ...prev,
                  dailyCustomers: e.target.value,
                }))
              }
              placeholder="10"
            />
          </div>
          <div className="space-y-2">
            <Label>Focus Areas (comma-separated)</Label>
            <Input
              value={workFields.focusAreas}
              onChange={(e) =>
                setWorkFields((prev) => ({ ...prev, focusAreas: e.target.value }))
              }
              placeholder="Leads, Conversions, Retention"
            />
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Hashtags (comma-separated)</Label>
            <Input
              value={parseJsonField(data.hashtags)}
              onChange={(e) => updateField("hashtags", toJsonString(e.target.value))}
              placeholder="#business, #services, #local"
            />
          </div>
          <div className="space-y-2">
            <Label>Keywords (comma-separated)</Label>
            <Input
              value={parseJsonField(data.seoKeywords)}
              onChange={(e) => updateField("seoKeywords", toJsonString(e.target.value))}
              placeholder="web design, seo agency, digital marketing"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button (bottom) */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}