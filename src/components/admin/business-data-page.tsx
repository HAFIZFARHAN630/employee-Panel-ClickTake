"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Store,
  Save,
  Plus,
  MapPin,
  Phone,
  Tag,
  FileText,
  UserCircle,
  ClipboardPaste,
  Upload,
  Sparkles,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { EmployeeSearchDropdown } from "@/components/shared/employee-search-dropdown";

// ============ HELPERS ============

interface BusinessEntry {
  id: string;
  data: BusinessData;
  assignedEmployeeId: string;
  assignedDepartment: string;
  savedAt: string;
}

interface ExtractedData {
  businessName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  contactNumber: string;
  email: string;
  website: string;
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

const defaultSocialFields = {
  facebook: "",
  instagram: "",
  tiktok: "",
  pinterest: "",
  youtube: "",
  linkedin: "",
  blog: "",
};

const defaultWorkFields = {
  dailyCalls: "",
  dailyCustomers: "",
  focusAreas: "",
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

// ============ SMART PASTE EXTRACTION ============

function extractBusinessData(text: string): ExtractedData {
  const result: ExtractedData = {
    businessName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    contactNumber: "",
    email: "",
    website: "",
  };

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Extract website
  const websiteMatch = text.match(/https?:\/\/(www\.)?[\w.-]+\.\w+/);
  if (websiteMatch) {
    result.website = websiteMatch[0];
  }

  // Extract phone - try multiple patterns
  const phonePatterns = [
    /\+?\d{1,4}[-.\s]?\(?\d{1,5}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    /(?:tel|phone|mobile)[:\s]*([+\d][\d\s\-().]{6,})/i,
  ];
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      result.contactNumber = matches[0].trim();
      break;
    }
  }

  // Extract postal code (UK format, US zip, or general)
  const postalMatch = text.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d{1,2}[A-Z]{1,2}|\d{5}(?:-\d{4})?)\b/);
  if (postalMatch) {
    result.postalCode = postalMatch[1];
  }

  // Extract city (common pattern: "City, State" or a capitalized word near postal code)
  const lines = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

  // Business name: first line or text before first comma
  if (lines.length > 0) {
    const firstLine = lines[0];
    // If first line has comma, take the part before it (unless it's a phone or email)
    const commaIdx = firstLine.indexOf(",");
    if (commaIdx > 0) {
      const candidate = firstLine.substring(0, commaIdx).trim();
      if (!/\d{3,}/.test(candidate) && !candidate.includes("@")) {
        result.businessName = candidate;
      } else {
        result.businessName = firstLine.trim();
      }
    } else {
      result.businessName = firstLine.trim();
    }
  }

  // Build address from remaining parts
  // Remove extracted parts and get address
  let remaining = text;
  // Remove business name
  if (result.businessName) {
    remaining = remaining.replace(result.businessName, "");
  }
  // Remove email
  if (result.email) {
    remaining = remaining.replace(result.email, "");
  }
  // Remove website
  if (result.website) {
    remaining = remaining.replace(result.website, "");
  }
  // Remove phone
  if (result.contactNumber) {
    remaining = remaining.replace(result.contactNumber, "");
  }
  // Remove postal code
  if (result.postalCode) {
    remaining = remaining.replace(result.postalCode, "");
  }

  // Clean remaining and use as address
  const addressParts = remaining
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && !/^https?:/.test(s) && !s.includes("@"));

  if (addressParts.length > 0) {
    // First part is likely address, second might be city
    const streetParts = addressParts.filter((p) => {
      const lower = p.toLowerCase();
      return (
        lower.includes("st") ||
        lower.includes("street") ||
        lower.includes("ave") ||
        lower.includes("avenue") ||
        lower.includes("road") ||
        lower.includes("rd") ||
        lower.includes("blvd") ||
        lower.includes("drive") ||
        lower.includes("lane") ||
        lower.includes("ln") ||
        lower.includes("way") ||
        lower.includes("circuit") ||
        lower.includes("plaza") ||
        /^\d+/.test(p) // starts with a number (street number)
      );
    });

    if (streetParts.length > 0) {
      result.address = streetParts[0];
    } else if (addressParts.length > 0) {
      result.address = addressParts[0];
    }

    // Try to find city
    const cityParts = addressParts.filter((p) => p !== result.address);
    if (cityParts.length > 0) {
      result.city = cityParts[0];
    }
    if (cityParts.length > 1) {
      result.country = cityParts[cityParts.length - 1];
    }
  }

  return result;
}

