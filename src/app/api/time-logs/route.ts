import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const params = queryParams(req);
    const employeeId = params.employeeId || "";
    const from = params.from || "";
    const to = params.to || "";
    const all = params.all === "true";
    const active = params.active === "true";

    const where: Record<string, unknown> = {};

    // Admin can see all users' logs with ?all=true
    if (!all || !isAdmin(auth)) {
      // Find employee for this user
      const employee = await db.employee.findUnique({ where: { userId: auth.userId } });
      if (employee) where.employeeId = employee.id;
      else if (employeeId) where.employeeId = employeeId;
    }

    if (active) {
      where.endTime = null;
    }

    if (from || to) {
      where.startTime = {};
      if (from) {
        (where.startTime as Record<string, unknown>).gte = new Date(from);
      }
      if (to) {
        (where.startTime as Record<string, unknown>).lte = new Date(to);
      }
    }

    const timeLogs = await db.timeLog.findMany({
      where,
      orderBy: { startTime: "desc" },
      include: {
        employee: {
          include: {
            user: {
              select: { fullName: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      timeLogs.map((t) => ({
        ...t,
        startTime: t.startTime.toISOString(),
        endTime: t.endTime?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching time logs:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { employeeId, project, task, tag, startTime, endTime, duration } = body;

    if (!employeeId || !startTime) {
      return NextResponse.json({ message: "employeeId and startTime are required" }, { status: 400 });
    }

    const start = new Date(startTime);
    let calcDuration = duration || 0;

    if (endTime) {
      const end = new Date(endTime);
      calcDuration = Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 100) / 100;
    }

    const timeLog = await db.timeLog.create({
      data: {
        employeeId,
        project: project || "",
        task: task || "",
        tag: tag || "",
        startTime: start,
        endTime: endTime ? new Date(endTime) : null,
        duration: calcDuration,
      },
      include: {
        employee: {
          include: {
            user: {
              select: { fullName: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...timeLog,
        startTime: timeLog.startTime.toISOString(),
        endTime: timeLog.endTime?.toISOString() || null,
        createdAt: timeLog.createdAt.toISOString(),
        updatedAt: timeLog.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating time log:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}