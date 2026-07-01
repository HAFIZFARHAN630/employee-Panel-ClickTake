import { NextRequest, NextResponse } from "next/server";
import { authenticate, isAdmin } from "@/lib/auth-middleware";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { file, folder } = await req.json();
    if (!file) {
      return NextResponse.json({ message: "File data is required" }, { status: 400 });
    }

    const url = await uploadToCloudinary(file, folder ? { folder } : undefined);
    if (!url) {
      return NextResponse.json({ message: "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}