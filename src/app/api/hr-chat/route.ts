import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { question, userId } = body;

    if (!question) return NextResponse.json({ message: "Question is required" }, { status: 400 });

    // Model 1: Search HR training data using case-insensitive contains
    const trainingMatches = await db.hRTrainingData.findMany({
      where: { question: { contains: question } },
      take: 3,
    });

    if (trainingMatches.length > 0) {
      // Return the best match (first one)
      const best = trainingMatches[0];
      return NextResponse.json({
        answer: best.answer,
        source: "training",
        confidence: "high",
      });
    }

    // Model 2 fallback: Return a helpful message
    // In production, this would call Gemini/OpenAI with user's DB context
    return NextResponse.json({
      answer: "I don't have specific training data for that question. Please contact your HR department for assistance, or try rephrasing your question.",
      source: "fallback",
      confidence: "low",
    });
  } catch (error) {
    console.error("Error in HR chat:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}