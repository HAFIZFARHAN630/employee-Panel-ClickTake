import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();

    const data = await db.hRTrainingData.update({
      where: { id },
      data: {
        ...(body.question !== undefined && { question: body.question }),
        ...(body.answer !== undefined && { answer: body.answer }),
        ...(body.category !== undefined && { category: body.category }),
      },
    });

    return NextResponse.json({ ...data, createdAt: data.createdAt.toISOString(), updatedAt: data.updatedAt.toISOString() });
  } catch (error) {
    console.error("Error updating HR training:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    await db.hRTrainingData.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting HR training:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}