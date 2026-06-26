import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, isActive } = body;

    const department = await db.department.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      id: department.id,
      name: department.name,
      description: department.description,
      isActive: department.isActive,
      createdAt: department.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const { id } = await params;
    await db.department.delete({ where: { id } });

    return NextResponse.json({ message: "Department deleted" });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}