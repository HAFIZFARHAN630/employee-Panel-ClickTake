import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const template = await db.agreementTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({
      ...template,
      applicableRoles: JSON.parse(template.applicableRoles),
      applicableDepartments: JSON.parse(template.applicableDepartments),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching agreement:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const body = await req.json();
    const template = await db.agreementTemplate.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.applicableRoles !== undefined && { applicableRoles: JSON.stringify(body.applicableRoles) }),
        ...(body.applicableDepartments !== undefined && { applicableDepartments: JSON.stringify(body.applicableDepartments) }),
        ...(body.version !== undefined && { version: body.version }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ ...template, createdAt: template.createdAt.toISOString(), updatedAt: template.updatedAt.toISOString() });
  } catch (error) {
    console.error("Error updating agreement:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    await db.agreementTemplate.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting agreement:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}