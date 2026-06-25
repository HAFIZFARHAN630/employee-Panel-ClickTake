import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const assets = await db.asset.findMany({
      orderBy: { createdAt: "desc" },
      include: { assignee: { include: { user: { select: { fullName: true } } } } },
    });

    return NextResponse.json(
      assets.map((a) => ({
        ...a,
        assigneeName: a.assignee?.user.fullName ?? null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, serialNumber, category, condition, assignedTo, purchaseDate } = body;

    if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });

    const asset = await db.asset.create({
      data: {
        name,
        serialNumber: serialNumber || "",
        category: category || "",
        condition: condition || "new",
        assignedTo: assignedTo || null,
        purchaseDate: purchaseDate || null,
      },
    });

    return NextResponse.json(
      { ...asset, createdAt: asset.createdAt.toISOString(), updatedAt: asset.updatedAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}