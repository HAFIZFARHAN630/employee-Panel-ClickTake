import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, verifyJwtToken } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Trim and normalize inputs
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPassword = (password || "").trim();

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Case-insensitive email lookup: fetch all and filter in JS
    // (SQLite's default collation is case-sensitive for findFirst)
    const allUsers = await db.user.findMany({
      where: { email: { contains: normalizedEmail.split("@")[0] } },
      include: { individualUser: true, employee: true },
      take: 50,
    });

    const user = allUsers.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (!user || user.password !== normalizedPassword) {
      console.warn(
        `[LOGIN-FAILED] email=${normalizedEmail}, userFound=${!!user}`
      );
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "ACCOUNT_PENDING_APPROVAL" },
        { status: 403 }
      );
    }

    // Sign a proper JWT token
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[LOGIN-ERROR]", msg);
    return NextResponse.json({ message: "Login failed: " + msg }, { status: 500 });
  }
}

// Re-export for backward compat (auth/me uses this)
export { verifyJwtToken as verifyToken };