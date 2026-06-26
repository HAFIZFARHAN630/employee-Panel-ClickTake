import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { question } = await req.json();
    if (!question) return NextResponse.json({ message: "Question is required" }, { status: 400 });

    // 1. Search training data
    const trainingData = await db.hRTrainingData.findMany({
      where: {
        OR: [
          { question: { contains: question } },
          { category: { contains: question } },
        ],
      },
      take: 5,
    });

    // 2. Calculate word overlap similarity
    const questionWords = new Set(question.toLowerCase().split(/\s+/));
    let bestMatch = null;
    let bestScore = 0;

    for (const item of trainingData) {
      const answerWords = new Set(item.question.toLowerCase().split(/\s+/));
      let overlap = 0;
      questionWords.forEach(w => { if (answerWords.has(w)) overlap++; });
      const score = overlap / Math.max(questionWords.size, answerWords.size);
      if (score > bestScore) { bestScore = score; bestMatch = item; }
    }

    // 3. If good match found, return it
    if (bestMatch && bestScore > 0.4) {
      return NextResponse.json({
        answer: bestMatch.answer,
        source: "knowledge-base",
        confidence: Math.round(bestScore * 100),
      });
    }

    // 4. Fall back to AI (use configured AI model)
    try {
      const aiConfig = await db.aIModelConfig.findFirst({ where: { isActive: true } });
      if (!aiConfig) {
        return NextResponse.json({ answer: "No AI model configured. Please set up an AI model in AI Config settings.", source: "error" });
      }

      const { decryptApiKey } = await import("@/lib/crypto-utils");
      const apiKey = decryptApiKey(aiConfig.apiKey);

      const response = await fetch(aiConfig.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: aiConfig.modelName,
          messages: [
            { role: "system", content: "You are an HR assistant for an employee management system. Answer questions about company policies, benefits, onboarding, and workplace conduct. Be concise and helpful." },
            { role: "user", content: question },
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens,
        }),
      });

      const data = await response.json();
      const aiAnswer = data.choices?.[0]?.message?.content || data.response || "I couldn't generate a response.";

      return NextResponse.json({ answer: aiAnswer, source: "ai", confidence: 75 });
    } catch (error) {
      return NextResponse.json({ answer: "Sorry, I'm having trouble connecting to the AI service. Please try again later.", source: "error" });
    }
  } catch (error) {
    console.error("Error in HR chat:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}