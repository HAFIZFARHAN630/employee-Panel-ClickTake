import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";
import { decryptApiKey } from "@/lib/crypto-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { question } = await req.json();
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { message: "Question is required" },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim();

    // 1. Search training data (knowledge base)
    const trainingData = await db.hRTrainingData.findMany({
      take: 10,
    });

    // 2. Calculate word overlap similarity
    const questionWords = new Set(
      trimmedQuestion.toLowerCase().split(/\s+/).filter(Boolean)
    );
    let bestMatch: { question: string; answer: string; category: string } | null = null;
    let bestScore = 0;

    for (const item of trainingData) {
      const itemWords = new Set(item.question.toLowerCase().split(/\s+/).filter(Boolean));
      // Also include category words in matching
      const categoryWords = new Set(item.category.toLowerCase().split(/[\s,]+/).filter(Boolean));

      let overlap = 0;
      questionWords.forEach((w) => {
        if (itemWords.has(w) || categoryWords.has(w)) overlap++;
      });

      const combinedSize = Math.max(questionWords.size, itemWords.size + categoryWords.size);
      const score = overlap / combinedSize;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // 3. If good match found, return it
    if (bestMatch && bestScore > 0.3) {
      return NextResponse.json({
        answer: bestMatch.answer,
        source: "knowledge-base",
        confidence: Math.round(bestScore * 100),
      });
    }

    // 4. Fall back to AI (use configured AI model)
    try {
      const aiConfig = await db.aIModelConfig.findFirst({
        where: { isActive: true },
      });

      if (!aiConfig || !aiConfig.apiKey) {
        return NextResponse.json({
          answer:
            "No AI model is configured yet. Please ask your administrator to set up an AI model in Settings > AI Config.",
          source: "error",
        });
      }

      const apiKey = decryptApiKey(aiConfig.apiKey);
      console.log(`[HR-CHAT] Using AI: provider=${aiConfig.provider}, model=${aiConfig.modelName}, keyLen=${apiKey.length}`);

      // Determine endpoint based on provider (handle both "google" and "gemini")
      const provider = aiConfig.provider.toLowerCase();
      let endpoint: string;
      if (provider === "google" || provider === "gemini") {
        endpoint =
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      } else {
        endpoint = "https://api.openai.com/v1/chat/completions";
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(endpoint, {
          signal: controller.signal,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: aiConfig.modelName,
            messages: [
              {
                role: "system",
                content:
                  "You are an HR assistant for an employee management system called EMS. Answer questions about company policies, benefits, onboarding, leave rules, workplace conduct, attendance, and general HR topics. Be concise, helpful, and professional. If you don't know the answer, say so honestly.",
              },
              { role: "user", content: trimmedQuestion },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        clearTimeout(timeout);

        // Check HTTP status before parsing JSON
        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          console.error(
            `[HR-CHAT] AI provider returned ${response.status}: ${errorText.substring(0, 200)}`
          );
          return NextResponse.json({
            answer:
              "I'm having trouble connecting to the AI service. Please try again later or contact your administrator.",
            source: "error",
          });
        }

        const data = await response.json();

        // Handle both OpenAI and Gemini response formats
        const aiAnswer =
          data.choices?.[0]?.message?.content ||
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I couldn't generate a response.";

        return NextResponse.json({
          answer: aiAnswer,
          source: "ai",
          confidence: 75,
        });
      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          console.error("[HR-CHAT] AI request timed out after 30s");
          return NextResponse.json({
            answer:
              "The AI service took too long to respond. Please try again.",
            source: "error",
          });
        }
        throw fetchError;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[HR-CHAT] AI fallback error:", msg);
      return NextResponse.json({
        answer:
          `AI service error: ${msg}. Please check your AI Config settings (API key, model name, provider).`,
        source: "error",
      });
    }
  } catch (error) {
    console.error("[HR-CHAT] Unhandled error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}