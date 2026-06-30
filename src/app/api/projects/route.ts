import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const params = queryParams(req);
    const status = params.status || "";
    const search = params.search || "";

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.name = { contains: search };
    }

    const projects = await db.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { tasks: true, assignments: true } },
        createdBy: { select: { fullName: true } },
        owner: { select: { fullName: true } },
      },
    });

    return NextResponse.json(
      projects.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { name, description, status, priority, progress, budget, tags, ownerId, startDate, endDate, requiresManualAcceptance } = body;

    if (!name) {
      return NextResponse.json({ message: "Project name is required" }, { status: 400 });
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || "",
        status: status || "draft",
        priority: priority || "medium",
        progress: progress || 0,
        budget: budget || 0,
        tags: typeof tags === "string" ? (tags || "[]") : JSON.stringify(tags || []),
        createdById: auth.userId,
        ownerId: ownerId || null,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(requiresManualAcceptance !== undefined && { requiresManualAcceptance }),
      },
    });

    return NextResponse.json(
      {
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}