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

    const members = await db.chatMember.findMany({
      where: { channelId: id },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(members.map(m => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
    })));
  } catch (error) {
    console.error("Error fetching channel members:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
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
    const { userId, role } = await req.json();

    const member = await db.chatMember.create({
      data: {
        channelId: id,
        userId: userId || auth.userId,
        role: role || "member",
      },
    });

    return NextResponse.json({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error adding channel member:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "User is already a member" }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}