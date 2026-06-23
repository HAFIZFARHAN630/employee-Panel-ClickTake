import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const attendance = await db.attendance.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
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
      orderBy: { date: "desc" },
    });

    // Group by employee
    const grouped: Record<string, (typeof attendance)[0]> = {};
    for (const record of attendance) {
      grouped[record.employeeId] = record;
    }

    // Also get all employees to show absent ones
    const allEmployees = await db.employee.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });

    const result = allEmployees.map((emp) => {
      const record = grouped[emp.id];
      return {
        employeeId: emp.id,
        fullName: emp.user.fullName,
        email: emp.user.email,
        department: emp.department,
        status: record?.status || "absent",
        checkIn: record?.checkIn?.toISOString() || null,
        checkOut: record?.checkOut?.toISOString() || null,
        hours: record?.hours || 0,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}