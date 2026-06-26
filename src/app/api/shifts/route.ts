import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const shifts = await db.shift.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(
      shifts.map((s) => ({
        ...s,
        applicableIds: JSON.parse(s.applicableIds),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, type, startTime, endTime, applicableType, applicableIds } = body;

    if (!name || !startTime || !endTime) {
      return NextResponse.json({ message: "Name, start time, and end time are required" }, { status: 400 });
    }

    const shift = await db.shift.create({
      data: {
        name,
        type: type || "working",
        startTime,
        endTime,
        applicableType: applicableType || "office",
        applicableIds: JSON.stringify(applicableIds || []),
        isActive: true,
      },
    });

    return NextResponse.json(
      { ...shift, applicableIds: JSON.parse(shift.applicableIds), createdAt: shift.createdAt.toISOString(), updatedAt: shift.updatedAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}