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
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();

    const asset = await db.asset.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.serialNumber !== undefined && { serialNumber: body.serialNumber }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.condition !== undefined && { condition: body.condition }),
        ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo || null }),
        ...(body.purchaseDate !== undefined && { purchaseDate: body.purchaseDate || null }),
      },
    });

    return NextResponse.json({ ...asset, createdAt: asset.createdAt.toISOString(), updatedAt: asset.updatedAt.toISOString() });
  } catch (error: unknown) {
    console.error("Error updating asset:", error);
    if (isP2025(error)) return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    await db.asset.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error: unknown) {
    console.error("Error deleting asset:", error);
    if (isP2025(error)) return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}