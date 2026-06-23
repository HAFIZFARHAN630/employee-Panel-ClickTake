import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

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
    const { employeeId, action } = body;

    if (!employeeId || !action) {
      return NextResponse.json({ message: "employeeId and action are required" }, { status: 400 });
    }

    if (action !== "check_in" && action !== "check_out") {
      return NextResponse.json({ message: "action must be 'check_in' or 'check_out'" }, { status: 400 });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

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
      let status = "present";
      if (hour >= 9 && hour < 10) {
        status = "late";
      }

      record = await db.attendance.create({
        data: {
          employeeId,
          date: today,
          checkIn: today,
          status,
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