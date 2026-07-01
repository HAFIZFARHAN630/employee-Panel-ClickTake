import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

function formatBusinessData(bd: Record<string, unknown>) {
  return {
    id: bd.id,
    businessName: bd.businessName,
    address: bd.address,
    city: bd.city,
    postalCode: bd.postalCode,
    country: bd.country,
    contactNumber: bd.contactNumber,
    email: bd.email,
    website: bd.website,
    googleMapLink: bd.googleMapLink,
    gmbProfileLink: bd.gmbProfileLink,
    openingHours: bd.openingHours,
    socialMedia: bd.socialMedia,
    services: bd.services,
    targetAreas: bd.targetAreas,
    shortDescription: bd.shortDescription,
    longDescription: bd.longDescription,
    workTargets: bd.workTargets,
    hashtags: bd.hashtags,
    seoKeywords: bd.seoKeywords,
    assignedTo: bd.assignedTo ?? null,
    assignedDepartment: bd.assignedDepartment ?? null,
    createdAt: (bd.createdAt as Date).toISOString(),
    updatedAt: (bd.updatedAt as Date).toISOString(),
  };
}

function buildDataFromBody(body: Record<string, unknown>) {
  return {
    businessName: body.businessName ?? "",
    address: body.address ?? "",
    city: body.city ?? "",
    postalCode: body.postalCode ?? "",
    country: body.country ?? "",
    contactNumber: body.contactNumber ?? "",
    email: body.email ?? "",
    website: body.website ?? "",
    googleMapLink: body.googleMapLink ?? "",
    gmbProfileLink: body.gmbProfileLink ?? "",
    openingHours: body.openingHours ?? "",
    socialMedia: body.socialMedia ?? "{}",
    services: body.services ?? "[]",
    targetAreas: body.targetAreas ?? "[]",
    shortDescription: body.shortDescription ?? "",
    longDescription: body.longDescription ?? "",
    workTargets: body.workTargets ?? "{}",
    hashtags: body.hashtags ?? "[]",
    seoKeywords: body.seoKeywords ?? "[]",
    assignedTo: body.assignedTo ?? null,
    assignedDepartment: body.assignedDepartment ?? null,
  };
}

// GET all business data entries (admin sees all; non-admin only gets /api/business-data/my)
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const allData = await db.businessData.findMany({
      orderBy: { createdAt: "desc" },
    });

    // For non-admin, include assignment names
    if (!isAdmin(auth)) {
      // Only return entries assigned to this user or their department
      const user = await db.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, employee: { select: { department: true } } },
      });
      const userDept = user?.employee?.department || "";
      const filtered = allData.filter(
        (d) =>
          !d.assignedTo &&
          !d.assignedDepartment &&
          d.assignedTo === auth.userId ||
          (d.assignedDepartment && d.assignedDepartment === userDept)
      );
      return NextResponse.json(filtered.map(formatBusinessData));
    }

    // Admin: get all with assigned user/department names
    const entries = await Promise.all(
      allData.map(async (bd) => {
        const entry = formatBusinessData(bd) as Record<string, unknown>;
        if (bd.assignedTo) {
          const u = await db.user.findUnique({
            where: { id: bd.assignedTo },
            select: { id: true, fullName: true },
          });
          entry.assignedToName = u?.fullName || null;
        }
        if (bd.assignedDepartment) {
          entry.assignedDepartmentName = bd.assignedDepartment;
        }
        return entry;
      })
    );

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching business data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST: create a new business data entry
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.businessName?.trim()) {
      return NextResponse.json({ message: "Business name is required" }, { status: 400 });
    }

    const data = buildDataFromBody(body);
    const created = await db.businessData.create({ data });

    return NextResponse.json(formatBusinessData(created), { status: 201 });
  } catch (error) {
    console.error("Error creating business data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PUT: update existing (first) business data (legacy support)
export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();

    // If body has an id, update that specific entry
    if (body.id) {
      const existing = await db.businessData.findUnique({ where: { id: body.id } });
      if (!existing) {
        return NextResponse.json({ message: "Entry not found" }, { status: 404 });
      }

      const data = buildDataFromBody(body);
      const updated = await db.businessData.update({
        where: { id: body.id },
        data,
      });

      return NextResponse.json(formatBusinessData(updated));
    }

    // Legacy: update first entry
    let businessData = await db.businessData.findFirst();

    if (!businessData) {
      const data = buildDataFromBody(body);
      businessData = await db.businessData.create({ data });
    } else {
      const data = buildDataFromBody(body);
      businessData = await db.businessData.update({
        where: { id: businessData.id },
        data,
      });
    }

    return NextResponse.json(formatBusinessData(businessData));
  } catch (error) {
    console.error("Error updating business data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PATCH: partial update of a specific entry
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    const existing = await db.businessData.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Entry not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const allowedFields = [
      "businessName", "address", "city", "postalCode", "country",
      "contactNumber", "email", "website", "googleMapLink", "gmbProfileLink",
      "openingHours", "socialMedia", "services", "targetAreas",
      "shortDescription", "longDescription", "workTargets", "hashtags", "seoKeywords",
      "assignedTo", "assignedDepartment",
    ];

    for (const key of allowedFields) {
      if (key in updateData) {
        data[key] = updateData[key];
      }
    }

    const updated = await db.businessData.update({
      where: { id },
      data,
    });

    return NextResponse.json(formatBusinessData(updated));
  } catch (error) {
    console.error("Error patching business data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE: delete a specific entry
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    await db.businessData.delete({ where: { id } });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting business data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}