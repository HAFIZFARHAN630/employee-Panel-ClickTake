import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const params = queryParams(req);
    const type = params.type;

    // Non-admin users can only see their own notifications
    const userId = isAdmin(auth) && params.userId ? params.userId : auth.userId;

    const where: Record<string, unknown> = { userId };
    if (type && type !== "all") {
      where.notificationType = type;
    }

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
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    // Only admins can create notifications for other users
    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, message, notificationType, actionUrl } = body;

    if (!userId || !message) {
      return NextResponse.json({ message: "userId and message are required" }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        userId,
        message,
        notificationType: notificationType || "info",
        actionUrl: actionUrl || null,
      },
    });

    return NextResponse.json(
      {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
        updatedAt: notification.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}