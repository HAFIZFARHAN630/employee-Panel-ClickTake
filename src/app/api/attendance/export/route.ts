import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const records = await db.attendance.findMany({
      orderBy: { date: "desc" },
      include: { employee: { include: { user: { select: { fullName: true, email: true } } } } },
    });

    return NextResponse.json(
      records.map((r) => ({
        id: r.id,
        employeeName: r.employee?.user.fullName ?? "Unknown",
        employeeEmail: r.employee?.user.email ?? "",
        department: r.employee?.department ?? "",
        date: r.date.toISOString(),
        checkIn: r.checkIn?.toISOString() ?? null,
        checkOut: r.checkOut?.toISOString() ?? null,
        status: r.status,
        hours: r.hours,
        latitude: r.latitude,
        longitude: r.longitude,
        isLocationVerified: r.isLocationVerified,
      }))
    );
  } catch (error) {
    console.error("Error exporting attendance:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}