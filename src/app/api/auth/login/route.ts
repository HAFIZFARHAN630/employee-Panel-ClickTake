import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, verifyJwtToken } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const user = await db.user.findUnique({
      where: { email },
      include: { individualUser: true, employee: true },
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ message: "ACCOUNT_PENDING_APPROVAL" }, { status: 403 });
    }

    // Sign a proper JWT token (persists across restarts, works on Render)
    const token = signToken({ userId: user.id, email: user.email });

    const { password: _, ...safeUser } = user;
    void _;

    return NextResponse.json({
      user: {
        ...safeUser,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// Re-export for backward compat (auth/me uses this)
export { verifyJwtToken as verifyToken };