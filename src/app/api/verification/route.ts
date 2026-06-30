import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // Return verification records with nested user data (matches frontend expectations)
    const records = await db.verificationRecord.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userType: true,
            avatarUrl: true,
            isFaceVerified: true,
            isActive: true,
            employee: {
              select: { id: true, department: true, designation: true, facePhotoUrls: true },
            },
          },
        },
        reviewer: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(
      records.map((r) => ({
        id: r.id,
        userId: r.userId,
        user: r.user,
        videoUrl: r.videoUrl,
        status: r.status,
        reviewedBy: r.reviewedBy,
        reviewer: r.reviewer,
        rejectionReason: r.rejectionReason,
        submittedAt: r.submittedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching verifications:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}