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
    const { name, provider, type, webhookUrl, events, isActive } = body;

    const existing = await db.integration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Integration not found" }, { status: 404 });
    }

    let eventsStr = existing.events;
    if (events !== undefined) {
      if (Array.isArray(events)) {
        eventsStr = JSON.stringify(events);
      } else if (typeof events === "string") {
        eventsStr = `[${events.split(",").map((e: string) => `"${e.trim()}"`).join(",")}]`;
      }
    }

    const integration = await db.integration.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(provider !== undefined && { provider }),
        ...(type !== undefined && { type }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        ...(events !== undefined && { events: eventsStr }),
        ...(isActive !== undefined && { isActive }),
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
    });
  } catch (error) {
    console.error("Error updating integration:", error);
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
    await db.integration.delete({ where: { id } });

    return NextResponse.json({ message: "Integration deleted" });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}