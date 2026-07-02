import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, verifyJwtToken } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Trim inputs
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPassword = (password || "").trim();

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Use select to ONLY fetch columns that definitely exist.
    // This avoids crashes if onboarding_status or other new columns
    // haven't been migrated in the production database yet.
    const user = await db.user.findFirst({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        userType: true,
        role: true,
        isActive: true,
        isSuperuser: true,
        isFaceVerified: true,
        avatarUrl: true,
        tenantId: true,
        requestedRole: true,
        createdAt: true,
        updatedAt: true,
        individualUser: { select: { id: true, phoneNumber: true, address: true } },
        employee: { select: { id: true, department: true, designation: true } },
      },
    });

    if (!user || user.password !== normalizedPassword) {
      console.warn(`[LOGIN-FAILED] email=${normalizedEmail}, userFound=${!!user}`);
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