import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    // Non-admin users only see channels they are a member of
    const where = isAdmin(auth)
      ? {}
      : { members: { some: { userId: auth.userId } } };

    const channels = await db.chatChannel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { messages: true, members: true } },
        members: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
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
        memberCount: c._count.members,
        messageCount: c._count.messages,
        members: c.members.map((m) => ({
          id: m.user.id,
          fullName: m.user.fullName,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
        })),
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

    // Handle member selection and project auto-add
    const memberIds: string[] = body.memberIds || [];

    if (type === "project" && projectId) {
      // Auto-add all employees assigned to this project
      const assignments = await db.employeeProject.findMany({
        where: { projectId },
        include: { employee: { include: { user: true } } },
      });
      for (const a of assignments) {
        if (a.employee.user?.id && !memberIds.includes(a.employee.user.id) && a.employee.user.id !== auth.userId) {
          memberIds.push(a.employee.user.id);
        }
      }
    }

    // Add all members (deduplicated, skip creator since already added)
    const allMemberIds = [...new Set(memberIds.filter(id => id !== auth.userId))];
    for (const uid of allMemberIds) {
      await db.chatMember.create({
        data: { channelId: channel.id, userId: uid, role: "member" },
      });
    }

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