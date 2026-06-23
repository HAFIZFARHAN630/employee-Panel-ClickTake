import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {
      ...(body.project !== undefined && { project: body.project }),
      ...(body.task !== undefined && { task: body.task }),
      ...(body.tag !== undefined && { tag: body.tag }),
      ...(body.startTime !== undefined && { startTime: new Date(body.startTime) }),
      ...(body.endTime !== undefined && { endTime: body.endTime ? new Date(body.endTime) : null }),
    };

    // Recalculate duration if endTime or startTime changed
    if (body.endTime !== undefined || body.startTime !== undefined) {
      const existing = await db.timeLog.findUnique({ where: { id } });
      if (existing) {
        const start = body.startTime ? new Date(body.startTime) : existing.startTime;
        const end = body.endTime ? new Date(body.endTime) : existing.endTime;
        if (start && end) {
          data.duration = Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 100) / 100;
        } else {
          data.duration = body.duration ?? 0;
        }
      }
    }

    if (body.duration !== undefined && data.duration === undefined) {
      data.duration = body.duration;
    }

    const timeLog = await db.timeLog.update({
      where: { id },
      data,
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

    return NextResponse.json({
      ...timeLog,
      startTime: timeLog.startTime.toISOString(),
      endTime: timeLog.endTime?.toISOString() || null,
      createdAt: timeLog.createdAt.toISOString(),
      updatedAt: timeLog.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error("Error updating time log:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "Time log not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}