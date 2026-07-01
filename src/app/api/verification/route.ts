import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";

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
            onboardingStatus: true,
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

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;

    if (!videoFile) {
      return NextResponse.json({ message: "Video file is required" }, { status: 400 });
    }

    // Check if user already has a pending verification
    const existingPending = await db.verificationRecord.findFirst({
      where: { userId: auth.userId, status: "pending" },
    });
    if (existingPending) {
      return NextResponse.json(
        { message: "You already have a pending verification. Please wait for admin review.", pendingRecord: existingPending },
        { status: 409 }
      );
    }

    let videoUrl = "";

    // Try uploading to Cloudinary
    if (isCloudinaryConfigured()) {
      try {
        const bytes = await videoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${videoFile.type};base64,${buffer.toString("base64")}`;
        const uploaded = await uploadToCloudinary(base64, {
          folder: "verification-videos",
          resource_type: "video",
        });
        if (uploaded) {
          videoUrl = uploaded;
        }
      } catch (uploadError) {
        console.error("Cloudinary upload failed, storing as placeholder:", uploadError);
      }
    }

    // If Cloudinary upload failed or not configured, store a placeholder
    if (!videoUrl) {
      videoUrl = `pending://${videoFile.name}`;
    }

    // Create verification record
    const record = await db.verificationRecord.create({
      data: {
        userId: auth.userId,
        videoUrl,
        status: "pending",
      },
    });

    // Update user onboarding status to face_pending
    await db.user.update({
      where: { id: auth.userId },
      data: { onboardingStatus: "face_pending" },
    });

    return NextResponse.json({
      id: record.id,
      userId: record.userId,
      videoUrl: record.videoUrl,
      status: record.status,
      submittedAt: record.submittedAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Error submitting verification:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}