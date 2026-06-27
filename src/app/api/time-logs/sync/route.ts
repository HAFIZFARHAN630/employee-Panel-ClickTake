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
    // This lets the frontend sync its timer with the server
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