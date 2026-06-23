import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
      select: { name: true, description: true },
    });

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const projectName = project.name.toLowerCase();

    // Generate contextual sample tasks based on project name
    const taskTemplates: Record<string, Array<{ title: string; description: string }>> = {
      default: [
        { title: "Project Kickoff Meeting", description: "Schedule and conduct initial project kickoff with all stakeholders to align on goals and timeline." },
        { title: "Requirements Gathering", description: "Document detailed functional and non-functional requirements for the project." },
        { title: "Design & Architecture", description: "Create system design documents, wireframes, and technical architecture." },
        { title: "Implementation - Phase 1", description: "Build core functionality and foundational components." },
        { title: "Implementation - Phase 2", description: "Develop advanced features and integrations." },
        { title: "Code Review & Refactoring", description: "Review code quality, optimize performance, and refactor as needed." },
        { title: "Testing & QA", description: "Write unit tests, integration tests, and perform manual QA testing." },
        { title: "Documentation", description: "Prepare user guides, API documentation, and deployment runbook." },
      ],
      website: [
        { title: "Wireframe & UI Design", description: "Design page layouts, navigation structure, and visual mockups." },
        { title: "Frontend Development", description: "Build responsive UI components using the approved design system." },
        { title: "Backend API Development", description: "Implement RESTful APIs for all required functionality." },
        { title: "Database Design", description: "Design and implement the database schema with proper relationships." },
        { title: "Content Integration", description: "Add all text content, images, and media assets." },
        { title: "Performance Optimization", description: "Optimize load times, implement caching, and compress assets." },
        { title: "Cross-browser Testing", description: "Test across all major browsers and mobile devices." },
        { title: "Launch & Deployment", description: "Deploy to production, configure DNS, SSL, and CDN." },
      ],
      mobile: [
        { title: "App Architecture Design", description: "Define the mobile app architecture, navigation flow, and state management." },
        { title: "UI/UX Design", description: "Create mobile-friendly designs following platform guidelines (iOS/Android)." },
        { title: "Core Feature Development", description: "Implement the primary features and user workflows." },
        { title: "API Integration", description: "Connect the app to backend services and APIs." },
        { title: "Push Notifications Setup", description: "Configure push notification services for the app." },
        { title: "Testing on Devices", description: "Test on multiple device sizes and OS versions." },
        { title: "App Store Submission", description: "Prepare assets, descriptions, and submit to app stores." },
      ],
      marketing: [
        { title: "Market Research & Analysis", description: "Research target audience, competitors, and market trends." },
        { title: "Campaign Strategy", description: "Develop the overall marketing campaign strategy and messaging." },
        { title: "Content Creation", description: "Create marketing copy, visuals, and multimedia content." },
        { title: "Channel Setup", description: "Set up and configure marketing channels (social, email, ads)." },
        { title: "Campaign Launch", description: "Launch campaigns across all selected channels." },
        { title: "Performance Tracking", description: "Monitor KPIs, analyze results, and optimize campaigns." },
      ],
    };

    // Select relevant template
    let tasks = taskTemplates.default;
    if (projectName.includes("website") || projectName.includes("web") || projectName.includes("landing")) {
      tasks = taskTemplates.website;
    } else if (projectName.includes("mobile") || projectName.includes("app") || projectName.includes("ios") || projectName.includes("android")) {
      tasks = taskTemplates.mobile;
    } else if (projectName.includes("market") || projectName.includes("campaign") || projectName.includes("brand")) {
      tasks = taskTemplates.marketing;
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error generating tasks:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}