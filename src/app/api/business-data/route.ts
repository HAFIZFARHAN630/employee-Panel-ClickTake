import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    let businessData = await db.businessData.findFirst();

    if (!businessData) {
      businessData = await db.businessData.create({
        data: {},
      });
    }

    return NextResponse.json({
      id: businessData.id,
      businessName: businessData.businessName,
      address: businessData.address,
      city: businessData.city,
      postalCode: businessData.postalCode,
      country: businessData.country,
      contactNumber: businessData.contactNumber,
      email: businessData.email,
      website: businessData.website,
      googleMapLink: businessData.googleMapLink,
      gmbProfileLink: businessData.gmbProfileLink,
      openingHours: businessData.openingHours,
      socialMedia: businessData.socialMedia,
      services: businessData.services,
      targetAreas: businessData.targetAreas,
      shortDescription: businessData.shortDescription,
      longDescription: businessData.longDescription,
      workTargets: businessData.workTargets,
      hashtags: businessData.hashtags,
      seoKeywords: businessData.seoKeywords,
      createdAt: businessData.createdAt.toISOString(),
      updatedAt: businessData.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching business data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();

    let businessData = await db.businessData.findFirst();

    if (!businessData) {
      businessData = await db.businessData.create({
        data: {
          businessName: body.businessName || "",
          address: body.address || "",
          city: body.city || "",
          postalCode: body.postalCode || "",
          country: body.country || "",
          contactNumber: body.contactNumber || "",
          email: body.email || "",
          website: body.website || "",
          googleMapLink: body.googleMapLink || "",
          gmbProfileLink: body.gmbProfileLink || "",
          openingHours: body.openingHours || "",
          socialMedia: body.socialMedia || "{}",
          services: body.services || "[]",
          targetAreas: body.targetAreas || "[]",
          shortDescription: body.shortDescription || "",
          longDescription: body.longDescription || "",
          workTargets: body.workTargets || "{}",
          hashtags: body.hashtags || "[]",
          seoKeywords: body.seoKeywords || "[]",
        },
      });
    } else {
      businessData = await db.businessData.update({
        where: { id: businessData.id },
        data: {
          businessName: body.businessName ?? businessData.businessName,
          address: body.address ?? businessData.address,
          city: body.city ?? businessData.city,
          postalCode: body.postalCode ?? businessData.postalCode,
          country: body.country ?? businessData.country,
          contactNumber: body.contactNumber ?? businessData.contactNumber,
          email: body.email ?? businessData.email,
          website: body.website ?? businessData.website,
          googleMapLink: body.googleMapLink ?? businessData.googleMapLink,
          gmbProfileLink: body.gmbProfileLink ?? businessData.gmbProfileLink,
          openingHours: body.openingHours ?? businessData.openingHours,
          socialMedia: body.socialMedia ?? businessData.socialMedia,
          services: body.services ?? businessData.services,
          targetAreas: body.targetAreas ?? businessData.targetAreas,
          shortDescription: body.shortDescription ?? businessData.shortDescription,
          longDescription: body.longDescription ?? businessData.longDescription,
          workTargets: body.workTargets ?? businessData.workTargets,
          hashtags: body.hashtags ?? businessData.hashtags,
          seoKeywords: body.seoKeywords ?? businessData.seoKeywords,
        },
      });
    }

    return NextResponse.json({
      id: businessData.id,
      businessName: businessData.businessName,
      address: businessData.address,
      city: businessData.city,
      postalCode: businessData.postalCode,
      country: businessData.country,
      contactNumber: businessData.contactNumber,
      email: businessData.email,
      website: businessData.website,
      googleMapLink: businessData.googleMapLink,
      gmbProfileLink: businessData.gmbProfileLink,
      openingHours: businessData.openingHours,
      socialMedia: businessData.socialMedia,
      services: businessData.services,
      targetAreas: businessData.targetAreas,
      shortDescription: businessData.shortDescription,
      longDescription: businessData.longDescription,
      workTargets: businessData.workTargets,
      hashtags: businessData.hashtags,
      seoKeywords: businessData.seoKeywords,
      createdAt: businessData.createdAt.toISOString(),
      updatedAt: businessData.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating business data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}