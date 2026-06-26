import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const integrations = await db.integration.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      integrations.map((i) => ({
        id: i.id,
        name: i.name,
        provider: i.provider,
        type: i.type,
        webhookUrl: i.webhookUrl,
        isActive: i.isActive,
        events: i.events,
        createdAt: i.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { name, provider, type, webhookUrl, events, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Integration name is required" }, { status: 400 });
    }

    const eventsStr = Array.isArray(events)
      ? JSON.stringify(events)
      : typeof events === "string"
        ? `[${events.split(",").map((e: string) => `"${e.trim()}"`).join(",")}]`
        : "[]";

    const integration = await db.integration.create({
      data: {
        name: name.trim(),
        provider: provider || "custom",
        type: type || "",
        webhookUrl: webhookUrl || "",
        events: eventsStr,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({
      id: integration.id,
      name: integration.name,
      provider: integration.provider,
      type: integration.type,
      webhookUrl: integration.webhookUrl,
      isActive: integration.isActive,
      events: integration.events,
      createdAt: integration.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating integration:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}