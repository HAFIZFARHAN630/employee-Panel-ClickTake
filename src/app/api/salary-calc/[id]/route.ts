import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const [yearStr, monthStr] = monthParam.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(new Date(year, month));

    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) return NextResponse.json({ message: "Employee not found" }, { status: 404 });

    const timeLogs = await db.timeLog.findMany({
      where: {
        employeeId: id,
        startTime: { gte: monthStart, lte: monthEnd },
        isVerified: true,
      },
    });

    const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalHours = totalMinutes / 60;
    const hourlyRate = employee.hourlyRate || 0;
    const totalSalary = totalHours * hourlyRate;

    return NextResponse.json({
      month: monthParam,
      totalHours: Math.round(totalHours * 100) / 100,
      hourlyRate,
      totalSalary: Math.round(totalSalary * 100) / 100,
      logCount: timeLogs.length,
    });
  } catch (error) {
    console.error("Error calculating salary:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}