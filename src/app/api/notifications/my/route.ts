import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const params = queryParams(req);
    const type = params.type || "";
    const unreadOnly = params.unread === "true";

    const where: Record<string, unknown> = { userId: auth.userId };
    if (type) where.notificationType = type;
    if (unreadOnly) where.isRead = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching my notifications:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}