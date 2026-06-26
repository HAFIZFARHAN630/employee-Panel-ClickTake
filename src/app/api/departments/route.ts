import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const departments = await db.department.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Count employees per department by matching department string field
    const employeeCounts = await db.employee.groupBy({
      by: ["department"],
      _count: { id: true },
    });

    const countMap = new Map(employeeCounts.map((e) => [e.department, e._count.id]));

    return NextResponse.json(
      departments.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        isActive: d.isActive,
        employeeCount: countMap.get(d.name) || 0,
        createdAt: d.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Department name is required" }, { status: 400 });
    }

    const department = await db.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
      },
    });

    return NextResponse.json({
      id: department.id,
      name: department.name,
      description: department.description,
      isActive: department.isActive,
      createdAt: department.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}