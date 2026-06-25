import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: Request) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const pendingUsers = await db.user.findMany({
      where: { isActive: false, requestedRole: { not: null } },
      select: {
        id: true,
        email: true,
        fullName: true,
        requestedRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      pendingUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Pending approvals error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}