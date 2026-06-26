import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const channels = await db.chatChannel.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });

    // Get last message for each channel
    const channelIds = channels.map((c) => c.id);
    const lastMessages = channelIds.length > 0
      ? await db.chatMessage.groupBy({
          by: ["channelId"],
          where: { channelId: { in: channelIds } },
          _max: { createdAt: true },
        })
      : [];

    const lastMsgMap = new Map(
      lastMessages.map((m) => [m.channelId, m._max.createdAt?.toISOString()])
    );

    return NextResponse.json(
      channels.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        projectId: c.projectId,
        createdAt: c.createdAt.toISOString(),
        lastMessage: lastMsgMap.get(c.id) || null,
      }))
    );
  } catch (error) {
    console.error("Error fetching chat channels:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { name, type, projectId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Channel name is required" }, { status: 400 });
    }

    const channel = await db.chatChannel.create({
      data: {
        name: name.trim(),
        type: type || "team",
        projectId: projectId || null,
      },
    });

    // Add creator as admin member
    await db.chatMember.create({
      data: {
        channelId: channel.id,
        userId: auth.userId,
        role: "admin",
      },
    });

    return NextResponse.json({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      projectId: channel.projectId,
      createdAt: channel.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating chat channel:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}