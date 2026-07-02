import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

function safeJsonParse(val: string | null | undefined, fallback: unknown = []): unknown {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const roles = await db.rBACRole.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      roles.map((r) => ({
        ...r,
        permissions: safeJsonParse(r.permissions),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching roles:", error);
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
    const { roleId, name, description, color, isSystem, parentRole, permissions } = body;

    if (!roleId || !name) {
      return NextResponse.json({ message: "roleId and name are required" }, { status: 400 });
    }

    const role = await db.rBACRole.create({
      data: {
        roleId,
        name,
        description: description || "",
        color: color || "#6b7280",
        isSystem: isSystem || false,
        parentRole: parentRole || null,
        permissions: permissions ? JSON.stringify(permissions) : "[]",
      },
    });

    return NextResponse.json(
      {
        ...role,
        permissions: safeJsonParse(role.permissions),
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}