import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    let settings = await db.brandingSettings.findFirst();
    if (!settings) {
      settings = await db.brandingSettings.create({
        data: {
          companyName: "",
          tagline: "",
          logoUrls: "[]",
          officeLocations: "[]",
          contactEmails: "[]",
          contactPhones: "[]",
          socialMediaLinks: "{}",
          primaryColor: "#E0197A",
          secondaryColor: "#7B2FBE",
          faviconUrl: "",
        },
      });
    }

    return NextResponse.json({
      ...settings,
      logoUrls: safeJsonParse(settings.logoUrls, []),
      officeLocations: safeJsonParse(settings.officeLocations, []),
      contactEmails: safeJsonParse(settings.contactEmails, []),
      contactPhones: safeJsonParse(settings.contactPhones, []),
      socialMediaLinks: safeJsonParse(settings.socialMediaLinks, {}),
      faviconUrl: settings.faviconUrl || "",
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching branding:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    let settings = await db.brandingSettings.findFirst();

    const data = {
      ...(body.companyName !== undefined && { companyName: body.companyName }),
      ...(body.tagline !== undefined && { tagline: body.tagline }),
      ...(body.logoUrls !== undefined && { logoUrls: typeof body.logoUrls === "string" ? body.logoUrls : JSON.stringify(body.logoUrls) }),
      ...(body.officeLocations !== undefined && { officeLocations: typeof body.officeLocations === "string" ? body.officeLocations : JSON.stringify(body.officeLocations) }),
      ...(body.contactEmails !== undefined && { contactEmails: typeof body.contactEmails === "string" ? body.contactEmails : JSON.stringify(body.contactEmails) }),
      ...(body.contactPhones !== undefined && { contactPhones: typeof body.contactPhones === "string" ? body.contactPhones : JSON.stringify(body.contactPhones) }),
      ...(body.socialMediaLinks !== undefined && { socialMediaLinks: typeof body.socialMediaLinks === "string" ? body.socialMediaLinks : JSON.stringify(body.socialMediaLinks) }),
      ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
      ...(body.secondaryColor !== undefined && { secondaryColor: body.secondaryColor }),
      ...(body.faviconUrl !== undefined && { faviconUrl: body.faviconUrl }),
    };

    if (settings) {
      settings = await db.brandingSettings.update({ where: { id: settings.id }, data });
    } else {
      settings = await db.brandingSettings.create({
        data: {
          companyName: (data.companyName as string) || "",
          tagline: (data.tagline as string) || "",
          logoUrls: (data.logoUrls as string) || "[]",
          officeLocations: (data.officeLocations as string) || "[]",
          contactEmails: (data.contactEmails as string) || "[]",
          contactPhones: (data.contactPhones as string) || "[]",
          socialMediaLinks: (data.socialMediaLinks as string) || "{}",
          primaryColor: (data.primaryColor as string) || "#E0197A",
          secondaryColor: (data.secondaryColor as string) || "#7B2FBE",
          faviconUrl: (data.faviconUrl as string) || "",
        },
      });
    }

    return NextResponse.json({
      ...settings,
      logoUrls: safeJsonParse(settings.logoUrls, []),
      officeLocations: safeJsonParse(settings.officeLocations, []),
      contactEmails: safeJsonParse(settings.contactEmails, []),
      contactPhones: safeJsonParse(settings.contactPhones, []),
      socialMediaLinks: safeJsonParse(settings.socialMediaLinks, {}),
      faviconUrl: settings.faviconUrl || "",
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating branding:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}