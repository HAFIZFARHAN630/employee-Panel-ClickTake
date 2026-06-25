import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// One-time route: creates a super_admin if none exists.
// Call: POST /api/auth/seed-admin
const SEED_EMAIL = "admin@clicktake.com";
const SEED_PASSWORD = "Admin@123";

export async function POST() {
  try {
    // Check if any super_admin exists
    const existing = await db.user.findFirst({
      where: { userType: "super_admin" },
    });

    if (existing) {
      return NextResponse.json({
        message: "Super admin already exists",
        email: existing.email,
      });
    }

    // Create super admin
    const user = await db.user.create({
      data: {
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
        fullName: "Super Admin",
        userType: "super_admin",
        role: "super_admin",
        isActive: true,
        individualUser: { create: {} },
        employee: { create: {} },
      },
      include: { individualUser: true, employee: true },
    });

    const { password: _, ...safeUser } = user;
    void _;

    return NextResponse.json({
      message: "Super admin created successfully",
      user: {
        ...safeUser,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      credentials: { email: SEED_EMAIL, password: SEED_PASSWORD },
    });
  } catch (error) {
    console.error("Seed admin error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}