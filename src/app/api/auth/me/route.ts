import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

  // Import the verifyToken from login route
  const { verifyToken } = await import("../login/route");
  const tokenData = verifyToken(token);
  if (!tokenData) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  const { db } = await import("@/lib/db");
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
}