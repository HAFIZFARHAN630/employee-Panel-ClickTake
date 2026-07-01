"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { BrandingSettings } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Palette, Plus, Trash2, Save, Upload, Loader2, ImageOff } from "lucide-react";
import { toast } from "sonner";

// ============ HELPERS ============

function parseJsonString<T>(str: string | unknown): T[] {
  if (!str) return [];
  if (Array.isArray(str)) return str as T[];
  try {
    const parsed = JSON.parse(str as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T extends Record<string, string>>(str: string | unknown): T {
  if (!str) return {} as T;
  if (typeof str === "object" && str !== null && !Array.isArray(str)) return str as T;
  try {
    return JSON.parse(str as string);
  } catch {
    return {} as T;
  }
}

// ============ FORM STATE ============

interface BrandingFormState {
  companyName: string;
  tagline: string;
  logoUrls: string[];
  faviconUrl: string;
  officeLocations: { address: string; lat: string; lng: string }[];
  contactEmails: string[];
  contactPhones: string[];
  socialMedia: { facebook: string; twitter: string; linkedin: string; instagram: string; youtube: string; github: string; tiktokUrl: string; pinterestUrl: string; youtubeUrl: string; linkedinCompanyUrl: string; blogUrl: string };
  primaryColor: string;
  secondaryColor: string;
}

const defaultForm: BrandingFormState = {
  companyName: "",
  tagline: "",
  logoUrls: [""],
  faviconUrl: "",
  officeLocations: [{ address: "", lat: "", lng: "" }],
  contactEmails: [""],
  contactPhones: [""],
  socialMedia: { facebook: "", twitter: "", linkedin: "", instagram: "", youtube: "", github: "", tiktokUrl: "", pinterestUrl: "", youtubeUrl: "", linkedinCompanyUrl: "", blogUrl: "" },
  primaryColor: "#E0197A",
  secondaryColor: "#7B2FBE",
};

// ============ COMPONENT ============

export function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandingId, setBrandingId] = useState<string>("");
  const [form, setForm] = useState<BrandingFormState>(defaultForm);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogoIdx, setUploadingLogoIdx] = useState<number | null>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const fetchBranding = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<BrandingSettings>("/api/branding");
      setBrandingId(data.id);
      setForm({
        companyName: data.companyName || "",
        tagline: data.tagline || "",
        logoUrls: parseJsonString<string>(data.logoUrls).length > 0 ? parseJsonString<string>(data.logoUrls) : [""],
        faviconUrl: (data as Record<string, string>).faviconUrl || "",
        officeLocations: parseJsonString(data.officeLocations).length > 0
          ? parseJsonString(data.officeLocations)
          : [{ address: "", lat: "", lng: "" }],
        contactEmails: parseJsonString<string>(data.contactEmails).length > 0
          ? parseJsonString<string>(data.contactEmails)
          : [""],
        contactPhones: parseJsonString<string>(data.contactPhones).length > 0
          ? parseJsonString<string>(data.contactPhones)
          : [""],
        socialMedia: { facebook: "", twitter: "", linkedin: "", instagram: "", youtube: "", github: "", tiktokUrl: "", pinterestUrl: "", youtubeUrl: "", linkedinCompanyUrl: "", blogUrl: "", ...parseJsonObject<Record<string, string>>(data.socialMediaLinks) },
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
        companyName: form.companyName.trim(),
        tagline: form.tagline.trim(),
        logoUrls: form.logoUrls.filter((u) => u.trim()),
        officeLocations: form.officeLocations.filter((l) => l.address.trim()),
        contactEmails: form.contactEmails.filter((e) => e.trim()),
        contactPhones: form.contactPhones.filter((p) => p.trim()),
        socialMediaLinks: form.socialMedia,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        faviconUrl: form.faviconUrl.trim(),
      };
      const result = await api.put<BrandingSettings>("/api/branding", payload);
      if (result?.id) {
        setBrandingId(result.id);
      }
      toast.success("Branding settings saved successfully");

      // Live-update the browser favicon
      const newUrl = form.faviconUrl.trim();
      if (newUrl) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
          link.href = newUrl;
        } else {
          const newLink = document.createElement("link");
          newLink.rel = "icon";
          newLink.href = newUrl;
          document.head.appendChild(newLink);
        }
      }

      fetchBranding();
    } catch {
      toast.error("Failed to save branding settings");
    } finally {
      setSaving(false);
    }
  };

  // ============ FILE UPLOAD HELPERS ============

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 512 * 1024) {
      toast.error("Favicon must be less than 512KB");
      return;
    }

    const validTypes = ["image/x-icon", "image/png", "image/svg+xml", "image/gif"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".ico") && !file.name.endsWith(".png") && !file.name.endsWith(".svg")) {
      toast.error("Please upload an .ico, .png, or .svg file");
      return;
    }

    setUploadingFavicon(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await api.post<{ url: string }>("/api/upload", {
        file: base64,
        folder: "ems/favicons",
      });
      setForm((prev) => ({ ...prev, faviconUrl: result.url }));
      toast.success("Favicon uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload favicon");
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    const validTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PNG, JPG, SVG, or WebP image");
      return;
    }

    setUploadingLogoIdx(-1); // -1 means uploading for "add new"
    try {
      const base64 = await fileToBase64(file);
      const result = await api.post<{ url: string }>("/api/upload", {
        file: base64,
        folder: "ems/logos",
      });
      // Add as a new logo URL
      setForm((prev) => ({
        ...prev,
        logoUrls: [...prev.logoUrls, result.url],
      }));
      toast.success("Logo uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogoIdx(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleLogoUrlAdd = () => {
    setForm((prev) => ({ ...prev, logoUrls: [...prev.logoUrls, ""] }));
  };

  const removeFavicon = () => {
    setForm((prev) => ({ ...prev, faviconUrl: "" }));
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

      {/* Company Identity */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold mb-3">Company Identity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Your company tagline or slogan"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo URLs */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold mb-3">Logo URLs</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Add logo URLs manually or upload image files directly.
          </p>
          <div className="space-y-2">
            {form.logoUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {url && (
                  <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={url}
                      alt={`Logo ${idx + 1}`}
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
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
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogoIdx !== null}
              className="gap-1.5"
            >
              {uploadingLogoIdx !== null ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploadingLogoIdx !== null ? "Uploading..." : "Upload Logo File"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogoUrlAdd}
              className="gap-1"
            >
              <Plus className="h-3 w-3" /> Add Logo URL
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Favicon */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold mb-3">Favicon</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Upload a favicon file or paste a URL. Recommended: 32x32px PNG or .ico file (max 512KB).
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={form.faviconUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, faviconUrl: e.target.value }))}
                  placeholder="https://example.com/favicon.ico"
                  className="flex-1"
                />
                {form.faviconUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFavicon}
                    aria-label="Remove favicon"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept=".ico,.png,.svg,.gif,image/x-icon,image/png,image/svg+xml"
                  onChange={handleFaviconUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={uploadingFavicon}
                  className="gap-1.5"
                >
                  {uploadingFavicon ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadingFavicon ? "Uploading..." : "Upload Favicon File"}
                </Button>
              </div>
            </div>

            {/* Favicon Preview */}
            <div className="flex items-center gap-4 shrink-0">
              {form.faviconUrl ? (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 border rounded bg-muted flex items-center justify-center overflow-hidden">
                      <img
                        src={form.faviconUrl}
                        alt="Favicon 16x16"
                        className="w-4 h-4 object-contain"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">16px</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 border rounded bg-muted flex items-center justify-center overflow-hidden">
                      <img
                        src={form.faviconUrl}
                        alt="Favicon 32x32"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">32px</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <div className="w-12 h-12 border rounded bg-muted flex items-center justify-center">
                    <ImageOff className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <span className="text-[10px]">No favicon set</span>
                </div>
              )}
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="social-instagram">Instagram</Label>
              <Input
                id="social-instagram"
                value={form.socialMedia.instagram}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, instagram: e.target.value } })
                }
                placeholder="https://instagram.com/company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-youtube">YouTube</Label>
              <Input
                id="social-youtube"
                value={form.socialMedia.youtube}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, youtube: e.target.value } })
                }
                placeholder="https://youtube.com/company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-github">GitHub</Label>
              <Input
                id="social-github"
                value={form.socialMedia.github}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, github: e.target.value } })
                }
                placeholder="https://github.com/company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-tiktok">TikTok</Label>
              <Input
                id="social-tiktok"
                value={form.socialMedia.tiktokUrl}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, tiktokUrl: e.target.value } })
                }
                placeholder="https://tiktok.com/@company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-pinterest">Pinterest</Label>
              <Input
                id="social-pinterest"
                value={form.socialMedia.pinterestUrl}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, pinterestUrl: e.target.value } })
                }
                placeholder="https://pinterest.com/company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-youtube-url">YouTube URL</Label>
              <Input
                id="social-youtube-url"
                value={form.socialMedia.youtubeUrl}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, youtubeUrl: e.target.value } })
                }
                placeholder="https://youtube.com/company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-linkedin-company">LinkedIn Company</Label>
              <Input
                id="social-linkedin-company"
                value={form.socialMedia.linkedinCompanyUrl}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, linkedinCompanyUrl: e.target.value } })
                }
                placeholder="https://linkedin.com/company/example"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-blog">Blog</Label>
              <Input
                id="social-blog"
                value={form.socialMedia.blogUrl}
                onChange={(e) =>
                  setForm({ ...form, socialMedia: { ...form.socialMedia, blogUrl: e.target.value } })
                }
                placeholder="https://blog.company.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}