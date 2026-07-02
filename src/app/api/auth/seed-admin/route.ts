import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

// One-time route: creates a super_admin if none exists.
// Only works in development and requires authentication.
const SEED_EMAIL = "admin@clicktake.com";
const SEED_PASSWORD = "Admin@123";

async function seedAdmin(req?: Request) {
  try {
    // Block in production
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ message: "Not available in production" }, { status: 404 });
    }

    // Require authentication in non-production
    if (req) {
      const auth = await authenticate(req);
      if (auth instanceof NextResponse) return auth;
      if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

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
    });

    return NextResponse.json({
      message: "Super admin created successfully",
      email: user.email,
    });
  } catch (error) {
    console.error("Seed admin error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return seedAdmin(req);
}

export async function POST(req: Request) {
  return seedAdmin(req);
}