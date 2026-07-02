import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const query = queryParams(req);
    const include = (query.include || "").split(",").filter(Boolean);

    const select: Record<string, unknown> = {
      id: true,
      email: true,
      fullName: true,
      userType: true,
      role: true,
      isActive: true,
      isSuperuser: true,
      avatarUrl: true,
      onboardingStatus: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true,
    };

    if (include.includes("employee")) {
      select.employee = true;
    }

    if (include.includes("individualUser")) {
      select.individualUser = true;
    }

    const user = await db.user.findUnique({
      where: { id },
      select,
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const result = {
      ...user,
      createdAt: (user.createdAt as Date).toISOString(),
      updatedAt: (user.updatedAt as Date).toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    const employeeUpdate: Record<string, unknown> = {};

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }
    if (body.onboardingStatus) {
      updateData.onboardingStatus = body.onboardingStatus;
    }
    if (body.role) {
      updateData.role = body.role;
    }
    if (body.department !== undefined) {
      employeeUpdate.department = body.department;
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...updateData,
        ...(Object.keys(employeeUpdate).length > 0
          ? { employee: { update: employeeUpdate } }
          : {}),
      },
      include: { employee: true },
    });

    const { password: _, ...safeUser } = user;
    void _;

    return NextResponse.json({
      ...safeUser,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error("Error patching user:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const user = await db.user.update({
      where: { id },
      data: {
        ...(body.email !== undefined && { email: body.email }),
        ...(body.fullName !== undefined && { fullName: body.fullName }),
        ...(body.password !== undefined && { password: body.password }),
        ...(body.userType !== undefined && { userType: body.userType }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isSuperuser !== undefined && { isSuperuser: body.isSuperuser }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
      },
    });

    const { password: _, ...safeUser } = user;
    void _;

    return NextResponse.json({
      ...safeUser,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json({ message: "Forbidden: admin only" }, { status: 403 });
    }

    const { id } = await params;

    await db.user.delete({ where: { id } });

    return NextResponse.json({ message: "User deleted" });
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}