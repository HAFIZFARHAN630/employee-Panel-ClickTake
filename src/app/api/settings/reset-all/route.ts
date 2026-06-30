import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json(
        { message: "Forbidden: admin only" },
        { status: 403 }
      );
    }

    const settings = await db.sessionSettings.findFirst();

    if (!settings) {
      await db.sessionSettings.create({
        data: {
          timeTrackingTimeoutMinutes: 15,
          timeTrackingWarningMinutes: 10,
        },
      });
    } else {
      await db.sessionSettings.update({
        where: { id: settings.id },
        data: {
          timeTrackingTimeoutMinutes: 15,
          timeTrackingWarningMinutes: 10,
        },
      });
    }

    return NextResponse.json({
      message: "Session tracking settings reset to defaults",
    });
  } catch (error) {
    console.error("Error resetting session settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}