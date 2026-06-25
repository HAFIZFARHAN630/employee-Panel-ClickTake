import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { videoUrl } = body;

    if (!videoUrl) return NextResponse.json({ message: "Video URL is required" }, { status: 400 });

    const record = await db.verificationRecord.create({
      data: {
        userId: auth.id,
        videoUrl,
        status: "pending",
      },
    });

    return NextResponse.json(
      { ...record, submittedAt: record.submittedAt.toISOString(), createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading verification:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}