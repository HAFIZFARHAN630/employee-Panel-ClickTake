import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    // Find the employee record for this user
    const employee = await db.employee.findUnique({
      where: { userId: auth.userId },
    });

    if (!employee) {
      return NextResponse.json([]);
    }

    const now = new Date();

    // Auto-stop dead sessions (> 24 hours with no end_time)
    const deadThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await db.timeLog.updateMany({
      where: {
        endTime: null,
        startTime: { lt: deadThreshold },
      },
      data: {
        endTime: deadThreshold,
        duration: 24,
        isVerified: false,
        verificationMethod: "auto-stopped (24h dead session)",
      },
    });

    // Find active (no end_time) time logs
    const activeLogs = await db.timeLog.findMany({
      where: {
        endTime: null,
        employeeId: employee.id,
      },
      include: {
        employee: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    // Calculate duration from startTime
    const enriched = activeLogs.map(log => ({
      ...log,
      startTime: log.startTime.toISOString(),
      endTime: null,
      durationMinutes: Math.round((now.getTime() - log.startTime.getTime()) / 60000),
      isLive: true,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching live time logs:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}