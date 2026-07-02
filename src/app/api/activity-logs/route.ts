import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

function safeJsonParse(val: string | null | undefined): unknown {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const params = queryParams(req);
    const section = params.section || "";
    const limit = parseInt(params.limit || "50", 10);
    const offset = parseInt(params.offset || "0", 10);

    const where: Record<string, unknown> = {};

    if (section) {
      where.section = section;
    }

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }),
      db.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        ...l,
        details: safeJsonParse(l.details),
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}