// ============ CSV PARSING ============

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Simple CSV parser
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter((r) => r.some((c) => c));
  return { headers, rows };
}

// Field mapping options
const FIELD_OPTIONS = [
  { value: "businessName", label: "Business Name" },
  { value: "address", label: "Address" },
  { value: "city", label: "City" },
  { value: "postalCode", label: "Postal Code" },
  { value: "country", label: "Country" },
  { value: "contactNumber", label: "Contact Number" },
  { value: "email", label: "Email" },
  { value: "website", label: "Website" },
  { value: "shortDescription", label: "Short Description" },
  { value: "longDescription", label: "Long Description" },
  { value: "openingHours", label: "Opening Hours" },
  { value: "googleMapLink", label: "Google Map Link" },
  { value: "gmbProfileLink", label: "GMB Profile Link" },
  { value: "services", label: "Services" },
  { value: "targetAreas", label: "Target Areas" },
  { value: "", label: "— Skip —" },
];

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
  const [socialFields, setSocialFields] = useState({ ...defaultSocialFields });

  // Work targets individual fields
  const [workFields, setWorkFields] = useState({ ...defaultWorkFields });

  // Smart Paste state
  const [smartPasteOpen, setSmartPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [extracting, setExtracting] = useState(false);

  // CSV Import state
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvFieldMap, setCsvFieldMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSocialFields({ ...defaultSocialFields });
    setWorkFields({ ...defaultWorkFields });
    setAssignedEmployeeId("");
    setAssignedDepartment("");
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
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

      toast.success("Business data saved successfully");

      // Reset form completely after save
      resetForm();
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

  // ============ SMART PASTE ============

  function handleExtract() {
    if (!pasteText.trim()) {
      toast.error("Please paste some text first");
      return;
    }
    setExtracting(true);
    // Use setTimeout to not block UI
    setTimeout(() => {
      const result = extractBusinessData(pasteText);
      setExtracted(result);
      setExtracting(false);
    }, 300);
  }

  function applyExtracted() {
    if (!extracted) return;
    setData((prev) => ({
      ...prev,
      businessName: extracted.businessName || prev.businessName,
      address: extracted.address || prev.address,
      city: extracted.city || prev.city,
      postalCode: extracted.postalCode || prev.postalCode,
      country: extracted.country || prev.country,
      contactNumber: extracted.contactNumber || prev.contactNumber,
      email: extracted.email || prev.email,
      website: extracted.website || prev.website,
    }));
    setSmartPasteOpen(false);
    setPasteText("");
    setExtracted(null);
    toast.success("Data extracted and applied to form");
  }

  function closeSmartPaste() {
    setSmartPasteOpen(false);
    setPasteText("");
    setExtracted(null);
  }

  // ============ CSV IMPORT ============

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      toast.info("Excel import requires server-side processing. Please use CSV format for client-side import.");
      return;
    }

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a .csv or .xlsx file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) {
        toast.error("Could not parse CSV headers");
        return;
      }

      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-guess field mappings
      const map: Record<string, string> = {};
      const headerLower = headers.map((h) => h.toLowerCase().trim());
      const guesses: Record<string, string[]> = {
        businessName: ["name", "business name", "business", "company", "company name", "organization"],
        address: ["address", "street", "street address", "location"],
        city: ["city", "town"],
        postalCode: ["postal code", "postcode", "zip", "zip code", "postal"],
        country: ["country", "nation"],
        contactNumber: ["phone", "tel", "telephone", "mobile", "contact number", "contact", "phone number"],
        email: ["email", "e-mail", "email address", "mail"],
        website: ["website", "web", "url", "site", "website url"],
        shortDescription: ["description", "short description", "summary", "about"],
        longDescription: ["long description", "detailed description", "full description"],
        openingHours: ["hours", "opening hours", "business hours"],
        services: ["services", "service"],
        targetAreas: ["target areas", "areas", "regions"],
      };

      for (const [field, aliases] of Object.entries(guesses)) {
        const idx = headerLower.findIndex((h) =>
          aliases.some((a) => h === a || h.includes(a) || a.includes(h))
        );
        if (idx >= 0) {
          map[headers[idx]] = field;
        }
      }

      setCsvFieldMap(map);
      setCsvImportOpen(true);
    };
    reader.readAsText(file);
  }

  async function handleImportCSV() {
    if (csvRows.length === 0) {
      toast.error("No data rows to import");
      return;
    }

    try {
      setImporting(true);
      const newEntries: BusinessEntry[] = [];

      for (const row of csvRows) {
        const entryData: BusinessData = { ...defaultData };

        csvHeaders.forEach((header, idx) => {
          const field = csvFieldMap[header] as keyof BusinessData;
          if (field && row[idx] !== undefined) {
            if (field === "services" || field === "targetAreas" || field === "hashtags" || field === "seoKeywords") {
              entryData[field] = JSON.stringify(row[idx].split(";").map((s) => s.trim()).filter(Boolean));
            } else {
              entryData[field] = row[idx];
            }
          }
        });

        if (!entryData.businessName) continue;

        try {
          await api.put<BusinessData>("/api/business-data", entryData);
        } catch {
          // Continue with next row even if one fails
        }

        newEntries.push({
          id: crypto.randomUUID(),
          data: entryData,
          assignedEmployeeId: "",
          assignedDepartment: "",
          savedAt: new Date().toISOString(),
        });
      }

      const updatedEntries = [...newEntries.reverse(), ...entries];
      setEntries(updatedEntries);
      saveEntries(updatedEntries);

      toast.success(`Imported ${newEntries.length} business entries`);
      setCsvImportOpen(false);
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvFieldMap({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setSmartPasteOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Smart Paste
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="outline" size="sm" onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
          <Button size="sm" onClick={() => handleSave()} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
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
        <Button onClick={() => handleSave()} disabled={saving} size="lg">
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

      {/* ============ SMART PASTE DIALOG ============ */}
      <Dialog open={smartPasteOpen} onOpenChange={(open) => {
        if (!open) closeSmartPaste();
        setSmartPasteOpen(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Paste
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste business information below and we&apos;ll automatically extract the fields for you.
              Example: &quot;Mearns Gadget, 123 Main St, Glasgow, G1 1AA, 0141-555-0123, info@mearns.co.uk, www.mearns.co.uk&quot;
            </p>
            <Textarea
              placeholder="Paste business data here... Name, Address, Phone, Email, Website, etc."
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setExtracted(null);
              }}
              rows={6}
              className="font-mono text-sm"
            />
            <Button onClick={handleExtract} disabled={extracting || !pasteText.trim()} className="w-full sm:w-auto">
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <ClipboardPaste className="w-4 h-4 mr-2" />
                  Extract Data
                </>
              )}
            </Button>

            {/* Extracted Data Preview */}
            {extracted && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Extracted Data Preview
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Business Name", value: extracted.businessName },
                    { label: "Address", value: extracted.address },
                    { label: "City", value: extracted.city },
                    { label: "Postal Code", value: extracted.postalCode },
                    { label: "Country", value: extracted.country },
                    { label: "Phone", value: extracted.contactNumber },
                    { label: "Email", value: extracted.email },
                    { label: "Website", value: extracted.website },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-1 p-2 rounded-md bg-muted/50 border">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-sm font-medium truncate">
                        {value || <span className="text-muted-foreground italic">Not found</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSmartPaste}>
              Cancel
            </Button>
            <Button onClick={applyExtracted} disabled={!extracted}>
              Apply to Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ CSV IMPORT DIALOG ============ */}
      <Dialog open={csvImportOpen} onOpenChange={(open) => {
        if (!open) {
          setCsvHeaders([]);
          setCsvRows([]);
          setCsvFieldMap({});
        }
        setCsvImportOpen(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import CSV Data
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{csvRows.length}</span> rows found with{" "}
              <span className="font-medium text-foreground">{csvHeaders.length}</span> columns.
              Map each CSV column to a form field below.
            </div>

            {/* Mapping UI */}
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>CSV Column</span>
                <span>→</span>
                <span>Form Field</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {csvHeaders.map((header, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center p-2 rounded-md bg-muted/30 border">
                    <span className="text-sm font-medium truncate">{header}</span>
                    <span className="text-muted-foreground">→</span>
                    <Select
                      value={csvFieldMap[header] || ""}
                      onValueChange={(val) => {
                        setCsvFieldMap((prev) => ({ ...prev, [header]: val }));
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Skip this column" />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value || "skip"} value={opt.value || "__skip__"}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview first 3 rows */}
            {csvRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Preview (first 3 rows)
                </p>
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left font-semibold">#</th>
                        {csvHeaders.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 3).map((row, ri) => (
                        <tr key={ri} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{ri + 1}</td>
                          {csvHeaders.map((_, ci) => (
                            <td key={ci} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                              {row[ci] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCsvImportOpen(false);
              setCsvHeaders([]);
              setCsvRows([]);
              setCsvFieldMap({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleImportCSV} disabled={importing || csvRows.length === 0}>
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {csvRows.length} Rows
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}