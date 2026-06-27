import { NextResponse } from "next/server";
import { verifyJwtToken } from "@/lib/auth-middleware";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const tokenData = verifyJwtToken(token);
    if (!tokenData) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: tokenData.userId },
      include: { individualUser: true, employee: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { password: _, ...safeUser } = user;
    void _;

    return NextResponse.json({
      ...safeUser,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}