import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

function isP2025(error: unknown): boolean {
  return error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025";
}

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
        ...(name !== undefined && { name: String(name).trim() }),
        ...(description !== undefined && { description: description != null ? String(description).trim() : null }),
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
  } catch (error: unknown) {
    console.error("Error updating department:", error);
    if (isP2025(error)) return NextResponse.json({ message: "Department not found" }, { status: 404 });
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
  } catch (error: unknown) {
    console.error("Error deleting department:", error);
    if (isP2025(error)) return NextResponse.json({ message: "Department not found" }, { status: 404 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}