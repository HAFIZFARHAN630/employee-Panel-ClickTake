import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const userId = body.userId || auth.userId;

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    const result = await db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ message: `${result.count} notifications marked as read` });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}