import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const params = queryParams(req);
    const where: Record<string, unknown> = {};

    // If status filter is provided, use it; otherwise default to active for non-admins
    if (params.status) {
      where.status = params.status;
    } else if (!isAdmin(auth)) {
      where.status = "active";
    }

    const announcements = await db.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { fullName: true } },
      },
    });

    return NextResponse.json(
      announcements.map((a) => ({
        ...a,
        expiresAt: a.expiresAt?.toISOString() || null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, content, priority, status, expiresAt } = body;

    if (!title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        description: description || "",
        content: content || "",
        priority: priority || "normal",
        status: status || "active",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: auth.userId,
      },
      include: {
        createdBy: { select: { fullName: true } },
      },
    });

    return NextResponse.json(
      {
        ...announcement,
        expiresAt: announcement.expiresAt?.toISOString() || null,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}