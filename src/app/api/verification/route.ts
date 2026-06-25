import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const users = await db.user.findMany({
      where: { isActive: true },
      select: {
        id: true, email: true, fullName: true, userType: true,
        isFaceVerified: true,
        employee: { select: { id: true, department: true } },
        verificationRecords: {
          select: { id: true, videoUrl: true, status: true, rejectionReason: true, submittedAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      users.map((u) => ({
        ...u,
        createdAt: u.verificationRecords[0]?.submittedAt?.toISOString() || "",
        verificationRecord: u.verificationRecords[0] || null,
        verificationRecords: undefined,
      }))
    );
  } catch (error) {
    console.error("Error fetching verifications:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}