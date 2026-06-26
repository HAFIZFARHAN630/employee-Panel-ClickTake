import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";
import { encryptApiKey } from "@/lib/crypto-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const models = await db.aIModelConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      models.map((m) => ({
        id: m.id,
        modelName: m.modelName,
        provider: m.provider,
        purpose: m.purpose,
        isActive: m.isActive,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching AI models:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { modelName, provider, apiKey, purpose, isActive } = body;

    if (!modelName) return NextResponse.json({ message: "Model name is required" }, { status: 400 });

    const model = await db.aIModelConfig.create({
      data: {
        modelName,
        provider: provider || "openai",
        apiKey: apiKey ? encryptApiKey(apiKey) : "",
        purpose: purpose || "",
        isActive: isActive !== false,
      },
    });

    return NextResponse.json(
      { id: model.id, modelName: model.modelName, provider: model.provider, purpose: model.purpose, isActive: model.isActive, createdAt: model.createdAt.toISOString(), updatedAt: model.updatedAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating AI model:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}