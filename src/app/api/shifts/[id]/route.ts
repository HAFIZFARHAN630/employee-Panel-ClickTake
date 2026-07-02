import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

function isP2025(error: unknown): boolean {
  return error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025";
}

function safeJsonParse(val: string | null | undefined, fallback: unknown = []): unknown {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();

    const shift = await db.shift.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.startTime !== undefined && { startTime: body.startTime }),
        ...(body.endTime !== undefined && { endTime: body.endTime }),
        ...(body.applicableType !== undefined && { applicableType: body.applicableType }),
        ...(body.applicableIds !== undefined && { applicableIds: JSON.stringify(body.applicableIds) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ ...shift, applicableIds: safeJsonParse(shift.applicableIds), createdAt: shift.createdAt.toISOString(), updatedAt: shift.updatedAt.toISOString() });
  } catch (error: unknown) {
    console.error("Error updating shift:", error);
    if (isP2025(error)) return NextResponse.json({ message: "Shift not found" }, { status: 404 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    await db.shift.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error: unknown) {
    console.error("Error deleting shift:", error);
    if (isP2025(error)) return NextResponse.json({ message: "Shift not found" }, { status: 404 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}