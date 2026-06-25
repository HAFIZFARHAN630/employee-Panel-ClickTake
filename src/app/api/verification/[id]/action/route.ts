import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const body = await req.json();
    const { status, rejectionReason } = body;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ message: "Status must be approved or rejected" }, { status: 400 });
    }

    const record = await db.verificationRecord.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const updated = await db.verificationRecord.update({
      where: { id },
      data: {
        status,
        reviewedBy: auth.id,
        rejectionReason: rejectionReason || "",
      },
    });

    if (status === "approved") {
      await db.user.update({ where: { id: record.userId }, data: { isFaceVerified: true } });
    }

    if (status === "rejected") {
      await db.notification.create({
        data: {
          userId: record.userId,
          message: `Your face verification was rejected${rejectionReason ? `: ${rejectionReason}` : ""}. Please resubmit.`,
          notificationType: "warning",
        },
      });
    }

    return NextResponse.json({
      ...updated,
      submittedAt: updated.submittedAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating verification:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}