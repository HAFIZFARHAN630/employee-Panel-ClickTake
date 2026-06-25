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
    });

    return NextResponse.json(
      templates.map((t) => ({
        ...t,
        applicableRoles: JSON.parse(t.applicableRoles),
        applicableDepartments: JSON.parse(t.applicableDepartments),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
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
    const { title, content, applicableRoles, applicableDepartments, version, isActive } = body;

    if (!title) return NextResponse.json({ message: "Title is required" }, { status: 400 });

    const template = await db.agreementTemplate.create({
      data: {
        title,
        content: content || "",
        applicableRoles: JSON.stringify(applicableRoles || []),
        applicableDepartments: JSON.stringify(applicableDepartments || []),
        version: version || "1.0",
        isActive: isActive !== false,
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