import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { question } = await req.json();
    if (!question) return NextResponse.json({ message: "Question is required" }, { status: 400 });

    // 1. Fetch training data
    const trainingData = await db.hRTrainingData.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 2. Improved word-level matching with scoring
    const questionLower = question.toLowerCase().trim();
    const keywords = questionLower.split(/\s+/).filter(w => w.length > 2);

    let bestMatch: { question: string; answer: string; category: string } | null = null;
    let bestScore = 0;

    for (const item of trainingData) {
      const qWords = new Set(item.question.toLowerCase().split(/\s+/));
      const catLower = (item.category || "").toLowerCase();

      // Exact or near-exact match
      if (questionLower === item.question.toLowerCase() && questionLower.length > 3) {
        bestMatch = item;
        bestScore = 1;
        break;
      }

      // Keyword matching
      let score = 0;
      for (const kw of keywords) {
        if (item.question.toLowerCase().includes(kw)) {
          score += 1 / keywords.length;
        } else if (item.answer.toLowerCase().includes(kw)) {
          score += 0.2 / keywords.length;
        }
      }

      // Category match bonus
      if (catLower && questionLower.includes(catLower)) {
        score += 0.25;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // 3. Return knowledge base match if confidence > 25%
    if (bestMatch && bestScore > 0.25) {
      return NextResponse.json({
        answer: bestMatch.answer,
        source: "knowledge-base",
        confidence: Math.min(Math.round(bestScore * 100), 100),
      });
    }

    // 4. Fall back to AI
    try {
      const aiConfig = await db.aIModelConfig.findFirst({ where: { isActive: true } });
      if (!aiConfig || !aiConfig.apiKey) {
        return NextResponse.json({
          answer: "I don't have enough information to answer that. An admin can add training data in HR Training, or configure an AI model in AI Config.",
          source: "no-match",
          confidence: 0,
        });
      }

      const { decryptApiKey } = await import("@/lib/crypto-utils");
      let apiKey: string;
      try {
        apiKey = decryptApiKey(aiConfig.apiKey);
      } catch {
        apiKey = aiConfig.apiKey;
      }

      const endpoint = aiConfig.provider === "google"
        ? `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
        : "https://api.openai.com/v1/chat/completions";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: aiConfig.modelName,
          messages: [
            { role: "system", content: "You are an HR assistant for an employee management system. Answer questions about company policies, benefits, onboarding, attendance, leave, and workplace conduct. Be concise and professional." },
            { role: "user", content: question },
          ],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        console.error("[HR-CHAT] AI error:", response.status);
        return NextResponse.json({
          answer: "I'm having trouble connecting to the AI service. Please try again later or ask admin to check AI Config.",
          source: "ai-error",
          confidence: 0,
        });
      }

      const data = await response.json();
      const aiAnswer = data.choices?.[0]?.message?.content || data.response || "I couldn't generate a response.";

      return NextResponse.json({ answer: aiAnswer, source: "ai", confidence: 75 });
    } catch (aiError) {
      console.error("[HR-CHAT] AI error:", aiError);
      return NextResponse.json({
        answer: "I'm having trouble connecting to the AI service. Please try again later.",
        source: "error",
        confidence: 0,
      });
    }
  } catch (error) {
    console.error("Error in HR chat:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}