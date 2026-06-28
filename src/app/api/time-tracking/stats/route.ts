import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";
import { startOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const fifteenAgo = subDays(now, 15);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const employee = await db.employee.findUnique({ where: { userId: auth.id } });
    if (!employee) return NextResponse.json({ message: "Employee not found" }, { status: 404 });

    const allLogs = await db.timeLog.findMany({
      where: { employeeId: employee.id, startTime: { gte: fifteenAgo } },
    });

    function calcStats(logs: typeof allLogs) {
      const total = logs.reduce((s, l) => s + (l.duration || 0), 0);
      const active = logs.filter((l) => l.isVerified).reduce((s, l) => s + (l.duration || 0), 0);
      return {
        totalHours: Math.round(total * 100) / 100,
        activeHours: Math.round(active * 100) / 100,
        unverifiedHours: Math.round((total - active) * 100) / 100,
      };
    }

    return NextResponse.json({
      daily: calcStats(allLogs.filter((l) => l.startTime >= todayStart)),
      weekly: calcStats(allLogs.filter((l) => l.startTime >= weekStart && l.startTime <= weekEnd)),
      fifteenDay: calcStats(allLogs),
      monthly: calcStats(allLogs.filter((l) => l.startTime >= monthStart && l.startTime <= monthEnd)),
    });
  } catch (error) {
    console.error("Error fetching time tracking stats:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}