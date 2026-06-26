import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";
import { encryptApiKey } from "@/lib/crypto-utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();

    const model = await db.aIModelConfig.update({
      where: { id },
      data: {
        ...(body.modelName !== undefined && { modelName: body.modelName }),
        ...(body.provider !== undefined && { provider: body.provider }),
        ...(body.apiKey !== undefined && { apiKey: body.apiKey ? encryptApiKey(body.apiKey) : "" }),
        ...(body.purpose !== undefined && { purpose: body.purpose }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ id: model.id, modelName: model.modelName, provider: model.provider, purpose: model.purpose, isActive: model.isActive, createdAt: model.createdAt.toISOString(), updatedAt: model.updatedAt.toISOString() });
  } catch (error) {
    console.error("Error updating AI model:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    await db.aIModelConfig.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting AI model:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}