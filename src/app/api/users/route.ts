import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const params = queryParams(req);
    const search = params.search || "";
    const type = params.type || "";
    const role = params.role || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (type) {
      where.userType = type;
    }

    if (role) {
      where.role = role;
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        userType: true,
        role: true,
        isActive: true,
        isSuperuser: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        employee: { select: { id: true, department: true, designation: true } },
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString(), updatedAt: u.updatedAt.toISOString() }))
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { email, fullName, password, userType, role, isActive } = body;

    if (!email || !fullName) {
      return NextResponse.json({ message: "Email and full name are required" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        email,
        fullName,
        password: password || "",
        userType: userType || "employee",
        role: role || "viewer",
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(
      {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}