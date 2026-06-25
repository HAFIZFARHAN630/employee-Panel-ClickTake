import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const data = await db.hRTrainingData.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(data.map((d) => ({ ...d, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString() })));
  } catch (error) {
    console.error("Error fetching HR training:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { question, answer, category } = body;
    if (!question) return NextResponse.json({ message: "Question is required" }, { status: 400 });

    const data = await db.hRTrainingData.create({
      data: { question, answer: answer || "", category: category || "" },
    });

    return NextResponse.json({ ...data, createdAt: data.createdAt.toISOString(), updatedAt: data.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error("Error creating HR training:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}