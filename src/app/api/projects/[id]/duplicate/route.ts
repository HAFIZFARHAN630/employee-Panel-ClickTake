import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;
    if (!isAdmin(auth)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const original = await db.project.findUnique({
      where: { id },
      include: { tasks: true },
    });

    if (!original) return NextResponse.json({ message: "Project not found" }, { status: 404 });

    const duplicate = await db.project.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        status: "draft",
        priority: original.priority,
        budget: original.budget,
        tags: original.tags,
        createdById: auth.userId,
        ownerId: original.ownerId,
        isDuplicateOf: id,
        startDate: original.startDate,
        endDate: original.endDate,
        requiresManualAcceptance: original.requiresManualAcceptance,
        tasks: {
          create: original.tasks.map((t) => ({
            title: t.title,
            description: t.description,
            assignedTo: t.assignedTo,
            techStack: t.techStack,
            customPrompt: t.customPrompt,
            phase: t.phase,
            estimatedHours: t.estimatedHours,
            sortOrder: t.sortOrder,
          })),
        },
      },
      include: { _count: { select: { tasks: true, assignments: true } } },
    });

    return NextResponse.json(
      {
        ...duplicate,
        createdAt: duplicate.createdAt.toISOString(),
        updatedAt: duplicate.updatedAt.toISOString(),
        startDate: duplicate.startDate?.toISOString() ?? null,
        endDate: duplicate.endDate?.toISOString() ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error duplicating project:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}