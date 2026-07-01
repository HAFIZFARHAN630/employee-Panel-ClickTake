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
      return NextResponse.json({
        serverTime: new Date().toISOString(),
        activeLog: null,
      });
    }

    // Return the server's current time and any active time log's start time
    const activeLog = await db.timeLog.findFirst({
      where: { employeeId: employee.id, endTime: null },
      orderBy: { startTime: "desc" },
      select: { id: true, startTime: true, project: true, task: true },
    });

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      activeLog: activeLog ? {
        ...activeLog,
        startTime: activeLog.startTime.toISOString(),
      } : null,
    });
  } catch (error) {
    console.error("Error syncing timer:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { action, employeeId } = body;

    // Find the employee record for this user
    const employee = await db.employee.findUnique({
      where: { userId: auth.userId },
    });

    const empId = employeeId || employee?.id;
    if (!empId) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    // Auto-stop all active timers
    if (action === "stop_all") {
      const now = new Date();
      const result = await db.timeLog.updateMany({
        where: { employeeId: empId, endTime: null },
        data: {
          endTime: now,
          isVerified: false,
          verificationMethod: "auto-stopped (logout)",
        },
      });

      // Recalculate durations for stopped logs
      if (result.count > 0) {
        const stoppedLogs = await db.timeLog.findMany({
          where: { employeeId: empId, endTime: now, verificationMethod: "auto-stopped (logout)" },
        });
        for (const log of stoppedLogs) {
          const duration = Math.round(((now.getTime() - log.startTime.getTime()) / (1000 * 60 * 60)) * 100) / 100;
          await db.timeLog.update({
            where: { id: log.id },
            data: { duration },
          });
        }
      }

      return NextResponse.json({ message: `Stopped ${result.count} active timer(s)`, stopped: result.count });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error in time-logs sync:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}