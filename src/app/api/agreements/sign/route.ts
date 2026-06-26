import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { templateId, signatureImageUrl } = body;

    if (!templateId || !signatureImageUrl) {
      return NextResponse.json({ message: "Template ID and signature are required" }, { status: 400 });
    }

    const employee = await db.employee.findUnique({ where: { userId: auth.id } });
    if (!employee) return NextResponse.json({ message: "Employee not found" }, { status: 404 });

    const existing = await db.employeeSignature.findFirst({
      where: { employeeId: employee.id, templateId },
    });
    if (existing) {
      return NextResponse.json({ message: "Already signed" }, { status: 409 });
    }

    const signature = await db.employeeSignature.create({
      data: {
        employeeId: employee.id,
        templateId,
        signatureImageUrl,
        ipAddress: req.headers.get("x-forwarded-for") || "",
      },
    });

    return NextResponse.json({ ...signature, signedAt: signature.signedAt.toISOString(), createdAt: signature.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error("Error signing agreement:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}