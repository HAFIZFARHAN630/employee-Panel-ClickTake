import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const awards = await db.awardPoint.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        employee: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        awardedBy: { select: { fullName: true } },
      },
    });

    return NextResponse.json(
      awards.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        points: a.points,
        reason: a.reason,
        targetType: a.targetType,
        targetIds: a.targetIds ? JSON.parse(a.targetIds) : null,
        employeeName: a.employee?.user.fullName ?? "Unknown",
        department: a.employee?.department ?? "",
        awardedByName: a.awardedBy?.fullName ?? "",
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching awards:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { employeeId, points, reason, targetType, targetIds } = body;

    if (!points || points <= 0) return NextResponse.json({ message: "Points must be positive" }, { status: 400 });

    const employees = [];

    if (targetType === "all") {
      const all = await db.employee.findMany({
        where: { user: { isActive: true } },
        select: { id: true },
      });
      employees.push(...all);
    } else if (targetType === "individual" && employeeId) {
      const emp = await db.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
      if (emp) employees.push(emp);
    } else if (targetType === "department" && targetIds?.length) {
      const depts = await db.employee.findMany({
        where: { department: { in: targetIds }, user: { isActive: true } },
        select: { id: true },
      });
      employees.push(...depts);
    } else if (targetType === "team" && targetIds?.length) {
      const team = await db.employee.findMany({
        where: { id: { in: targetIds } },
        select: { id: true },
      });
      employees.push(...team);
    }

    if (employees.length === 0) return NextResponse.json({ message: "No matching employees found" }, { status: 404 });

    await db.awardPoint.createMany({
      data: employees.map((e) => ({
        employeeId: e.id,
        points,
        reason: reason || "",
        awardedById: auth.id,
        targetType: targetType || "individual",
        targetIds: targetIds ? JSON.stringify(targetIds) : null,
      })),
    });

    return NextResponse.json({ message: `Awarded ${points} points to ${employees.length} employee(s)` }, { status: 201 });
  } catch (error) {
    console.error("Error creating award:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}