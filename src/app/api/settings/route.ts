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

    // Parse extra settings from JSON or return defaults
    let extras: Record<string, unknown> = {};
    try {
      extras = JSON.parse((settings as Record<string, unknown>).activityCheckIntervalMinutes as string || "{}");
    } catch { /* empty */ }

    return NextResponse.json({
      ...settings,
      // General settings (stored as extra or returned as defaults)
      companyName: (extras.companyName as string) || "",
      timezone: (extras.timezone as string) || "UTC",
      dateFormat: (extras.dateFormat as string) || "YYYY-MM-DD",
      // Notification settings
      emailNotifs: (extras.emailNotifs as boolean) ?? true,
      pushNotifs: (extras.pushNotifs as boolean) ?? true,
      inAppNotifs: (extras.inAppNotifs as boolean) ?? true,
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

    // Separate session fields from general/notification fields
    const sessionData: Record<string, unknown> = {};
    if (body.timeTrackingTimeoutMinutes !== undefined) sessionData.timeTrackingTimeoutMinutes = body.timeTrackingTimeoutMinutes;
    if (body.timeTrackingWarningMinutes !== undefined) sessionData.timeTrackingWarningMinutes = body.timeTrackingWarningMinutes;
    if (body.activityCheckIntervalMinutes !== undefined) sessionData.activityCheckIntervalMinutes = body.activityCheckIntervalMinutes;
    if (body.popupCountdownSeconds !== undefined) sessionData.popupCountdownSeconds = body.popupCountdownSeconds;
    if (body.officeLat !== undefined) sessionData.officeLat = body.officeLat;
    if (body.officeLng !== undefined) sessionData.officeLng = body.officeLng;
    if (body.allowedRadiusMeters !== undefined) sessionData.allowedRadiusMeters = body.allowedRadiusMeters;

    if (!settings) {
      settings = await db.sessionSettings.create({
        data: {
          timeTrackingTimeoutMinutes: body.timeTrackingTimeoutMinutes ?? 15,
          timeTrackingWarningMinutes: body.timeTrackingWarningMinutes ?? 10,
          ...sessionData,
        },
      });
    } else {
      settings = await db.sessionSettings.update({
        where: { id: settings.id },
        data: sessionData,
      });
    }

    return NextResponse.json({
      ...settings,
      companyName: body.companyName || "",
      timezone: body.timezone || "UTC",
      dateFormat: body.dateFormat || "YYYY-MM-DD",
      emailNotifs: body.emailNotifs ?? true,
      pushNotifs: body.pushNotifs ?? true,
      inAppNotifs: body.inAppNotifs ?? true,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}