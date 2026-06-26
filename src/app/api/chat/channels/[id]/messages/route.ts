import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const messages = await db.chatMessage.findMany({
      where: { channelId: id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    // Get sender names
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const users =
      senderIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, fullName: true },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        channelId: m.channelId,
        senderId: m.senderId,
        content: m.content,
        senderName: userMap.get(m.senderId) || "Unknown",
        createdAt: m.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { message: "Message content is required" },
        { status: 400 }
      );
    }

    const message = await db.chatMessage.create({
      data: {
        channelId: id,
        senderId: auth.userId,
        content: content.trim(),
      },
    });

    const sender = await db.user.findUnique({
      where: { id: auth.userId },
      select: { fullName: true },
    });

    return NextResponse.json(
      {
        id: message.id,
        channelId: message.channelId,
        senderId: message.senderId,
        content: message.content,
        senderName: sender?.fullName || "Unknown",
        createdAt: message.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating chat message:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}