import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    let session = await db.sessionSettings.findFirst();
    if (!session) {
      session = await db.sessionSettings.create({
        data: {
          timeTrackingTimeoutMinutes: 15,
          timeTrackingWarningMinutes: 10,
        },
      });
    }

    let general = await db.generalSettings.findFirst();

    return NextResponse.json({
      // Session settings
      id: session.id,
      timeTrackingTimeoutMinutes: session.timeTrackingTimeoutMinutes,
      timeTrackingWarningMinutes: session.timeTrackingWarningMinutes,
      activityCheckIntervalMinutes: session.activityCheckIntervalMinutes,
      popupCountdownSeconds: session.popupCountdownSeconds,
      officeLat: session.officeLat,
      officeLng: session.officeLng,
      allowedRadiusMeters: session.allowedRadiusMeters,
      // General settings
      companyName: general?.companyName ?? "",
      timezone: general?.timezone ?? "UTC",
      dateFormat: general?.dateFormat ?? "YYYY-MM-DD",
      emailNotifs: general?.emailNotifs ?? true,
      pushNotifs: general?.pushNotifs ?? true,
      inAppNotifs: general?.inAppNotifs ?? true,
      hrBotEnabled: general?.hrBotEnabled ?? true,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
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

    let session = await db.sessionSettings.findFirst();
    let general = await db.generalSettings.findFirst();

    // Separate session fields
    const sessionData: Record<string, unknown> = {};
    if (body.timeTrackingTimeoutMinutes !== undefined) sessionData.timeTrackingTimeoutMinutes = body.timeTrackingTimeoutMinutes;
    if (body.timeTrackingWarningMinutes !== undefined) sessionData.timeTrackingWarningMinutes = body.timeTrackingWarningMinutes;
    if (body.activityCheckIntervalMinutes !== undefined) sessionData.activityCheckIntervalMinutes = body.activityCheckIntervalMinutes;
    if (body.popupCountdownSeconds !== undefined) sessionData.popupCountdownSeconds = body.popupCountdownSeconds;
    if (body.officeLat !== undefined) sessionData.officeLat = body.officeLat;
    if (body.officeLng !== undefined) sessionData.officeLng = body.officeLng;
    if (body.allowedRadiusMeters !== undefined) sessionData.allowedRadiusMeters = body.allowedRadiusMeters;

    // Save session settings
    if (Object.keys(sessionData).length > 0) {
      if (session) {
        await db.sessionSettings.update({ where: { id: session.id }, data: sessionData });
      } else {
        await db.sessionSettings.create({ data: sessionData as any });
      }
    }

    // Separate general fields
    const generalData: Record<string, unknown> = {};
    if (body.companyName !== undefined) generalData.companyName = body.companyName;
    if (body.timezone !== undefined) generalData.timezone = body.timezone;
    if (body.dateFormat !== undefined) generalData.dateFormat = body.dateFormat;
    if (body.emailNotifs !== undefined) generalData.emailNotifs = body.emailNotifs;
    if (body.pushNotifs !== undefined) generalData.pushNotifs = body.pushNotifs;
    if (body.inAppNotifs !== undefined) generalData.inAppNotifs = body.inAppNotifs;
    if (body.hrBotEnabled !== undefined) generalData.hrBotEnabled = body.hrBotEnabled;

    // Save general settings
    if (Object.keys(generalData).length > 0) {
      if (general) {
        await db.generalSettings.update({ where: { id: general.id }, data: generalData });
      } else {
        await db.generalSettings.create({ data: generalData as any });
      }
    }

    // Re-read both for the response
    session = (await db.sessionSettings.findFirst())!;
    general = (await db.generalSettings.findFirst()) ?? null;

    return NextResponse.json({
      id: session.id,
      timeTrackingTimeoutMinutes: session.timeTrackingTimeoutMinutes,
      timeTrackingWarningMinutes: session.timeTrackingWarningMinutes,
      activityCheckIntervalMinutes: session.activityCheckIntervalMinutes,
      popupCountdownSeconds: session.popupCountdownSeconds,
      officeLat: session.officeLat,
      officeLng: session.officeLng,
      allowedRadiusMeters: session.allowedRadiusMeters,
      companyName: general?.companyName ?? "",
      timezone: general?.timezone ?? "UTC",
      dateFormat: general?.dateFormat ?? "YYYY-MM-DD",
      emailNotifs: general?.emailNotifs ?? true,
      pushNotifs: general?.pushNotifs ?? true,
      inAppNotifs: general?.inAppNotifs ?? true,
      hrBotEnabled: general?.hrBotEnabled ?? true,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}