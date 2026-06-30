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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Store, Save, Plus, MapPin, Phone, Tag, FileText, UserCircle } from "lucide-react";
import { EmployeeSearchDropdown } from "@/components/shared/employee-search-dropdown";

// ============ HELPERS ============

interface BusinessEntry {
  id: string;
  data: BusinessData;
  assignedEmployeeId: string;
  assignedDepartment: string;
  savedAt: string;
}

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

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // split by comma
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toJsonString(value: string): string {
  if (!value.trim()) return "[]";
  const items = value.split(",").map((s) => s.trim()).filter(Boolean);
  return JSON.stringify(items);
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

const STORAGE_KEY = "ems_business_entries";

function loadEntries(): BusinessEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: BusinessEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ============ COMPONENT ============

export function BusinessDataPage() {
  const [data, setData] = useState<BusinessData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<BusinessEntry[]>([]);

  // Assignment fields
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [assignedDepartment, setAssignedDepartment] = useState("");

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

  // Initialize
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      // Load saved entries from localStorage
      const stored = loadEntries();
      setEntries(stored);

      // Load current business data from API
      const result = await api.get<BusinessData>("/api/business-data");
      if (result && result.id) {
        setData(result);

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
    initialize();
  }, [initialize]);

  function updateField(field: keyof BusinessData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setData({ ...defaultData });
    setSocialFields({ facebook: "", instagram: "", tiktok: "", pinterest: "", youtube: "", linkedin: "", blog: "" });
    setWorkFields({ dailyCalls: "", dailyCustomers: "", focusAreas: "" });
    setAssignedEmployeeId("");
    setAssignedDepartment("");
  }

  async function handleSave() {
    if (!data.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
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

      const saved = await api.put<BusinessData>("/api/business-data", payload);

      // Add to entries list
      const newEntry: BusinessEntry = {
        id: saved.id || crypto.randomUUID(),
        data: { ...payload, id: saved.id || "", createdAt: saved.createdAt, updatedAt: saved.updatedAt },
        assignedEmployeeId,
        assignedDepartment,
        savedAt: new Date().toISOString(),
      };

      const updatedEntries = [newEntry, ...entries];
      setEntries(updatedEntries);
      saveEntries(updatedEntries);

      toast.success("Business data saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleAddNew() {
    resetForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("Form reset — fill in a new business entry");
  }

  function handleDeleteEntry(index: number) {
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated);
    saveEntries(updated);
    toast.success("Entry removed from list");
  }

  // ============ RENDER ============

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add Business Data
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Assignment Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Assign to Employee</Label>
            <EmployeeSearchDropdown
              value={assignedEmployeeId}
              onChange={setAssignedEmployeeId}
              placeholder="Search and select an employee..."
            />
          </div>
          <div className="space-y-2">
            <Label>Assign to Department</Label>
            <Input
              value={assignedDepartment}
              onChange={(e) => setAssignedDepartment(e.target.value)}
              placeholder="e.g., Marketing, Engineering"
            />
          </div>
        </CardContent>
      </Card>

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
      <div className="flex flex-col sm:flex-row justify-end gap-2 pb-4">
        <Button variant="outline" onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Business Data
        </Button>
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      {/* Saved Entries */}
      {entries.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Saved Business Entries ({entries.length})
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry, index) => {
                const services = parseJsonArray(entry.data.services);
                return (
                  <Card key={entry.id + "-" + index} className="relative group">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base truncate pr-8">
                        {entry.data.businessName || "Untitled Business"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {entry.data.address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">
                            {entry.data.address}
                            {entry.data.city ? `, ${entry.data.city}` : ""}
                          </span>
                        </div>
                      )}

                      {entry.data.contactNumber && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{entry.data.contactNumber}</span>
                        </div>
                      )}

                      {services.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <Tag className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {services.slice(0, 5).map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                            {services.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{services.length - 5}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {entry.data.shortDescription && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {entry.data.shortDescription}
                        </p>
                      )}

                      {(entry.assignedEmployeeId || entry.assignedDepartment) && (
                        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                          {entry.assignedDepartment && (
                            <p>Dept: <span className="font-medium text-foreground">{entry.assignedDepartment}</span></p>
                          )}
                          {entry.assignedEmployeeId && (
                            <p>Employee: <span className="font-medium text-foreground">{entry.assignedEmployeeId}</span></p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] text-muted-foreground">
                          Saved {new Date(entry.savedAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteEntry(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}