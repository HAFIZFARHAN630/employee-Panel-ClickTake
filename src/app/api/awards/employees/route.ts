import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const employees = await db.employee.findMany({
      where: { user: { isActive: true } },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    return NextResponse.json(
      employees.map((e) => ({
        id: e.id,
        fullName: e.user.fullName,
        email: e.user.email,
        department: e.department,
      }))
    );
  } catch (error) {
    console.error("Error fetching employees for awards:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}