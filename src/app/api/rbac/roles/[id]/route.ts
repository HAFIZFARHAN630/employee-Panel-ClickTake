import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

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

    const role = await db.rBACRole.update({
      where: { id },
      data: {
        ...(body.roleId !== undefined && { roleId: body.roleId }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.isSystem !== undefined && { isSystem: body.isSystem }),
        ...(body.parentRole !== undefined && { parentRole: body.parentRole }),
        ...(body.permissions !== undefined && { permissions: typeof body.permissions === "string" ? body.permissions : JSON.stringify(body.permissions) }),
      },
    });

    return NextResponse.json({
      ...role,
      permissions: JSON.parse(role.permissions),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error("Error updating role:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
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

    const role = await db.rBACRole.findUnique({ where: { id } });
    if (role?.isSystem) {
      return NextResponse.json({ message: "Cannot delete system roles" }, { status: 403 });
    }

    await db.rBACRole.delete({ where: { id } });

    return NextResponse.json({ message: "Role deleted" });
  } catch (error: unknown) {
    console.error("Error deleting role:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}