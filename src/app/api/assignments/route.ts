import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const params = queryParams(req);
    const status = params.status || "";
    const employeeId = params.employeeId || "";
    const projectId = params.projectId || "";

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const assignments = await db.employeeProject.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                employee: { select: { department: true } },
              },
            },
          },
        },
        project: {
          select: { id: true, name: true, status: true },
        },
        assignedBy: {
          select: { fullName: true },
        },
      },
    });

    return NextResponse.json(
      assignments.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { employeeId, projectId, status } = body;

    if (!employeeId || !projectId) {
      return NextResponse.json({ message: "employeeId and projectId are required" }, { status: 400 });
    }

    const assignment = await db.employeeProject.create({
      data: {
        employeeId,
        projectId,
        assignedById: auth.userId,
        status: status || "pending",
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                employee: { select: { department: true } },
              },
            },
          },
        },
        project: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    return NextResponse.json(
      {
        ...assignment,
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}