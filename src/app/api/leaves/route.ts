import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const params = queryParams(req);
    const status = params.status || "";
    const employeeId = params.employeeId || "";

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const leaves = await db.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
      leaves.map((l) => ({
        ...l,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { employeeId, type, startDate, endDate, reason, days } = body;

    if (!employeeId || !type || !startDate || !endDate) {
      return NextResponse.json(
        { message: "employeeId, type, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leave = await db.leaveRequest.create({
      data: {
        employeeId,
        type,
        startDate: start,
        endDate: end,
        reason: reason || "",
        days: days || diffDays,
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
        ...leave,
        startDate: leave.startDate.toISOString(),
        endDate: leave.endDate.toISOString(),
        createdAt: leave.createdAt.toISOString(),
        updatedAt: leave.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating leave request:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}