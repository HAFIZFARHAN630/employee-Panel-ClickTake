import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    let settings = await db.brandingSettings.findFirst();
    if (!settings) {
      settings = await db.brandingSettings.create({
        data: {
          logoUrls: "[]",
          officeLocations: "[]",
          contactEmails: "[]",
          contactPhones: "[]",
          socialMediaLinks: "{}",
          primaryColor: "#E0197A",
          secondaryColor: "#7B2FBE",
        },
      });
    }

    return NextResponse.json({
      ...settings,
      logoUrls: JSON.parse(settings.logoUrls),
      officeLocations: JSON.parse(settings.officeLocations),
      contactEmails: JSON.parse(settings.contactEmails),
      contactPhones: JSON.parse(settings.contactPhones),
      socialMediaLinks: JSON.parse(settings.socialMediaLinks),
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
      ...(body.logoUrls !== undefined && { logoUrls: typeof body.logoUrls === "string" ? body.logoUrls : JSON.stringify(body.logoUrls) }),
      ...(body.officeLocations !== undefined && { officeLocations: typeof body.officeLocations === "string" ? body.officeLocations : JSON.stringify(body.officeLocations) }),
      ...(body.contactEmails !== undefined && { contactEmails: typeof body.contactEmails === "string" ? body.contactEmails : JSON.stringify(body.contactEmails) }),
      ...(body.contactPhones !== undefined && { contactPhones: typeof body.contactPhones === "string" ? body.contactPhones : JSON.stringify(body.contactPhones) }),
      ...(body.socialMediaLinks !== undefined && { socialMediaLinks: typeof body.socialMediaLinks === "string" ? body.socialMediaLinks : JSON.stringify(body.socialMediaLinks) }),
      ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
      ...(body.secondaryColor !== undefined && { secondaryColor: body.secondaryColor }),
    };

    if (settings) {
      settings = await db.brandingSettings.update({ where: { id: settings.id }, data });
    } else {
      settings = await db.brandingSettings.create({
        data: {
          ...data,
          logoUrls: (data.logoUrls as string) || "[]",
          officeLocations: (data.officeLocations as string) || "[]",
          contactEmails: (data.contactEmails as string) || "[]",
          contactPhones: (data.contactPhones as string) || "[]",
          socialMediaLinks: (data.socialMediaLinks as string) || "{}",
          primaryColor: (data.primaryColor as string) || "#E0197A",
          secondaryColor: (data.secondaryColor as string) || "#7B2FBE",
        },
      });
    }

    return NextResponse.json({
      ...settings,
      logoUrls: JSON.parse(settings.logoUrls),
      officeLocations: JSON.parse(settings.officeLocations),
      contactEmails: JSON.parse(settings.contactEmails),
      contactPhones: JSON.parse(settings.contactPhones),
      socialMediaLinks: JSON.parse(settings.socialMediaLinks),
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating branding:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}