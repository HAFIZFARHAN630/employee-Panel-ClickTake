import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const tasks = await db.projectTask.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(
      tasks.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
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
    const { title, description, sortOrder, tasks: batchTasks } = body;

    // Support batch creation
    if (batchTasks && Array.isArray(batchTasks)) {
      const count = await db.projectTask.count({ where: { projectId: id } });
      const created = await db.projectTask.createMany({
        data: batchTasks.map((task: { title: string; description?: string }, idx: number) => ({
          projectId: id,
          title: task.title,
          description: task.description || "",
          sortOrder: task.sortOrder ?? count + idx,
        })),
      });

      const allTasks = await db.projectTask.findMany({
        where: { projectId: id },
        orderBy: { sortOrder: "asc" },
      });

      return NextResponse.json(
        allTasks.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        { status: 201 }
      );
    }

    if (!title) {
      return NextResponse.json({ message: "Task title is required" }, { status: 400 });
    }

    const maxOrder = await db.projectTask.findFirst({
      where: { projectId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const task = await db.projectTask.create({
      data: {
        projectId: id,
        title,
        description: description || "",
        sortOrder: sortOrder ?? (maxOrder ? maxOrder.sortOrder + 1 : 0),
      },
    });

    return NextResponse.json(
      {
        ...task,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const { taskId, isCompleted } = body;

    if (!taskId) {
      return NextResponse.json({ message: "taskId is required" }, { status: 400 });
    }

    const task = await db.projectTask.updateMany({
      where: { id: taskId, projectId: id },
      data: { isCompleted: !!isCompleted },
    });

    if (task.count === 0) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task updated", isCompleted: !!isCompleted });
  } catch (error) {
    console.error("Error toggling task:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}