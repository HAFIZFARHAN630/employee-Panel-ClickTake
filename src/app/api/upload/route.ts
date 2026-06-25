import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth-middleware";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";

/**
 * POST /api/upload
 * Body: { file: string (base64 data URI), folder?: string }
 * Returns: { url: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { file, folder } = await req.json();

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { message: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET." },
        { status: 503 },
      );
    }

    const url = await uploadToCloudinary(file, folder ? { folder: `ems/${folder}` } : undefined);

    if (!url) {
      return NextResponse.json({ message: "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}