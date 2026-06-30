import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public branding endpoint — no auth required (for login page)
export async function GET() {
  try {
    let branding = await db.brandingSettings.findFirst();

    if (!branding) {
      branding = await db.brandingSettings.create({
        data: {
          primaryColor: "#E0197A",
          secondaryColor: "#7B2FBE",
        },
      });
    }

    const parse = (val: string | null) => {
      if (!val) return null;
      try { return JSON.parse(val); } catch { return val; }
    };

    return NextResponse.json({
      companyName: branding.companyName,
      tagline: branding.tagline,
      logoUrls: parse(branding.logoUrls),
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
    });
  } catch {
    return NextResponse.json({
      companyName: "",
      tagline: "",
      logoUrls: [],
      primaryColor: "#E0197A",
      secondaryColor: "#7B2FBE",
    });
  }
}