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
    const { action, reason } = body;

    // Map frontend action to DB status
    let status: string;
    if (action === "approve") status = "verified";
    else if (action === "reject") status = "rejected";
    else if (action === "resubmit") status = "rejected";
    else return NextResponse.json({ message: "Invalid action. Use: approve, reject, or resubmit" }, { status: 400 });

    const record = await db.verificationRecord.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ message: "Verification record not found" }, { status: 404 });

    const updated = await db.verificationRecord.update({
      where: { id },
      data: {
        status,
        reviewedBy: auth.id,
        rejectionReason: reason || (action === "resubmit" ? "Please resubmit with clearer photos/video." : ""),
      },
    });

    if (status === "verified") {
      await db.user.update({
        where: { id: record.userId },
        data: { isFaceVerified: true },
      });
    }

    // Notify user about the decision
    const messages: Record<string, string> = {
      verified: "Your face verification has been approved. You may proceed to the next onboarding step.",
      rejected: action === "resubmit"
        ? `Your face verification requires resubmission. ${reason || "Please provide clearer photos/video."}`
        : `Your face verification was rejected. ${reason || "Please contact admin for details."}`,
    };

    await db.notification.create({
      data: {
        userId: record.userId,
        message: messages[status] || "Your verification status has been updated.",
        notificationType: status === "verified" ? "success" : "warning",
      },
    });

    // If rejected/resubmit, reset face verification so they can try again
    if (status === "rejected") {
      await db.user.update({
        where: { id: record.userId },
        data: { isFaceVerified: false },
      });
    }

    return NextResponse.json({
      id: updated.id,
      userId: updated.userId,
      videoUrl: updated.videoUrl,
      status: updated.status,
      reviewedBy: updated.reviewedBy,
      rejectionReason: updated.rejectionReason,
      submittedAt: updated.submittedAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating verification:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}