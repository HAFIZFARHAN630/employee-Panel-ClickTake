import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    let settings = await db.sessionSettings.findFirst();

    if (!settings) {
      settings = await db.sessionSettings.create({
        data: {
          timeTrackingTimeoutMinutes: 15,
          timeTrackingWarningMinutes: 10,
        },
      });
    }

    return NextResponse.json({
      ...settings,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();

    let settings = await db.sessionSettings.findFirst();

    if (!settings) {
      settings = await db.sessionSettings.create({
        data: {
          timeTrackingTimeoutMinutes: body.timeTrackingTimeoutMinutes ?? 15,
          timeTrackingWarningMinutes: body.timeTrackingWarningMinutes ?? 10,
        },
      });
    } else {
      settings = await db.sessionSettings.update({
        where: { id: settings.id },
        data: {
          ...(body.timeTrackingTimeoutMinutes !== undefined && { timeTrackingTimeoutMinutes: body.timeTrackingTimeoutMinutes }),
          ...(body.timeTrackingWarningMinutes !== undefined && { timeTrackingWarningMinutes: body.timeTrackingWarningMinutes }),
        },
      });
    }

    return NextResponse.json({
      ...settings,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}