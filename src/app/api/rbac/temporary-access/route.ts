import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const access = await db.rBACTempAccess.findMany({
      include: {
        grantedBy: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      access.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        expiresAt: a.expiresAt.toISOString(),
        isActive: new Date(a.expiresAt) > new Date(),
        email: a.userEmail,
        roleId: a.role,
        roleName: a.role,
        grantedByName: a.grantedBy?.fullName || null,
      }))
    );
  } catch (error) {
    console.error("Error fetching temp access:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { userEmail, role, expiresAt } = await req.json();
    if (!userEmail || !role || !expiresAt) {
      return NextResponse.json(
        { message: "userEmail, role, and expiresAt are required" },
        { status: 400 }
      );
    }

    const access = await db.rBACTempAccess.create({
      data: {
        userEmail,
        role,
        expiresAt: new Date(expiresAt),
        grantedById: auth.userId,
      },
    });

    return NextResponse.json(
      {
        ...access,
        createdAt: access.createdAt.toISOString(),
        expiresAt: access.expiresAt.toISOString(),
        email: access.userEmail,
        roleId: access.role,
        roleName: access.role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating temp access:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}