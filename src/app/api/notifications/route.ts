import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const params = queryParams(req);
    const userId = params.userId || auth.userId;

    const notifications = await db.notification.findMany({
      where: { userId },
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

    const body = await req.json();
    const { userId, message, notificationType, actionUrl, link } = body;

    if (!userId || !message) {
      return NextResponse.json({ message: "userId and message are required" }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        userId,
        message,
        notificationType: notificationType || "info",
        actionUrl: actionUrl || link || "",
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