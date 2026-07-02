import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, requestedRole } = await req.json();

    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPassword = (password || "").trim();

    if (!normalizedEmail || !normalizedPassword || !fullName || !requestedRole) {
      return NextResponse.json(
        { message: "Missing required fields: email, password, fullName, requestedRole" },
        { status: 400 }
      );
    }

    if (requestedRole === "super_admin" || requestedRole === "admin") {
      return NextResponse.json(
        { message: "Cannot request admin roles" },
        { status: 403 }
      );
    }

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        password: normalizedPassword,
        fullName,
        role: requestedRole,
        userType: requestedRole,
        requestedRole,
        isActive: false,
        individualUser: {
          create: {},
        },
        ...(requestedRole === "employee" || requestedRole === "freelancer"
          ? {
              employee: {
                create: {},
              },
            }
          : {}),
      },
      include: { individualUser: true, employee: true },
    });

    const { password: _, ...safeUser } = user;
    void _;

    return NextResponse.json(
      {
        ...safeUser,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Register error:", msg);
    return NextResponse.json({ message: "Registration failed" }, { status: 500 });
  }
}