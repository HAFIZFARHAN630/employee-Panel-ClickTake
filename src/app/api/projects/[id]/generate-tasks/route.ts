import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";
import { decryptApiKey } from "@/lib/crypto-utils";

const PHASES = ["Planning", "Design", "Development", "Testing", "Deployment"] as const;

function generateFallbackTasks(
  projectName: string,
  description: string
): Array<{ title: string; description: string; phase: string }> {
  const name = projectName.toLowerCase();
  const isWeb = name.includes("website") || name.includes("web") || name.includes("landing");
  const isMobile = name.includes("mobile") || name.includes("app") || name.includes("ios") || name.includes("android");
  const isMarketing = name.includes("market") || name.includes("campaign") || name.includes("brand");

  if (isWeb) {
    return [
      { title: "Wireframe & UI Design", description: "Design page layouts, navigation structure, and visual mockups.", phase: "Design" },
      { title: "Frontend Development", description: "Build responsive UI components using the approved design system.", phase: "Development" },
      { title: "Backend API Development", description: "Implement RESTful APIs for all required functionality.", phase: "Development" },
      { title: "Database Design", description: "Design and implement the database schema with proper relationships.", phase: "Design" },
      { title: "Content Integration", description: "Add all text content, images, and media assets.", phase: "Development" },
      { title: "Performance Optimization", description: "Optimize load times, implement caching, and compress assets.", phase: "Testing" },
      { title: "Cross-browser Testing", description: "Test across all major browsers and mobile devices.", phase: "Testing" },
      { title: "Launch & Deployment", description: "Deploy to production, configure DNS, SSL, and CDN.", phase: "Deployment" },
    ];
  }
  if (isMobile) {
    return [
      { title: "App Architecture Design", description: "Define the mobile app architecture, navigation flow, and state management.", phase: "Planning" },
      { title: "UI/UX Design", description: "Create mobile-friendly designs following platform guidelines (iOS/Android).", phase: "Design" },
      { title: "Core Feature Development", description: "Implement the primary features and user workflows.", phase: "Development" },
      { title: "API Integration", description: "Connect the app to backend services and APIs.", phase: "Development" },
      { title: "Push Notifications Setup", description: "Configure push notification services for the app.", phase: "Development" },
      { title: "Testing on Devices", description: "Test on multiple device sizes and OS versions.", phase: "Testing" },
      { title: "App Store Submission", description: "Prepare assets, descriptions, and submit to app stores.", phase: "Deployment" },
    ];
  }
  if (isMarketing) {
    return [
      { title: "Market Research & Analysis", description: "Research target audience, competitors, and market trends.", phase: "Planning" },
      { title: "Campaign Strategy", description: "Develop the overall marketing campaign strategy and messaging.", phase: "Planning" },
      { title: "Content Creation", description: "Create marketing copy, visuals, and multimedia content.", phase: "Design" },
      { title: "Channel Setup", description: "Set up and configure marketing channels (social, email, ads).", phase: "Development" },
      { title: "Campaign Launch", description: "Launch campaigns across all selected channels.", phase: "Deployment" },
      { title: "Performance Tracking", description: "Monitor KPIs, analyze results, and optimize campaigns.", phase: "Testing" },
    ];
  }
  // Default
  return [
    { title: "Project Kickoff Meeting", description: "Schedule and conduct initial project kickoff with all stakeholders to align on goals and timeline.", phase: "Planning" },
    { title: "Requirements Gathering", description: "Document detailed functional and non-functional requirements for the project.", phase: "Planning" },
    { title: "Design & Architecture", description: "Create system design documents, wireframes, and technical architecture.", phase: "Design" },
    { title: "Implementation - Phase 1", description: "Build core functionality and foundational components.", phase: "Development" },
    { title: "Implementation - Phase 2", description: "Develop advanced features and integrations.", phase: "Development" },
    { title: "Code Review & Refactoring", description: "Review code quality, optimize performance, and refactor as needed.", phase: "Testing" },
    { title: "Testing & QA", description: "Write unit tests, integration tests, and perform manual QA testing.", phase: "Testing" },
    { title: "Documentation", description: "Prepare user guides, API documentation, and deployment runbook.", phase: "Deployment" },
  ];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const { aiModelId } = body;

    const project = await db.project.findUnique({
      where: { id },
      select: { name: true, description: true, department: true },
    });

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const department = project.department || "General";

    // --- Attempt AI generation ---
    try {
      const aiConfig = aiModelId
        ? await db.aIModelConfig.findFirst({ where: { id: aiModelId, isActive: true } })
        : await db.aIModelConfig.findFirst({ where: { isActive: true } });

      if (aiConfig) {
        const apiKey = decryptApiKey(aiConfig.apiKey);

        const endpoint =
          aiConfig.provider === "google"
            ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
            : "https://api.openai.com/v1/chat/completions";

        const prompt = `You are a Project Manager AI. Generate a JSON array of tasks for a project. 
Project title: ${project.name}
Description: ${project.description}
Department: ${department}

Return ONLY a valid JSON array. Each task must have:
- "title" (string): Short task name
- "description" (string): Detailed description of what needs to be done
- "phase" (string): Which phase (Planning, Design, Development, Testing, Deployment)

Generate 5-10 relevant tasks based on the project details. Do NOT make up random tasks.`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: aiConfig.modelName,
            messages: [
              { role: "system", content: "You are a Project Manager AI that generates structured task lists as JSON arrays. Only output valid JSON." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content || "";

          // Strip markdown code fences if present
          content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Validate and sanitize
            const tasks = parsed
              .filter(
                (t: Record<string, unknown>) =>
                  typeof t.title === "string" &&
                  typeof t.description === "string" &&
                  PHASES.includes((t.phase as string) || "")
              )
              .map((t: Record<string, unknown>) => ({
                title: String(t.title),
                description: String(t.description),
                phase: String(t.phase),
              }));

            if (tasks.length > 0) {
              console.log(
                `[AI-GENERATE-TASKS] Model: ${aiConfig.modelName} (${aiConfig.provider}), Tasks: ${tasks.length}, Timestamp: ${new Date().toISOString()}`
              );
              return NextResponse.json({ tasks, source: "ai" });
            }
          }
        }
      }
    } catch (aiError) {
      console.warn("[AI-GENERATE-TASKS] AI generation failed, falling back to templates:", aiError);
    }

    // --- Fallback to template-based generation ---
    console.log(
      `[AI-GENERATE-TASKS] Fallback to templates, Timestamp: ${new Date().toISOString()}`
    );
    const tasks = generateFallbackTasks(project.name, project.description || "");
    return NextResponse.json({ tasks, source: "template" });
  } catch (error) {
    console.error("Error generating tasks:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}