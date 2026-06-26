import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const templates = await db.agreementTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { signatures: true } },
        department: { select: { name: true } },
      },
    });

    return NextResponse.json(
      templates.map((t) => ({
        ...t,
        applicableRoles: t.applicableRoles,
        applicableDepartments: t.applicableDepartments,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        _count: t._count,
        department: t.department,
        departmentId: t.departmentId,
      }))
    );
  } catch (error) {
    console.error("Error fetching agreements:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, content, applicableRoles, applicableDepartments, version, isActive, departmentId } = body;

    if (!title) return NextResponse.json({ message: "Title is required" }, { status: 400 });

    // Convert comma-separated strings to JSON arrays for storage
    const rolesArr = typeof applicableRoles === "string"
      ? applicableRoles.split(",").map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(applicableRoles) ? applicableRoles : [];
    const deptsArr = typeof applicableDepartments === "string"
      ? applicableDepartments.split(",").map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(applicableDepartments) ? applicableDepartments : [];

    const template = await db.agreementTemplate.create({
      data: {
        title,
        content: content || "",
        applicableRoles: JSON.stringify(rolesArr),
        applicableDepartments: JSON.stringify(deptsArr),
        version: version || "1.0",
        isActive: isActive !== false,
        departmentId: departmentId || null,
      },
    });

    return NextResponse.json(
      { ...template, createdAt: template.createdAt.toISOString(), updatedAt: template.updatedAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating agreement:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}