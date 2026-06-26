import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Test database connection
    const userCount = await db.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: "error",
      database: "disconnected",
      error: msg,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}