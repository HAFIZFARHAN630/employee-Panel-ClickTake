import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

// ============ HAVERSINE FORMULA ============
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const params = queryParams(req);
    const employeeId = params.employeeId || "";
    const date = params.date || "";
    const from = params.from || "";
    const to = params.to || "";

    const where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    } else if (from || to) {
      where.date = {};
      if (from) {
        (where.date as Record<string, unknown>).gte = new Date(from);
      }
      if (to) {
        (where.date as Record<string, unknown>).lte = new Date(to);
      }
    }

    const attendance = await db.attendance.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        employee: {
          include: {
            user: {
              select: { fullName: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      attendance.map((a) => ({
        ...a,
        date: a.date.toISOString(),
        checkIn: a.checkIn?.toISOString() || null,
        checkOut: a.checkOut?.toISOString() || null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    let { employeeId, action, latitude, longitude } = body;

    // Non-admin users can only check in/out for themselves
    if (!isAdmin(auth)) {
      const employee = await db.employee.findUnique({ where: { userId: auth.userId } });
      if (!employee) return NextResponse.json({ message: "No employee record found" }, { status: 403 });
      employeeId = employee.id;
    }

    if (!employeeId || !action) {
      return NextResponse.json({ message: "employeeId and action are required" }, { status: 400 });
    }

    if (action !== "check_in" && action !== "check_out") {
      return NextResponse.json({ message: "action must be 'check_in' or 'check_out'" }, { status: 400 });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Determine location verification
    let isLocationVerified = false;
    const lat: number | null = latitude != null ? Number(latitude) : null;
    const lng: number | null = longitude != null ? Number(longitude) : null;

    if (lat !== null && lng !== null) {
      // Fetch session settings for geo-fence config
      try {
        const settings = await db.sessionSettings.findFirst({
          orderBy: { createdAt: "desc" },
        });

        if (settings) {
          const officeLat = settings.officeLat ?? 0;
          const officeLng = settings.officeLng ?? 0;
          const allowedRadius = settings.allowedRadiusMeters ?? 500;

          // If office coords are (0,0), no geo-fence configured — auto-verify
          if (officeLat === 0 && officeLng === 0) {
            isLocationVerified = true;
          } else {
            const distance = haversineDistance(lat, lng, officeLat, officeLng);
            isLocationVerified = distance <= allowedRadius;
          }
        } else {
          // No settings found, default to verified if coords provided
          isLocationVerified = true;
        }
      } catch {
        // If settings fetch fails, verify if coords are present
        isLocationVerified = true;
      }
    }
    // If lat/lng are null, isLocationVerified stays false — but DO NOT block punch-in

    let record = await db.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (action === "check_in") {
      if (record) {
        return NextResponse.json({ message: "Already checked in today" }, { status: 400 });
      }

      // Determine status based on time
      const hour = today.getHours();
      let status = hour >= 9 ? "late" : "present";

      record = await db.attendance.create({
        data: {
          employeeId,
          date: today,
          checkIn: today,
          status,
          latitude: lat,
          longitude: lng,
          isLocationVerified,
        },
        include: {
          employee: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      });
    } else {
      // check_out
      if (!record) {
        return NextResponse.json({ message: "No check-in record found for today" }, { status: 400 });
      }

      if (record.checkOut) {
        return NextResponse.json({ message: "Already checked out today" }, { status: 400 });
      }

      const hours =
        record.checkIn
          ? Math.round(((today.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60)) * 100) / 100
          : 0;

      record = await db.attendance.update({
        where: { id: record.id },
        data: {
          checkOut: today,
          hours,
          status: hours < 4 ? "half_day" : record.status,
          // Update location on check-out if provided
          ...(lat !== null ? { latitude: lat } : {}),
          ...(lng !== null ? { longitude: lng } : {}),
          // If new coords provided and not previously verified, re-check
          ...(lat !== null && lng !== null && !record.isLocationVerified
            ? { isLocationVerified }
            : {}),
        },
        include: {
          employee: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      });
    }

    return NextResponse.json({
      ...record,
      date: record.date.toISOString(),
      checkIn: record.checkIn?.toISOString() || null,
      checkOut: record.checkOut?.toISOString() || null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error recording attendance:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}